'use client'

import { useUser } from '@/components/providers/UserProvider'
import { CEOCommandCenter }      from './components/CEOCommandCenter'
import { DivisionCommandCenter } from './components/DivisionCommandCenter'
import { StaffWorkspace }        from './components/StaffWorkspace'

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

  // CEO tanpa impersonation → Global Command Center
  if (role === 'CEO' && !isImpersonating) return <CEOCommandCenter />

  // CEO sedang impersonate, atau HEAD/FINANCE → Division view
  if (role === 'CEO' || role === 'HEAD' || role === 'FINANCE') return <DivisionCommandCenter />

  // STAFF → Workspace-focused
  return <StaffWorkspace />
}
