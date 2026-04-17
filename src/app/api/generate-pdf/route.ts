import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { uploadToR2, buildStorageKey } from '@/lib/r2/client'
import { getPresignedUrl } from '@/lib/r2/client'
import { renderToBuffer } from '@react-pdf/renderer'
import { InvoicePDFDocument } from '@/lib/pdf/InvoiceDocument'
import type { Invoice, Entity } from '@/types'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { invoice_id } = await request.json()

  const serviceClient = createServiceClient()
  const { data: invoice, error } = await serviceClient
    .from('invoices')
    .select('*, entity:entities(*)')
    .eq('id', invoice_id)
    .single()

  if (error || !invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (invoice.status !== 'APPROVED') return NextResponse.json({ error: 'Invoice not approved' }, { status: 400 })

  const buffer = await renderToBuffer(InvoicePDFDocument({ invoice: invoice as Invoice & { entity: Entity } }))

  const key = buildStorageKey('invoices', invoice.entity_id, `${invoice.invoice_number ?? invoice.id}.pdf`)
  await uploadToR2(key, buffer, 'application/pdf')
  await serviceClient.from('invoices').update({ pdf_storage_key: key }).eq('id', invoice_id)

  const url = await getPresignedUrl(key, 3600)
  return NextResponse.json({ url, key })
}
