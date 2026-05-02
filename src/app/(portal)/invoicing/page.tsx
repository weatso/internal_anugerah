'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { formatRupiah } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Plus, FileText, CheckCircle2, Loader2, X, RefreshCcw, ArrowRight } from 'lucide-react'

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-white/10 text-neutral-400',
  SENT: 'bg-blue-500/10 text-blue-400',
  APPROVED: 'bg-amber-500/10 text-amber-400',
  PAID: 'bg-emerald-500/10 text-emerald-500',
  PROFORMA_INVOICE: 'bg-purple-500/10 text-purple-400',
}

const TABS = [
  { key: 'DRAFT',  label: 'Draft',        filter: (d: any) => d.status === 'DRAFT' },
  { key: 'SENT',   label: 'Terkirim/SPK', filter: (d: any) => ['SENT','APPROVED','OFFERING_LETTER','SPK','BAST','PROFORMA_INVOICE'].includes(d.status) },
  { key: 'UNPAID', label: 'Unpaid',       filter: (d: any) => d.doc_type === 'INVOICE' && !d.linked_journal_id && d.status !== 'DRAFT' && d.status !== 'PAID' },
  { key: 'PAID',   label: 'Lunas ✓',     filter: (d: any) => d.status === 'PAID' },
]

export default function CommercialPage() {
  const { profile, highestRole } = useUser()
  const supabase = createClient()
  const router = useRouter()
  const [documents, setDocuments] = useState<any[]>([])
  const [bankAccounts, setBankAccounts] = useState<{ id: string; account_name: string }[]>([])
  const [activeTab, setActiveTab] = useState('DRAFT')
  const [loading, setLoading] = useState(true)
  const [payModal, setPayModal] = useState<any>(null)
  const [convertModal, setConvertModal] = useState<any>(null)
  const [selectedBank, setSelectedBank] = useState('')
  const [paying, setPaying] = useState(false)
  const [converting, setConverting] = useState(false)

  useEffect(() => { fetchAll() }, [profile])

  async function fetchAll() {
    setLoading(true)
    let query = supabase.from('commercial_documents')
      .select('*, clients(company_name), entities(name)')
      .order('created_at', { ascending: false })
    if (highestRole !== 'CEO' && highestRole !== 'FINANCE' && profile?.entity_id) {
      query = query.eq('entity_id', profile.entity_id)
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: payModal.id, bank_account_id: selectedBank }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Invoice PAID! Jurnal, amortisasi & project dibuat otomatis.')
      setPayModal(null)
      fetchAll()
    } catch (err: any) { toast.error(err.message) }
    setPaying(false)
  }

  async function handleConvert() {
    if (!convertModal) return
    setConverting(true)
    try {
      const res = await fetch('/api/commercial/convert-to-invoice', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_doc_id: convertModal.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Invoice ${data.doc_number} berhasil dibuat!`)
      setConvertModal(null)
      fetchAll()
      router.push('/invoicing')
    } catch (err: any) { toast.error(err.message) }
    setConverting(false)
  }

  const isCEOOrFinance = highestRole === 'CEO' || highestRole === 'FINANCE'
  const canPay = (doc: any) => isCEOOrFinance && !doc.linked_journal_id && doc.doc_type === 'INVOICE' && doc.status !== 'PAID'
  const canConvert = (doc: any) => doc.doc_type !== 'INVOICE' && doc.status !== 'PAID'

  const currentDocs = documents.filter(TABS.find(t => t.key === activeTab)!.filter)

  if (loading) return <div className="p-8 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Memuat Arsip Komersial...</div>

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] font-bold mb-1" style={{ color: 'var(--gold)' }}>Commercial Hub</p>
          <h1 className="text-2xl font-black tracking-tighter" style={{ color: 'var(--text-primary)' }}>Dokumen Komersial</h1>
        </div>
        <Link href="/invoicing/create" className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold"
          style={{ background: 'var(--gold)', color: '#050505' }}>
          <Plus size={16} /> Buat Dokumen
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
        {TABS.map(tab => {
          const count = documents.filter(tab.filter).length
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold transition-all"
              style={activeTab === tab.key
                ? { background: 'var(--gold)', color: '#050505' }
                : { color: 'var(--text-muted)' }
              }>
              {tab.label}
              {count > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-black"
                  style={{ background: activeTab === tab.key ? 'rgba(0,0,0,0.2)' : 'var(--border-subtle)' }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {currentDocs.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)' }}>Tidak ada dokumen di tab ini.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b text-[10px] uppercase tracking-widest font-bold"
              style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
              <tr>
                <th className="px-5 py-4">No. Dokumen</th>
                <th className="px-5 py-4">Klien / Perihal</th>
                <th className="px-5 py-4">Divisi</th>
                <th className="px-5 py-4 text-right">Nilai</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {currentDocs.map(doc => (
                <tr key={doc.id} className="hover:bg-white/[0.015] transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-mono text-xs" style={{ color: 'var(--gold)' }}>{doc.doc_number}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {new Date(doc.issue_date).toLocaleDateString('id-ID')} · {doc.doc_type}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{doc.clients?.company_name}</p>
                    <p className="text-xs truncate max-w-xs" style={{ color: 'var(--text-muted)' }}>{doc.title}</p>
                  </td>
                  <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{doc.entities?.name}</td>
                  <td className="px-5 py-3 text-right font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                    {formatRupiah(doc.grand_total)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-[9px] px-2 py-1 rounded-sm uppercase tracking-widest font-bold ${STATUS_STYLE[doc.status] || 'bg-white/5 text-neutral-400'}`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => window.open(`/api/generate-pdf?id=${doc.id}`, '_blank')}
                        className="p-2 rounded transition-colors" style={{ background: 'var(--gold-glow)', color: 'var(--gold)' }} title="PDF">
                        <FileText size={13} />
                      </button>
                      {canConvert(doc) && isCEOOrFinance && (
                        <button onClick={() => setConvertModal(doc)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-bold"
                          style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
                          <ArrowRight size={11} /> Invoice
                        </button>
                      )}
                      {canPay(doc) && (
                        <button onClick={() => setPayModal(doc)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-bold"
                          style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                          <CheckCircle2 size={11} /> PAID
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
                <p className="font-mono text-xs" style={{ color: 'var(--gold)' }}>{payModal.doc_number}</p>
                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{payModal.title}</p>
                <p className="text-2xl font-black tabular-nums mt-2" style={{ color: '#10b981' }}>{formatRupiah(payModal.grand_total)}</p>
              </div>
              <div className="p-3 rounded-lg text-xs space-y-1" style={{ background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.2)' }}>
                <p className="font-bold" style={{ color: 'var(--gold)' }}>Sistem akan otomatis:</p>
                <p style={{ color: 'var(--text-muted)' }}>✓ Jurnal Debit Bank + Kredit Revenue</p>
                <p style={{ color: 'var(--text-muted)' }}>✓ Jadwal amortisasi (jika ada recurring)</p>
                <p style={{ color: 'var(--text-muted)' }}>✓ Project + magic link client portal</p>
                <p style={{ color: 'var(--text-muted)' }}>✓ Komisi aktif jadi PENDING</p>
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

        {/* Convert Modal */}
        {convertModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-xl space-y-5"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center justify-between">
                <h2 className="font-black" style={{ color: 'var(--text-primary)' }}>Convert ke Invoice</h2>
                <button onClick={() => setConvertModal(null)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                <p className="text-xs font-mono mb-1" style={{ color: 'var(--gold)' }}>{convertModal.doc_number} ({convertModal.doc_type})</p>
                <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{convertModal.title}</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>→ Akan dibuat Invoice baru dengan nomor baru. Dokumen asal tetap ada sebagai referensi.</p>
              </div>
              <button onClick={handleConvert} disabled={converting}
                className="w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                style={{ background: '#818cf8', color: '#fff' }}>
                {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-4 h-4" /> Buat Invoice</>}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}