'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { formatRupiah } from '@/lib/utils'
import { CheckCircle2, X, ArrowRight, Loader2, FileText, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  doc: any
  canConvert: boolean
  canPay: boolean
  isCEOOrFinance: boolean
  bankAccounts: { id: string; account_name: string }[]
}

export default function InvoicingClientActions({ doc, canConvert, canPay, isCEOOrFinance, bankAccounts }: Props) {
  const router = useRouter()
  
  const [terminName, setTerminName] = useState('DP 50%')
  const [percentage, setPercentage] = useState(50)
  const [showPayModal, setShowPayModal] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [selectedBank, setSelectedBank] = useState(bankAccounts[0]?.id || '')
  
  const [paying, setPaying] = useState(false)
  const [converting, setConverting] = useState(false)
  const [hasBast, setHasBast] = useState(true)

  useEffect(() => {
    if (showConvertModal && doc.doc_type === 'SPK') {
      const supabase = createClient()
      supabase.from('projects').select('bast_signed_at').eq('spk_id', doc.id).single().then(({ data }) => {
        setHasBast(!!data?.bast_signed_at)
      })
    }
  }, [showConvertModal, doc.doc_type, doc.id])

  async function handlePay() {
    if (!selectedBank) return toast.error('Pilih rekening kas/bank tujuan.')
    setPaying(true)
    try {
      const res = await fetch('/api/invoicing/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: doc.id, bank_account_id: selectedBank }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal memproses pembayaran')
      
      toast.success('LUNAS. Jurnal akuntansi & Project Workspace telah dieksekusi otomatis.')
      setShowPayModal(false)
      
      // Paksa Server Component merender ulang data terbaru
      router.refresh() 
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setPaying(false)
    }
  }

  async function handleConvert() {
    setConverting(true)
    try {
      const res = await fetch('/api/commercial/convert-to-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          source_doc_id: doc.id,
          termin_name: doc.doc_type === 'SPK' ? terminName : null,
          percentage: doc.doc_type === 'SPK' ? percentage : 100
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal mengkonversi dokumen')
      
      toast.success(`Dokumen turunan berhasil diciptakan!`)
      setShowConvertModal(false)
      
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setConverting(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-end gap-2">
        <button 
          onClick={() => window.open(`/api/generate-pdf?id=${doc.id}`, '_blank')}
          className="p-2 rounded transition-all hover:opacity-80" 
          style={{ background: 'var(--gold-glow)', color: 'var(--gold)' }} 
          title="Cetak PDF"
        >
          <FileText size={13} />
        </button>

        {canConvert && isCEOOrFinance && (
          <button onClick={() => setShowConvertModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-bold transition-all hover:opacity-80"
            style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
            <ArrowRight size={11} /> INVOICE
          </button>
        )}

        {canPay && isCEOOrFinance && (
          <button onClick={() => setShowPayModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-[10px] font-bold transition-all hover:opacity-80"
            style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
            <CheckCircle2 size={11} /> PAID
          </button>
        )}
      </div>

      <AnimatePresence>
        {/* MODAL BAYAR */}
        {showPayModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-left" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-xl space-y-5 shadow-2xl"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              
              <div className="flex items-center justify-between">
                <h2 className="font-black text-lg tracking-wide" style={{ color: 'var(--text-primary)' }}>Eksekusi Pelunasan</h2>
                <button onClick={() => setShowPayModal(false)} className="hover:opacity-70 transition-opacity" style={{ color: 'var(--text-muted)' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 rounded-lg space-y-1 border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
                <p className="font-mono text-xs font-bold" style={{ color: 'var(--gold)' }}>{doc.doc_number}</p>
                <p className="font-bold text-sm tracking-wide" style={{ color: 'var(--text-primary)' }}>{doc.title}</p>
                <p className="text-2xl font-black tabular-nums pt-2" style={{ color: '#10b981' }}>{formatRupiah(doc.grand_total)}</p>
              </div>

              <div className="p-3 rounded-lg text-[11px] space-y-1.5" style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}>
                <p className="font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--gold)' }}>Otomasi Sistem:</p>
                <p style={{ color: 'var(--text-muted)' }}>✓ Jurnal Debit Bank + Kredit Pendapatan</p>
                <p style={{ color: 'var(--text-muted)' }}>✓ Penjadwalan Amortisasi Revenue (jika ada)</p>
                <p style={{ color: 'var(--text-muted)' }}>✓ Pembuatan War Room Project & Akses Klien</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Tujuan Dana (Kas Bank)</label>
                <select 
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--gold)] transition-colors" 
                  value={selectedBank} 
                  onChange={e => setSelectedBank(e.target.value)}
                >
                  {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.account_name}</option>)}
                </select>
              </div>

              <button onClick={handlePay} disabled={paying}
                className="w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                style={{ background: '#10b981', color: '#fff' }}>
                {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> KONFIRMASI LUNAS</>}
              </button>
            </motion.div>
          </div>
        )}

        {/* MODAL CONVERT */}
        {showConvertModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-left" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-xl space-y-5 shadow-2xl"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              
              <div className="flex items-center justify-between">
                <h2 className="font-black text-lg tracking-wide" style={{ color: 'var(--text-primary)' }}>Eskalasi Dokumen</h2>
                <button onClick={() => setShowConvertModal(false)} className="hover:opacity-70 transition-opacity" style={{ color: 'var(--text-muted)' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 rounded-lg border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
                <p className="text-xs font-mono font-bold mb-1" style={{ color: 'var(--gold)' }}>{doc.doc_number} ({doc.doc_type})</p>
                <p className="font-bold text-sm tracking-wide" style={{ color: 'var(--text-primary)' }}>{doc.title}</p>
                <p className="text-[11px] mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Aksi ini akan menduplikasi item dari dokumen ini menjadi entitas Invoice penagihan resmi. Dokumen asal tidak akan dihapus.
                </p>
              </div>

              {doc.doc_type === 'SPK' && (
                <div className="space-y-4 border-t border-white/10 pt-4 mt-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--gold)' }}>Nama Termin</label>
                    <input type="text" value={terminName} onChange={e => setTerminName(e.target.value)} 
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-sm text-white outline-none focus:border-[var(--gold)]" 
                      placeholder="Contoh: DP 50% atau Termin 1" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--gold)' }}>Persentase Tagihan (%)</label>
                    <input type="number" value={percentage} onChange={e => setPercentage(Number(e.target.value))} max="100" min="1"
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-md px-3 py-2 text-sm text-white outline-none focus:border-[var(--gold)]" />
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Nominal tagihan akan otomatis dihitung dari {percentage}% nilai total SPK.</p>
                  </div>
                </div>
              )}

              {(() => {
                const isFinalBilling = terminName.toLowerCase().includes('pelunasan') || terminName.toLowerCase().includes('final');
                const isLocked = doc.doc_type === 'SPK' && isFinalBilling && !hasBast;
                
                return (
                  <div className="space-y-3">
                    {isLocked && (
                      <div className="p-3 rounded bg-red-500/10 border border-red-500/20 flex gap-2">
                        <Lock className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-400">
                          <strong>Blokir Penagihan:</strong> BAST belum diunggah. Anda tidak bisa menagih pelunasan tanpa BAST.
                        </p>
                      </div>
                    )}
                    <button onClick={handleConvert} disabled={converting || isLocked}
                      className="w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: isLocked ? 'var(--bg-secondary)' : '#818cf8', color: isLocked ? 'var(--text-muted)' : '#fff' }}>
                      {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : isLocked ? <><Lock className="w-4 h-4" /> TERKUNCI</> : <><ArrowRight className="w-4 h-4" /> BUAT INVOICE TURUNAN</>}
                    </button>
                  </div>
                )
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}