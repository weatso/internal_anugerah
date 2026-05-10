'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FileDown, RefreshCw, CheckCircle, Loader2 } from 'lucide-react'

export default function InvoicingClientActions({ doc, canConvert, canPay, isCEOOrFinance, bankAccounts }: any) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPayModal, setShowPayModal] = useState(false)
  const [selectedBank, setSelectedBank] = useState('')

  async function handleConvert() {
    if (!confirm(`Konversi ${doc.doc_type} ini menjadi Invoice?`)) return
    setLoading(true)
    try {
      const res = await fetch('/api/commercial/convert-to-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: doc.id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Berhasil dikonversi ke Invoice!')
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
    // Sesuaikan URL ini jika API PDF Anda berbeda
    window.open(`/api/generate-pdf?id=${doc.id}`, '_blank')
  }

  return (
    <div className="flex items-center gap-2">
      {canConvert && (
        <button onClick={handleConvert} disabled={loading} title="Convert ke Invoice"
          className="p-2 bg-white/5 hover:bg-[#D4AF37]/20 text-[#D4AF37] rounded-md transition-colors">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      )}

      {canPay && isCEOOrFinance && (
        <>
          <button onClick={() => setShowPayModal(true)} title="Tandai Lunas"
            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-md transition-colors">
            <CheckCircle className="w-4 h-4" />
          </button>

          {showPayModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="glass-card w-full max-w-sm p-6">
                <h3 className="font-bold text-white mb-4">Penerimaan Pembayaran</h3>
                <form onSubmit={handlePay} className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Uang Masuk ke Rekening Bank:</label>
                    <select required value={selectedBank} onChange={e => setSelectedBank(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:border-[#D4AF37]/50">
                      <option value="" disabled>-- Pilih Rekening --</option>
                      {bankAccounts.map((b: any) => <option key={b.id} value={b.id}>{b.account_name}</option>)}
                    </select>
                  </div>
                  <div className="flex justify-end gap-2 mt-4 border-t border-white/10 pt-4">
                    <button type="button" onClick={() => setShowPayModal(false)} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white">Batal</button>
                    <button type="submit" disabled={loading} className="px-4 py-2 text-xs font-bold bg-emerald-500 text-black rounded hover:bg-emerald-400 flex items-center gap-2">
                      {loading && <Loader2 className="w-3 h-3 animate-spin" />} Catat Pelunasan
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      <button onClick={handleDownload} title="Download PDF"
        className="p-2 bg-white/5 hover:bg-blue-500/20 text-blue-400 rounded-md transition-colors">
        <FileDown className="w-4 h-4" />
      </button>
    </div>
  )
}