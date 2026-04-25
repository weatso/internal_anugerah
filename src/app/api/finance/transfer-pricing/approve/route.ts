import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('*, entity:entities(*)').eq('id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const body = await request.json()
    const { billing_id, expense_category_id } = body

    if (!billing_id || !expense_category_id) {
      return NextResponse.json({ error: 'Billing ID and Expense Category are required' }, { status: 400 })
    }

    // 1. Fetch Billing
    const { data: billing, error: billingErr } = await supabase.from('internal_billings').select('*, from_entity:entities!internal_billings_from_entity_id_fkey(*), to_entity:entities!internal_billings_to_entity_id_fkey(*)').eq('id', billing_id).single()
    if (billingErr || !billing) return NextResponse.json({ error: 'Billing not found' }, { status: 404 })
    if (billing.status === 'APPROVED') return NextResponse.json({ error: 'Already approved' }, { status: 400 })

    // Verify Authorization (Head of the target division, or CEO)
    if (profile.role !== 'CEO' && (profile.role !== 'HEAD' || profile.entity_id !== billing.to_entity_id)) {
      return NextResponse.json({ error: 'Not authorized to approve this billing' }, { status: 403 })
    }

    // 2. Find Affiliation Accounts
    const { data: accounts } = await supabase.from('chart_of_accounts').select('*').in('account_code', ['2-9000', '1-9000'])
    const liabilityAcc = accounts?.find(a => a.account_code === '2-9000') // Utang Afiliasi
    const assetAcc = accounts?.find(a => a.account_code === '1-9000') // Piutang Afiliasi
    
    if (!liabilityAcc || !assetAcc) return NextResponse.json({ error: 'Akun afiliasi tidak lengkap' }, { status: 500 })

    // Generate Reference
    const dateStr = new Date().toISOString().split('T')[0]
    const baseRef = `${dateStr.replace(/-/g, '').slice(0, 6)}-${Math.floor(1000 + Math.random() * 9000)}`

    // ==========================================
    // 3A. JURNAL UNTUK DIVISI YANG DITAGIH (EXPENSE)
    // ==========================================
    const { data: headerTo, error: errTo } = await supabase.from('journal_entries').insert({
      transaction_date: dateStr,
      reference_number: `TP-OUT-${baseRef}`,
      description: `Tagihan Transfer Pricing dari ${billing.from_entity?.name}: ${billing.description}`,
      entity_id: billing.to_entity_id,
      status: 'APPROVED',
      created_by: profile.id,
      approved_by: profile.id
    }).select().single()
    if (errTo) throw errTo

    const { error: linesToErr } = await supabase.from('journal_lines').insert([
      { journal_id: headerTo.id, account_id: expense_category_id, debit: billing.amount, credit: 0 },
      { journal_id: headerTo.id, account_id: liabilityAcc.id, debit: 0, credit: billing.amount }
    ])
    if (linesToErr) throw linesToErr

    // ==========================================
    // 3B. JURNAL UNTUK DIVISI YANG MENAGIH (REVENUE)
    // ==========================================
    if (billing.revenue_account_id) {
      const { data: headerFrom, error: errFrom } = await supabase.from('journal_entries').insert({
        transaction_date: dateStr,
        reference_number: `TP-IN-${baseRef}`,
        description: `Pendapatan Transfer Pricing ke ${billing.to_entity?.name}: ${billing.description}`,
        entity_id: billing.from_entity_id,
        status: 'APPROVED',
        created_by: profile.id,
        approved_by: profile.id
      }).select().single()
      if (errFrom) throw errFrom

      const { error: linesFromErr } = await supabase.from('journal_lines').insert([
        { journal_id: headerFrom.id, account_id: assetAcc.id, debit: billing.amount, credit: 0 }, // Piutang Bertambah
        { journal_id: headerFrom.id, account_id: billing.revenue_account_id, debit: 0, credit: billing.amount } // Pendapatan Bertambah
      ])
      if (linesFromErr) throw linesFromErr
    }

    // 5. Update Billing Status
    const { error: updateErr } = await supabase.from('internal_billings').update({
      status: 'APPROVED',
      approved_by: profile.id
    }).eq('id', billing_id)

    if (updateErr) throw updateErr

    return NextResponse.json({ success: true, data: headerTo })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
