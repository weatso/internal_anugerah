import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ApprovalStatus } from '@/types'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('*, entity:entities(*)').eq('id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const body = await request.json()
    const { type, amount, description, bank_account_id, category_id, proof_storage_key, transaction_date } = body

    if (!amount || amount <= 0) return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })
    if (!bank_account_id || !category_id) return NextResponse.json({ error: 'Bank and Category are required' }, { status: 400 })

    const txDate = transaction_date || new Date().toISOString().split('T')[0]

    // Generate Reference Number
    const dateStr = txDate.replace(/-/g, '').slice(0, 6) // YYYYMM
    const refPrefix = type === 'EXPENSE' ? `OUT-${dateStr}` : `IN-${dateStr}`
    const refNumber = `${refPrefix}-${Math.floor(1000 + Math.random() * 9000)}`

    let status: ApprovalStatus = 'PENDING_APPROVAL'
    let approved_by = null

    if (type === 'INCOME') {
      if (profile.role === 'CEO' || profile.role === 'FINANCE') {
        status = 'APPROVED'
        approved_by = profile.id
      } else {
        status = 'PENDING_APPROVAL'
      }
    } else if (type === 'EXPENSE') {
      if (profile.role === 'CEO') {
        status = 'APPROVED'
        approved_by = profile.id
      } else if (profile.role === 'HEAD') {
        // Check Limit
        const { data: limitSettings } = await supabase.from('division_financial_settings').select('*').eq('entity_id', profile.entity_id).single()
        
        if (limitSettings) {
          const now = new Date()
          const lastReset = new Date(limitSettings.last_reset_month)
          
          let currentUsage = Number(limitSettings.current_month_usage)
          
          // Reset logic if month changed
          if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
             currentUsage = 0
          }

          if (currentUsage + Number(amount) <= Number(limitSettings.monthly_auto_approve_limit)) {
            status = 'APPROVED'
            approved_by = profile.id
            // Update usage
            await supabase.from('division_financial_settings').update({
              current_month_usage: currentUsage + Number(amount),
              last_reset_month: now.toISOString().split('T')[0]
            }).eq('entity_id', profile.entity_id)
          } else {
            status = 'PENDING_APPROVAL'
          }
        } else {
          status = 'PENDING_APPROVAL'
        }
      } else {
        status = 'PENDING_APPROVAL' // STAFF
      }
    }

    // 1. Create Header
    const { data: header, error: headerErr } = await supabase.from('journal_entries').insert({
      transaction_date: txDate,
      reference_number: refNumber,
      description,
      entity_id: profile.entity_id,
      proof_storage_key,
      status,
      created_by: profile.id,
      approved_by
    }).select().single()

    if (headerErr) throw headerErr

    // 2. Create Lines
    let debitAccount = ''
    let creditAccount = ''

    if (type === 'INCOME') {
      debitAccount = bank_account_id // Asset increases (Debit)
      creditAccount = category_id // Revenue increases (Credit)
    } else if (type === 'EXPENSE') {
      debitAccount = category_id // Expense increases (Debit)
      creditAccount = bank_account_id // Asset decreases (Credit)
    }

    const { error: linesErr } = await supabase.from('journal_lines').insert([
      { journal_id: header.id, account_id: debitAccount, debit: amount, credit: 0 },
      { journal_id: header.id, account_id: creditAccount, debit: 0, credit: amount }
    ])

    if (linesErr) {
       await supabase.from('journal_entries').delete().eq('id', header.id)
       throw linesErr
    }

    return NextResponse.json({ success: true, data: header })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
