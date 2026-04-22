'use client'

import { useUser } from '@/components/providers/UserProvider'
import { CEOCommandCenter }      from './components/CEOCommandCenter'
import { DivisionCommandCenter } from './components/DivisionCommandCenter'
import { StaffWorkspace }        from './components/StaffWorkspace'
// Buat file komponen kosong ini nanti di folder components
import { DesignCommandCenter }   from './components/DesignCommandCenter' 

export default function DashboardPage() {
  const { profile, loading, isImpersonating } = useUser()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const role = profile?.role

  if (role === 'CEO' && !isImpersonating) return <CEOCommandCenter />
  if (role === 'CEO' || role === 'HEAD' || role === 'FINANCE') return <DivisionCommandCenter />
  
  // TAMBAHAN BARU: Routing khusus divisi kreatif
  if (role === 'DESIGN') return <DesignCommandCenter />

  return <StaffWorkspace />
}