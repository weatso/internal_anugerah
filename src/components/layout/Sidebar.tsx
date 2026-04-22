'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, TrendingUp, FileText, FolderKanban,
  Settings, LogOut, ChevronLeft, ChevronRight, ArrowLeftRight,
  Briefcase, X, Eye,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { ThemeToggle } from './ThemeToggle'
import { cn, getStatusLabel } from '@/lib/utils'
import { getEntityAccentColor } from '@/lib/division-config'
import Image from 'next/image'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['CEO', 'FINANCE', 'HEAD', 'STAFF'] },
  { href: '/finance', label: 'Finance', icon: TrendingUp, roles: ['CEO', 'FINANCE', 'HEAD', 'STAFF'] },
  { href: '/finance/transfer-pricing', label: 'Transfer Pricing', icon: ArrowLeftRight, roles: ['CEO', 'FINANCE'] },
  { href: '/invoicing', label: 'Invoicing', icon: FileText, roles: ['CEO', 'FINANCE', 'HEAD', 'STAFF'] },
  { href: '/workspace', label: 'Workspace', icon: FolderKanban, roles: ['CEO', 'FINANCE', 'HEAD', 'STAFF'] },
  { href: '/sales-kit', label: 'Sales Kit', icon: Briefcase, roles: ['CEO', 'HEAD'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['CEO'] },
]

const ROLE_BADGE: Record<string, string> = {
  CEO: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  FINANCE: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  HEAD: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  STAFF: 'bg-neutral-400/10 text-neutral-400 border-neutral-400/20',
  PENDING: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
}

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const [width, setWidth] = useState(240)
  const [isResizing, setIsResizing] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { profile, loading, isImpersonating, effectiveEntity, impersonate } = useUser()

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = Math.min(400, Math.max(200, e.clientX))
      setWidth(newWidth)
    }
    const handleMouseUp = () => setIsResizing(false)
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const role = profile?.role ?? 'STAFF'
  const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(role))

  // Dynamic accent: impersonated or own entity color
  const accentColor = isImpersonating
    ? getEntityAccentColor(effectiveEntity)
    : (effectiveEntity?.primary_color ?? '#D4AF37')

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : width }}
      transition={{ duration: isResizing ? 0 : 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-screen shrink-0 bg-[--color-bg-secondary] border-r border-[--color-border] z-30"
    >
      {/* Resizer Handle */}
      {!collapsed && (
        <div
          className="absolute right-0 top-0 w-1 h-full cursor-col-resize z-40 hover:opacity-100 opacity-0 transition-opacity"
          style={{ background: accentColor }}
          onMouseDown={(e) => { e.preventDefault(); setIsResizing(true) }}
        />
      )}

      {/* Collapse Toggle */}
      <button
        id="sidebar-toggle"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-7 z-50 w-6 h-6 rounded-full border flex items-center justify-center text-[--color-text-muted] hover:text-[--color-text-primary] transition-all focus:outline-none"
        style={{ background: 'var(--color-bg-elevated)', borderColor: 'var(--color-border)' }}
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Inner scrollable column */}
      <div className="flex flex-col h-full overflow-hidden">

        {/* ── Logo ── */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-[--color-border]">
          <div className="relative w-9 h-9 shrink-0">
            <Image src="/logo.png" alt="Anugerah" fill className="object-contain" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <p className="text-white font-black text-sm tracking-tight leading-none">Anugerah OS</p>
                <p className="text-[--color-text-muted] text-[10px] tracking-widest uppercase mt-0.5">Internal System</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Impersonation Banner ── */}
        <AnimatePresence>
          {isImpersonating && !collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
              style={{ background: `${accentColor}12`, borderBottom: `1px solid ${accentColor}30` }}
            >
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3 h-3" style={{ color: accentColor }} />
                    <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: accentColor }}>
                      Menyamar sebagai
                    </p>
                  </div>
                  <button onClick={() => impersonate(null)} className="text-[--color-text-muted] hover:text-white transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[--color-text-primary] font-bold text-sm">{effectiveEntity?.name}</p>
                <button onClick={() => impersonate(null)}
                  className="text-[10px] font-semibold mt-1.5 hover:underline"
                  style={{ color: accentColor }}>
                  ← Kembali ke Global View
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── User Info ── */}
        {!loading && profile && (
          <div className={cn('px-3 py-4 border-b border-[--color-border]', collapsed && 'px-2')}>
            {collapsed ? (
              <div className="flex justify-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-[#050505]"
                  style={{ background: accentColor }}>
                  {profile.full_name.charAt(0).toUpperCase()}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-[#050505]"
                  style={{ background: accentColor }}>
                  {profile.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden min-w-0">
                  <p className="text-[--color-text-primary] text-sm font-semibold truncate">{profile.full_name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-widest', ROLE_BADGE[role])}>
                      {getStatusLabel(role)}
                    </span>
                    {profile.entity && !isImpersonating && (
                      <span className="text-[--color-text-muted] text-[10px] truncate">{profile.entity.name}</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {visibleNav.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                id={`nav-${item.href.replace(/\//g, '-').slice(1)}`}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all group',
                  collapsed && 'justify-center px-2',
                  isActive
                    ? 'border'
                    : 'text-[--color-text-secondary] hover:text-[--color-text-primary] hover:bg-white/5 border border-transparent'
                )}
                style={isActive ? {
                  background: `${accentColor}12`,
                  borderColor: `${accentColor}30`,
                  color: accentColor,
                } : {}}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            )
          })}
        </nav>

        {/* ── Bottom ── */}
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
      </div>
    </motion.aside>
  )
}
