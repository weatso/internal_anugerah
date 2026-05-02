'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { formatRupiah } from '@/lib/utils'
import { DollarSign, CheckCircle2, Loader2, X } from 'lucide-react'

interface Commission {
  id: string
  recipient_name: string | null
  recipient_profile_id: string | null
  commission_amount: number
  commission_percentage: number
  status: string
  created_at: string
  commercial_documents: { doc_number: string; title: string; entities: { name: string } | null } | null
}

interface BankAccount { id: string; account_name: string }

export default function CommissionsClient({
  commissions, bankAccounts, isCEO,
}: { commissions: Commission[]; bankAccounts: BankAccount[]; isCEO: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [payingId, setPayingId] = useState<string | null>(null)
  const [selectedBank, setSelectedBank] = useState(bankAccounts[0]?.id || '')
  const [modal, setModal] = useState<Commission | null>(null)

  const pending = commissions.filter(c => c.status === 'PENDING')
  const paid = commissions.filter(c => c.status === 'PAID')

  async function handlePay() {
    if (!modal || !selectedBank) return
    setPayingId(modal.id)
    try {
      const res = await fetch('/api/finance/commissions/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commission_id: modal.id, bank_account_id: selectedBank }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Komisi berhasil dicairkan!')
      setModal(null)
      startTransition(() => router.refresh())
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setPayingId(null)
    }
  }

  const statusBadge = (s: string) => s === 'PAID'
    ? 'bg-emerald-500/15 text-emerald-500'
    : 'bg-amber-500/15 text-amber-500'

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.3em] font-bold mb-1" style={{ color: 'var(--gold)' }}>Finance Module</p>
        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Mesin Komisi</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Kelola dan cairkan komisi sales & affiliator.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4" style={{ borderLeftColor: '#f97316', borderLeftWidth: 2 }}>
          <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)' }}>Pending Pencairan</p>
          <p className="text-2xl font-black tabular-nums mt-1" style={{ color: '#f97316' }}>
            {formatRupiah(pending.reduce((s, c) => s + Number(c.commission_amount), 0))}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{pending.length} transaksi</p>
        </div>
        <div className="glass-card p-4" style={{ borderLeftColor: '#10b981', borderLeftWidth: 2 }}>
          <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)' }}>Sudah Dicairkan</p>
          <p className="text-2xl font-black tabular-nums mt-1" style={{ color: '#10b981' }}>
            {formatRupiah(paid.reduce((s, c) => s + Number(c.commission_amount), 0))}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{paid.length} transaksi</p>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-widest border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
            <tr>
              <th className="px-5 py-3 text-left font-bold" style={{ color: 'var(--text-muted)' }}>Penerima</th>
              <th className="px-5 py-3 text-left font-bold" style={{ color: 'var(--text-muted)' }}>Invoice / Divisi</th>
              <th className="px-5 py-3 text-right font-bold" style={{ color: 'var(--text-muted)' }}>Nominal</th>
              <th className="px-5 py-3 text-center font-bold" style={{ color: 'var(--text-muted)' }}>Status</th>
              {isCEO && <th className="px-3 py-3 text-center font-bold" style={{ color: 'var(--text-muted)' }}>Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {commissions.map(c => (
              <tr key={c.id} className="transition-colors hover:bg-white/[0.015]">
                <td className="px-5 py-3">
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {c.recipient_name || 'Internal'}
                  </p>
                  {c.commission_percentage > 0 && (
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{c.commission_percentage}%</p>
                  )}
                </td>
                <td className="px-5 py-3">
                  <p className="text-xs font-mono" style={{ color: 'var(--gold)' }}>{c.commercial_documents?.doc_number}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{(c.commercial_documents as any)?.entities?.name}</p>
                </td>
                <td className="px-5 py-3 text-right font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                  {formatRupiah(Number(c.commission_amount))}
                </td>
                <td className="px-5 py-3 text-center">
                  <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded ${statusBadge(c.status)}`}>
                    {c.status}
                  </span>
                </td>
                {isCEO && (
                  <td className="px-3 py-3 text-center">
                    {c.status === 'PENDING' && (
                      <button onClick={() => setModal(c)}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
                        style={{ background: 'var(--gold-glow)', color: 'var(--gold)' }}>
                        Cairkan
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {commissions.length === 0 && (
          <div className="text-center py-16">
            <DollarSign className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
            <p style={{ color: 'var(--text-muted)' }}>Belum ada data komisi.</p>
          </div>
        )}
      </div>

      {/* Cairkan Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md p-6 rounded-xl space-y-5"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-black" style={{ color: 'var(--text-primary)' }}>Cairkan Komisi</h2>
              <button onClick={() => setModal(null)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 rounded-lg space-y-1" style={{ background: 'var(--bg-secondary)' }}>
              <p className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>Penerima</p>
              <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{modal.recipient_name || 'Internal'}</p>
              <p className="text-xl font-black tabular-nums mt-2" style={{ color: 'var(--gold)' }}>
                {formatRupiah(Number(modal.commission_amount))}
              </p>
            </div>
            <div>
              <label className="section-label block mb-2">Debet dari Rekening</label>
              <select className="select-field w-full" value={selectedBank} onChange={e => setSelectedBank(e.target.value)}>
                {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.account_name}</option>)}
              </select>
            </div>
            <button onClick={handlePay} disabled={!!payingId}
              className="w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
              style={{ background: 'var(--gold)', color: '#050505' }}>
              {payingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Konfirmasi Pencairan</>}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
