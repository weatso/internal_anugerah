import { cookies } from 'next/headers'
import dynamic from 'next/dynamic'

// Impor komponen (Bisa tetap menggunakan dynamic import jika komponen di dalamnya sangat berat)
import CEOCommandCenter from './components/CEOCommandCenter'
import { DivisionCommandCenter } from './components/DivisionCommandCenter'
import { DesignCommandCenter } from './components/DesignCommandCenter'
import { StaffWorkspace } from './components/StaffWorkspace'

export default async function DashboardPage() {
  // 1. BACA OTORITAS LANGSUNG DARI SERVER (Tanpa Hook useUser)
  const cookieStore = await cookies()
  const activeRole = cookieStore.get('active_role')?.value
  const activeEntityId = cookieStore.get('active_entity_id')?.value

  // 2. FALLBACK (Jika user baru login dan cookie belum ter-set oleh Switcher)
  if (!activeRole || !activeEntityId) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <span style={{ color: 'var(--gold)' }} className="animate-pulse font-bold tracking-widest uppercase text-sm">
          Menyelaraskan Konteks Divisi...
        </span>
      </div>
    )
  }

  // 3. DISTRIBUSI KEKUASAAN ABSOLUT
  // Catatan: Jika Anda (CEO) mengganti divisi di Dropdown atas, 
  // activeRole ini otomatis berubah menjadi peran Anda di divisi tersebut.
  switch (activeRole) {
    case 'CEO':
      // Hanya muncul jika Anda berada di entitas Holding/Global
      return <CEOCommandCenter />

    case 'HEAD':
    case 'FINANCE':
      // Otomatis muncul jika CEO memilih divisi tempat ia berperan sebagai HEAD
      return <DivisionCommandCenter />

    case 'DESIGN':
      return <DesignCommandCenter />

    case 'STAFF':
    default:
      return <StaffWorkspace />
  }
}