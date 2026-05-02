import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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

    const { source_doc_id } = await req.json()
    if (!source_doc_id) return NextResponse.json({ error: 'source_doc_id diperlukan' }, { status: 400 })

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Fetch source document + line items
    const { data: source, error: sErr } = await db
      .from('commercial_documents')
      .select('*, document_line_items(*)')
      .eq('id', source_doc_id)
      .single()
    if (sErr || !source) return NextResponse.json({ error: 'Dokumen asal tidak ditemukan' }, { status: 404 })
    if (source.doc_type === 'INVOICE') return NextResponse.json({ error: 'Dokumen ini sudah berupa Invoice' }, { status: 400 })

    // 2. Generate new invoice number
    const divCode = source.doc_number.split('/')[1] || 'AV'
    const newDocNumber = `INV/${divCode}/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`

    // 3. Duplicate document as INVOICE
    const { data: newDoc, error: nErr } = await db.from('commercial_documents').insert({
      entity_id: source.entity_id,
      client_id: source.client_id,
      doc_type: 'INVOICE',
      doc_number: newDocNumber,
      title: source.title,
      content_blocks: source.content_blocks,
      subtotal: source.subtotal,
      tax_rate: source.tax_rate,
      tax_amount: source.tax_amount,
      grand_total: source.grand_total,
      status: 'DRAFT',
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: source.due_date,
      created_by: session.user.id,
    }).select().single()
    if (nErr || !newDoc) throw new Error(`Gagal membuat invoice: ${nErr?.message}`)

    // 4. Duplicate line items
    const lineItems = source.document_line_items || []
    if (lineItems.length > 0) {
      await db.from('document_line_items').insert(
        lineItems.map((item: any, idx: number) => ({
          document_id: newDoc.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          original_price: item.original_price,
          discount_amount: item.discount_amount,
          is_recurring: item.is_recurring,
          duration_months: item.duration_months,
          revenue_account_id: item.revenue_account_id,
          deferred_account_id: item.deferred_account_id,
          sort_order: idx,
        }))
      )
    }

    return NextResponse.json({ success: true, new_doc_id: newDoc.id, doc_number: newDocNumber })
  } catch (err: any) {
    console.error('[API /commercial/convert-to-invoice]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
