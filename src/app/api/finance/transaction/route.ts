import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const body = await request.json()
    // Menangkap payload persis seperti yang dikirim oleh Frontend LAMA Anda
    const { type, amount, bank_account_id, category_id, description, transaction_date, proof_storage_key } = body

    if (!amount || amount <= 0 || !bank_account_id || !category_id) {
      return NextResponse.json({ error: 'Data transaksi tidak lengkap' }, { status: 400 })
    }

    // 1. TENTUKAN STATUS & LIMIT 5 JUTA UNTUK HEAD (Hanya untuk Pengeluaran)
    let finalStatus = 'PENDING_APPROVAL'
    let approvedBy = null

    if (profile.role === 'CEO' || profile.role === 'FINANCE') {
      finalStatus = 'APPROVED'
      approvedBy = profile.id
    } else if (profile.role === 'HEAD' && type === 'EXPENSE') {
      const { data: divSetting } = await supabase
        .from('division_financial_settings')
        .select('*')
        .eq('entity_id', profile.entity_id)
        .single()

      if (divSetting) {
        const now = new Date()
        const lastReset = new Date(divSetting.last_reset_month)
        let currentUsage = divSetting.current_month_usage

        if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
          currentUsage = 0 // Reset bulan baru
        }

        if ((Number(currentUsage) + Number(amount)) <= Number(divSetting.monthly_auto_approve_limit)) {
          finalStatus = 'APPROVED'
          approvedBy = profile.id
          
          await supabase.from('division_financial_settings').update({
            current_month_usage: Number(currentUsage) + Number(amount),
            last_reset_month: now.toISOString()
          }).eq('entity_id', profile.entity_id)
        }
      }
    } else if (type === 'INCOME') {
      // Pemasukan oleh HEAD otomatis PENDING sampai dikonfirmasi FINANCE bahwa uang benar masuk bank
      finalStatus = 'PENDING_APPROVAL'
    }

    // 2. GENERATE NOMOR JURNAL
    const refNumber = `JRN-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(1000 + Math.random() * 9000)}`

    // 3. INSERT HEADER JURNAL (Termasuk bukti struk dari Frontend)
    const { data: journal, error: journalError } = await supabase.from('journal_entries').insert({
      entity_id: profile.entity_id,
      transaction_date: transaction_date || new Date().toISOString(),
      reference_number: refNumber,
      description: description,
      proof_storage_key: proof_storage_key, // Menangkap URL gambar
      status: finalStatus,
      created_by: profile.id,
      approved_by: approvedBy
    }).select().single()

    if (journalError) throw journalError

    // 4. TRANSLASI KE DOUBLE-ENTRY KAP LOGIC
    let journalLines = []
    
    if (type === 'EXPENSE') {
      // Uang Keluar: Kategori/Biaya bertambah (Debit), Bank berkurang (Credit)
      journalLines = [
        { journal_id: journal.id, account_id: category_id, debit: amount, credit: 0 },
        { journal_id: journal.id, account_id: bank_account_id, debit: 0, credit: amount }
      ]
    } else {
      // Uang Masuk: Bank bertambah (Debit), Pendapatan bertambah (Credit)
      journalLines = [
        { journal_id: journal.id, account_id: bank_account_id, debit: amount, credit: 0 },
        { journal_id: journal.id, account_id: category_id, debit: 0, credit: amount }
      ]
    }

    // 5. VALIDASI KESEIMBANGAN MUTLAK
    const totalDebit = journalLines.reduce((sum, line) => sum + line.debit, 0)
    const totalCredit = journalLines.reduce((sum, line) => sum + line.credit, 0)
    
    if (totalDebit !== totalCredit) {
      await supabase.from('journal_entries').delete().eq('id', journal.id)
      throw new Error('FATAL: Jurnal tidak seimbang.')
    }

    const { error: lineError } = await supabase.from('journal_lines').insert(journalLines)
    if (lineError) throw lineError

    return NextResponse.json({ success: true, message: 'Transaksi berhasil dicatat', journal_id: journal.id })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}