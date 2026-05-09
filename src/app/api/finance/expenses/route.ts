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
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Akses Ditolak: Sesi tidak valid atau telah berakhir.' }, { status: 401 })

    const body = await req.json()
    const { entity_id, project_id, expense_date, amount, description, category, proof_url, expense_account_id, bank_account_id } = body

    if (!entity_id || !amount || !description || !expense_account_id || !bank_account_id) {
      return NextResponse.json({ error: 'Data wajib (entitas, nominal, deskripsi, akun beban, akun bank) tidak lengkap' }, { status: 400 })
    }

    // ── ZERO-TRUST: VERIFIKASI ROLE DARI DATABASE ──────────────────────────
    // Jangan percaya cookie. Cek apakah user benar-benar punya role yang sah untuk entitas ini.
    const db = admin()
    const { data: verifiedRole } = await db
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('entity_id', entity_id)
      .in('role', ['CEO', 'HEAD', 'FINANCE'])
      .limit(1)
      .single()

    if (!verifiedRole) {
      return NextResponse.json(
        { error: 'Manipulasi Terdeteksi: Anda tidak memiliki otoritas untuk mencatat pengeluaran pada entitas ini.' },
        { status: 403 }
      )
    }

    // 1. Buat Journal Entry (Double-Entry)
    const refNum = `EXP/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`
    const { data: journal, error: jErr } = await db.from('journal_entries').insert({
      transaction_date: expense_date || new Date().toISOString().slice(0, 10),
      reference_number: refNum,
      description: `Pengeluaran: ${description}`,
      entity_id,
      status: 'APPROVED',
      created_by: user.id,
      approved_by: user.id
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
      created_by: user.id
    }).select().single()

    if (expErr) throw new Error(`Gagal mencatat pengeluaran: ${expErr.message}`)

    return NextResponse.json({ success: true, data: expense })
  } catch (err: any) {
    console.error('[API /finance/expenses POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * DELETE /api/finance/expenses?id=<expense_id>&reason=<optional>
 * 
 * HUKUM AKUNTANSI: TIDAK pernah melakukan hard delete pada journal_entries.
 * Alur:
 *  1. Ambil expense beserta journal aslinya (termasuk journal lines + akun).
 *  2. Buat Jurnal Reversal (mirror: debit ↔ credit dibalik).
 *  3. Tandai journal asli sebagai is_reversed=true, referensikan reversal journal.
 *  4. Tandai expense sebagai VOID (kolom status).
 */
export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() } } }
    )
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Akses Ditolak: Sesi tidak valid atau telah berakhir.' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const expenseId = searchParams.get('id')
    const reason = searchParams.get('reason') || 'Pembatalan pengeluaran oleh pengguna'

    if (!expenseId) {
      return NextResponse.json({ error: 'Parameter expense id wajib diisi' }, { status: 400 })
    }

    const db = admin()

    // 1. Ambil expense + journal asli + semua journal lines
    const { data: expense, error: expFetchErr } = await db
      .from('expenses')
      .select('*, journal:journal_entries(*, lines:journal_lines(*))')
      .eq('id', expenseId)
      .single()

    if (expFetchErr || !expense) {
      return NextResponse.json({ error: 'Pengeluaran tidak ditemukan' }, { status: 404 })
    }

    // ── ZERO-TRUST: VERIFIKASI ROLE DARI DATABASE ──────────────────────────
    const expenseEntityId = (expense as any).entity_id
    const { data: verifiedRole } = await db
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('entity_id', expenseEntityId)
      .in('role', ['CEO', 'HEAD', 'FINANCE'])
      .limit(1)
      .single()

    if (!verifiedRole) {
      return NextResponse.json(
        { error: 'Manipulasi Terdeteksi: Anda tidak memiliki otoritas untuk membatalkan pengeluaran pada entitas ini.' },
        { status: 403 }
      )
    }

    if ((expense as any).status === 'VOID') {
      return NextResponse.json({ error: 'Pengeluaran ini sudah dibatalkan (VOID)' }, { status: 409 })
    }

    const originalJournal = (expense as any).journal
    if (!originalJournal) {
      return NextResponse.json({ error: 'Jurnal terkait tidak ditemukan' }, { status: 404 })
    }

    if (originalJournal.is_reversed) {
      return NextResponse.json({ error: 'Jurnal ini sudah pernah di-reverse' }, { status: 409 })
    }

    // 2. Buat Jurnal Reversal (flip debit ↔ credit)
    const reversalRef = `REV/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`
    const { data: reversalJournal, error: rjErr } = await db
      .from('journal_entries')
      .insert({
        transaction_date: new Date().toISOString().slice(0, 10),
        reference_number: reversalRef,
        description: `[REVERSAL] ${originalJournal.description} — ${reason}`,
        entity_id: originalJournal.entity_id,
        status: 'APPROVED',
        cancellation_reason: reason,
        created_by: user.id,
        approved_by: user.id,
      })
      .select()
      .single()

    if (rjErr || !reversalJournal) {
      throw new Error(`Gagal membuat jurnal reversal: ${rjErr?.message}`)
    }

    // 3. Insert reversal lines (debit ↔ credit dibalik dari asli)
    const reversalLines = originalJournal.lines.map((line: any) => ({
      journal_id: reversalJournal.id,
      account_id: line.account_id,
      debit: line.credit,   // Flip: kredit asli → debit reversal
      credit: line.debit,   // Flip: debit asli → kredit reversal
    }))

    const { error: rlErr } = await db.from('journal_lines').insert(reversalLines)
    if (rlErr) throw new Error(`Gagal insert reversal lines: ${rlErr.message}`)

    // 4. Tandai jurnal asli sebagai is_reversed, referensikan reversal journal
    const { error: updateJErr } = await db
      .from('journal_entries')
      .update({
        is_reversed: true,
        reversed_journal_id: reversalJournal.id,
        cancellation_reason: reason,
      })
      .eq('id', originalJournal.id)

    if (updateJErr) throw new Error(`Gagal update jurnal asli: ${updateJErr.message}`)

    // 5. Tandai expense sebagai VOID
    const { error: voidErr } = await db
      .from('expenses')
      .update({ status: 'VOID', updated_at: new Date().toISOString() })
      .eq('id', expenseId)

    if (voidErr) throw new Error(`Gagal membatalkan expense: ${voidErr.message}`)

    return NextResponse.json({
      success: true,
      message: 'Pengeluaran berhasil dibatalkan dengan jurnal reversal.',
      reversal_journal_id: reversalJournal.id,
      reversal_reference: reversalRef,
    })
  } catch (err: any) {
    console.error('[API /finance/expenses DELETE]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

