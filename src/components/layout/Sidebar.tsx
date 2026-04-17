'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, TrendingUp, FileText, FolderKanban,
  Settings, LogOut, ChevronLeft, ChevronRight, ArrowLeftRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { ThemeToggle } from './ThemeToggle'
import { cn, getStatusLabel } from '@/lib/utils'
import Image from 'next/image'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['CEO', 'FINANCE', 'HEAD'] },
  { href: '/finance', label: 'Finance', icon: TrendingUp, roles: ['CEO', 'FINANCE', 'HEAD', 'STAFF'] },
  { href: '/finance/transfer-pricing', label: 'Transfer Pricing', icon: ArrowLeftRight, roles: ['CEO', 'FINANCE'] },
  { href: '/invoicing', label: 'Invoicing', icon: FileText, roles: ['CEO', 'FINANCE', 'HEAD', 'STAFF'] },
  { href: '/workspace', label: 'Workspace', icon: FolderKanban, roles: ['CEO', 'FINANCE', 'HEAD', 'STAFF'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['CEO'] },
]

const ROLE_BADGE = {
  CEO: 'bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30',
  FINANCE: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  HEAD: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  STAFF: 'bg-neutral-400/10 text-neutral-400 border-neutral-400/20',
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { profile, loading } = useUser()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const role = profile?.role ?? 'STAFF'
  const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(role))

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-screen shrink-0 bg-[--color-bg-secondary] border-r border-[--color-border] overflow-hidden"
    >
      {/* Toggle Button */}
      <button
        id="sidebar-toggle"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-7 z-50 w-6 h-6 rounded-full bg-[--color-bg-elevated] border border-[--color-border] flex items-center justify-center text-[--color-text-muted] hover:text-[--color-text-primary] transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[--color-border]">
        <div className="relative w-9 h-9 shrink-0">
          <Image src="/logo.png" alt="Anugerah" fill className="object-contain" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className="text-white font-black text-sm tracking-tight leading-none">Anugerah OS</p>
              <p className="text-[--color-text-muted] text-[10px] tracking-widest uppercase mt-0.5">Internal System</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User Info */}
      {!loading && profile && (
        <div className={cn('px-3 py-4 border-b border-[--color-border]', collapsed && 'px-2')}>
          {collapsed ? (
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] font-bold text-xs">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] font-bold text-xs shrink-0">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-[--color-text-primary] text-sm font-semibold truncate">{profile.full_name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-widest', ROLE_BADGE[role as keyof typeof ROLE_BADGE])}>
                    {getStatusLabel(role)}
                  </span>
                  {profile.entity && (
                    <span className="text-[--color-text-muted] text-[10px] truncate">{profile.entity.name}</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visibleNav.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              id={`nav-${item.href.replace(/\//g, '-').slice(1)}`}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all group',
                collapsed && 'justify-center px-2',
                isActive
                  ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20'
                  : 'text-[--color-text-secondary] hover:text-[--color-text-primary] hover:bg-white/5 border border-transparent'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-[#D4AF37]' : '')} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-4 border-t border-[--color-border] pt-3 space-y-0.5">
        <ThemeToggle />
        <button
          id="btn-logout"
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-[--color-text-secondary] hover:text-red-400 hover:bg-red-400/5 transition-all',
            collapsed && 'justify-center px-2'
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Keluar
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  )
}
