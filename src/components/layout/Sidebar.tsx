'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, TrendingUp, FileText, FolderKanban,
  Settings, LogOut, ChevronLeft, ChevronRight, ArrowLeftRight,
  Briefcase, Eye, X
} from 'lucide-react'
import { useUser } from '@/components/providers/UserProvider'
import { cn, getStatusLabel } from '@/lib/utils'
import Image from 'next/image'

// REVISI: Penambahan akses HEAD pada Settings dan Transfer Pricing
const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['CEO','FINANCE','HEAD','STAFF','DESIGN'] },
  { href: '/finance', label: 'Finance', icon: TrendingUp, roles: ['CEO','FINANCE','HEAD'] },
  { href: '/finance/transfer-pricing', label: 'Transfer Pricing', icon: ArrowLeftRight, roles: ['CEO','FINANCE','HEAD'] },
  { href: '/invoicing', label: 'Invoicing', icon: FileText, roles: ['CEO','FINANCE','HEAD'] },
  { href: '/workspace', label: 'Workspace', icon: FolderKanban, roles: ['CEO','FINANCE','HEAD','STAFF','DESIGN'] },
  { href: '/sales-kit', label: 'Sales Kit', icon: Briefcase, roles: ['CEO','HEAD','DESIGN'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['CEO', 'HEAD'] },
]

const ROLE_BADGE: Record<string, string> = {
  CEO: 'text-amber-500 border-amber-500/30 bg-amber-500/5',
  FINANCE: 'text-blue-400 border-blue-400/20 bg-blue-400/5',
  HEAD: 'text-purple-400 border-purple-400/20 bg-purple-400/5',
  STAFF: 'text-neutral-400 border-neutral-400/20 bg-neutral-400/5',
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { profile, loading, isImpersonating, effectiveEntity, impersonate } = useUser()

  const role = profile?.role ?? 'STAFF'
  const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(role))

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 260 }}
      className="relative flex flex-col h-screen bg-[#050505] border-r border-white/5 z-30"
    >
      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-8 z-50 w-6 h-6 rounded-full border border-white/10 bg-[#0A0A0A] flex items-center justify-center text-gray-500 hover:text-white transition-all"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Brand Header */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 shrink-0">
            <Image src="/logo.png" alt="Anugerah" fill className="object-contain" />
          </div>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-hidden">
              <p className="text-white font-black text-xs tracking-tighter uppercase leading-none">Anugerah Ventures</p>
              <p className="text-[9px] text-[#C5A028] tracking-[0.25em] uppercase mt-1 font-bold">Internal OS</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Impersonation Banner (Tetap Ada jika CEO menyamar) */}
      <AnimatePresence>
        {isImpersonating && !collapsed && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="bg-[#C5A028]/10 border-b border-[#C5A028]/20 overflow-hidden">
            <div className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye size={12} className="text-[#C5A028]" />
                <p className="text-[10px] text-[#C5A028] font-bold uppercase tracking-widest">{effectiveEntity?.name}</p>
              </div>
              <button onClick={() => impersonate(null)} className="text-gray-500 hover:text-white"><X size={12}/></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {visibleNav.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-all group",
                isActive 
                  ? "bg-[#C5A028]/10 text-[#C5A028] border-l-2 border-[#C5A028]" 
                  : "text-gray-500 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
              )}
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && <span className="tracking-tight">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Prestige Identity Footer (Identitas diletakkan di sini) */}
      {!loading && profile && (
        <div className="p-4 border-t border-white/5 bg-white/[0.02]">
          {collapsed ? (
            <div className="w-10 h-10 mx-auto rounded-full bg-[#C5A028] flex items-center justify-center font-bold text-black text-xs">
              {profile.full_name.charAt(0)}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#C5A028] flex items-center justify-center font-bold text-black text-xs shrink-0">
                {profile.full_name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-bold truncate leading-none mb-1">{profile.full_name}</p>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest font-medium">
                  {profile.role} • {effectiveEntity?.name}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.aside>
  )
}