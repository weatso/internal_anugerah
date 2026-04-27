import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    
    const body = await request.json()
    // billing_id adalah ID dari internal_billings. expense_account_id dikirim dari frontend saat klik Approve.
    const { billing_id, expense_account_id } = body

    if (!billing_id || !expense_account_id) {
      return NextResponse.json({ error: 'Data approval tidak lengkap' }, { status: 400 })
    }

    // 1. TARIK DATA TAGIHAN
    const { data: billing } = await supabase
      .from('internal_billings')
      .select('*')
      .eq('id', billing_id)
      .single()

    if (!billing || billing.status !== 'PENDING_APPROVAL') {
      return NextResponse.json({ error: 'Tagihan tidak valid atau sudah diproses' }, { status: 400 })
    }

    // 2. OTORISASI (Hanya CEO, FINANCE, atau HEAD divisi yang ditagih yang boleh Approve)
    if (profile.role !== 'CEO' && profile.role !== 'FINANCE' && profile.entity_id !== billing.to_entity_id) {
      return NextResponse.json({ error: 'Anda tidak memiliki otoritas menyetujui tagihan ini' }, { status: 403 })
    }

    // 3. UPDATE STATUS TAGIHAN
    await supabase.from('internal_billings').update({
      status: 'APPROVED',
      approved_by: profile.id
    }).eq('id', billing_id)

    // 4. INJEKSI KE BUKU BESAR (JOURNAL) SEBAGAI TRANSAKSI NON-TUNAI
    const refNumber = `TP-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`

    // Buat Header Jurnal (dimasukkan ke entitas yang ditagih)
    const { data: journal, error: journalError } = await supabase.from('journal_entries').insert({
      entity_id: billing.to_entity_id,
      transaction_date: new Date().toISOString(),
      reference_number: refNumber,
      description: `Internal Billing (TP) dari ${billing.from_entity_id}: ${billing.description}`,
      status: 'APPROVED',
      created_by: billing.created_by,
      approved_by: profile.id
    }).select().single()

    if (journalError) throw journalError

    // 5. DOUBLE-ENTRY TRANSFER PRICING
    // Debit: Beban di divisi yang ditagih (to_entity)
    // Credit: Pendapatan di divisi yang menagih (from_entity -> revenue_account_id)
    const journalLines = [
      { journal_id: journal.id, account_id: expense_account_id, debit: billing.amount, credit: 0 },
      { journal_id: journal.id, account_id: billing.revenue_account_id, debit: 0, credit: billing.amount }
    ]

    await supabase.from('journal_lines').insert(journalLines)

    return NextResponse.json({ success: true, message: 'Transfer Pricing disetujui dan dibukukan.' })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}