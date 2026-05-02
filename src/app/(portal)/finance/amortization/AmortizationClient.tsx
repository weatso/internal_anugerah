'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { formatRupiah } from '@/lib/utils'
import { Zap, CheckCircle2, Loader2, TrendingUp } from 'lucide-react'

interface Recognition {
  id: string
  month_period: string
  amount: number
  entity_id: string
  document_line_items: { description: string } | null
  commercial_documents: { doc_number: string; title: string; entities: { name: string } | null } | null
}

export default function AmortizationClient({
  recognitions, isCEO, currentPeriod,
}: { recognitions: Recognition[]; isCEO: boolean; currentPeriod: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loadingIds, setLoadingIds] = useState<string[]>([])

  // Group by month_period
  const grouped = recognitions.reduce((acc, r) => {
    if (!acc[r.month_period]) acc[r.month_period] = []
    acc[r.month_period].push(r)
    return acc
  }, {} as Record<string, Recognition[]>)

  const months = Object.keys(grouped).sort()
  const totalPending = recognitions.reduce((s, r) => s + Number(r.amount), 0)

  async function amortize(ids: string[], period: string) {
    setLoadingIds(prev => [...prev, ...ids])
    try {
      const res = await fetch('/api/finance/amortize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recognition_ids: ids, month_period: period }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`${data.processed} item berhasil diamortisasi.`)
      startTransition(() => router.refresh())
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoadingIds(prev => prev.filter(id => !ids.includes(id)))
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.3em] font-bold mb-1" style={{ color: 'var(--gold)' }}>Finance Module</p>
        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Mesin Amortisasi Revenue</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Eksekusi pengakuan pendapatan dari Deferred Revenue ke Pendapatan Riil.</p>
      </div>

      {/* Summary */}
      <div className="glass-card p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'var(--gold-glow)' }}>
            <TrendingUp className="w-5 h-5" style={{ color: 'var(--gold)' }} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)' }}>Total Tertunggak</p>
            <p className="text-xl font-black tabular-nums" style={{ color: 'var(--gold)' }}>{formatRupiah(totalPending)}</p>
          </div>
        </div>
        <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>{recognitions.length} baris · {months.length} periode</p>
      </div>

      {months.length === 0 && (
        <div className="text-center py-20 glass-card">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: '#10b981' }} />
          <p className="font-bold" style={{ color: 'var(--text-primary)' }}>Semua revenue sudah diakui!</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Tidak ada item tertunggak sampai bulan ini.</p>
        </div>
      )}

      {/* Per-month sections */}
      {months.map(period => {
        const items = grouped[period]
        const periodTotal = items.reduce((s, r) => s + Number(r.amount), 0)
        const periodIds = items.map(r => r.id)
        const isLoading = periodIds.some(id => loadingIds.includes(id))
        const [y, m] = period.split('-')
        const label = new Date(Number(y), Number(m) - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' })

        return (
          <motion.div key={period} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="glass-card overflow-hidden">
            {/* Month header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
              <div>
                <p className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>{label}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{items.length} item · {formatRupiah(periodTotal)}</p>
              </div>
              {/* Sapu Jagat button */}
              <button
                onClick={() => amortize(periodIds, period)}
                disabled={isLoading || isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                style={{ background: 'var(--gold)', color: '#050505', opacity: isLoading ? 0.6 : 1 }}>
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                Sapu Jagat {label}
              </button>
            </div>

            {/* Items table */}
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                <tr>
                  <th className="px-5 py-3 text-left font-bold">Layanan / Invoice</th>
                  <th className="px-5 py-3 text-left font-bold">Divisi</th>
                  <th className="px-5 py-3 text-right font-bold">Nominal</th>
                  <th className="px-3 py-3 text-center font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {items.map(rec => {
                  const isRowLoading = loadingIds.includes(rec.id)
                  return (
                    <tr key={rec.id} style={{ background: isRowLoading ? 'var(--gold-glow)' : 'transparent' }}>
                      <td className="px-5 py-3">
                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {rec.document_line_items?.description || '—'}
                        </p>
                        <p className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                          {rec.commercial_documents?.doc_number}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {(rec.commercial_documents as any)?.entities?.name || '—'}
                      </td>
                      <td className="px-5 py-3 text-right font-bold tabular-nums text-sm" style={{ color: 'var(--gold)' }}>
                        {formatRupiah(Number(rec.amount))}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={() => amortize([rec.id], period)}
                          disabled={isRowLoading || isPending}
                          className="p-1.5 rounded transition-all"
                          style={{ background: 'var(--bg-secondary)', color: 'var(--gold)' }}
                          title="Eksekusi baris ini">
                          {isRowLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </motion.div>
        )
      })}
    </div>
  )
}
