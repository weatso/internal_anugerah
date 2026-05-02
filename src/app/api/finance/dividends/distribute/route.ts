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

    const { entity_id, period_month, bank_account_id } = await req.json()
    const db = admin()

    // 1. Hitung Net Profit dari journal_lines bulan tersebut
    const [year, month] = period_month.split('-').map(Number)
    const startDate = `${period_month}-01`
    const endDate = new Date(year, month, 0).toISOString().slice(0, 10)

    const { data: journals } = await db.from('journal_entries')
      .select('id').eq('entity_id', entity_id).eq('status', 'APPROVED')
      .gte('transaction_date', startDate).lte('transaction_date', endDate)

    const journalIds = (journals || []).map((j: any) => j.id)
    if (journalIds.length === 0)
      return NextResponse.json({ error: 'Tidak ada transaksi di periode ini' }, { status: 400 })

    const { data: lines } = await db.from('journal_lines')
      .select('account_id, debit, credit, chart_of_accounts(account_class)')
      .in('journal_id', journalIds)

    let totalRevenue = 0
    let totalCost = 0
    for (const line of (lines || []) as any[]) {
      const cls = line.chart_of_accounts?.account_class
      if (cls === 'REVENUE') totalRevenue += (Number(line.credit) - Number(line.debit))
      if (cls === 'COGS' || cls === 'EXPENSE') totalCost += (Number(line.debit) - Number(line.credit))
    }
    const netProfit = totalRevenue - totalCost
    if (netProfit <= 0) throw new Error(`Net Profit tidak positif (${netProfit})`)

    // 2. Fetch stakeholders aktif + COA
    const [{ data: stakeholders }, { data: coas }] = await Promise.all([
      db.from('stakeholders').select('*').eq('is_active', true),
      db.from('chart_of_accounts').select('id, account_code'),
    ])
    if (!stakeholders || stakeholders.length === 0) throw new Error('Tidak ada stakeholder aktif')
    const coaMap = Object.fromEntries((coas || []).map((c: any) => [c.account_code, c.id]))
    const retainedId = coaMap['3-3000']
    if (!retainedId) throw new Error('Akun Retained Earnings (3-3000) tidak ditemukan')

    // 3. Buat journal entry compound
    const { data: journal, error: jErr } = await db.from('journal_entries').insert({
      transaction_date: new Date().toISOString().slice(0, 10),
      reference_number: `JRN/DIV/${entity_id.slice(0, 6).toUpperCase()}/${period_month}`,
      description: `Distribusi Profit — Periode ${period_month}`,
      entity_id,
      status: 'APPROVED',
      created_by: session.user.id,
      approved_by: session.user.id,
    }).select().single()
    if (jErr || !journal) throw new Error(`Gagal membuat journal: ${jErr?.message}`)

    const jLines: any[] = []
    const divRecords: any[] = []

    for (const sh of stakeholders) {
      const pct = Number(sh.profit_split_percentage) || 0
      const amount = Math.round(netProfit * (pct / 100))
      if (amount <= 0) continue
      jLines.push({ journal_id: journal.id, account_id: retainedId, debit: amount, credit: 0 })
      jLines.push({ journal_id: journal.id, account_id: bank_account_id, debit: 0, credit: amount })
      divRecords.push({
        stakeholder_id: sh.id,
        period_month,
        net_profit_amount: netProfit,
        distributed_amount: amount,
        journal_id: journal.id,
      })
    }

    if (jLines.length > 0) await db.from('journal_lines').insert(jLines)
    if (divRecords.length > 0) await db.from('dividend_distributions').insert(divRecords)

    return NextResponse.json({ success: true, net_profit: netProfit, distributed: divRecords.length, journal_id: journal.id })
  } catch (err: any) {
    console.error('[API /finance/dividends/distribute]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
