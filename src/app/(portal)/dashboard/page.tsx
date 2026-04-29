'use client'

import { useUser } from '@/components/providers/UserProvider'
import { CEOCommandCenter } from './components/CEOCommandCenter'
import { DivisionCommandCenter } from './components/DivisionCommandCenter'
import { DesignCommandCenter } from './components/DesignCommandCenter'
import { StaffWorkspace } from './components/StaffWorkspace'
import { Loader2 } from 'lucide-react'

export default function DashboardPage() {
  // 1. Tarik profile dan highestRole dari otak sistem
  const { profile, highestRole, loading } = useUser()

  if (loading || !profile) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#050505]">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
      </div>
    )
  }

  // 2. DISTRIBUSI KEKUASAAN (Render komponen berdasarkan Kasta Tertinggi)
  // Jika dia punya ['CEO', 'STAFF'], highestRole adalah 'CEO', maka render CEOCommandCenter.
  // Role 'STAFF' tetap ada di database untuk akses data log, tapi UI tetap UI CEO.
  
  switch (highestRole) {
    case 'CEO':
      return <CEOCommandCenter />
      
    case 'HEAD':
    case 'FINANCE': 
      // Asumsi Finance dan Head menggunakan dashboard tingkat divisi
      return <DivisionCommandCenter />
      
    case 'DESIGN':
      return <DesignCommandCenter />
      
    case 'STAFF':
    default:
      // Kasta terbawah atau jabatan tidak dikenali
      return <StaffWorkspace />
  }
}