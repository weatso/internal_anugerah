'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { formatRupiah } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, Plus, Loader2, X, Edit2, Trash2, CheckCircle2 } from 'lucide-react'

const COLORS = ['#D4AF37', '#10b981', '#6366f1', '#f97316', '#a855f7', '#ef4444']

export default function DividendsClient({ stakeholders: initialStakeholders, entities, bankAccounts, history }: {
  stakeholders: any[]; entities: any[]; bankAccounts: any[]; history: any[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  const [stakeholders, setStakeholders] = useState(initialStakeholders)
  const [selectedEntity, setSelectedEntity] = useState(entities[0]?.id || '')
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
  })
  const [selectedBank, setSelectedBank] = useState(bankAccounts[0]?.id || '')
  const [loading, setLoading] = useState(false)
  const [distributing, setDistributing] = useState(false)
  const [netProfit, setNetProfit] = useState<number | null>(null)

  // Stakeholder CRUD
  const [shModal, setShModal] = useState<'add' | 'edit' | null>(null)
  const [editSh, setEditSh] = useState<any>(null)
  const [shForm, setShForm] = useState({ name: '', type: 'INTERNAL', equity_percentage: 0, profit_split_percentage: 0, bank_name: '', bank_account_number: '', bank_account_holder: '', is_active: true })

  const totalSplit = stakeholders.filter(s => s.is_active).reduce((a, s) => a + Number(s.profit_split_percentage), 0)
  const inputCls = 'w-full rounded-md px-3 py-2.5 text-sm outline-none input-field'

  // Calculate net profit preview
  async function calcNetProfit() {
    if (!selectedEntity || !selectedPeriod) return
    setLoading(true)
    setNetProfit(null)
    try {
      const [y, m] = selectedPeriod.split('-').map(Number)
      const start = `${selectedPeriod}-01`
      const end = new Date(y, m, 0).toISOString().slice(0, 10)
      const { data: journals } = await supabase.from('journal_entries').select('id').eq('entity_id', selectedEntity).eq('status', 'APPROVED').gte('transaction_date', start).lte('transaction_date', end)
      const ids = (journals || []).map((j: any) => j.id)
      if (ids.length === 0) { toast.error('Tidak ada transaksi di periode ini'); setLoading(false); return }
      const { data: lines } = await supabase.from('journal_lines').select('debit, credit, chart_of_accounts(account_class)').in('journal_id', ids)
      let rev = 0, cost = 0
      for (const l of (lines || []) as any[]) {
        const cls = l.chart_of_accounts?.account_class
        if (cls === 'REVENUE') rev += Number(l.credit) - Number(l.debit)
        if (cls === 'COGS' || cls === 'EXPENSE') cost += Number(l.debit) - Number(l.credit)
      }
      setNetProfit(rev - cost)
    } catch { toast.error('Gagal menghitung') }
    setLoading(false)
  }

  async function distribute() {
    setDistributing(true)
    try {
      const res = await fetch('/api/finance/dividends/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity_id: selectedEntity, period_month: selectedPeriod, bank_account_id: selectedBank }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Profit didistribusikan ke ${data.distributed} stakeholder!`)
      setNetProfit(null)
      startTransition(() => router.refresh())
    } catch (err: any) { toast.error(err.message) }
    setDistributing(false)
  }

  async function saveSh(e: React.FormEvent) {
    e.preventDefault()
    try {
      if (shModal === 'edit' && editSh) {
        await supabase.from('stakeholders').update(shForm).eq('id', editSh.id)
        toast.success('Stakeholder diperbarui')
      } else {
        await supabase.from('stakeholders').insert([shForm])
        toast.success('Stakeholder ditambahkan')
      }
      setShModal(null)
      startTransition(() => router.refresh())
    } catch (err: any) { toast.error(err.message) }
  }

  async function deleteSh(id: string) {
    if (!confirm('Hapus stakeholder ini?')) return
    await supabase.from('stakeholders').update({ is_active: false }).eq('id', id)
    startTransition(() => router.refresh())
  }

  const pieData = stakeholders.filter(s => s.is_active).map((s, i) => ({
    name: s.name, value: Number(s.profit_split_percentage), color: COLORS[i % COLORS.length],
  }))

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.3em] font-bold mb-1" style={{ color: 'var(--gold)' }}>Finance Module</p>
        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Profit Split & Dividen</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Kalkulasi laba bersih real-time dan distribusi ke stakeholder.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Stakeholder Management */}
        <div className="xl:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Stakeholder ({stakeholders.filter(s => s.is_active).length})
            </p>
            <button onClick={() => { setShForm({ name: '', type: 'INTERNAL', equity_percentage: 0, profit_split_percentage: 0, bank_name: '', bank_account_number: '', bank_account_holder: '', is_active: true }); setShModal('add') }}
              className="text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1"
              style={{ background: 'var(--gold-glow)', color: 'var(--gold)' }}>
              <Plus className="w-3 h-3" /> Tambah
            </button>
          </div>

          {/* Donut chart */}
          {pieData.length > 0 && (
            <div className="glass-card p-4">
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value">
                      {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className={`text-center text-xs font-bold mt-1 ${totalSplit === 100 ? 'text-emerald-500' : 'text-amber-500'}`}>
                Total Split: {totalSplit}% {totalSplit !== 100 && '⚠️ harus = 100%'}
              </p>
            </div>
          )}

          <div className="space-y-2">
            {stakeholders.filter(s => s.is_active).map((sh, i) => (
              <div key={sh.id} className="glass-card p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{sh.name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{sh.profit_split_percentage}% profit · {sh.equity_percentage}% equity</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditSh(sh); setShForm(sh); setShModal('edit') }}
                    className="p-1 rounded" style={{ color: 'var(--text-muted)' }}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteSh(sh.id)} className="p-1 rounded hover:text-red-500 transition-colors" style={{ color: 'var(--text-muted)' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Distribution Engine */}
        <div className="xl:col-span-2 space-y-4">
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Mesin Kalkulasi & Distribusi</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="section-label block mb-1.5">Divisi</label>
                <select className="select-field w-full" value={selectedEntity} onChange={e => setSelectedEntity(e.target.value)}>
                  {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="section-label block mb-1.5">Periode</label>
                <input type="month" className="input-field w-full px-3 py-2.5 text-sm rounded-md"
                  value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)} />
              </div>
            </div>

            <button onClick={calcNetProfit} disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '🔍 Hitung Net Profit'}
            </button>

            {netProfit !== null && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-xl space-y-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-widest font-bold mb-1" style={{ color: 'var(--text-muted)' }}>Net Profit</p>
                  <p className={`text-3xl font-black tabular-nums ${netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatRupiah(netProfit)}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {entities.find(e => e.id === selectedEntity)?.name} · {selectedPeriod}
                  </p>
                </div>

                {netProfit > 0 && (
                  <>
                    <div className="space-y-2">
                      {stakeholders.filter(s => s.is_active).map((sh, i) => {
                        const amt = netProfit * (Number(sh.profit_split_percentage) / 100)
                        return (
                          <div key={sh.id} className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                              <span style={{ color: 'var(--text-secondary)' }}>{sh.name} ({sh.profit_split_percentage}%)</span>
                            </div>
                            <span className="font-bold tabular-nums" style={{ color: COLORS[i % COLORS.length] }}>
                              {formatRupiah(Math.round(amt))}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    <div>
                      <label className="section-label block mb-1.5">Debet dari Rekening</label>
                      <select className="select-field w-full" value={selectedBank} onChange={e => setSelectedBank(e.target.value)}>
                        {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.account_name}</option>)}
                      </select>
                    </div>

                    <button onClick={distribute} disabled={distributing || totalSplit !== 100}
                      className="w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                      style={{ background: totalSplit === 100 ? 'var(--gold)' : 'var(--bg-secondary)', color: totalSplit === 100 ? '#050505' : 'var(--text-muted)' }}>
                      {distributing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Distribusikan Profit</>}
                    </button>
                    {totalSplit !== 100 && <p className="text-xs text-amber-500 text-center">Total split harus 100% sebelum distribusi</p>}
                  </>
                )}
              </motion.div>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="glass-card overflow-hidden">
              <p className="px-5 py-4 text-xs font-bold uppercase tracking-wider border-b" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}>Riwayat Distribusi</p>
              <table className="w-full text-sm">
                <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {history.map(h => (
                    <tr key={h.id}>
                      <td className="px-5 py-3">
                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{(h.stakeholders as any)?.name}</p>
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{h.period_month}</p>
                      </td>
                      <td className="px-5 py-3 text-right font-bold tabular-nums" style={{ color: '#10b981' }}>
                        {formatRupiah(Number(h.distributed_amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Stakeholder Modal */}
      <AnimatePresence>
        {shModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md p-6 rounded-xl space-y-4"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center justify-between">
                <h2 className="font-black" style={{ color: 'var(--text-primary)' }}>
                  {shModal === 'add' ? 'Tambah Stakeholder' : 'Edit Stakeholder'}
                </h2>
                <button onClick={() => setShModal(null)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={saveSh} className="space-y-3">
                <input className={inputCls} placeholder="Nama" required value={shForm.name} onChange={e => setShForm(p => ({ ...p, name: e.target.value }))} />
                <div className="grid grid-cols-2 gap-2">
                  <input className={inputCls} type="number" placeholder="Equity %" min={0} max={100}
                    value={shForm.equity_percentage} onChange={e => setShForm(p => ({ ...p, equity_percentage: Number(e.target.value) }))} />
                  <input className={inputCls} type="number" placeholder="Profit Split %" min={0} max={100}
                    value={shForm.profit_split_percentage} onChange={e => setShForm(p => ({ ...p, profit_split_percentage: Number(e.target.value) }))} />
                </div>
                <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-muted)' }}>Data Perbankan</p>
                <input className={inputCls} placeholder="Nama Bank" value={shForm.bank_name || ''} onChange={e => setShForm(p => ({ ...p, bank_name: e.target.value }))} />
                <input className={inputCls} placeholder="No. Rekening" value={shForm.bank_account_number || ''} onChange={e => setShForm(p => ({ ...p, bank_account_number: e.target.value }))} />
                <input className={inputCls} placeholder="Nama Pemilik Rekening" value={shForm.bank_account_holder || ''} onChange={e => setShForm(p => ({ ...p, bank_account_holder: e.target.value }))} />
                <button type="submit" className="w-full py-2.5 rounded-lg font-bold text-sm" style={{ background: 'var(--gold)', color: '#050505' }}>Simpan</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
