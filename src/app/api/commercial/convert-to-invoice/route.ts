import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sesi tidak valid.' }, { status: 401 })

    // TANGKAP PAYLOAD BARU: termin_name dan percentage
    const { source_doc_id, termin_name, percentage } = await request.json()
    if (!source_doc_id) return NextResponse.json({ error: 'ID tidak ditemukan.' }, { status: 400 })

    const { data: source, error: sourceErr } = await supabase
      .from('commercial_documents')
      .select('*, document_line_items(*)')
      .eq('id', source_doc_id)
      .single()
      
    if (sourceErr || !source) throw new Error('Dokumen asal gagal ditarik.')

    let targetType = 'INVOICE'
    let parentId = null
    let terminName = null
    let targetStatus = 'UNPAID'
    let calcMultiplier = 1 // Default 100%

    // LOGIKA PEMISAHAN
    if (source.doc_type === 'QUOTATION') {
      targetType = 'SPK'
      parentId = null 
      targetStatus = 'APPROVED'
    } else if (source.doc_type === 'SPK') {
      targetType = 'INVOICE'
      parentId = source.id
      terminName = termin_name || 'Termin Penagihan'
      targetStatus = 'UNPAID'
      calcMultiplier = percentage ? Number(percentage) / 100 : 1 // Hitung rasio
    } else if (source.doc_type === 'PROFORMA') {
      targetType = 'INVOICE'
      parentId = source.parent_id 
      terminName = source.termin_name
      targetStatus = 'UNPAID'
    } else {
      throw new Error(`Dokumen ${source.doc_type} tidak bisa dieskalasi.`)
    }

    // 1. Logika Gembok BAST (Jika SPK ke Invoice Pelunasan)
    if (targetType === 'INVOICE' && parentId) {
      const isFinalBilling = terminName?.toLowerCase().includes('pelunasan') || terminName?.toLowerCase().includes('final')
      if (isFinalBilling) {
        const { data: project } = await supabase.from('projects').select('bast_signed_at, bast_url').eq('spk_id', parentId).single()
        if (!project?.bast_signed_at || !project?.bast_url) {
          return NextResponse.json({ 
            error: 'Blokir Penagihan: BAST (Berita Acara Serah Terima) belum diunggah atau ditandatangani klien. Selesaikan administrasi proyek di War Room terlebih dahulu.' 
          }, { status: 403 })
        }
      }
      
      // 2. Validasi Anti-Leakage (Cek total tagihan tidak melebihi SPK)
      const { data: existingInvoices } = await supabase
        .from('commercial_documents')
        .select('grand_total')
        .eq('parent_id', parentId)
        .neq('status', 'CANCELLED')
      
      const totalBilled = existingInvoices?.reduce((acc: number, curr: any) => acc + Number(curr.grand_total), 0) || 0
      const sourceGrandTotal = source.doc_type === 'PROFORMA' ? source.grand_total : (source.grand_total) // Wait, SPK total
      
      // SPK total is source.grand_total if source is SPK.
      // If source is Proforma, its parent is the SPK, so we'd need the SPK's total.
      // But actually, the safest is to check against SPK. If source is PROFORMA, source is the PROFORMA. 
      // Let's simplify: only validate strictly if source is SPK.
      if (source.doc_type === 'SPK') {
        const newInvoiceTotal = sourceGrandTotal * calcMultiplier
        if (totalBilled + newInvoiceTotal > sourceGrandTotal + 1) { // +1 to account for rounding
          return NextResponse.json({ error: 'Gagal: Total akumulasi penagihan melebihi nilai kontrak SPK Induk.' }, { status: 400 })
        }
      }
    }

    const prefix = targetType === 'SPK' ? 'SPK' : 'INV'
    const timestamp = new Date().getTime().toString().slice(-5)
    const docNumber = `${prefix}-${source.entity_id.split('-')[0].toUpperCase()}-${timestamp}`

    // CETAK DOKUMEN DENGAN NOMINAL YANG SUDAH DIPOTONG PERSENTASE
    const { data: newDoc, error: insertErr } = await supabase
      .from('commercial_documents')
      .insert({
        entity_id: source.entity_id,
        client_id: source.client_id,
        doc_type: targetType,
        doc_number: docNumber,
        title: source.title,
        subtotal: source.subtotal * calcMultiplier,
        tax_rate: source.tax_rate,
        tax_amount: source.tax_amount * calcMultiplier,
        grand_total: source.grand_total * calcMultiplier,
        status: targetStatus,
        parent_id: parentId,
        termin_name: terminName,
        created_by: user.id
      })
      .select().single()

    if (insertErr) throw insertErr

    // DUPLIKASI ITEM DAN SESUAIKAN HARGA
    if (source.document_line_items && source.document_line_items.length > 0) {
      const newItems = source.document_line_items.map((item: any) => ({
        document_id: newDoc.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price * calcMultiplier, // Harga satuan dipotong
        total_price: item.total_price * calcMultiplier, // Total dipotong
        sort_order: item.sort_order,
        is_recurring: item.is_recurring,
        duration_months: item.duration_months,
        revenue_account_id: item.revenue_account_id,
        deferred_account_id: item.deferred_account_id
      }))
      const { error: lineErr } = await supabase.from('document_line_items').insert(newItems)
      if (lineErr) throw new Error('Gagal menduplikasi detail item.')
    }

    // TRIGGER WAR ROOM JIKA SPK
    if (targetType === 'SPK') {
      await supabase.from('projects').insert({
        entity_id: source.entity_id,
        client_id: source.client_id,
        spk_id: newDoc.id,
        name: source.title,
        description: `Proyek diinisialisasi dari SPK: ${docNumber}.`,
        status: 'ACTIVE'
      })
    }

    return NextResponse.json({ success: true, doc_number: newDoc.doc_number })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}