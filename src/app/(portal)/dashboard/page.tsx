'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { formatRupiah, formatDate, cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, FileText, FolderKanban, ArrowUpRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { Entity, Transaction } from '@/types'
import Link from 'next/link'

interface PLData {
  entity: Entity
  income: number
  expense: number
  net: number
}

export default function DashboardPage() {
  const { profile, loading: userLoading } = useUser()
  const supabase = createClient()
  const [plData, setPlData] = useState<PLData[]>([])
  const [recentTx, setRecentTx] = useState<Transaction[]>([])
  const [pendingInvoices, setPendingInvoices] = useState(0)
  const [unreadLogs, setUnreadLogs] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    fetchData()
  }, [profile])

  async function fetchData() {
    setLoading(true)
    const isCeoOrFinance = profile?.role === 'CEO' || profile?.role === 'FINANCE'

    let txQuery = supabase.from('transactions').select('*, entity:entities(id,name,type,logo_key,primary_color)')
    if (!isCeoOrFinance) txQuery = txQuery.eq('entity_id', profile!.entity_id)

    const { data: txData } = await txQuery
    if (txData) {
      setRecentTx((txData as Transaction[]).slice(0, 5))
      const grouped = new Map<string, PLData>()
      for (const tx of txData as Transaction[]) {
        const key = tx.entity_id
        if (!grouped.has(key)) {
          grouped.set(key, { entity: tx.entity!, income: 0, expense: 0, net: 0 })
        }
        const g = grouped.get(key)!
        if (tx.type === 'INCOME') g.income += tx.amount
        else g.expense += tx.amount
        g.net = g.income - g.expense
      }
      setPlData(Array.from(grouped.values()))
    }

    let invQ = supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('status', 'PENDING_APPROVAL')
    if (!isCeoOrFinance) invQ = invQ.eq('entity_id', profile!.entity_id)
    const { count: invCount } = await invQ
    setPendingInvoices(invCount ?? 0)

    if (profile?.role === 'CEO') {
      const { count: logCount } = await supabase
        .from('workspace_logs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'SUBMITTED')
      setUnreadLogs(logCount ?? 0)
    }

    setLoading(false)
  }

  const totalIncome = plData.reduce((s, d) => s + d.income, 0)
  const totalExpense = plData.reduce((s, d) => s + d.expense, 0)
  const totalNet = totalIncome - totalExpense

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const isCeoOrFinance = profile?.role === 'CEO' || profile?.role === 'FINANCE'
  const isCeo = profile?.role === 'CEO'


  return (
    <div className="p-6 md:p-8 space-y-8 animate-[slide-up_0.4s_ease]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className={cn("text-xs uppercase tracking-[0.3em] font-bold mb-1", isCeo ? "text-amber-500" : "text-[#D4AF37]")}>
            {isCeo ? "EXECUTIVE OVERVIEW" : "Dashboard"}
          </p>
          <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight flex items-center gap-2">
            Selamat datang, {profile?.full_name.split(' ')[0]}
            {isCeo && <span className="bg-amber-500/10 text-amber-500 text-[10px] px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-widest ml-2">CEO Mode</span>}
          </h1>
          <p className="text-[--color-text-muted] text-sm mt-1">
            {isCeoOrFinance ? 'Ringkasan performa finansial seluruh ekosistem Anugerah Ventures.' : `Ringkasan performa divisi ${profile?.entity?.name}.`}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Pemasukan"
          value={formatRupiah(totalIncome)}
          icon={<TrendingUp className="w-4 h-4" />}
          color="emerald"
        />
        <KpiCard
          label="Total Pengeluaran"
          value={formatRupiah(totalExpense)}
          icon={<TrendingDown className="w-4 h-4" />}
          color="red"
        />
        <KpiCard
          label="Net Profit/Loss"
          value={formatRupiah(totalNet)}
          icon={<Minus className="w-4 h-4" />}
          color={totalNet >= 0 ? 'emerald' : 'red'}
        />
        <KpiCard
          label="Invoice Pending"
          value={String(pendingInvoices)}
          icon={<FileText className="w-4 h-4" />}
          color="amber"
          suffix={pendingInvoices > 0 ? "Butuh approval" : "Semua clear"}
          href="/invoicing"
        />
      </div>

      {/* Unread Logs badge (CEO only) */}
      {isCeo && unreadLogs > 0 && (
        <Link href="/workspace" className="flex items-center justify-between glass-card px-5 py-4 border-l-4 border-amber-500 hover:border-r-amber-500/30 group animate-pulse hover:animate-none">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <FolderKanban className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-[--color-text-primary] font-bold text-sm">
                {unreadLogs} Laporan divisi menunggu review
              </p>
              <p className="text-[--color-text-muted] text-xs mt-0.5">Buka Workspace untuk melihat detail progress setiap Head.</p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-amber-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
      )}

      {/* P&L Chart */}
      {isCeoOrFinance && plData.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-[--color-text-primary] font-bold mb-1">Perbandingan P&L Divisi</h2>
          <p className="text-[--color-text-muted] text-xs mb-6">Analisis pemasukan vs pengeluaran antar unit bisnis</p>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={plData} barGap={4} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <XAxis dataKey="entity.name" tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ background: '#050505', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#ededed' }}
                  formatter={(v: any) => formatRupiah(Number(v))}
                />
                <Bar dataKey="income" name="Pemasukan" fill="#10b981" radius={[4,4,0,0]} maxBarSize={48} />
                <Bar dataKey="expense" name="Pengeluaran" fill="#ef4444" radius={[4,4,0,0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* P&L Division Cards (CEO/FINANCE only) */}
      {isCeoOrFinance && (
        <div>
          <h2 className="text-[--color-text-primary] font-bold text-sm mb-4">Breakdown Ekosistem</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plData.map((d) => (
              <div key={d.entity.id} className="glass-card p-5 group hover:border-[#D4AF37]/30 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[--color-text-primary] font-bold">{d.entity.name}</p>
                  <span className="text-[10px] text-[--color-text-muted] uppercase tracking-wider">{d.entity.type}</span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[--color-text-muted]">Income</span>
                    <span className="text-emerald-400 font-medium">{formatRupiah(d.income)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-b border-[--color-border] pb-3">
                    <span className="text-[--color-text-muted]">Expense</span>
                    <span className="text-red-400 font-medium">{formatRupiah(d.expense)}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-[--color-text-primary] text-xs font-bold uppercase tracking-widest">Net Realized</span>
                    <span className={`font-bold ${d.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatRupiah(d.net)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {recentTx.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[--color-border] bg-white/[0.01]">
            <h2 className="text-[--color-text-primary] font-bold text-sm">Aktivitas Finansial Terbaru</h2>
            <Link href="/finance/transactions" className="text-[#D4AF37] text-xs font-semibold hover:underline">Lihat Detail →</Link>
          </div>
          <div className="divide-y divide-[--color-border] overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-[--color-border]">
                {recentTx.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-3">
                      <p className="text-[--color-text-primary] font-medium">{tx.category}</p>
                      <p className="text-[--color-text-muted] text-xs mt-0.5">{tx.description ?? '—'} · {formatDate(tx.created_at)}</p>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className={`font-bold tabular-nums ${tx.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {tx.type === 'INCOME' ? '+' : '-'}{formatRupiah(tx.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, icon, color, suffix, href }: {
  label: string; value: string; icon: React.ReactNode
  color: 'emerald' | 'red' | 'amber'; suffix?: string; href?: string
}) {
  const colorMap = {
    emerald: 'text-emerald-400 bg-emerald-400/10',
    red: 'text-red-400 bg-red-400/10',
    amber: 'text-amber-400 bg-amber-400/10',
  }
  const Wrapper = href ? Link : 'div'
  return (
    <Wrapper href={href ?? '#'} className="glass-card p-5 hover:border-[--color-border-hover] transition-all group">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[--color-text-muted] text-xs uppercase tracking-widest">{label}</p>
        <div className={`p-1.5 rounded-md ${colorMap[color]}`}>{icon}</div>
      </div>
      <p className={`text-xl font-black ${colorMap[color].split(' ')[0]}`}>{value}</p>
      {suffix && <p className="text-[--color-text-muted] text-xs mt-1">{suffix}</p>}
    </Wrapper>
  )
}
