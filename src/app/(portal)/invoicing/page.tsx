'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { Plus, FileText, CheckCircle2, Loader2, X } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-white/10 text-neutral-400',
  SENT: 'bg-blue-500/10 text-blue-400',
  APPROVED: 'bg-amber-500/10 text-amber-400',
  PAID: 'bg-emerald-500/10 text-emerald-500',
}

export default function DocumentListPage() {
  const { profile, highestRole } = useUser()
  const supabase = createClient()
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [bankAccounts, setBankAccounts] = useState<{ id: string; account_name: string }[]>([])
  const [payModal, setPayModal] = useState<any>(null)
  const [selectedBank, setSelectedBank] = useState('')
  const [paying, setPaying] = useState(false)

  useEffect(() => { fetchAll() }, [profile])

  async function fetchAll() {
    let query = supabase.from('commercial_documents')
      .select('*, clients(company_name), entities(name)')
      .order('created_at', { ascending: false })
    if (highestRole !== 'CEO' && highestRole !== 'FINANCE') {
      if (profile?.entity_id) query = query.eq('entity_id', profile.entity_id)
    }
    const { data } = await query
    if (data) setDocuments(data)

    const { data: banks } = await supabase.from('chart_of_accounts').select('id, account_name').eq('is_bank', true).eq('is_active', true)
    if (banks) { setBankAccounts(banks); setSelectedBank(banks[0]?.id || '') }
    setLoading(false)
  }

  async function handlePay() {
    if (!payModal || !selectedBank) return
    setPaying(true)
    try {
      const res = await fetch('/api/invoicing/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: payModal.id, bank_account_id: selectedBank }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Invoice berhasil ditandai PAID. Jurnal & amortisasi dibuat otomatis.')
      setPayModal(null)
      fetchAll()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setPaying(false)
    }
  }

  const canPay = (doc: any) => (highestRole === 'CEO' || highestRole === 'FINANCE') && !doc.linked_journal_id && ['SENT', 'APPROVED', 'PROFORMA_INVOICE'].includes(doc.status)

  if (loading) return <div className="p-8 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Memuat Arsip Dokumen...</div>

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] font-bold mb-1" style={{ color: 'var(--gold)' }}>Commercial Hub</p>
          <h1 className="text-2xl font-black tracking-tighter" style={{ color: 'var(--text-primary)' }}>Arsip Dokumen Komersial</h1>
        </div>
        <Link href="/invoicing/create" className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Buat Dokumen Baru
        </Link>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b text-[10px] uppercase tracking-widest font-bold"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
            <tr>
              <th className="px-6 py-4">No. Dokumen</th>
              <th className="px-6 py-4">Klien / Perihal</th>
              <th className="px-6 py-4">Divisi</th>
              <th className="px-6 py-4 text-right">Nilai</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {documents.map(doc => (
              <tr key={doc.id} className="hover:bg-white/[0.015] transition-colors">
                <td className="px-6 py-4">
                  <p className="font-mono text-xs" style={{ color: 'var(--gold)' }}>{doc.doc_number}</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{new Date(doc.issue_date).toLocaleDateString('id-ID')}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{doc.clients?.company_name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{doc.title}</p>
                </td>
                <td className="px-6 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>{doc.entities?.name}</td>
                <td className="px-6 py-4 text-right font-mono font-bold" style={{ color: 'var(--text-primary)' }}>{formatRupiah(doc.grand_total)}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`text-[9px] px-2 py-1 rounded-sm uppercase tracking-widest font-bold ${STATUS_STYLE[doc.status] || 'bg-white/5 text-neutral-400'}`}>
                    {doc.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => window.open(`/api/generate-pdf?id=${doc.id}`, '_blank')}
                      className="p-2 rounded-sm transition-colors" style={{ background: 'var(--gold-glow)', color: 'var(--gold)' }} title="Lihat PDF">
                      <FileText size={14} />
                    </button>
                    {canPay(doc) && (
                      <button onClick={() => setPayModal(doc)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-sm text-xs font-bold transition-all"
                        style={{ background: 'var(--bg-secondary)', color: '#10b981', border: '1px solid #10b981' }}>
                        <CheckCircle2 size={12} /> Tandai PAID
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pay Modal */}
      <AnimatePresence>
        {payModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-xl space-y-5"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center justify-between">
                <h2 className="font-black" style={{ color: 'var(--text-primary)' }}>Konfirmasi Pelunasan</h2>
                <button onClick={() => setPayModal(null)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 rounded-lg space-y-1" style={{ background: 'var(--bg-secondary)' }}>
                <p className="text-xs font-mono" style={{ color: 'var(--gold)' }}>{payModal.doc_number}</p>
                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{payModal.title}</p>
                <p className="text-2xl font-black tabular-nums mt-2" style={{ color: '#10b981' }}>{formatRupiah(payModal.grand_total)}</p>
              </div>
              <div className="p-3 rounded-lg text-xs space-y-1" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}>
                <p className="font-bold" style={{ color: 'var(--gold)' }}>Sistem akan otomatis:</p>
                <p style={{ color: 'var(--text-muted)' }}>✓ Buat jurnal akuntansi (Kas Masuk + Deferred Revenue)</p>
                <p style={{ color: 'var(--text-muted)' }}>✓ Buat jadwal amortisasi (jika ada item recurring)</p>
                <p style={{ color: 'var(--text-muted)' }}>✓ Buat project dengan magic link untuk client portal</p>
              </div>
              <div>
                <label className="section-label block mb-2">Kas Masuk ke Rekening</label>
                <select className="select-field w-full" value={selectedBank} onChange={e => setSelectedBank(e.target.value)}>
                  {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.account_name}</option>)}
                </select>
              </div>
              <button onClick={handlePay} disabled={paying}
                className="w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                style={{ background: '#10b981', color: '#fff' }}>
                {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Konfirmasi & Proses PAID</>}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}