'use client'

import { useUser } from '@/components/providers/UserProvider'
import { Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamic import untuk code splitting
const CEOCommandCenter      = dynamic(() => import('./components/CEOCommandCenter'))
const DivisionCommandCenter = dynamic(() => import('./components/DivisionCommandCenter').then(m => ({ default: m.DivisionCommandCenter })))
const DesignCommandCenter   = dynamic(() => import('./components/DesignCommandCenter').then(m => ({ default: m.DesignCommandCenter })))
const StaffWorkspace        = dynamic(() => import('./components/StaffWorkspace').then(m => ({ default: m.StaffWorkspace })))

export default function DashboardPage() {
  const { profile, highestRole, isImpersonating, loading } = useUser()

  if (loading || !profile) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--gold)' }} />
      </div>
    )
  }

  // ── DISTRIBUSI KEKUASAAN ──────────────────────────────────────────────────
  // OPSI B: CEO yang sedang impersonate → tampilkan DivisionCommandCenter
  // Dengan banner "kamu sedang melihat sebagai HEAD [divisi]" + tombol back
  switch (highestRole) {
    case 'CEO':
      // Opsi B: saat impersonate, render tampilan HEAD (DivisionCommandCenter)
      if (isImpersonating) return <DivisionCommandCenter isCEOImpersonating />
      return <CEOCommandCenter />

    case 'HEAD':
    case 'FINANCE':
      return <DivisionCommandCenter />

    case 'DESIGN':
      return <DesignCommandCenter />

    case 'STAFF':
    default:
      return <StaffWorkspace />
  }
}