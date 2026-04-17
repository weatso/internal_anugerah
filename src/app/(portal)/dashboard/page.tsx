'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { formatRupiah, formatDate } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, DollarSign, FileText, FolderKanban, ArrowUpRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
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

    // --- P&L Data ---
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

    // --- Pending Invoices ---
    let invQ = supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('status', 'PENDING_APPROVAL')
    if (!isCeoOrFinance) invQ = invQ.eq('entity_id', profile!.entity_id)
    const { count: invCount } = await invQ
    setPendingInvoices(invCount ?? 0)

    // --- Unread Logs (CEO only) ---
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

  return (
    <div className="p-6 md:p-8 space-y-8 animate-[slide-up_0.4s_ease]">
      {/* Header */}
      <div>
        <p className="text-[#D4AF37] text-xs uppercase tracking-[0.3em] font-bold mb-1">Dashboard</p>
        <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight">
          Selamat datang, {profile?.full_name.split(' ')[0]}
        </h1>
        <p className="text-[--color-text-muted] text-sm mt-1">
          {isCeoOrFinance ? 'Ringkasan keuangan seluruh ekosistem Anugerah Ventures.' : `Ringkasan keuangan divisi ${profile?.entity?.name}.`}
        </p>
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
          suffix="invoice"
          href="/invoicing"
        />
      </div>

      {/* Unread Logs badge (CEO only) */}
      {profile?.role === 'CEO' && unreadLogs > 0 && (
        <Link href="/workspace" className="flex items-center justify-between glass-card px-5 py-4 border-l-4 border-[#D4AF37] hover:border-r-[#D4AF37]/30 group">
          <div className="flex items-center gap-3">
            <FolderKanban className="w-4 h-4 text-[#D4AF37]" />
            <div>
              <p className="text-[--color-text-primary] font-semibold text-sm">
                {unreadLogs} Log Belum Direview
              </p>
              <p className="text-[--color-text-muted] text-xs">Klik untuk buka Workspace</p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-[#D4AF37] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
      )}

      {/* P&L Chart */}
      {isCeoOrFinance && plData.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="text-[--color-text-primary] font-bold mb-1">P&L Per Divisi</h2>
          <p className="text-[--color-text-muted] text-xs mb-6">Perbandingan pemasukan vs pengeluaran</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={plData} barGap={4}>
                <XAxis dataKey="entity.name" tick={{ fill: '#737373', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`} />
                <Tooltip
                  contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#ededed' }}
                  formatter={(v: number) => formatRupiah(v)}
                />
                <Bar dataKey="income" name="Pemasukan" fill="#22c55e" radius={[4,4,0,0]} maxBarSize={40} />
                <Bar dataKey="expense" name="Pengeluaran" fill="#ef4444" radius={[4,4,0,0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* P&L Division Cards (CEO/FINANCE only) */}
      {isCeoOrFinance && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plData.map((d) => (
            <div key={d.entity.id} className="glass-card p-5">
              <p className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-3">{d.entity.name}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[--color-text-muted]">Pemasukan</span>
                  <span className="text-emerald-400 font-medium">{formatRupiah(d.income)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[--color-text-muted]">Pengeluaran</span>
                  <span className="text-red-400 font-medium">{formatRupiah(d.expense)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-[--color-border] pt-2">
                  <span className="text-[--color-text-primary] font-semibold">Net</span>
                  <span className={`font-bold ${d.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatRupiah(d.net)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Transactions */}
      {recentTx.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[--color-border]">
            <h2 className="text-[--color-text-primary] font-bold text-sm">Transaksi Terbaru</h2>
            <Link href="/finance/transactions" className="text-[#D4AF37] text-xs hover:underline">Lihat Semua</Link>
          </div>
          <div className="divide-y divide-[--color-border]">
            {recentTx.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-[--color-text-primary] text-sm font-medium">{tx.category}</p>
                  <p className="text-[--color-text-muted] text-xs">{tx.description ?? '—'} · {formatDate(tx.created_at)}</p>
                </div>
                <span className={`text-sm font-bold ${tx.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {tx.type === 'INCOME' ? '+' : '-'}{formatRupiah(tx.amount)}
                </span>
              </div>
            ))}
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
