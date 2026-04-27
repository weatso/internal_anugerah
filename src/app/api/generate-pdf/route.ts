import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { renderToStream } from '@react-pdf/renderer';
import { CommercialDocumentPDF } from '@/lib/pdf/InvoiceDocument';
import React from 'react';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('id');

    if (!docId) return new NextResponse('Document ID is required', { status: 400 });

    const supabase = await createClient();

    // Tarik Semua Data Bersarang (Nested)
    const { data: document, error } = await supabase
      .from('commercial_documents')
      .select(`
        *,
        entities (name, type, primary_color, logo_key),
        clients (*),
        document_line_items (*)
      `)
      .eq('id', docId)
      .single();

    if (error || !document) return new NextResponse('Document not found', { status: 404 });

    // FIX 1: Memaksa TypeScript menerima elemen React di dalam file .ts
    const pdfComponent = React.createElement(CommercialDocumentPDF, { data: document }) as any;
    const stream = await renderToStream(pdfComponent);
    
    // FIX 2: Menyeragamkan semua potongan aliran data menjadi Buffer murni
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as any) {
      chunks.push(Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${document.doc_number.replace(/\//g, '_')}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("PDF Generation Error:", error);
    return new NextResponse('Error generating PDF', { status: 500 });
  }
}