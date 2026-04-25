import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (profile?.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { period_month, bank_account_id, distributions, total_net_profit } = body

    if (!period_month || !bank_account_id || !distributions || distributions.length === 0) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    // Hitung total dividen yang akan dibayarkan
    const totalDistributed = distributions.reduce((sum: number, d: any) => sum + Number(d.distributed_amount), 0)

    // Cari akun Prive / Dividen (3-2000)
    const { data: priveAcc } = await supabase.from('chart_of_accounts').select('id').eq('account_code', '3-2000').single()
    if (!priveAcc) return NextResponse.json({ error: 'Akun Prive (3-2000) tidak ditemukan' }, { status: 500 })

    // Generate Reference
    const dateStr = new Date().toISOString().split('T')[0]
    const refNumber = `DIV-${period_month.replace('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`

    // 1. Buat Jurnal Entry
    const { data: header, error: headerErr } = await supabase.from('journal_entries').insert({
      transaction_date: dateStr,
      reference_number: refNumber,
      description: `Pembagian Dividen / Profit Share periode ${period_month}`,
      entity_id: (await supabase.from('entities').select('id').eq('type', 'HOLDING').single()).data?.id,
      status: 'APPROVED',
      created_by: profile.id,
      approved_by: profile.id
    }).select().single()

    if (headerErr) throw headerErr

    // 2. Buat Journal Lines (Debit: Prive 3-2000, Credit: Bank)
    const { error: linesErr } = await supabase.from('journal_lines').insert([
      { journal_id: header.id, account_id: priveAcc.id, debit: totalDistributed, credit: 0 },
      { journal_id: header.id, account_id: bank_account_id, debit: 0, credit: totalDistributed }
    ])

    if (linesErr) {
       await supabase.from('journal_entries').delete().eq('id', header.id)
       throw linesErr
    }

    // 3. Masukkan ke tabel dividend_distributions
    const rows = distributions.map((d: any) => ({
      stakeholder_id: d.stakeholder_id,
      period_month,
      net_profit_amount: total_net_profit,
      distributed_amount: d.distributed_amount,
      journal_id: header.id
    }))

    const { error: divErr } = await supabase.from('dividend_distributions').insert(rows)
    if (divErr) throw divErr

    return NextResponse.json({ success: true, data: header })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
