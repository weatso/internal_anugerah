'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'

export default function ProjectProfitability({ projectId, spkId, isCEOOrFinance, accentColor }: { projectId: string, spkId: string, isCEOOrFinance: boolean, accentColor: string }) {
  const [loading, setLoading] = useState(true)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    if (!isCEOOrFinance) return

    async function fetchData() {
      // 1. Ambil Total Paid Invoices yang terikat ke SPK ini
      const { data: invoices } = await supabase
        .from('commercial_documents')
        .select('grand_total')
        .or(`id.eq.${spkId},parent_id.eq.${spkId}`)
        .eq('status', 'PAID')

      const revenue = (invoices || []).reduce((acc, curr) => acc + Number(curr.grand_total), 0)
      setTotalRevenue(revenue)

      // 2. Ambil Total Expenses yang terikat ke Project ID
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('project_id', projectId)

      const expenseTotal = (expenses || []).reduce((acc, curr) => acc + Number(curr.amount), 0)
      setTotalExpenses(expenseTotal)

      setLoading(false)
    }

    fetchData()
  }, [projectId, spkId, isCEOOrFinance])

  if (!isCEOOrFinance) return null
  if (loading) return null

  const margin = totalRevenue - totalExpenses
  const marginPercentage = totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0

  let marginColor = '#ef4444' // Red (Danger)
  if (marginPercentage > 30) marginColor = '#10b981' // Green (Healthy)
  else if (marginPercentage >= 10) marginColor = '#f59e0b' // Yellow (Warning)

  return (
    <div className="p-5 rounded-xl border mt-6" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4" style={{ color: accentColor }} />
        <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Project Profitability (Margin)</h2>
        <span className="ml-auto px-2 py-0.5 rounded text-[9px] font-bold uppercase" style={{ background: 'rgba(212,175,55,0.1)', color: 'var(--gold)' }}>Internal / CEO Only</span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Revenue */}
        <div className="p-3 rounded-lg bg-white/5 border border-white/5">
          <p className="text-[10px] text-neutral-400 uppercase tracking-widest mb-1">Paid Revenue</p>
          <p className="text-sm font-black text-white">{formatRupiah(totalRevenue)}</p>
        </div>

        {/* Expenses */}
        <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
          <p className="text-[10px] text-red-400/80 uppercase tracking-widest mb-1">Total Expenses</p>
          <p className="text-sm font-black text-red-400">{formatRupiah(totalExpenses)}</p>
        </div>

        {/* Margin */}
        <div className="p-3 rounded-lg border flex flex-col justify-center" style={{ background: `${marginColor}10`, borderColor: `${marginColor}25` }}>
          <div className="flex items-center gap-1.5 mb-1">
            {marginPercentage > 30 ? <TrendingUp className="w-3 h-3" style={{ color: marginColor }} /> : <TrendingDown className="w-3 h-3" style={{ color: marginColor }} />}
            <p className="text-[10px] uppercase tracking-widest" style={{ color: marginColor }}>Margin</p>
          </div>
          <p className="text-sm font-black" style={{ color: marginColor }}>
            {formatRupiah(margin)} <span className="text-[11px] font-bold">({marginPercentage.toFixed(1)}%)</span>
          </p>
        </div>
      </div>
    </div>
  )
}
