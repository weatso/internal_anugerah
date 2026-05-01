'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, FileText, FolderKanban, ArrowUpRight, Plus, ArrowLeft, Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { formatRupiah, formatDate } from '@/lib/utils'
import { getEntityAccentColor, getDivisionConfig } from '@/lib/division-config'
import type { JournalEntry } from '@/types'

const FADE_UP = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

interface DivisionCommandCenterProps {
  /** Jika true: CEO sedang impersonate → tampilkan banner + tombol back */
  isCEOImpersonating?: boolean
}

export function DivisionCommandCenter({ isCEOImpersonating = false }: DivisionCommandCenterProps) {
  const { profile, effectiveEntityId, effectiveEntity, isImpersonating, impersonate, highestRole } = useUser()
  const supabase = createClient()

  const [income, setIncome]   = useState(0)
  const [expense, setExpense] = useState(0)
  const [recentJournals, setRecentJournals] = useState<JournalEntry[]>([])
  const [pendingInvoices, setPendingInvoices] = useState(0)
  const [workspaceLogs, setWorkspaceLogs] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!effectiveEntityId) return
    fetchData()
  }, [effectiveEntityId])

  async function fetchData() {
    setLoading(true)
    try {
      const [
        { data: journalData },
        { count: invCount },
        { count: logCount },
      ] = await Promise.all([
        supabase
          .from('journal_entries')
          .select('*, lines:journal_lines(*, account:chart_of_accounts(*))')
          .eq('entity_id', effectiveEntityId!)
          .eq('status', 'APPROVED'),
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

      const journals = (journalData ?? []) as JournalEntry[]
      let inc = 0, exp = 0

      journals.forEach(j => {
        j.lines?.forEach(l => {
          const accClass = l.account?.account_class
          if (accClass === 'REVENUE') inc += (l.credit - l.debit)
          if (accClass === 'EXPENSE' || accClass === 'COGS') exp += (l.debit - l.credit)
        })
      })

      setIncome(inc)
      setExpense(exp)
      setRecentJournals(journals.slice(-5).reverse())
      setPendingInvoices(invCount ?? 0)
      setWorkspaceLogs(logCount ?? 0)
    } catch (e) {
      console.error('[DivisionCommandCenter] fetchData error:', e)
    } finally {
      setLoading(false)
    }
  }

  const accentColor = getEntityAccentColor(effectiveEntity)
  const config      = getDivisionConfig(effectiveEntity?.name)
  const net         = income - expense
  const divName     = effectiveEntity?.name ?? profile?.entity?.name ?? 'Divisi'
  const firstName   = profile?.full_name?.split(' ')[0] ?? ''

  const barData = [
    { name: 'Pemasukan', value: income },
    { name: 'Pengeluaran', value: expense },
    { name: 'Net', value: Math.abs(net) },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: accentColor, borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="relative">
      {/* ── CEO Impersonate Banner ─────────────────────────────────────────── */}
      {isCEOImpersonating && (
        <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-2.5"
          style={{ background: `${accentColor}18`, borderBottom: `1px solid ${accentColor}40` }}>
          <div className="flex items-center gap-2.5">
            <div className="p-1 rounded" style={{ background: `${accentColor}25` }}>
              <Eye className="w-3.5 h-3.5" style={{ color: accentColor }} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: accentColor }}>
              Impersonate Mode
            </p>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              — Anda melihat tampilan sebagai <strong style={{ color: accentColor }}>HEAD {divName}</strong>
            </span>
          </div>
          <button
            onClick={() => impersonate(null)}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-sm transition-all hover:opacity-80"
            style={{ background: accentColor, color: '#050505' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke CEO HQ
          </button>
        </div>
      )}

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
                {divName} · {isCEOImpersonating ? 'HEAD (via CEO)' : (highestRole ?? 'HEAD')}
              </p>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Halo, {firstName}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{config.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/workspace/create"
              className="flex items-center gap-2 border text-xs font-bold px-3 py-2 rounded-sm transition-all hover:opacity-80"
              style={{ borderColor: `${accentColor}40`, color: accentColor }}>
              <Plus className="w-3.5 h-3.5" /> Log Baru
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
                  <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{kpi.label}</p>
                  {kpi.icon && <div className="p-1.5 rounded-md" style={{ background: `${kpi.color}15`, color: kpi.color }}>{kpi.icon}</div>}
                </div>
                <p className="text-lg font-black tabular-nums" style={{ color: kpi.color }}>{kpi.value}</p>
              </Wrapper>
            )
          })}
        </motion.div>

        {/* Bar Chart */}
        <motion.div variants={FADE_UP} className="glass-card p-5 md:p-6">
          <h2 className="font-bold mb-1 text-sm" style={{ color: 'var(--text-primary)' }}>P&L Overview</h2>
          <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>Semua waktu · {divName}</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barSize={48}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)' }}
                  formatter={(v: any) => formatRupiah(Number(v))}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} fill={accentColor} fillOpacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Recent Transactions + Workspace summary */}
        <motion.div variants={FADE_UP} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Transactions */}
          <div className="lg:col-span-2 glass-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Transaksi Terbaru</h2>
              <Link href="/finance/transactions" className="text-xs font-semibold hover:underline" style={{ color: accentColor }}>
                Lihat semua →
              </Link>
            </div>
            {recentJournals.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Belum ada transaksi.</p>
            ) : (
              <div style={{ borderColor: 'var(--border-subtle)' }}>
                {recentJournals.map((j) => {
                  const isIncome = j.lines?.some(l => l.account?.account_class === 'REVENUE')
                  const category = j.lines?.find(l => !l.account?.is_bank)?.account?.account_name || 'N/A'
                  const amount = j.lines?.reduce((s, l) => s + (l.account?.is_bank ? Math.max(l.debit, l.credit) : 0), 0) || 0
                  return (
                    <div key={j.id} className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{category}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatDate(j.transaction_date)}</p>
                      </div>
                      <span className={`text-sm font-bold tabular-nums ${isIncome ? 'text-emerald-500' : 'text-red-500'}`}>
                        {isIncome ? '+' : '−'}{formatRupiah(amount)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Workspace Quick */}
          <div className="glass-card p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <FolderKanban className="w-4 h-4" style={{ color: accentColor }} />
              <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Workspace</h2>
            </div>
            <p className="text-4xl font-black mb-1" style={{ color: accentColor }}>{workspaceLogs}</p>
            <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>Total log tercatat</p>
            <Link href="/workspace"
              className="flex items-center justify-between text-sm font-semibold p-3 rounded-sm border transition-all hover:opacity-80 mt-auto"
              style={{ borderColor: `${accentColor}30`, color: accentColor }}>
              Buka Workspace
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
