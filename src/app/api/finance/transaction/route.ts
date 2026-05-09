import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    // ── 1. VERIFIKASI SESI (ZERO-TRUST: getUser, bukan getSession) ──────────
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() } } }
    )
    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Akses Ditolak: Sesi tidak valid atau telah berakhir.' }, { status: 401 })

    // ── 2. PARSE PAYLOAD ─────────────────────────────────────────────────
    const body = await request.json()
    const { type, amount, bank_account_id, category_id, description, transaction_date, proof_storage_key, entity_id } = body

    if (!amount || Number(amount) <= 0 || !bank_account_id || !category_id) {
      return NextResponse.json({ error: 'Data transaksi tidak lengkap' }, { status: 400 })
    }
    if (type !== 'INCOME' && type !== 'EXPENSE') {
      return NextResponse.json({ error: 'Invalid transaction type. Use INCOME or EXPENSE.' }, { status: 400 })
    }

    // Entity: gunakan entity_id dari payload, atau fallback
    const { data: userProfile } = await supabaseAuth
      .from('profiles')
      .select('entity_id')
      .eq('id', user.id)
      .single()

    const targetEntityId = entity_id || userProfile?.entity_id || null
    if (!targetEntityId) {
      return NextResponse.json({ error: 'Entity ID tidak ditemukan. Pilih divisi terlebih dahulu.' }, { status: 400 })
    }

    // ── 3. ZERO-TRUST: VERIFIKASI ROLE DARI DATABASE ───────────────────────
    //    Jangan percaya cookie. Cek apakah user benar-benar punya role yang sah.
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: verifiedRoles } = await db
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('entity_id', targetEntityId)

    const userRoles = (verifiedRoles || []).map((r: any) => r.role)
    const isCEO = userRoles.includes('CEO')
    const isFinance = userRoles.includes('FINANCE')
    const isHead = userRoles.includes('HEAD')

    if (!isCEO && !isFinance && !isHead) {
      return NextResponse.json(
        { error: 'Manipulasi Terdeteksi: Anda tidak memiliki otoritas pada entitas ini.' },
        { status: 403 }
      )
    }

    // ── 4. TENTUKAN STATUS APPROVAL ────────────────────────────────────────
    let finalStatus = 'PENDING_APPROVAL'
    let approvedBy: string | null = null

    if (isCEO || isFinance) {
      finalStatus = 'APPROVED'
      approvedBy = user.id
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
          approvedBy = user.id
          await db.from('division_financial_settings').update({
            current_month_usage: Number(usage) + Number(amount),
            last_reset_month: now.toISOString(),
          }).eq('entity_id', targetEntityId)
        }
      }
    }

    // ── 5. VALIDASI AKUN COA SEBELUM JURNAL ──────────────────────────────
    // Pastikan kedua akun ada di master data agar tidak error PGRST116
    const { data: bankAccount, error: bankErr } = await db
      .from('chart_of_accounts')
      .select('id, account_name')
      .eq('id', bank_account_id)
      .eq('is_active', true)
      .single()

    if (bankErr || !bankAccount) {
      return NextResponse.json({
        error: 'Gagal: Akun bank/rekening tidak ditemukan di Master COA. Pastikan akun sudah terdaftar dan aktif.'
      }, { status: 400 })
    }

    const { data: categoryAccount, error: catErr } = await db
      .from('chart_of_accounts')
      .select('id, account_name')
      .eq('id', category_id)
      .eq('is_active', true)
      .single()

    if (catErr || !categoryAccount) {
      return NextResponse.json({
        error: 'Gagal: Akun kategori tidak ditemukan di Master COA. Pastikan akun sudah terdaftar dan aktif.'
      }, { status: 400 })
    }

    // ── 6. DOUBLE-ENTRY: TENTUKAN DEBIT & KREDIT ──────────────────────────
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
      created_by: user.id,
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

    // Tangkap error Supabase/Postgres umum dan berikan pesan manusiawi
    const msg = error?.message || 'Terjadi kesalahan tidak terduga'
    const code = error?.code || ''

    if (code === 'PGRST116') {
      return NextResponse.json({ error: 'Gagal: Akun kategori tidak ditemukan di Master COA. Pastikan data sudah diisi di Master Data.' }, { status: 400 })
    }
    if (code === '23503') {
      return NextResponse.json({ error: 'Gagal: Referensi data tidak valid. Pastikan semua ID akun dan entitas benar.' }, { status: 400 })
    }
    if (code === '23505') {
      return NextResponse.json({ error: 'Gagal: Nomor referensi jurnal duplikat. Silakan coba lagi.' }, { status: 409 })
    }

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}