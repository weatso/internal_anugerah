import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { renderToStream } from '@react-pdf/renderer'
import { CommercialDocumentPDF } from '@/lib/pdf/InvoiceDocument'
import React from 'react'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  try {
    // ── VERIFIKASI SESI ─────────────────────────────────────────────────────
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() } } }
    )
    const { data: { session } } = await supabaseAuth.auth.getSession()

    const { searchParams } = new URL(request.url)
    const docId = searchParams.get('id')
    const token = searchParams.get('token') // public access via client portal token

    if (!docId) return new NextResponse('Document ID is required', { status: 400 })

    // Allow access if: logged-in user OR valid public portal token
    if (!session && !token) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Use service role to fetch doc (bypass RLS — we handle auth above)
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // If accessed via token, validate the token matches a project linked to this invoice
    if (!session && token) {
      const { data: project } = await db
        .from('projects')
        .select('invoice_id')
        .eq('magic_link_token', token)
        .single()
      if (!project || project.invoice_id !== docId) {
        return new NextResponse('Forbidden: Token tidak valid untuk dokumen ini', { status: 403 })
      }
    }

    const { data: document, error } = await db
      .from('commercial_documents')
      .select('*, entities(name, type, primary_color, logo_key), clients(*), document_line_items(*)')
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

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${document.doc_number.replace(/\//g, '_')}.pdf"`,
      },
    })
  } catch (error: any) {
    console.error('[API /generate-pdf]', error)
    return new NextResponse('Error generating PDF', { status: 500 })
  }
}