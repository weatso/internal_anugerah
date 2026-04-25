'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, LogOut, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@/components/providers/UserProvider'

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  const { isImpersonating, impersonate, effectiveEntity } = useUser()

  return (
    <header className="h-16 border-b border-white/5 bg-[#050505]/50 backdrop-blur-xl flex items-center justify-between px-4 md:px-8 sticky top-0 z-20">
      {/* Breadcrumbs sebagai penanda navigasi tunggal */}
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="lg:hidden text-gray-400 hover:text-white">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-600 font-bold">Portal</span>
        {segments.map((segment, index) => {
          const href = '/' + segments.slice(0, index + 1).join('/')
          return (
            <div key={index} className="flex items-center gap-2">
              <ChevronRight size={10} className="text-gray-800" />
              <Link href={href} className={cn(
                "text-[10px] uppercase tracking-[0.2em] font-bold hover:text-white transition-colors",
                index === segments.length - 1 ? "text-[#C5A028]" : "text-gray-400"
              )}>
                {segment.replace(/-/g, ' ')}
              </Link>
            </div>
          )
        })}
      </div>
    </div>
      
      {/* Elemen Kanan Minimalis */}
      <div className="flex items-center gap-6">
        {isImpersonating && (
          <button 
            onClick={() => impersonate(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20 text-[10px] font-bold uppercase tracking-wider"
          >
            <LogOut size={12} />
            Keluar: {effectiveEntity?.name}
          </button>
        )}
        <div className="h-4 w-[1px] bg-white/10" />
        <div className="text-[9px] text-gray-600 font-mono tracking-widest uppercase">
          System Core v1.0.4
        </div>
      </div>
    </header>
  )
}