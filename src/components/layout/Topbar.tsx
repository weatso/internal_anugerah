'use client'

import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Topbar() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  return (
    <header className="h-16 border-b border-white/5 bg-[#050505]/50 backdrop-blur-xl flex items-center justify-between px-8">
      {/* Breadcrumbs sebagai penanda navigasi tunggal */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-600 font-bold">Portal</span>
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center gap-2">
            <ChevronRight size={10} className="text-gray-800" />
            <span className={cn(
              "text-[10px] uppercase tracking-[0.2em] font-bold",
              index === segments.length - 1 ? "text-[#C5A028]" : "text-gray-400"
            )}>
              {segment.replace(/-/g, ' ')}
            </span>
          </div>
        ))}
      </div>
      
      {/* Elemen Kanan Minimalis */}
      <div className="flex items-center gap-6">
        <div className="h-4 w-[1px] bg-white/10" />
        <div className="text-[9px] text-gray-600 font-mono tracking-widest uppercase">
          System Core v1.0.4
        </div>
      </div>
    </header>
  )
}