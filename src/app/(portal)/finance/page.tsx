'use client'

import Link from 'next/link'
import { TrendingUp, ArrowLeftRight, Receipt, Landmark, Coins, Layers, BarChart3, DollarSign } from 'lucide-react'
import { useUser } from '@/components/providers/UserProvider'
import { motion } from 'framer-motion'

const MODULES = [
  {
    href: '/finance/transactions',
    label: 'Buku Besar',
    subtitle: 'Catat transaksi masuk/keluar ke rekening bank beserta struk bukti.',
    icon: Receipt, color: '#10b981', roles: ['CEO','FINANCE','HEAD','STAFF'],
  },
  {
    href: '/finance/master-data',
    label: 'Master COA & Stakeholder',
    subtitle: 'Kelola Chart of Accounts, rekening bank, budget limit divisi, dan stakeholder.',
    icon: Landmark, color: '#D4AF37', roles: ['CEO'],
  },
  {
    href: '/finance/transfer-pricing',
    label: 'Transfer Pricing',
    subtitle: 'Alokasi biaya virtual antar-divisi (Internal Billing).',
    icon: ArrowLeftRight, color: '#3b82f6', roles: ['CEO','FINANCE'],
  },
  {
    href: '/finance/amortization',
    label: 'Amortisasi Revenue',
    subtitle: 'Pengakuan pendapatan berkala dari layanan recurring.',
    icon: Layers, color: '#8b5cf6', roles: ['CEO','FINANCE'],
  },
  {
    href: '/finance/commissions',
    label: 'Komisi Sales',
    subtitle: 'Kelola dan cairkan komisi tim penjualan & affiliator.',
    icon: DollarSign, color: '#f59e0b', roles: ['CEO','FINANCE'],
  },
  {
    href: '/finance/dividends',
    label: 'Profit Split & Dividen',
    subtitle: 'Distribusikan laba bersih ke stakeholder berdasarkan porsi equity.',
    icon: Coins, color: '#ec4899', roles: ['CEO'],
  },
  {
    href: '/finance/reports',
    label: 'Laporan Keuangan',
    subtitle: 'P&L Statement real-time dari General Ledger per entitas & periode.',
    icon: BarChart3, color: '#06b6d4', roles: ['CEO','FINANCE'],
  },
]

const FADE_UP = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

export default function FinancePage() {
  const { highestRole } = useUser()
  const visible = MODULES.filter(m => m.roles.includes(highestRole ?? 'STAFF'))

  return (
    <div className="p-6 md:p-8 space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] font-bold mb-1" style={{ color: 'var(--gold)' }}>Finance & Akuntansi</p>
        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Modul Keuangan</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Pilih modul di bawah untuk mulai bekerja.</p>
      </div>

      <motion.div
        initial="hidden" animate="show"
        variants={{ show: { transition: { staggerChildren: 0.07 } } }}
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
      >
        {visible.map(mod => (
          <motion.div key={mod.href} variants={FADE_UP}>
            <Link href={mod.href}
              className="glass-card p-6 flex flex-col gap-4 hover:scale-[1.02] transition-transform h-full group"
              style={{ borderLeft: `2px solid ${mod.color}30` }}>
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-lg" style={{ background: `${mod.color}15` }}>
                  <mod.icon className="w-5 h-5" style={{ color: mod.color }} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded"
                  style={{ background: `${mod.color}10`, color: mod.color }}>
                  {mod.roles.includes('STAFF') ? 'All' : mod.roles[0] === 'CEO' && mod.roles.length === 1 ? 'CEO Only' : 'Finance'}
                </span>
              </div>
              <div>
                <h2 className="font-black text-base mb-1 group-hover:opacity-90 transition-opacity"
                  style={{ color: mod.color }}>{mod.label}</h2>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{mod.subtitle}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
