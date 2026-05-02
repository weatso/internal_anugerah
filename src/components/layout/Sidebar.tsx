'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard, TrendingUp, FileText,
  Settings, Briefcase, ShieldCheck, X, LogOut,
  Sun, Moon, FolderKanban
} from 'lucide-react'
import { useUser } from '@/components/providers/UserProvider'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import Image from 'next/image'

const NAV_ITEMS = [
  { href: '/dashboard',                 label: 'Dashboard',         icon: LayoutDashboard, roles: ['CEO','FINANCE','HEAD','STAFF','DESIGN'] },
  { href: '/finance',                   label: 'Finance',           icon: TrendingUp,      roles: ['CEO','FINANCE','HEAD'] },
  { href: '/finance/amortization',      label: '↳ Amortisasi',      icon: TrendingUp,      roles: ['CEO','FINANCE'] },
  { href: '/finance/commissions',       label: '↳ Komisi',          icon: TrendingUp,      roles: ['CEO','FINANCE'] },
  { href: '/finance/dividends',         label: '↳ Dividen & Profit',icon: TrendingUp,      roles: ['CEO'] },
  { href: '/invoicing',                 label: 'Invoicing',         icon: FileText,        roles: ['CEO','FINANCE','HEAD'] },
  { href: '/workspace',                 label: 'Workspace',         icon: FolderKanban,    roles: ['CEO','FINANCE','HEAD','STAFF','DESIGN'] },
  { href: '/clients',                   label: 'CRM / Clients',     icon: Briefcase,       roles: ['CEO','FINANCE','HEAD','STAFF'] },
  { href: '/admin',                     label: 'Admin Panel',       icon: ShieldCheck,     roles: ['CEO'] },
  { href: '/settings',                  label: 'Settings',          icon: Settings,        roles: ['CEO','FINANCE','HEAD','STAFF','DESIGN'] },
]

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const [width, setWidth] = useState(260)
  const [isResizing, setIsResizing] = useState(false)
  const [mounted, setMounted] = useState(false)

  const pathname = usePathname()
  const supabase = createClient()
  const { profile, highestRole, loading, effectiveEntity } = useUser()
  const { theme, setTheme } = useTheme()

  useEffect(() => setMounted(true), [])

  const currentRole = highestRole ?? 'STAFF'
  const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(currentRole))

  const handleSignOut = async () => {
    try { await supabase.auth.signOut() }
    catch (error) { console.error('Gagal keluar:', error) }
  }

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

  return (
    <motion.aside
      animate={{ width }}
      transition={{ duration: isResizing ? 0 : 0.2, ease: 'linear' }}
      className="relative flex flex-col h-screen border-r z-30 shrink-0"
      style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-subtle)' }}
    >
      {/* Resize Handle */}
      <div
        className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize z-40 transition-colors hover:bg-[var(--gold)]"
        onMouseDown={(e) => { e.preventDefault(); setIsResizing(true) }}
      />

      {/* Logo */}
      <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 shrink-0">
            <Image src="/logo.png" alt="Anugerah" fill className="object-contain" />
          </div>
          <div className="overflow-hidden whitespace-nowrap">
            <p className="font-black text-sm tracking-tighter uppercase" style={{ color: 'var(--text-primary)' }}>ANUGERAH</p>
            <p className="text-[9px] tracking-[0.3em] font-bold uppercase" style={{ color: 'var(--gold)' }}>VENTURES OS</p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden" style={{ color: 'var(--text-muted)' }}>
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-5 px-3 space-y-0.5 overflow-y-auto">
        {visibleNav.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-all overflow-hidden whitespace-nowrap border-l-2',
                isActive
                  ? 'border-l-[var(--gold)]'
                  : 'border-l-transparent'
              )}
              style={isActive
                ? { background: 'var(--gold-glow)', color: 'var(--gold)' }
                : { color: 'var(--text-muted)' }
              }
              onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--border-subtle)' } }}
              onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent' } }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      {!loading && profile && (
        <div className="mt-auto p-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 overflow-hidden flex-1">
              {(profile as any).avatar_url ? (
                <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden border" style={{ borderColor: 'var(--gold-glow)' }}>
                  <img
                    src={(profile as any).avatar_url.startsWith('http') ? (profile as any).avatar_url : `/api/storage/file?key=${encodeURIComponent((profile as any).avatar_url)}`}
                    alt="Profile" className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 text-xs"
                  style={{ background: 'var(--gold)', color: '#050505' }}>
                  {profile.full_name?.charAt(0) || 'U'}
                </div>
              )}
              <div className="overflow-hidden whitespace-nowrap">
                <p className="text-[11px] font-bold truncate leading-none mb-1" style={{ color: 'var(--text-primary)' }}>{profile.full_name}</p>
                <p className="text-[9px] uppercase tracking-widest font-medium truncate" style={{ color: 'var(--text-muted)' }}>
                  {currentRole} · {effectiveEntity?.name || 'Holding'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Theme Toggle */}
              {mounted && (
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-1.5 rounded-sm transition-all"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--gold)'; (e.currentTarget as HTMLElement).style.background = 'var(--gold-glow)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              )}

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className="p-1.5 rounded-sm transition-all"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                title="Keluar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.aside>
  )
}