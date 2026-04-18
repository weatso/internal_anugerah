'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, FileText, FolderKanban, ArrowUpRight, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { formatRupiah, formatDate } from '@/lib/utils'
import { getEntityAccentColor, getDivisionConfig } from '@/lib/division-config'
import type { Transaction } from '@/types'

const FADE_UP = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

export function DivisionCommandCenter() {
  const { profile, effectiveEntityId, effectiveEntity, isImpersonating } = useUser()
  const supabase = createClient()

  const [income, setIncome]   = useState(0)
  const [expense, setExpense] = useState(0)
  const [recentTx, setRecentTx] = useState<Transaction[]>([])
  const [pendingInvoices, setPendingInvoices] = useState(0)
  const [workspaceLogs, setWorkspaceLogs] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!effectiveEntityId) return
    fetchData()
  }, [effectiveEntityId])

  async function fetchData() {
    setLoading(true)
    const [
      { data: txData },
      { count: invCount },
      { count: logCount },
    ] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, entity:entities(*)')
        .eq('entity_id', effectiveEntityId!),
      supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('entity_id', effectiveEntityId!)
        .eq('status', 'PENDING_APPROVAL'),
      supabase
        .from('workspace_logs')
        .select('id', { count: 'exact', head: true })
        .eq('entity_id', effectiveEntityId!),
    ])

    const txs = (txData ?? []) as Transaction[]
    const inc = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
    const exp = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)
    setIncome(inc)
    setExpense(exp)
    setRecentTx(txs.slice(-5).reverse())
    setPendingInvoices(invCount ?? 0)
    setWorkspaceLogs(logCount ?? 0)
    setLoading(false)
  }

  const accentColor = getEntityAccentColor(effectiveEntity)
  const config      = getDivisionConfig(effectiveEntity?.name)
  const net         = income - expense
  const divName     = effectiveEntity?.name ?? profile?.entity?.name ?? 'Divisi'
  const firstName   = profile?.full_name.split(' ')[0] ?? ''
  const roleLabel   = profile?.role === 'CEO' && isImpersonating ? 'CEO (Viewing)' : profile?.role

  const barData = [
    { name: 'Pemasukan', value: income },
    { name: 'Pengeluaran', value: expense },
    { name: 'Net', value: Math.abs(net) },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: accentColor, borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden" animate="show"
      variants={{ show: { transition: { staggerChildren: 0.07 } } }}
      className="p-4 md:p-6 lg:p-8 space-y-6"
    >
      {/* Header */}
      <motion.div variants={FADE_UP} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{config.emoji}</span>
            <p className="text-xs uppercase tracking-[0.3em] font-bold" style={{ color: accentColor }}>
              {divName} · {roleLabel}
            </p>
          </div>
          <h1 className="text-[--color-text-primary] text-2xl md:text-3xl font-black tracking-tight">
            Halo, {firstName}
          </h1>
          <p className="text-[--color-text-muted] text-sm mt-1">{config.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/invoicing/create"
            className="flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-md transition-colors"
            style={{ background: accentColor, color: '#050505' }}>
            <Plus className="w-3.5 h-3.5" /> Invoice
          </Link>
          <Link href="/workspace/create"
            className="flex items-center gap-2 border text-[--color-text-secondary] text-xs font-bold px-3 py-2 rounded-md hover:text-[--color-text-primary] hover:bg-white/5 transition-colors"
            style={{ borderColor: `${accentColor}30` }}>
            <Plus className="w-3.5 h-3.5" /> Log
          </Link>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={FADE_UP} className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Pemasukan', value: formatRupiah(income), icon: <TrendingUp className="w-4 h-4" />, color: '#10b981' },
          { label: 'Pengeluaran', value: formatRupiah(expense), icon: <TrendingDown className="w-4 h-4" />, color: '#ef4444' },
          { label: 'Net P/L', value: formatRupiah(net), icon: null, color: net >= 0 ? '#10b981' : '#ef4444' },
          { label: 'Invoice Pending', value: String(pendingInvoices), icon: <FileText className="w-4 h-4" />, color: '#D4AF37',
            href: '/invoicing', pulse: pendingInvoices > 0 },
        ].map((kpi) => {
          const Wrapper = kpi.href ? Link : 'div' as any
          return (
            <Wrapper key={kpi.label} href={kpi.href ?? '#'}
              className={`glass-card p-4 flex flex-col gap-2 transition-all hover:scale-[1.01] ${kpi.pulse ? 'animate-pulse hover:animate-none' : ''}`}
              style={{ borderColor: `${kpi.color}25` }}>
              <div className="flex items-center justify-between">
                <p className="text-[--color-text-muted] text-xs uppercase tracking-wider">{kpi.label}</p>
                {kpi.icon && <div className="p-1.5 rounded-md" style={{ background: `${kpi.color}15`, color: kpi.color }}>{kpi.icon}</div>}
              </div>
              <p className="text-lg font-black tabular-nums" style={{ color: kpi.color }}>{kpi.value}</p>
            </Wrapper>
          )
        })}
      </motion.div>

      {/* Bar Chart */}
      <motion.div variants={FADE_UP} className="glass-card p-5 md:p-6">
        <h2 className="text-[--color-text-primary] font-bold mb-1 text-sm">P&L Overview</h2>
        <p className="text-[--color-text-muted] text-xs mb-5">Semua waktu · {divName}</p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} barSize={48}>
              <XAxis dataKey="name" tick={{ fill: '#737373', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`} />
              <Tooltip
                contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }}
                formatter={(v: any) => formatRupiah(Number(v))}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}
                fill={accentColor} fillOpacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Recent Transactions + Workspace summary */}
      <motion.div variants={FADE_UP} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Transactions */}
        <div className="lg:col-span-2 glass-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[--color-border]">
            <h2 className="text-[--color-text-primary] font-bold text-sm">Transaksi Terbaru</h2>
            <Link href="/finance/transactions" className="text-xs font-semibold hover:underline" style={{ color: accentColor }}>
              Lihat semua →
            </Link>
          </div>
          {recentTx.length === 0 ? (
            <p className="text-[--color-text-muted] text-sm text-center py-8">Belum ada transaksi.</p>
          ) : (
            <div className="divide-y divide-[--color-border]">
              {recentTx.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-[--color-text-primary] text-sm font-medium">{tx.category}</p>
                    <p className="text-[--color-text-muted] text-xs mt-0.5">{formatDate(tx.created_at)}</p>
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${tx.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {tx.type === 'INCOME' ? '+' : '−'}{formatRupiah(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Workspace Quick */}
        <div className="glass-card p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <FolderKanban className="w-4 h-4" style={{ color: accentColor }} />
            <h2 className="text-[--color-text-primary] font-bold text-sm">Workspace</h2>
          </div>
          <p className="text-4xl font-black mb-1" style={{ color: accentColor }}>{workspaceLogs}</p>
          <p className="text-[--color-text-muted] text-xs mb-6">Total log tercatat</p>
          <Link href="/workspace"
            className="flex items-center justify-between text-sm font-semibold p-3 rounded-md border transition-all hover:opacity-80 mt-auto"
            style={{ borderColor: `${accentColor}30`, color: accentColor }}>
            Buka Workspace
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>
    </motion.div>
  )
}
