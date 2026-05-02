import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    // ── 1. VERIFIKASI SESI ────────────────────────────────────────────────
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() } } }
    )
    const { data: { session } } = await supabaseAuth.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized: Missing Session' }, { status: 401 })

    // ── 2. VERIFIKASI PROFIL & OTORITAS ────────────────────────────────────
    const { data: profile } = await supabaseAuth
      .from('profiles')
      .select('*, user_roles(role, entity_id)')
      .eq('id', session.user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // Tentukan highest role dari profiles.roles (legacy) atau user_roles (baru)
    const legacyRoles: string[] = profile.roles || []
    const assignedRoles: string[] = (profile.user_roles || []).map((r: any) => r.role)
    const allRoles = [...new Set([...legacyRoles, ...assignedRoles])]
    const isCEO = allRoles.includes('CEO')
    const isFinance = allRoles.includes('FINANCE')
    const isHead = allRoles.includes('HEAD')

    if (!isCEO && !isFinance && !isHead) {
      return NextResponse.json({ error: 'Forbidden: Insufficient Privileges' }, { status: 403 })
    }

    // ── 3. PARSE PAYLOAD ───────────────────────────────────────────────────
    const body = await request.json()
    const { type, amount, bank_account_id, category_id, description, transaction_date, proof_storage_key, entity_id } = body

    if (!amount || Number(amount) <= 0 || !bank_account_id || !category_id) {
      return NextResponse.json({ error: 'Data transaksi tidak lengkap' }, { status: 400 })
    }
    if (type !== 'INCOME' && type !== 'EXPENSE') {
      return NextResponse.json({ error: 'Invalid transaction type. Use INCOME or EXPENSE.' }, { status: 400 })
    }

    // Entity: gunakan entity_id dari payload (CEO bisa pilih), atau fallback ke entity user
    const targetEntityId = entity_id || profile.entity_id ||
      (profile.user_roles?.[0]?.entity_id ?? null)

    // ── 4. TENTUKAN STATUS APPROVAL ────────────────────────────────────────
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    let finalStatus = 'PENDING_APPROVAL'
    let approvedBy: string | null = null

    if (isCEO || isFinance) {
      finalStatus = 'APPROVED'
      approvedBy = session.user.id
    } else if (isHead && type === 'EXPENSE') {
      // Head: cek limit divisi
      const { data: divSetting } = await db
        .from('division_financial_settings')
        .select('*')
        .eq('entity_id', targetEntityId)
        .single()

      if (divSetting) {
        const now = new Date()
        const lastReset = new Date(divSetting.last_reset_month)
        let usage = divSetting.current_month_usage
        if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
          usage = 0
        }
        if ((Number(usage) + Number(amount)) <= Number(divSetting.monthly_auto_approve_limit)) {
          finalStatus = 'APPROVED'
          approvedBy = session.user.id
          await db.from('division_financial_settings').update({
            current_month_usage: Number(usage) + Number(amount),
            last_reset_month: now.toISOString(),
          }).eq('entity_id', targetEntityId)
        }
      }
    }

    // ── 5. DOUBLE-ENTRY: TENTUKAN DEBIT & KREDIT ──────────────────────────
    let debitAccountId: string
    let creditAccountId: string

    if (type === 'INCOME') {
      debitAccountId = bank_account_id    // Bank bertambah → Debit
      creditAccountId = category_id       // Pendapatan bertambah → Credit
    } else {
      debitAccountId = category_id        // Biaya bertambah → Debit
      creditAccountId = bank_account_id   // Bank berkurang → Credit
    }

    // ── 6. INSERT JOURNAL ENTRY ────────────────────────────────────────────
    const refNumber = `TRX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`

    const { data: journal, error: journalError } = await db.from('journal_entries').insert({
      entity_id: targetEntityId,
      transaction_date: transaction_date || new Date().toISOString().slice(0, 10),
      reference_number: refNumber,
      description,
      proof_storage_key: proof_storage_key || null,
      status: finalStatus,
      created_by: session.user.id,
      approved_by: approvedBy,
    }).select().single()

    if (journalError) throw journalError

    // ── 7. INSERT JOURNAL LINES (Double-Entry enforced) ───────────────────
    const journalLines = [
      { journal_id: journal.id, account_id: debitAccountId,  debit: Number(amount), credit: 0 },
      { journal_id: journal.id, account_id: creditAccountId, debit: 0, credit: Number(amount) },
    ]

    // Validasi balance (wajib)
    const totalDebit  = journalLines.reduce((s, l) => s + l.debit, 0)
    const totalCredit = journalLines.reduce((s, l) => s + l.credit, 0)
    if (totalDebit !== totalCredit) {
      await db.from('journal_entries').delete().eq('id', journal.id) // rollback
      throw new Error('FATAL: Jurnal tidak seimbang — double-entry violation.')
    }

    const { error: lineError } = await db.from('journal_lines').insert(journalLines)
    if (lineError) {
      await db.from('journal_entries').delete().eq('id', journal.id) // rollback
      throw lineError
    }

    return NextResponse.json({
      success: true,
      message: `Transaksi ${type} berhasil dicatat`,
      journal_id: journal.id,
      status: finalStatus,
    })

  } catch (error: any) {
    console.error('[API /finance/transaction]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}