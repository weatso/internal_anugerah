'use client'

import { useUser } from '@/components/providers/UserProvider'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, LogOut, Clock } from 'lucide-react'

export default function PendingPage() {
  const { profile, loading } = useUser()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return null

  // Jika diam-diam sudah di-approve, suruh refresh
  if (profile && profile.role !== 'PENDING') {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-theme(spacing.16))] p-6 space-y-6 animate-pulse">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
        <p className="text-[#D4AF37] font-bold text-lg">Approve berhasil, memuat dashboard...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.16))] p-6 text-center animate-[slide-up_0.4s_ease]">
      <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mb-6">
        <Clock className="w-8 h-8 text-[#D4AF37]" />
      </div>
      <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight mb-2">Menunggu Approval</h1>
      <p className="text-[--color-text-muted] max-w-sm mb-8">
        Akun Anda berhasil didaftarkan, namun saat ini masih dalam status <strong className="text-amber-400 font-bold">PENDING</strong>.
        Silakan hubungi CEO atau admin untuk memberikan akses Role dan Divisi yang sesuai.
      </p>

      <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-[--color-text-muted] hover:text-red-400 transition-colors">
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  )
}
