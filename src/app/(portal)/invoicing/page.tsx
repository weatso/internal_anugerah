'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { Plus, FileText, Download, CheckCircle2 } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'

export default function DocumentListPage() {
  const { profile } = useUser()
  const supabase = createClient()
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDocs() {
      // CEO lihat semua, Head hanya lihat divisi miliknya
      let query = supabase.from('commercial_documents')
        .select('*, clients(company_name), entities(name)')
        .order('created_at', { ascending: false })
      
      if (profile?.role !== 'CEO' && profile?.role !== 'FINANCE') {
        query = query.eq('entity_id', profile?.entity_id)
      }

      const { data } = await query
      if (data) setDocuments(data)
      setLoading(false)
    }
    fetchDocs()
  }, [profile])

  const openPdf = (id: string) => {
    window.open(`/api/generate-pdf?id=${id}`, '_blank')
  }

  if (loading) return <div className="p-8 text-gray-500 text-xs font-mono">Memuat Arsip Dokumen...</div>

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <p className="text-[#C5A028] text-xs uppercase tracking-[0.3em] font-bold mb-1">Commercial Hub</p>
          <h1 className="text-white text-2xl font-black tracking-tighter">Arsip Dokumen Komersial</h1>
        </div>
        <Link href="/invoicing/create" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Buat Dokumen Baru
        </Link>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#0A0A0A] border-b border-white/5 text-[10px] uppercase tracking-widest font-bold text-gray-400">
            <tr>
              <th className="px-6 py-4">No. Dokumen</th>
              <th className="px-6 py-4">Klien / Perihal</th>
              <th className="px-6 py-4">Divisi</th>
              <th className="px-6 py-4 text-right">Nilai Tagihan</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {documents.map(doc => (
              <tr key={doc.id} className="hover:bg-white/[0.02]">
                <td className="px-6 py-4">
                  <p className="font-mono text-[#C5A028] text-xs">{doc.doc_number}</p>
                  <p className="text-[10px] text-gray-500">{new Date(doc.issue_date).toLocaleDateString('id-ID')}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-bold text-white mb-0.5">{doc.clients?.company_name}</p>
                  <p className="text-gray-400 text-xs">{doc.title}</p>
                </td>
                <td className="px-6 py-4 text-xs text-gray-400">{doc.entities?.name}</td>
                <td className="px-6 py-4 text-right font-mono font-bold text-white">{formatRupiah(doc.grand_total)}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`text-[9px] px-2 py-1 rounded-sm uppercase tracking-widest font-bold ${doc.status === 'DRAFT' ? 'bg-white/10 text-white' : doc.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                    {doc.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => openPdf(doc.id)} className="text-[#C5A028] hover:text-white bg-[#C5A028]/10 p-2 rounded-sm transition-colors" title="Lihat PDF">
                    <FileText size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}