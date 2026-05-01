'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, PieChart, Pie, Cell, Sector,
} from 'recharts'
import {
  FileText, FolderKanban, TrendingDown, Wallet,
  CheckCircle2, TrendingUp, Clock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { formatRupiah } from '@/lib/utils'
import { getEntityAccentColor } from '@/lib/division-config'
import type { Entity } from '@/types'

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

const FADE_UP = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

const getDivisionMetadata = (name: string | undefined) => {
  const n = (name || '').toLowerCase()
  if (n.includes('weatso')) return { desc: 'Enterprise IT Consultancy & Creative', logo: '/logos/weatso.svg' }
  if (n.includes('colabz')) return { desc: 'Roblox Game Development Studio', logo: '/logos/colabz.png' }
  if (n.includes('evory')) return { desc: 'Event Organizer & Management', logo: '/logos/evory.png' }
  if (n.includes('lokal')) return { desc: 'F&B Retail & Franchise', logo: '/logos/lokal.png' }
  return { desc: 'Divisi Operasional', logo: null }
}

// Donut active shape
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value, percent } = props
  return (
    <g>
      <text x={cx} y={cy - 12} textAnchor="middle" fill="var(--text-primary)" fontSize={13} fontWeight={800}>
        {payload.name}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill={fill} fontSize={11} fontWeight={700}>
        {(percent * 100).toFixed(1)}%
      </text>
      <text x={cx} y={cy + 26} textAnchor="middle" fill="var(--text-muted)" fontSize={10}>
        {formatRupiah(value)}
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
      <Sector cx={cx} cy={cy} innerRadius={innerRadius - 4} outerRadius={innerRadius - 2}
        startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  )
}

export default function CEOCommandCenter() {
  const { profile, impersonate, effectiveEntityId } = useUser()
  const supabase = createClient()

  const [entities, setEntities]               = useState<Entity[]>([])
  const [plData, setPLData]                   = useState<PLData[]>([])
  const [chartData, setChartData]             = useState<MonthlyPoint[]>([])
  const [pendingInvoices, setPendingInvoices] = useState(0)
  const [unreadLogs, setUnreadLogs]           = useState(0)
  const [cashOnHand, setCashOnHand]           = useState(0)
  const [burnRate, setBurnRate]               = useState(0)
  const [totalRevenueMTD, setTotalRevenueMTD] = useState(0)
  const [activePieIndex, setActivePieIndex]   = useState(0)
  const [loading, setLoading]                 = useState(true)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const [
        { data: entitiesData },
        { data: bankBalances },
        { data: monthlyPL },
        { count: invCount },
        { count: logCount },
      ] = await Promise.all([
        supabase.from('entities').select('*').order('type').order('name'),
        supabase.from('global_bank_balances').select('*'),
        supabase.from('monthly_division_pl').select('*'),
        supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('status', 'PENDING_APPROVAL'),
        supabase.from('workspace_logs').select('id', { count: 'exact', head: true }).eq('status', 'SUBMITTED'),
      ])

      const divEntities = (entitiesData ?? []) as Entity[]
      setEntities(divEntities)

      const totalCash = (bankBalances || []).reduce((sum, b) => sum + Number(b.current_balance), 0)
      setCashOnHand(totalCash)

      const plMap = new Map<string, PLData>()
      const monthMap = new Map<string, MonthlyPoint>()
      let totalExp = 0
      const uniqueMonths = new Set<string>()

      // Current month for MTD
      const nowMonth = new Date().toISOString().slice(0, 7) // e.g. "2026-05"
      let mtdRevenue = 0

      divEntities.forEach(e => {
        plMap.set(e.id, { entity: e, income: 0, expense: 0, net: 0 })
      })

      if (monthlyPL) {
        monthlyPL.forEach(row => {
          const eId    = row.entity_id
          const eName  = row.division_name
          const month  = row.month_period

          uniqueMonths.add(month)
          totalExp += Number(row.total_expense)

          if (month === nowMonth) {
            mtdRevenue += Number(row.total_revenue)
          }

          if (plMap.has(eId)) {
            const g = plMap.get(eId)!
            g.income  += Number(row.total_revenue)
            g.expense += Number(row.total_expense)
            g.net     += Number(row.net_profit)
          }

          if (!monthMap.has(month)) monthMap.set(month, { month })
          const pt = monthMap.get(month)!
          pt[eName] = Number(row.net_profit)
        })
      }

      setPLData(Array.from(plMap.values()))
      setBurnRate(uniqueMonths.size > 0 ? totalExp / uniqueMonths.size : 0)
      setChartData(Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month)))
      setTotalRevenueMTD(mtdRevenue)
      setPendingInvoices(invCount ?? 0)
      setUnreadLogs(logCount ?? 0)
    } catch (error) {
      console.error('Gagal menarik data CEO Dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const divisionEntities = entities.filter(e => e.type === 'DIVISION')
  const firstName        = profile?.full_name?.split(' ')[0] ?? 'Pemimpin'

  // ── Derived metrics ──────────────────────────────────────────────────────
  const runway     = burnRate > 0 ? Math.floor(cashOnHand / burnRate) : null
  const totalIncome = plData.reduce((s, p) => s + p.income, 0)

  // Bar chart data: revenue vs expense per division
  const barChartData = plData
    .filter(p => p.entity.type === 'DIVISION')
    .map(p => ({
      name: p.entity.name,
      Revenue: p.income,
      Expense: p.expense,
      _color: getEntityAccentColor(p.entity),
    }))
    .sort((a, b) => b.Revenue - a.Revenue)

  // Donut chart data: revenue % contribution per division
  const donutData = plData
    .filter(p => p.entity.type === 'DIVISION' && p.income > 0)
    .map(p => ({
      name: p.entity.name,
      value: p.income,
      color: getEntityAccentColor(p.entity),
    }))
    .sort((a, b) => b.value - a.value)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden" animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto"
    >
      {/* ── Header ── */}
      <motion.div variants={FADE_UP} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] font-bold mb-1" style={{ color: 'var(--gold)' }}>
            Global Command Center
          </p>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Halo, CEO <span style={{ color: 'var(--gold)' }}>{firstName}</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Ekosistem Anugerah Ventures · Real-time overview
          </p>
        </div>
      </motion.div>

      {/* ── 6 KPI Cards ── */}
      <motion.div variants={FADE_UP} className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <BentoKPI
          label="Cash on Hand"
          value={formatRupiah(cashOnHand)}
          sub="Total liquid asset"
          icon={<Wallet className="w-4 h-4" />}
          color={cashOnHand >= 0 ? '#10b981' : '#ef4444'}
        />
        <BentoKPI
          label="Revenue MTD"
          value={formatRupiah(totalRevenueMTD)}
          sub={`Bulan ${new Date().toLocaleString('id-ID', { month: 'long' })}`}
          icon={<TrendingUp className="w-4 h-4" />}
          color="#D4AF37"
        />
        <BentoKPI
          label="Burn Rate"
          value={formatRupiah(burnRate)}
          sub="Rata-rata pengeluaran/bln"
          icon={<TrendingDown className="w-4 h-4" />}
          color="#f97316"
        />
        <BentoKPI
          label="Runway"
          value={runway !== null ? `${runway} bln` : 'N/A'}
          sub={runway !== null
            ? runway >= 6 ? 'Aman ✓' : runway >= 3 ? 'Perlu perhatian' : '⚠️ Kritis'
            : 'Tidak ada data'}
          icon={<Clock className="w-4 h-4" />}
          color={runway === null ? '#737373' : runway >= 6 ? '#10b981' : runway >= 3 ? '#f97316' : '#ef4444'}
        />
        <BentoKPI
          label="Invoice Pending"
          value={String(pendingInvoices)}
          sub={pendingInvoices > 0 ? 'Butuh persetujuan' : 'Semua bersih ✓'}
          icon={<FileText className="w-4 h-4" />}
          color="#6366f1"
          href="/invoicing"
          pulse={pendingInvoices > 0}
        />
        <BentoKPI
          label="Log Pending"
          value={String(unreadLogs)}
          sub={unreadLogs > 0 ? 'Dari divisi' : 'Semua bersih ✓'}
          icon={<FolderKanban className="w-4 h-4" />}
          color="#a855f7"
          href="/workspace"
          pulse={unreadLogs > 0}
        />
      </motion.div>

      {/* ── Chart Row: Line + Donut ── */}
      <motion.div variants={FADE_UP} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Line Chart — Net Cashflow */}
        <div className="lg:col-span-2 glass-card p-5">
          <h2 className="font-bold mb-0.5 text-sm" style={{ color: 'var(--text-primary)' }}>
            Net Cashflow per Divisi
          </h2>
          <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
            Profitabilitas bulanan · positif = profit
          </p>
          {chartData.length > 0 ? (
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`} width={36} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 }}
                    formatter={(v: any) => formatRupiah(Number(v))}
                  />
                  <Legend wrapperStyle={{ fontSize: 10, color: 'var(--text-muted)', paddingTop: 12 }} />
                  {divisionEntities.map(e => (
                    <Line key={e.id} type="monotone" dataKey={e.name}
                      stroke={getEntityAccentColor(e)} strokeWidth={2}
                      dot={{ r: 3, fill: getEntityAccentColor(e) }} activeDot={{ r: 5 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada data cashflow.</p>
            </div>
          )}
        </div>

        {/* Donut Chart — Revenue Contribution */}
        <div className="glass-card p-5 flex flex-col">
          <h2 className="font-bold mb-0.5 text-sm" style={{ color: 'var(--text-primary)' }}>
            Kontribusi Revenue
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            % per divisi · Total {formatRupiah(totalIncome)}
          </p>
          {donutData.length > 0 ? (
            <div className="flex-1 flex flex-col items-center">
              <div className="w-full h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%" cy="50%"
                      innerRadius={52} outerRadius={72}
                      dataKey="value"
                      activeIndex={activePieIndex}
                      activeShape={renderActiveShape}
                      onMouseEnter={(_, index) => setActivePieIndex(index)}
                    >
                      {donutData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="w-full space-y-1.5 mt-2">
                {donutData.map((d, i) => (
                  <button key={i} className="w-full flex items-center justify-between gap-2 text-xs"
                    onMouseEnter={() => setActivePieIndex(i)}>
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="truncate font-medium" style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                    </div>
                    <span className="font-bold shrink-0" style={{ color: d.color }}>
                      {totalIncome > 0 ? ((d.value / totalIncome) * 100).toFixed(1) : 0}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Belum ada data revenue.</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Bar Chart: Revenue vs Expense per Division ── */}
      {barChartData.length > 0 && (
        <motion.div variants={FADE_UP} className="glass-card p-5 md:p-6">
          <h2 className="font-bold mb-0.5 text-sm" style={{ color: 'var(--text-primary)' }}>
            Revenue vs Expense per Divisi
          </h2>
          <p className="text-xs mb-6" style={{ color: 'var(--text-muted)' }}>
            Perbandingan pemasukan dan pengeluaran kumulatif · semua waktu
          </p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} barSize={20} barCategoryGap="35%"
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`} width={36} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 }}
                  formatter={(v: any, name: string) => [formatRupiah(Number(v)), name]}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-muted)' }} />
                <Bar dataKey="Revenue" name="Revenue" radius={[4, 4, 0, 0]} fill="#10b981" fillOpacity={0.85} />
                <Bar dataKey="Expense" name="Expense" radius={[4, 4, 0, 0]} fill="#ef4444" fillOpacity={0.75} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* ── Jaringan Entitas (Impersonate Panel) ── */}
      <motion.div variants={FADE_UP}>
        <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Jaringan Entitas</h2>
          <p className="text-[10px] uppercase tracking-widest hidden sm:block" style={{ color: 'var(--text-muted)' }}>
            Klik untuk masuk sebagai Head
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {divisionEntities.map((div) => {
            const isTarget = effectiveEntityId === div.id
            const meta     = getDivisionMetadata(div.name)
            const logoSrc  = div.logo_key ? `/api/storage/file?key=${div.logo_key}` : meta.logo
            const color    = getEntityAccentColor(div)
            const pl       = plData.find(d => d.entity.id === div.id)

            return (
              <button
                key={div.id}
                onClick={() => isTarget ? impersonate(null) : impersonate(div.id)}
                className="group relative text-left rounded-sm border transition-all duration-300 overflow-hidden"
                style={{
                  aspectRatio: '4/5',
                  background: isTarget ? `${color}18` : 'var(--bg-elevated)',
                  borderColor: isTarget ? color : 'var(--border-subtle)',
                  boxShadow: isTarget ? `0 0 24px ${color}25` : 'none',
                }}
              >
                {/* Logo as large background — top-right */}
                {logoSrc && (
                  <div className="absolute inset-0 flex items-start justify-end p-3 pointer-events-none">
                    <img src={logoSrc} alt=""
                      className="w-3/4 h-3/4 object-contain transition-all duration-500"
                      style={{ opacity: isTarget ? 0.28 : 0.1, filter: 'contrast(1.2)' }}
                    />
                  </div>
                )}
                {!logoSrc && (
                  <div className="absolute top-2 right-2 text-5xl font-black pointer-events-none"
                    style={{ color, opacity: 0.12 }}>
                    {div.name.charAt(0)}
                  </div>
                )}

                {isTarget && (
                  <div className="absolute top-3 left-3">
                    <CheckCircle2 className="w-4 h-4" style={{ color }} />
                  </div>
                )}

                {/* Bottom-left content */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-[9px] font-bold uppercase tracking-wider leading-relaxed"
                    style={{ color: isTarget ? color : 'var(--text-muted)' }}>
                    {meta.desc}
                  </p>
                  {pl && (
                    <p className="text-xs font-black tabular-nums mt-1"
                      style={{ color: pl.net >= 0 ? '#10b981' : '#ef4444' }}>
                      {formatRupiah(pl.net)}
                    </p>
                  )}
                </div>

                {/* Bottom accent bar */}
                <div className="absolute bottom-0 left-0 h-0.5 transition-all duration-300"
                  style={{ width: isTarget ? '100%' : '0%', background: color }} />
                <div className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-1/3 transition-all duration-300"
                  style={{ background: color, opacity: isTarget ? 0 : 0.5 }} />
              </button>
            )
          })}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── BentoKPI Component ─────────────────────────────────────────────────────
function BentoKPI({ label, value, sub, icon, color, href, pulse }: {
  label: string; value: string; sub: string
  icon: React.ReactNode; color: string; href?: string; pulse?: boolean
}) {
  const Wrapper = (href ? Link : 'div') as any
  return (
    <Wrapper
      href={href ?? '#'}
      className={`glass-card p-4 flex flex-col gap-2.5 transition-all hover:scale-[1.01] ${pulse ? 'animate-pulse hover:animate-none' : ''}`}
      style={{ borderLeftColor: color, borderLeftWidth: '2px' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <div className="p-1.5 rounded" style={{ background: `${color}15`, color }}>{icon}</div>
      </div>
      <p className="text-xl font-black tabular-nums leading-none" style={{ color }}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{sub}</p>
    </Wrapper>
  )
}