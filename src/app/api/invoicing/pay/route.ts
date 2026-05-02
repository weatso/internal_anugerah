import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() } } }
    )
    const { data: { session } } = await supabaseAuth.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { invoice_id, bank_account_id } = body as { invoice_id: string; bank_account_id: string }

    const db = admin()

    // 1. Fetch invoice + line items
    const { data: invoice, error: invErr } = await db
      .from('commercial_documents')
      .select('*, document_line_items(*), clients(*)')
      .eq('id', invoice_id)
      .single()
    if (invErr || !invoice) throw new Error('Invoice tidak ditemukan')

    // Anti double-entry
    if (invoice.linked_journal_id) throw new Error('Invoice ini sudah pernah diproses (double-entry prevented)')

    // 2. Lookup akun COA yang dibutuhkan
    const { data: coas } = await db.from('chart_of_accounts').select('id, account_code')
    const coaMap = Object.fromEntries((coas || []).map(c => [c.account_code, c.id]))
    const deferredAccountId = coaMap['2-1000']
    const discountAccountId = coaMap['6-8000']
    if (!deferredAccountId) throw new Error('Akun Deferred Revenue (2-1000) belum ada. Jalankan SQL migration dulu.')

    // 3. Hitung journal lines
    const lineItems = invoice.document_line_items || []
    const journalLines: { account_id: string; debit: number; credit: number }[] = []

    let totalCashIn = 0
    let totalDiscount = 0

    for (const item of lineItems) {
      const originalTotal = (Number(item.original_price) || Number(item.total_price)) * Number(item.quantity || 1)
      const discountAmt = Number(item.discount_amount) || 0
      const netAmount = originalTotal - discountAmt

      totalCashIn += netAmount
      totalDiscount += discountAmt

      // Kredit: Deferred Revenue (recurring) atau Revenue langsung (non-recurring)
      const creditAccountId = item.is_recurring
        ? (item.deferred_account_id || deferredAccountId)
        : (item.revenue_account_id || deferredAccountId) // fallback ke deferred jika belum diset
      
      journalLines.push({ account_id: creditAccountId, debit: 0, credit: originalTotal })

      // Debit Diskon (jika ada)
      if (discountAmt > 0 && discountAccountId) {
        journalLines.push({ account_id: discountAccountId, debit: discountAmt, credit: 0 })
      }
    }

    // Debit Bank (kas masuk = grand_total dari invoice)
    journalLines.push({ account_id: bank_account_id, debit: Number(invoice.grand_total), credit: 0 })

    // 4. Buat journal entry
    const refNum = `JRN/PAID/${invoice.doc_number.replace(/\//g, '-')}`
    const { data: journal, error: jErr } = await db.from('journal_entries').insert({
      transaction_date: new Date().toISOString().slice(0, 10),
      reference_number: refNum,
      description: `Pelunasan Invoice: ${invoice.title} — ${invoice.clients?.company_name || ''}`,
      entity_id: invoice.entity_id,
      status: 'APPROVED',
      created_by: session.user.id,
      approved_by: session.user.id,
    }).select().single()
    if (jErr || !journal) throw new Error(`Gagal membuat journal: ${jErr?.message}`)

    // 5. Insert journal lines
    const { error: lErr } = await db.from('journal_lines').insert(
      journalLines.map(l => ({ ...l, journal_id: journal.id }))
    )
    if (lErr) throw new Error(`Gagal insert journal lines: ${lErr.message}`)

    // 6. Update invoice status & linked_journal_id
    await db.from('commercial_documents').update({
      status: 'PAID',
      linked_journal_id: journal.id,
    }).eq('id', invoice_id)

    // 7. Buat jadwal amortisasi untuk recurring line items
    const paidDate = new Date()
    const recognitions: any[] = []
    for (const item of lineItems.filter((i: any) => i.is_recurring && i.duration_months > 0)) {
      const months = Number(item.duration_months)
      const originalPerMonth = (Number(item.original_price) || Number(item.unit_price)) / months
      for (let i = 0; i < months; i++) {
        const d = new Date(paidDate)
        d.setMonth(d.getMonth() + i)
        const period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        recognitions.push({
          entity_id: invoice.entity_id,
          invoice_id: invoice_id,
          line_item_id: item.id,
          month_period: period,
          amount: originalPerMonth,
          is_recognized: false,
        })
      }
    }
    if (recognitions.length > 0) {
      await db.from('revenue_recognitions').insert(recognitions)
    }

    // 8. Auto-create project dengan magic link
    const startDate = paidDate.toISOString().slice(0, 10)
    const maxDuration = Math.max(...lineItems.filter((i: any) => i.is_recurring).map((i: any) => Number(i.duration_months) || 0), 0)
    const endDate = maxDuration > 0
      ? (() => { const d = new Date(paidDate); d.setMonth(d.getMonth() + maxDuration); return d.toISOString().slice(0, 10) })()
      : null

    await db.from('projects').insert({
      entity_id: invoice.entity_id,
      client_id: invoice.client_id,
      invoice_id: invoice_id,
      name: invoice.title,
      status: 'ACTIVE',
      start_date: startDate,
      end_date: endDate,
    })

    // 9. Aktifkan komisi yang sudah di-draft (dari form invoice)
    await db.from('commissions').update({ status: 'PENDING' })
      .eq('invoice_id', invoice_id).eq('status', 'DRAFT')

    return NextResponse.json({ success: true, journal_id: journal.id })
  } catch (err: any) {
    console.error('[API /invoicing/pay]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
