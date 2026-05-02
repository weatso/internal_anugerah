'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { formatRupiah } from '@/lib/utils'
import { BarChart3, Loader2, FileDown, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Entity { id: string; name: string; type: string }
interface PnLLine { account_class: string; account_name: string; account_code: string; balance: number }

export default function PnLClient({ entities }: { entities: Entity[] }) {
  const supabase = createClient()
  const [selectedEntity, setSelectedEntity] = useState(entities[0]?.id || '')
  const [periodMonth, setPeriodMonth] = useState(() => {
    const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
  })
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<PnLLine[] | null>(null)

  // Auto-generate on mount for current month
  useEffect(() => { if (entities[0]?.id) generateReport() }, [])

  async function generateReport() {
    if (!selectedEntity || !periodMonth) return
    setLoading(true)
    setReport(null)
    try {
      const [year, month] = periodMonth.split('-').map(Number)
      const start = `${periodMonth}-01`
      const end = new Date(year, month, 0).toISOString().slice(0, 10)

      const { data: journals } = await supabase.from('journal_entries')
        .select('id').eq('entity_id', selectedEntity).eq('status', 'APPROVED')
        .gte('transaction_date', start).lte('transaction_date', end)

      const ids = (journals || []).map((j: any) => j.id)
      if (!ids.length) { toast.error('Tidak ada transaksi di periode ini'); setLoading(false); return }

      const { data: lines } = await supabase.from('journal_lines')
        .select('debit, credit, chart_of_accounts(account_class, account_name, account_code)')
        .in('journal_id', ids)

      // Aggregate by account
      const agg: Record<string, { account_class: string; account_name: string; account_code: string; debit: number; credit: number }> = {}
      for (const line of (lines || []) as any[]) {
        const coa = line.chart_of_accounts
        if (!coa) continue
        const key = coa.account_code
        if (!agg[key]) agg[key] = { account_class: coa.account_class, account_name: coa.account_name, account_code: coa.account_code, debit: 0, credit: 0 }
        agg[key].debit += Number(line.debit)
        agg[key].credit += Number(line.credit)
      }

      // Calculate balance per account class
      const result: PnLLine[] = Object.values(agg).map(a => {
        let balance = 0
        if (a.account_class === 'REVENUE') balance = a.credit - a.debit   // Revenue: credit normal
        if (a.account_class === 'COGS' || a.account_class === 'EXPENSE') balance = a.debit - a.credit  // Cost: debit normal
        return { ...a, balance }
      }).filter(a => ['REVENUE', 'COGS', 'EXPENSE'].includes(a.account_class))

      setReport(result)
    } catch (err: any) { toast.error(err.message) }
    setLoading(false)
  }

  // Compute P&L structure
  const revenues = report?.filter(r => r.account_class === 'REVENUE') || []
  const cogs = report?.filter(r => r.account_class === 'COGS') || []
  const expenses = report?.filter(r => r.account_class === 'EXPENSE') || []
  const totalRevenue = revenues.reduce((s, r) => s + r.balance, 0)
  const totalCOGS = cogs.reduce((s, r) => s + r.balance, 0)
  const grossProfit = totalRevenue - totalCOGS
  const totalExpense = expenses.reduce((s, r) => s + r.balance, 0)
  const netProfit = grossProfit - totalExpense
  const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0'
  const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0'

  const Section = ({ title, items, total, color }: { title: string; items: PnLLine[]; total: number; color: string }) => (
    <div className="space-y-1">
      <p className="text-[10px] font-black uppercase tracking-widest px-4 py-2" style={{ color, background: `${color}10` }}>{title}</p>
      {items.map(item => (
        <div key={item.account_code} className="flex justify-between px-4 py-1.5 text-sm">
          <div>
            <span className="font-mono text-[10px] mr-2" style={{ color: 'var(--text-muted)' }}>{item.account_code}</span>
            <span style={{ color: 'var(--text-secondary)' }}>{item.account_name}</span>
          </div>
          <span className="font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatRupiah(item.balance)}</span>
        </div>
      ))}
      <div className="flex justify-between px-4 py-2 font-bold border-t" style={{ borderColor: `${color}30`, color }}>
        <span>Total {title}</span>
        <span className="font-mono tabular-nums">{formatRupiah(total)}</span>
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] font-bold mb-1" style={{ color: 'var(--gold)' }}>Finance</p>
        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Laporan Keuangan (P&L)</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Profit & Loss Statement dari General Ledger — real-time & akurat.</p>
      </div>

      {/* Selector */}
      <div className="glass-card p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="section-label block mb-1.5">Entitas / Divisi</label>
            <select className="select-field w-full" value={selectedEntity} onChange={e => setSelectedEntity(e.target.value)}>
              {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="section-label block mb-1.5">Periode</label>
            <input type="month" className="input-field w-full px-3 py-2.5 text-sm rounded-md"
              value={periodMonth} onChange={e => setPeriodMonth(e.target.value)} />
          </div>
          <button onClick={generateReport} disabled={loading}
            className="flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg font-bold text-sm"
            style={{ background: 'var(--gold)', color: '#050505' }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><BarChart3 className="w-4 h-4" /> Generate Laporan</>}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {report && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Pendapatan', value: totalRevenue, color: '#10b981', icon: TrendingUp },
              { label: 'Gross Profit', value: grossProfit, color: '#6366f1', suffix: `(${grossMargin}%)`, icon: TrendingUp },
              { label: 'Total Beban', value: totalExpense, color: '#f97316', icon: TrendingDown },
              { label: 'Net Profit', value: netProfit, color: netProfit >= 0 ? '#10b981' : '#ef4444', suffix: `(${netMargin}%)`, icon: netProfit >= 0 ? TrendingUp : TrendingDown },
            ].map(kpi => (
              <div key={kpi.label} className="glass-card p-4" style={{ borderLeftColor: kpi.color, borderLeftWidth: 2 }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{kpi.label}</p>
                  <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
                <p className="text-lg font-black tabular-nums" style={{ color: kpi.color }}>{formatRupiah(kpi.value)}</p>
                {kpi.suffix && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{kpi.suffix}</p>}
              </div>
            ))}
          </div>

          {/* Full P&L Statement */}
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
              <div>
                <p className="font-black" style={{ color: 'var(--text-primary)' }}>
                  {entities.find(e => e.id === selectedEntity)?.name} — {periodMonth}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Profit & Loss Statement</p>
              </div>
              <button onClick={() => window.print()}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                <FileDown className="w-3.5 h-3.5" /> Cetak / PDF
              </button>
            </div>

            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              <Section title="Pendapatan (Revenue)" items={revenues} total={totalRevenue} color="#10b981" />

              <Section title="Harga Pokok Penjualan (COGS)" items={cogs} total={totalCOGS} color="#f97316" />

              {/* Gross Profit */}
              <div className="flex justify-between px-4 py-3 font-black text-base border-y-2"
                style={{ borderColor: '#6366f1', background: 'rgba(99,102,241,0.05)' }}>
                <span style={{ color: '#6366f1' }}>GROSS PROFIT</span>
                <span className="font-mono tabular-nums" style={{ color: '#6366f1' }}>{formatRupiah(grossProfit)}</span>
              </div>

              <Section title="Beban Operasional (Expense)" items={expenses} total={totalExpense} color="#ef4444" />

              {/* Net Profit */}
              <div className="flex justify-between px-4 py-4 font-black text-lg"
                style={{ background: netProfit >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)' }}>
                <span style={{ color: netProfit >= 0 ? '#10b981' : '#ef4444' }}>NET PROFIT / LOSS</span>
                <span className="font-mono tabular-nums" style={{ color: netProfit >= 0 ? '#10b981' : '#ef4444' }}>
                  {formatRupiah(netProfit)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {!report && !loading && (
        <div className="text-center py-20 glass-card">
          <BarChart3 className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="font-bold" style={{ color: 'var(--text-primary)' }}>Pilih entitas & periode, lalu klik Generate</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Laporan diambil langsung dari General Ledger (journal_lines)</p>
        </div>
      )}
    </div>
  )
}
