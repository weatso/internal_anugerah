import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sesi tidak valid.' }, { status: 401 })

    const { source_doc_id } = await request.json()
    if (!source_doc_id) return NextResponse.json({ error: 'ID SPK asal tidak ditemukan.' }, { status: 400 })

    const { data: source, error: sourceErr } = await supabase
      .from('commercial_documents')
      .select('*, document_line_items(*)')
      .eq('id', source_doc_id)
      .single()
      
    if (sourceErr || !source) throw new Error('Dokumen SPK asal gagal ditarik.')
    if (source.doc_type !== 'SPK') throw new Error('Change Request hanya bisa dibuat dari dokumen SPK.')

    const timestamp = new Date().getTime().toString().slice(-5)
    const docNumber = `CR-${source.entity_id.split('-')[0].toUpperCase()}-${timestamp}`

    // Buat Dokumen CR
    const { data: newDoc, error: insertErr } = await supabase
      .from('commercial_documents')
      .insert({
        entity_id: source.entity_id,
        client_id: source.client_id,
        doc_type: 'CR',
        doc_number: docNumber,
        title: `[CR] ${source.title}`,
        subtotal: 0, // Dikosongkan agar bisa diisi item baru
        tax_rate: source.tax_rate,
        tax_amount: 0,
        grand_total: 0,
        status: 'DRAFT',
        parent_id: source.id,
        termin_name: 'Change Request',
        created_by: user.id
      })
      .select().single()

    if (insertErr) throw insertErr

    // Catat otomatis ke Project Tasks
    // Ambil project yang terkait dengan SPK ini
    const { data: project } = await supabase.from('projects').select('id').eq('spk_id', source.id).single()
    if (project) {
      await supabase.from('project_tasks').insert({
        project_id: project.id,
        title: `Evaluasi & Eksekusi Change Request: ${docNumber}`,
        description: 'Klien mengajukan permintaan perubahan (Change Request). Harap periksa ruang lingkup baru dan ajukan penagihan tambahan.',
        status: 'TODO',
        priority: 'HIGH',
        sort_order: 999
      })
    }

    return NextResponse.json({ success: true, doc_number: newDoc.doc_number })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
