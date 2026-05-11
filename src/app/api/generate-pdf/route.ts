import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { renderToStream } from '@react-pdf/renderer'
import { CommercialDocumentPDF } from '@/lib/pdf/InvoiceDocument'
import React from 'react'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() } } }
    )
    const { data: { session } } = await supabaseAuth.auth.getSession()

    const { searchParams } = new URL(request.url)
    const docId = searchParams.get('id')
    const token = searchParams.get('token')

    if (!docId) return new NextResponse('Document ID is required', { status: 400 })

    if (!session && !token) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    if (!session && token) {
      const { data: project } = await db
        .from('projects')
        .select('invoice_id')
        .eq('magic_link_token', token)
        .single()
      if (!project || project.invoice_id !== docId) {
        return new NextResponse('Forbidden: Token tidak valid', { status: 403 })
      }
    }

    // ALIAS DITAMBAHKAN DI SINI: items:document_line_items(*)
    // Ini memastikan data bisa dibaca oleh PDF Template
    const { data: document, error } = await db
      .from('commercial_documents')
      .select('*, entities(name, type, primary_color, logo_key), clients(*), items:document_line_items(*)')
      .eq('id', docId)
      .single()

    if (error || !document) return new NextResponse('Document not found', { status: 404 })

    const pdfComponent = React.createElement(CommercialDocumentPDF, { data: document }) as any
    const stream = await renderToStream(pdfComponent)

    const chunks: Uint8Array[] = []
    for await (const chunk of stream as any) {
      chunks.push(Buffer.from(chunk))
    }
    const pdfBuffer = Buffer.concat(chunks)

    // FORMAT PENAMAAN FILE DINAMIS
    const cleanStr = (str: string) => (str || '').replace(/[^a-zA-Z0-9]/g, '_')
    const docType = document.doc_type || 'DOC'
    const divName = document.entities?.name || 'Divisi'
    const clientName = document.clients?.company_name || 'Client'
    const dateStr = document.issue_date ? new Date(document.issue_date).toLocaleDateString('id-ID').replace(/\//g, '-') : 'Date'
    
    // Hasil: Quotation_Weatso_UD_Dokar_11-5-2026.pdf
    const fileName = `${docType}_${cleanStr(divName)}_${cleanStr(clientName)}_${dateStr}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
      },
    })
  } catch (error: any) {
    console.error('[API /generate-pdf]', error)
    return new NextResponse('Error generating PDF', { status: 500 })
  }
}