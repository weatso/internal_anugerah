'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { FileText, FolderKanban, Plus, TrendingDown, Wallet, Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { formatRupiah, formatDate } from '@/lib/utils'
import { getEntityAccentColor, getDivisionConfig } from '@/lib/division-config'
import type { Entity, JournalEntry } from '@/types'

interface MonthlyPoint {
  month: string
  [entityName: string]: number | string
}

interface PLData {
  entity: Entity
  income: number
  expense: number
  net: number
}

const FADE_UP = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0 },
}

export function CEOCommandCenter() {
  const { profile, impersonate } = useUser()
  const supabase = createClient()

  const [entities, setEntities]             = useState<Entity[]>([])
  const [plData, setPLData]                 = useState<PLData[]>([])
  const [chartData, setChartData]           = useState<MonthlyPoint[]>([])
  const [pendingInvoices, setPendingInvoices] = useState(0)
  const [unreadLogs, setUnreadLogs]         = useState(0)
  const [cashOnHand, setCashOnHand]         = useState(0)
  const [burnRate, setBurnRate]             = useState(0)
  const [loading, setLoading]               = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)

    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const [
      { data: journalAll },
      { data: entitiesData },
      { count: invCount },
      { count: logCount },
    ] = await Promise.all([
      supabase
        .from('journal_entries')
        .select('*, entity:entities(id,name,type,primary_color,logo_key), lines:journal_lines(*, account:chart_of_accounts(*))')
        .eq('status', 'APPROVED')
        .gte('transaction_date', sixMonthsAgo.toISOString().split('T')[0]),
      supabase.from('entities').select('*').order('type').order('name'),
      supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('status', 'PENDING_APPROVAL'),
      supabase.from('workspace_logs').select('id', { count: 'exact', head: true }).eq('status', 'SUBMITTED'),
    ])

    const journals = (journalAll ?? []) as JournalEntry[]
    const divEntities = (entitiesData ?? []) as Entity[]
    setEntities(divEntities)

    // ── P&L per entity ──────────────────────────────────────────────────────
    const plMap = new Map<string, PLData>()
    for (const j of journals) {
      if (!j.entity) continue
      const key = j.entity_id
      if (!plMap.has(key)) plMap.set(key, { entity: j.entity!, income: 0, expense: 0, net: 0 })
      const g = plMap.get(key)!
      
      j.lines?.forEach(l => {
        const accClass = l.account?.account_class
        if (accClass === 'REVENUE') g.income += (l.credit - l.debit)
        if (accClass === 'EXPENSE' || accClass === 'COGS') g.expense += (l.debit - l.credit)
      })
      g.net = g.income - g.expense
    }
    const pl = Array.from(plMap.values())
    setPLData(pl)

    // ── Cash on Hand (Holding entity) ────────────────────────────────────────
    const holdingPL = pl.find(d => d.entity.type === 'HOLDING')
    setCashOnHand(holdingPL?.net ?? 0)

    // ── Burn Rate: avg monthly expense last 6 months ─────────────────────────
    let totalExp = 0
    journals.forEach(j => {
      j.lines?.forEach(l => {
        if (l.account?.account_class === 'EXPENSE' || l.account?.account_class === 'COGS') {
          totalExp += (l.debit - l.credit)
        }
      })
    })
    setBurnRate(totalExp / 6)

    // ── Monthly chart data ───────────────────────────────────────────────────
    const monthMap = new Map<string, MonthlyPoint>()
    for (const j of journals) {
      if (!j.entity || j.entity.type === 'HOLDING') continue
      const mo = j.transaction_date.slice(0, 7) // YYYY-MM
      if (!monthMap.has(mo)) monthMap.set(mo, { month: mo })
      const pt = monthMap.get(mo)!
      const eName = j.entity.name
      const cur = (pt[eName] as number) ?? 0
      
      let netJ = 0
      j.lines?.forEach(l => {
        const accClass = l.account?.account_class
        if (accClass === 'REVENUE') netJ += (l.credit - l.debit)
        if (accClass === 'EXPENSE' || accClass === 'COGS') netJ -= (l.debit - l.credit)
      })
      pt[eName] = cur + netJ
    }
    setChartData(Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month)))

    setPendingInvoices(invCount ?? 0)
    setUnreadLogs(logCount ?? 0)
    setLoading(false)
  }

  const divisionEntities = entities.filter(e => e.type === 'DIVISION')
  const firstName = profile?.full_name.split(' ')[0] ?? ''

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden" animate="show"
      variants={{ show: { transition: { staggerChildren: 0.07 } } }}
      className="p-4 md:p-6 lg:p-8 space-y-6"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.div variants={FADE_UP} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-amber-500 text-xs uppercase tracking-[0.35em] font-bold mb-1">Global Command Center</p>
          <h1 className="text-[--color-text-primary] text-2xl md:text-3xl font-black tracking-tight">
            Halo, CEO <span className="text-[#D4AF37]">{firstName}</span>
          </h1>
          <p className="text-[--color-text-muted] text-sm mt-1">
            Ekosistem Anugerah Ventures · Real-time overview
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/invoicing/create"
            className="flex items-center gap-2 bg-[#D4AF37] text-[#050505] text-xs font-bold px-3 py-2 rounded-md hover:bg-[#F5D678] transition-colors">
            <Plus className="w-3.5 h-3.5" /> Invoice
          </Link>
          <Link href="/workspace/create"
            className="flex items-center gap-2 border border-white/10 text-[--color-text-secondary] text-xs font-bold px-3 py-2 rounded-md hover:text-[--color-text-primary] hover:bg-white/5 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Log
          </Link>
        </div>
      </motion.div>

      {/* ── KPI Bento Grid ──────────────────────────────────────────────── */}
      <motion.div variants={FADE_UP} className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <BentoKPI
          label="Cash on Hand"
          value={formatRupiah(cashOnHand)}
          sub="Net Holding"
          icon={<Wallet className="w-4 h-4" />}
          color={cashOnHand >= 0 ? '#10b981' : '#ef4444'}
        />
        <BentoKPI
          label="Burn Rate / Bulan"
          value={formatRupiah(burnRate)}
          sub="Avg 6 bulan terakhir"
          icon={<TrendingDown className="w-4 h-4" />}
          color="#f97316"
        />
        <BentoKPI
          label="Invoice Pending"
          value={String(pendingInvoices)}
          sub={pendingInvoices > 0 ? 'Butuh persetujuan' : 'Semua bersih ✓'}
          icon={<FileText className="w-4 h-4" />}
          color="#D4AF37"
          href="/invoicing"
        />
        <BentoKPI
          label="Log Belum Direview"
          value={String(unreadLogs)}
          sub={unreadLogs > 0 ? 'Dari divisi' : 'Semua telah direview ✓'}
          icon={<FolderKanban className="w-4 h-4" />}
          color="#a855f7"
          href="/workspace"
          pulse={unreadLogs > 0}
        />
      </motion.div>

      {/* ── Revenue vs Expense Chart ─────────────────────────────────────── */}
      {chartData.length > 0 && (
        <motion.div variants={FADE_UP} className="glass-card p-5 md:p-6">
          <h2 className="text-[--color-text-primary] font-bold mb-1">Net Cashflow per Divisi</h2>
          <p className="text-[--color-text-muted] text-xs mb-6">6 bulan terakhir · positif = profit, negatif = rugi</p>
          <div className="h-[260px] md:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                <XAxis dataKey="month" tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`} />
                <Tooltip
                  contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#ededed' }}
                  formatter={(v: any) => formatRupiah(Number(v))}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: '#737373' }} />
                {divisionEntities.map((e) => (
                  <Line
                    key={e.id}
                    type="monotone"
                    dataKey={e.name}
                    stroke={getEntityAccentColor(e)}
                    strokeWidth={2}
                    dot={{ r: 3, fill: getEntityAccentColor(e) }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* ── Division Command Cards (Impersonation Panel) ─────────────────── */}
      <motion.div variants={FADE_UP}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[--color-text-primary] font-bold text-sm">Masuk ke Divisi</h2>
          <p className="text-[--color-text-muted] text-xs">Klik untuk menyamar sebagai Head</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {divisionEntities.map((entity) => {
            const color = getEntityAccentColor(entity)
            const config = getDivisionConfig(entity.name)
            const pl = plData.find(d => d.entity.id === entity.id)
            return (
              <motion.button
                key={entity.id}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => impersonate(entity.id)}
                className="glass-card p-4 text-left group cursor-pointer transition-all hover:border-opacity-60"
                style={{ borderColor: `${color}30` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{config.emoji}</span>
                  <Eye className="w-3.5 h-3.5 text-[--color-text-muted] group-hover:opacity-100 opacity-0 transition-opacity"
                    style={{ color }} />
                </div>
                <p className="text-[--color-text-primary] font-bold text-sm mb-0.5">{entity.name}</p>
                <p className="text-[--color-text-muted] text-[10px] mb-3">{config.description}</p>
                {pl && (
                  <div className="space-y-1 border-t pt-2" style={{ borderColor: `${color}20` }}>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[--color-text-muted]">Net</span>
                      <span className="font-bold" style={{ color: pl.net >= 0 ? '#10b981' : '#ef4444' }}>
                        {formatRupiah(pl.net)}
                      </span>
                    </div>
                  </div>
                )}
                <div className="mt-2 h-0.5 w-full rounded-full opacity-30" style={{ background: color }} />
              </motion.button>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Bento KPI Card ──────────────────────────────────────────────────────────

function BentoKPI({ label, value, sub, icon, color, href, pulse }: {
  label: string; value: string; sub: string
  icon: React.ReactNode; color: string; href?: string; pulse?: boolean
}) {
  const Wrapper = href ? Link : 'div'
  return (
    <Wrapper href={href ?? '#'} className={`glass-card p-4 md:p-5 flex flex-col gap-3 group transition-all hover:scale-[1.01] ${pulse ? 'animate-pulse hover:animate-none' : ''}`}
      style={{ borderColor: `${color}25` }}>
      <div className="flex items-center justify-between">
        <p className="text-[--color-text-muted] text-xs uppercase tracking-wider">{label}</p>
        <div className="p-1.5 rounded-md" style={{ background: `${color}15`, color }}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-xl md:text-2xl font-black tabular-nums" style={{ color }}>{value}</p>
        <p className="text-[--color-text-muted] text-xs mt-0.5">{sub}</p>
      </div>
    </Wrapper>
  )
}
