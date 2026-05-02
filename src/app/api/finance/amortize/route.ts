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

    const { recognition_ids, month_period } = await req.json() as {
      recognition_ids: string[]
      month_period: string
    }

    if (!recognition_ids || recognition_ids.length === 0)
      return NextResponse.json({ error: 'recognition_ids diperlukan' }, { status: 400 })

    const db = admin()

    // 1. Fetch recognition records + linked line items
    const { data: recs, error: rErr } = await db
      .from('revenue_recognitions')
      .select('*, document_line_items(deferred_account_id, revenue_account_id)')
      .in('id', recognition_ids)
      .eq('is_recognized', false)

    if (rErr || !recs || recs.length === 0)
      throw new Error('Tidak ada data amortisasi yang valid untuk dieksekusi')

    // 2. Ambil entity_id dari recognition pertama
    const entityId = recs[0].entity_id

    // 3. Group by (deferred_account_id, revenue_account_id) → compound journal
    const groupMap = new Map<string, { deferredId: string; revenueId: string; total: number }>()
    for (const rec of recs) {
      const li = rec.document_line_items as any
      if (!li?.deferred_account_id || !li?.revenue_account_id) continue
      const key = `${li.deferred_account_id}::${li.revenue_account_id}`
      const existing = groupMap.get(key)
      if (existing) existing.total += Number(rec.amount)
      else groupMap.set(key, { deferredId: li.deferred_account_id, revenueId: li.revenue_account_id, total: Number(rec.amount) })
    }

    // Fallback: jika line items tidak punya account mapping, gunakan COA default
    if (groupMap.size === 0) {
      const { data: coas } = await db.from('chart_of_accounts').select('id, account_code')
      const coaMap = Object.fromEntries((coas || []).map(c => [c.account_code, c.id]))
      const totalAmt = recs.reduce((s, r) => s + Number(r.amount), 0)
      groupMap.set('default', {
        deferredId: coaMap['2-1000'],
        revenueId: coaMap['4-1000'], // fallback ke pendapatan proyek IT
        total: totalAmt,
      })
    }

    // 4. Buat compound journal entry
    const refNum = `JRN/AMR/${month_period}/${Date.now()}`
    const { data: journal, error: jErr } = await db.from('journal_entries').insert({
      transaction_date: new Date().toISOString().slice(0, 10),
      reference_number: refNum,
      description: `Amortisasi Revenue — Periode ${month_period}`,
      entity_id: entityId,
      status: 'APPROVED',
      created_by: session.user.id,
      approved_by: session.user.id,
    }).select().single()
    if (jErr || !journal) throw new Error(`Gagal membuat journal: ${jErr?.message}`)

    // 5. Build & insert journal lines
    const lines: { journal_id: string; account_id: string; debit: number; credit: number }[] = []
    for (const g of groupMap.values()) {
      lines.push({ journal_id: journal.id, account_id: g.deferredId, debit: g.total, credit: 0 }) // Debit Deferred (berkurang)
      lines.push({ journal_id: journal.id, account_id: g.revenueId, debit: 0, credit: g.total }) // Credit Revenue (bertambah)
    }
    await db.from('journal_lines').insert(lines)

    // 6. Update recognitions → is_recognized = true
    await db.from('revenue_recognitions')
      .update({ is_recognized: true, journal_id: journal.id })
      .in('id', recognition_ids)

    return NextResponse.json({ success: true, journal_id: journal.id, processed: recs.length })
  } catch (err: any) {
    console.error('[API /finance/amortize]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
