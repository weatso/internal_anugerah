import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    const { entity_id, project_id, expense_date, amount, description, category, proof_url, expense_account_id, bank_account_id } = await req.json()

    if (!entity_id || !amount || !description || !expense_account_id || !bank_account_id) {
      return NextResponse.json({ error: 'Data wajib (entitas, nominal, deskripsi, akun beban, akun bank) tidak lengkap' }, { status: 400 })
    }

    const db = admin()

    // 1. Buat Journal Entry (Double-Entry)
    const refNum = `EXP/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`
    const { data: journal, error: jErr } = await db.from('journal_entries').insert({
      transaction_date: expense_date || new Date().toISOString().slice(0, 10),
      reference_number: refNum,
      description: `Pengeluaran: ${description}`,
      entity_id,
      status: 'APPROVED',
      created_by: session.user.id,
      approved_by: session.user.id
    }).select().single()
    
    if (jErr || !journal) throw new Error(`Gagal membuat jurnal: ${jErr?.message}`)

    // 2. Insert Journal Lines (Debit Expense, Credit Bank)
    const { error: lErr } = await db.from('journal_lines').insert([
      { journal_id: journal.id, account_id: expense_account_id, debit: Number(amount), credit: 0 },
      { journal_id: journal.id, account_id: bank_account_id, debit: 0, credit: Number(amount) }
    ])
    
    if (lErr) throw new Error(`Gagal insert journal lines: ${lErr.message}`)

    // 3. Insert Expense Record terikat ke Journal
    const { data: expense, error: expErr } = await db.from('expenses').insert({
      entity_id,
      project_id: project_id || null,
      expense_date: expense_date || new Date().toISOString().slice(0, 10),
      amount: Number(amount),
      description,
      category,
      proof_url,
      journal_id: journal.id,
      created_by: session.user.id
    }).select().single()

    if (expErr) throw new Error(`Gagal mencatat pengeluaran: ${expErr.message}`)

    return NextResponse.json({ success: true, data: expense })
  } catch (err: any) {
    console.error('[API /finance/expenses]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
