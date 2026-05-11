'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FileDown, RefreshCw, CheckCircle, Loader2, Pencil, X } from 'lucide-react'

export default function InvoicingClientActions({ doc, canConvert, canPay, isCEOOrFinance, bankAccounts, canEdit }: any) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [selectedBank, setSelectedBank] = useState('')
  // Termin modal state (untuk konversi SPK → Invoice)
  const [terminName, setTerminName] = useState('Termin 1')
  const [terminPct, setTerminPct] = useState(100)

  const isSpk = doc.doc_type === 'SPK'

  async function handleConvert() {
    if (isSpk) {
      // Buka modal input termin untuk SPK → Invoice
      setShowConvertModal(true)
      return
    }
    // Quotation → SPK: langsung convert tanpa modal
    await doConvert()
  }

  async function doConvert(e?: React.FormEvent) {
    e?.preventDefault()
    setShowConvertModal(false)
    setLoading(true)
    try {
      const res = await fetch('/api/commercial/convert-to-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // FIX: gunakan source_doc_id (bukan document_id)
        body: JSON.stringify({
          source_doc_id: doc.id,
          termin_name: isSpk ? terminName : undefined,
          percentage: isSpk ? terminPct : undefined,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Berhasil! Dokumen ${data.doc_number} diterbitkan.`)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBank) return toast.error('Pilih rekening bank tujuan transfer')
    setLoading(true)
    try {
      const res = await fetch('/api/invoicing/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice_id: doc.id, bank_account_id: selectedBank })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Pembayaran dicatat & masuk ke Buku Besar!')
      setShowPayModal(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDownload() {
    toast.info('Membuat PDF...')
    window.open(`/api/generate-pdf?id=${doc.id}`, '_blank')
  }

  const modalBg = 'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4'
  const modalCard = 'glass-card w-full max-w-sm p-6 relative'

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Edit — hanya jika canEdit (bukan PAID/UNPAID) */}
      {canEdit && (
        <a href={`/invoicing/${doc.id}/edit`}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-md transition-colors"
          title="Edit Dokumen"
          style={{ color: 'var(--text-muted)' }}>
          <Pencil className="w-4 h-4" />
        </a>
      )}

      {/* Convert */}
      {canConvert && (
        <button onClick={handleConvert} disabled={loading} title={isSpk ? 'Buat Invoice dari SPK' : 'Konversi ke SPK'}
          className="p-2 bg-white/5 hover:bg-[#D4AF37]/20 text-[#D4AF37] rounded-md transition-colors">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      )}

      {/* Tandai Lunas */}
      {canPay && isCEOOrFinance && (
        <>
          <button onClick={() => setShowPayModal(true)} title="Tandai Lunas"
            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-md transition-colors">
            <CheckCircle className="w-4 h-4" />
          </button>

          {showPayModal && (
            <div className={modalBg}>
              <div className={modalCard}>
                <button onClick={() => setShowPayModal(false)} className="absolute top-4 right-4" style={{ color: 'var(--text-muted)' }}>
                  <X className="w-4 h-4" />
                </button>
                <h3 className="font-bold text-white mb-1">Konfirmasi Pelunasan</h3>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                  Invoice: <span className="font-mono font-bold" style={{ color: 'var(--gold)' }}>{doc.doc_number}</span>
                </p>
                <form onSubmit={handlePay} className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Uang Masuk ke Rekening Bank:</label>
                    <select required value={selectedBank} onChange={e => setSelectedBank(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:border-[#D4AF37]/50 outline-none">
                      <option value="" disabled>-- Pilih Rekening --</option>
                      {bankAccounts.map((b: any) => <option key={b.id} value={b.id}>{b.account_name}</option>)}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
                    <button type="button" onClick={() => setShowPayModal(false)} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white">Batal</button>
                    <button type="submit" disabled={loading}
                      className="px-4 py-2 text-xs font-bold bg-emerald-500 text-black rounded hover:bg-emerald-400 flex items-center gap-2">
                      {loading && <Loader2 className="w-3 h-3 animate-spin" />} Catat Pelunasan
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {/* Download PDF */}
      <button onClick={handleDownload} title="Download PDF"
        className="p-2 bg-white/5 hover:bg-blue-500/20 text-blue-400 rounded-md transition-colors">
        <FileDown className="w-4 h-4" />
      </button>

      {/* Modal Konversi SPK → Invoice (input termin & persentase) */}
      {showConvertModal && (
        <div className={modalBg}>
          <div className={modalCard}>
            <button onClick={() => setShowConvertModal(false)} className="absolute top-4 right-4" style={{ color: 'var(--text-muted)' }}>
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-bold text-white mb-1">Buat Invoice dari SPK</h3>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Tentukan nama termin & persentase penagihan.
            </p>
            <form onSubmit={doConvert} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Nama Termin *</label>
                <input required className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]/50"
                  placeholder="Contoh: Termin 1 - DP, Termin Pelunasan..."
                  value={terminName} onChange={e => setTerminName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Persentase Tagihan: <span className="font-bold text-[#D4AF37]">{terminPct}%</span>
                </label>
                <input type="range" min={1} max={100} value={terminPct} onChange={e => setTerminPct(Number(e.target.value))}
                  className="w-full accent-[#D4AF37]" />
                <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                  <span>1%</span><span>50%</span><span>100%</span>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
                <button type="button" onClick={() => setShowConvertModal(false)} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white">Batal</button>
                <button type="submit" disabled={loading}
                  className="px-4 py-2 text-xs font-bold bg-[#D4AF37] text-black rounded hover:bg-[#D4AF37]/90 flex items-center gap-2">
                  {loading && <Loader2 className="w-3 h-3 animate-spin" />} Terbitkan Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}