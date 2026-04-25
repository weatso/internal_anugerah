'use client'

import { useUser } from '@/components/providers/UserProvider'
import { CEOCommandCenter } from './components/CEOCommandCenter'
import { DivisionCommandCenter } from './components/DivisionCommandCenter'
import { StaffWorkspace } from './components/StaffWorkspace'
import { DesignCommandCenter } from './components/DesignCommandCenter'

export default function DashboardPage() {
  const { profile, loading, isImpersonating } = useUser()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#050505]">
        <span className="text-[#C5A028] font-mono text-[10px] tracking-[0.3em] uppercase animate-pulse">
          Memuat Ruang Kontrol...
        </span>
      </div>
    )
  }

  if (!profile) return null

  // 1. JALUR KHUSUS: Jika CEO sedang menyamar (Impersonate) menjadi divisi tertentu,
  // paksa sistem menampilkan Dashboard Divisi, BUKAN Dashboard Global.
  if (profile.role === 'CEO' && isImpersonating) {
    return <DivisionCommandCenter />
  }

  // 2. JALUR ABSOLUT: Kunci akses berdasarkan jabatan yang terdaftar di database.
  switch (profile.role) {
    case 'CEO':
    case 'FINANCE':
      // Melihat ringkasan perputaran uang seluruh Holding Anugerah Ventures
      return <CEOCommandCenter />
      
    case 'HEAD':
      // Hanya melihat performa divisi mereka sendiri (Weatso, Lokal, dll)
      return <DivisionCommandCenter />
      
    case 'DESIGN':
      // Hanya melihat antrean tugas desain dan manajemen aset (tanpa angka uang)
      return <DesignCommandCenter />
      
    case 'STAFF':
    default:
      // Hanya melihat papan kerja operasional harian (tanpa metrik finansial)
      return <StaffWorkspace />
  }
}