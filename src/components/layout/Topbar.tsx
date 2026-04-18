'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X, Bell } from 'lucide-react'
import { useUser } from '@/components/providers/UserProvider'
import { cn } from '@/lib/utils'

const ROLE_LABEL: Record<string, string> = {
  CEO    : 'CEO',
  HEAD   : 'Head',
  FINANCE: 'Finance',
  STAFF  : 'Staff',
  PENDING: 'Pending',
}

const ROLE_BADGE: Record<string, string> = {
  CEO    : 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  FINANCE: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  HEAD   : 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  STAFF  : 'bg-neutral-400/10 text-neutral-400 border-neutral-400/20',
  PENDING: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard'                 : 'Dashboard',
  '/finance'                   : 'Finance',
  '/finance/transactions'      : 'Transaksi',
  '/finance/transfer-pricing'  : 'Transfer Pricing',
  '/invoicing'                 : 'Invoicing',
  '/invoicing/create'          : 'Buat Invoice',
  '/workspace'                 : 'Workspace',
  '/settings'                  : 'Settings',
  '/pending'                   : 'Menunggu Akses',
}

interface TopbarProps {
  onMenuClick: () => void
  sidebarOpen: boolean
}

export function Topbar({ onMenuClick, sidebarOpen }: TopbarProps) {
  const { profile } = useUser()
  const pathname = usePathname()

  const roleKey = profile?.role ?? 'STAFF'
  const pageTitle = PAGE_TITLES[pathname] ?? 'Anugerah OS'

  return (
    <header className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-[--color-border] bg-[--color-bg-secondary]/80 backdrop-blur-sm sticky top-0 z-20">

      {/* Left — Mobile menu + page title */}
      <div className="flex items-center gap-3">
        {/* Hamburger — only mobile */}
        <button
          onClick={onMenuClick}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded-md text-[--color-text-muted] hover:text-[--color-text-primary] hover:bg-white/5 transition-all"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        <div>
          <p className="text-[--color-text-muted] text-[10px] uppercase tracking-[0.25em] hidden sm:block">
            Anugerah OS
          </p>
          <p className="text-[--color-text-primary] font-bold text-sm leading-tight">{pageTitle}</p>
        </div>
      </div>

      {/* Right — User info */}
      {profile && (
        <div className="flex items-center gap-3">
          {/* Role badge */}
          <span className={cn(
            'hidden sm:inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-widest',
            ROLE_BADGE[roleKey]
          )}>
            {ROLE_LABEL[roleKey]}
          </span>

          {/* Name + Avatar */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:block text-right">
              <p className="text-[--color-text-primary] text-xs font-semibold leading-tight">
                {profile.full_name}
              </p>
              <p className="text-[--color-text-muted] text-[10px] leading-tight">
                {profile.entity?.name ?? 'Anugerah Ventures'}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] font-bold text-xs shrink-0 ring-1 ring-[#D4AF37]/20">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
