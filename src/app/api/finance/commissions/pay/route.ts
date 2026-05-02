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

    const { commission_id, bank_account_id } = await req.json()
    const db = admin()

    // 1. Fetch commission
    const { data: comm, error } = await db
      .from('commissions').select('*').eq('id', commission_id).single()
    if (error || !comm) throw new Error('Komisi tidak ditemukan')
    if (comm.status === 'PAID') throw new Error('Komisi ini sudah dicairkan')

    // 2. Ambil akun Komisi COGS (5-3000)
    const { data: coaComm } = await db.from('chart_of_accounts')
      .select('id').eq('account_code', '5-3000').single()
    if (!coaComm) throw new Error('Akun Komisi (5-3000) tidak ditemukan di COA')

    // 3. Buat jurnal
    const { data: journal, error: jErr } = await db.from('journal_entries').insert({
      transaction_date: new Date().toISOString().slice(0, 10),
      reference_number: `JRN/COM/${comm.id.slice(0, 8).toUpperCase()}`,
      description: `Pencairan Komisi — ${comm.recipient_name || 'Internal'}`,
      status: 'APPROVED',
      created_by: session.user.id,
      approved_by: session.user.id,
    }).select().single()
    if (jErr || !journal) throw new Error(`Gagal membuat journal: ${jErr?.message}`)

    // 4. Journal lines: Debit COGS Komisi, Credit Bank
    await db.from('journal_lines').insert([
      { journal_id: journal.id, account_id: coaComm.id, debit: comm.commission_amount, credit: 0 },
      { journal_id: journal.id, account_id: bank_account_id, debit: 0, credit: comm.commission_amount },
    ])

    // 5. Update commission → PAID
    await db.from('commissions').update({ status: 'PAID', journal_id: journal.id }).eq('id', commission_id)

    return NextResponse.json({ success: true, journal_id: journal.id })
  } catch (err: any) {
    console.error('[API /finance/commissions/pay]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
