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
      .select('roles, entity_id, user_roles(role, entity_id)')
      .eq('id', session.user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const legacyRoles: string[] = profile.roles || []
    const assignedRoles: string[] = (profile.user_roles || []).map((r: any) => r.role)
    const allRoles = [...new Set([...legacyRoles, ...assignedRoles])]
    const isCEO = allRoles.includes('CEO')
    const isFinance = allRoles.includes('FINANCE')
    const isHead = allRoles.includes('HEAD')

    if (!isCEO && !isFinance && !isHead) {
      return NextResponse.json({ error: 'Forbidden: Hanya CEO, Finance, atau Head yang dapat menyetujui transfer pricing' }, { status: 403 })
    }

    // ── 3. PARSE PAYLOAD ───────────────────────────────────────────────────
    const { billing_id, expense_account_id } = await request.json()
    if (!billing_id || !expense_account_id) {
      return NextResponse.json({ error: 'billing_id dan expense_account_id diperlukan' }, { status: 400 })
    }

    // ── 4. GUNAKAN SERVICE ROLE UNTUK DB OPERATIONS ────────────────────────
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 5. Ambil data tagihan
    const { data: billing, error: billErr } = await db
      .from('internal_billings')
      .select('*')
      .eq('id', billing_id)
      .single()

    if (billErr || !billing) return NextResponse.json({ error: 'Tagihan tidak ditemukan' }, { status: 404 })
    if (billing.status !== 'PENDING_APPROVAL') {
      return NextResponse.json({ error: 'Tagihan sudah diproses sebelumnya' }, { status: 400 })
    }

    // 6. Verifikasi otoritas terhadap tagihan spesifik ini
    const userEntityIds = (profile.user_roles || []).map((r: any) => r.entity_id)
    const canApprove = isCEO || isFinance || userEntityIds.includes(billing.to_entity_id) || profile.entity_id === billing.to_entity_id
    if (!canApprove) {
      return NextResponse.json({ error: 'Anda tidak memiliki otoritas menyetujui tagihan ini' }, { status: 403 })
    }

    // 7. Update status billing
    await db.from('internal_billings').update({
      status: 'APPROVED',
      approved_by: session.user.id,
    }).eq('id', billing_id)

    // 8. Buat Journal Entry (Double-Entry)
    const refNumber = `TP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`

    const { data: journal, error: journalError } = await db.from('journal_entries').insert({
      entity_id: billing.to_entity_id,
      transaction_date: new Date().toISOString().slice(0, 10),
      reference_number: refNumber,
      description: `Internal Billing (Transfer Pricing): ${billing.description}`,
      status: 'APPROVED',
      created_by: billing.created_by,
      approved_by: session.user.id,
    }).select().single()

    if (journalError) throw journalError

    // 9. Journal Lines Double-Entry
    // Debit: Beban di divisi yang ditagih (to_entity)
    // Credit: Pendapatan di divisi yang menagih (from_entity via revenue_account_id)
    const journalLines = [
      { journal_id: journal.id, account_id: expense_account_id,       debit: billing.amount, credit: 0 },
      { journal_id: journal.id, account_id: billing.revenue_account_id, debit: 0, credit: billing.amount },
    ]

    const { error: lineErr } = await db.from('journal_lines').insert(journalLines)
    if (lineErr) {
      await db.from('journal_entries').delete().eq('id', journal.id) // rollback
      throw lineErr
    }

    // 10. Update linked_journal_id di internal_billings
    await db.from('internal_billings').update({ linked_journal_id: journal.id }).eq('id', billing_id)

    return NextResponse.json({ success: true, message: 'Transfer Pricing disetujui dan dibukukan.', journal_id: journal.id })

  } catch (error: any) {
    console.error('[API /finance/transfer-pricing/approve]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}