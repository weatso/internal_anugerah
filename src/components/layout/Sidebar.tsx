'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, TrendingUp, FileText,
  Settings, Briefcase, ShieldCheck, X, LogOut
} from 'lucide-react'
import { useUser } from '@/components/providers/UserProvider'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import Image from 'next/image'

// MENU DIRAMPINGKAN: Hanya modul yang siap produksi (Finance, Invoicing, CRM, Admin, Settings)
const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['CEO','FINANCE','HEAD','STAFF','DESIGN'] },
  { href: '/finance', label: 'Finance', icon: TrendingUp, roles: ['CEO','FINANCE','HEAD'] },
  { href: '/invoicing', label: 'Invoicing', icon: FileText, roles: ['CEO','FINANCE','HEAD'] },
  { href: '/clients', label: 'CRM / Clients', icon: Briefcase, roles: ['CEO','FINANCE','HEAD','STAFF'] },
  { href: '/admin', label: 'Admin Panel', icon: ShieldCheck, roles: ['CEO'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['CEO','FINANCE','HEAD','STAFF','DESIGN'] },
]

interface SidebarProps {
  onClose?: () => void
}

export function Sidebar({ onClose }: SidebarProps) {
  const [width, setWidth] = useState(260)
  const [isResizing, setIsResizing] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  
  const { profile, highestRole, loading, effectiveEntity } = useUser()

  const currentRole = highestRole ?? 'STAFF'
  const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(currentRole))

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error("Gagal keluar:", error)
    }
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
      transition={{ duration: isResizing ? 0 : 0.2, ease: "linear" }}
      className="relative flex flex-col h-screen bg-[#050505] border-r border-white/5 z-30 shrink-0"
    >
      <div
        className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize z-40 hover:bg-[#D4AF37] transition-colors"
        onMouseDown={(e) => { e.preventDefault(); setIsResizing(true) }}
      />

      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 shrink-0">
            <Image src="/logo.png" alt="Anugerah" fill className="object-contain" />
          </div>
          <div className="overflow-hidden whitespace-nowrap">
            <p className="text-white font-black text-sm tracking-tighter uppercase">ANUGERAH</p>
            <p className="text-[#D4AF37] text-[9px] tracking-[0.3em] font-bold uppercase">VENTURES OS</p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden text-gray-500 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {visibleNav.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-all group overflow-hidden whitespace-nowrap",
                isActive ? "bg-[#D4AF37]/10 text-[#D4AF37] border-l-2 border-[#D4AF37]" : "text-gray-500 hover:text-white hover:bg-white/5 border-l-2 border-transparent"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {!loading && profile && (
        <div className="mt-auto p-4 border-t border-white/5 bg-gradient-to-t from-white/[0.02] to-transparent">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              {(profile as any).avatar_url ? (
                <div className="w-9 h-9 rounded-full shrink-0 relative overflow-hidden border border-[#D4AF37]/30">
                  <img 
                    src={(profile as any).avatar_url.startsWith('http') ? (profile as any).avatar_url : `/api/storage/file?key=${encodeURIComponent((profile as any).avatar_url)}`} 
                    alt="Profile" 
                    className="w-full h-full object-cover" 
                  />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#D4AF37] flex items-center justify-center font-bold text-black shrink-0 text-xs">
                  {profile.full_name?.charAt(0) || 'U'}
                </div>
              )}
              <div className="overflow-hidden whitespace-nowrap">
                <p className="text-white text-[11px] font-bold truncate leading-none mb-1">{profile.full_name}</p>
                <p className="text-[9px] text-gray-500 uppercase tracking-widest font-medium truncate">
                  {currentRole} • {effectiveEntity?.name || 'Holding'}
                </p>
              </div>
            </div>
            
            <button 
              onClick={handleSignOut}
              className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-sm transition-all"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </motion.aside>
  )
}