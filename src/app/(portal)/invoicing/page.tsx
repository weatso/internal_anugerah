'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { formatRupiah, formatDate, getStatusColor, getStatusLabel, cn } from '@/lib/utils'
import { Plus, Download, Share2, CheckCircle, Loader2, FileText } from 'lucide-react'
import type { Invoice } from '@/types'
import Link from 'next/link'

export default function InvoicingPage() {
  const { profile } = useUser()
  const supabase = createClient()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null)

  async function fetchInvoices() {
    setLoading(true)
    let q = supabase.from('invoices')
      .select('*, entity:entities(id,name,type,logo_key,primary_color), creator:profiles!invoices_created_by_fkey(id,full_name,role,entity_id)')
      .order('created_at', { ascending: false })
    if (filterStatus !== 'ALL') q = q.eq('status', filterStatus)
    const { data } = await q
    setInvoices((data ?? []) as Invoice[])
    setLoading(false)
  }

  useEffect(() => { if (profile) fetchInvoices() }, [profile, filterStatus])

  async function handleApprove(invoice: Invoice) {
    await supabase.from('invoices').update({
      status: 'APPROVED',
      approved_by: profile!.id,
      approved_at: new Date().toISOString(),
    }).eq('id', invoice.id)
    fetchInvoices()
  }

  async function handleGeneratePdf(invoice: Invoice) {
    setGeneratingPdf(invoice.id)
    const res = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice_id: invoice.id }),
    })
    const { url } = await res.json()
    if (url) window.open(url, '_blank')
    setGeneratingPdf(null)
    fetchInvoices()
  }

  async function shareWhatsapp(invoice: Invoice) {
    if (!invoice.pdf_storage_key) {
      await handleGeneratePdf(invoice)
      return
    }
    const res = await fetch('/api/storage/presigned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: invoice.pdf_storage_key }),
    })
    const { url } = await res.json()
    const msg = encodeURIComponent(`Halo, terlampir invoice ${invoice.invoice_number ?? ''} untuk ${invoice.client_name}.\n\n${url}`)
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  const canApprove = (inv: Invoice) => {
    if (inv.status !== 'PENDING_APPROVAL') return false
    const r = profile?.role
    if (r === 'CEO' || r === 'FINANCE') return true
    if (r === 'HEAD' && profile?.entity_id === inv.entity_id) return true
    return false
  }

  return (
    <div className="p-6 md:p-8 space-y-6 animate-[slide-up_0.4s_ease]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[#D4AF37] text-xs uppercase tracking-[0.3em] font-bold mb-1">Invoicing</p>
          <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight">Manajemen Invoice</h1>
        </div>
        <Link href="/invoicing/create"
          className="flex items-center gap-2 bg-[#D4AF37] text-[#050505] font-bold px-4 py-2 rounded-md text-sm hover:bg-[#F5D678] transition-colors">
          <Plus className="w-4 h-4" /> Buat Invoice
        </Link>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['ALL', 'PENDING_APPROVAL', 'APPROVED', 'SENT'].map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={cn('px-4 py-1.5 rounded-full text-xs font-bold border transition-all uppercase tracking-widest',
              filterStatus === s ? getStatusColor(s === 'ALL' ? 'APPROVED' : s) + ' border-opacity-40' : 'border-[--color-border] text-[--color-text-muted] hover:text-[--color-text-primary]')}>
            {s === 'ALL' ? 'Semua' : getStatusLabel(s)}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" /></div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-[--color-text-muted]">
            <FileText className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">Belum ada invoice.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[--color-border]">
                  {['No. Invoice', 'Klien', 'Divisi', 'Total', 'Status', 'Tgl Dibuat', 'Aksi'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[--color-text-muted] text-xs uppercase tracking-wider font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[--color-border]">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 text-[--color-text-muted] font-mono text-xs">{inv.invoice_number ?? '—'}</td>
                    <td className="px-5 py-3 text-[--color-text-primary] font-medium">{inv.client_name}</td>
                    <td className="px-5 py-3 text-[--color-text-secondary]">{inv.entity?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-[#D4AF37] font-bold">{formatRupiah(inv.total_amount)}</td>
                    <td className="px-5 py-3">
                      <span className={cn('px-2 py-0.5 rounded border text-xs font-bold uppercase tracking-wider', getStatusColor(inv.status))}>
                        {getStatusLabel(inv.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[--color-text-muted]">{formatDate(inv.created_at)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {canApprove(inv) && (
                          <button onClick={() => handleApprove(inv)} title="Approve"
                            className="text-emerald-400 hover:text-emerald-300 transition-colors">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {inv.status === 'APPROVED' && (
                          <>
                            <button onClick={() => handleGeneratePdf(inv)} title="Download PDF" disabled={generatingPdf === inv.id}
                              className="text-[#D4AF37] hover:text-[#F5D678] transition-colors disabled:opacity-50">
                              {generatingPdf === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            </button>
                            <button onClick={() => shareWhatsapp(inv)} title="Share via WhatsApp"
                              className="text-emerald-400 hover:text-emerald-300 transition-colors">
                              <Share2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
