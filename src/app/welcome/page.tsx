'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { setActiveDivision } from '@/app/actions/workspace'

const ROLE_LABEL: Record<string, string> = {
  CEO: 'CEO',
  HEAD: 'Head',
  FINANCE: 'Finance',
  DESIGN: 'Design',
  STAFF: 'Staff',
}

export default function WelcomePage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [visible, setVisible] = useState(false)
  const [profileData, setProfileData] = useState<{ firstName: string; displayRole: string } | null>(null)
  const [isProcessing, setIsProcessing] = useState(true)

  useEffect(() => {
    async function initializeSession() {
      // 1. Tarik user session
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.replace('/login')
        return
      }

      // 2. Tarik nama profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      // 3. Tarik role dari user_roles (Untuk set Cookie)
      const { data: roles } = await supabase
        .from('user_roles')
        .select('entity_id, role')
        .eq('user_id', user.id)

      if (profile && roles && roles.length > 0) {
        // Set state untuk animasi UI
        const firstName = profile.full_name ? profile.full_name.split(' ')[0] : 'User'
        const highestRole = roles[0].role // Ambil role pertama sebagai default
        setProfileData({
          firstName,
          displayRole: ROLE_LABEL[highestRole] ?? highestRole
        })

        // SUNTIKKAN COOKIE KE SERVER
        await setActiveDivision(roles[0].entity_id, roles[0].role)

        // Matikan loading, trigger animasi
        setIsProcessing(false)
        requestAnimationFrame(() => setVisible(true))

        // Redirect otomatis ke dashboard setelah 2.8 detik
        setTimeout(() => {
          router.replace('/dashboard')
        }, 2800)

      } else {
        // User terdaftar tapi tidak punya role di divisi manapun
        setIsProcessing(false)
        alert("Akses ditolak: Anda belum di-assign ke divisi manapun. Hubungi CEO.")
        router.replace('/login')
      }
    }

    initializeSession()
  }, [router, supabase])

  // Cegah flicker kosong saat loading data backend
  if (isProcessing || !profileData) return null;

  return (
    <div
      className="fixed inset-0 bg-[--color-bg-primary] flex flex-col items-center justify-center overflow-hidden"
      style={{
        transition: 'opacity 0.5s ease',
        opacity: visible ? 1 : 0,
      }}
    >
      {/* Background gold glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#D4AF37] opacity-[0.06] blur-[120px]" />
      </div>

      {/* Grid texture */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(212,175,55,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(212,175,55,0.025)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Content */}
      <div className="relative z-10 text-center px-6">
        <p
          className="text-[#D4AF37] text-xs uppercase tracking-[0.35em] font-bold mb-6"
          style={{
            transform: visible ? 'translateY(0)' : 'translateY(16px)',
            opacity: visible ? 1 : 0,
            transition: 'transform 0.6s ease, opacity 0.6s ease',
          }}
        >
          Anugerah Ventures OS
        </p>

        <h1
          className="text-[--color-text-primary] font-black tracking-tight"
          style={{
            fontSize: 'clamp(2.25rem, 8vw, 4rem)',
            lineHeight: 1.1,
            transform: visible ? 'translateY(0)' : 'translateY(24px)',
            opacity: visible ? 1 : 0,
            transition: 'transform 0.7s ease 0.1s, opacity 0.7s ease 0.1s',
          }}
        >
          Halo,{' '}
          <span className="text-[#D4AF37]">{profileData.displayRole}</span>
          <br />
          {profileData.firstName}
        </h1>

        <p
          className="text-[--color-text-muted] text-sm mt-4"
          style={{
            transform: visible ? 'translateY(0)' : 'translateY(16px)',
            opacity: visible ? 1 : 0,
            transition: 'transform 0.7s ease 0.2s, opacity 0.7s ease 0.2s',
          }}
        >
          Selamat datang kembali di sistem internal.
        </p>

        {/* Progress bar */}
        <div
          className="mt-10 mx-auto w-48 h-0.5 bg-white/5 rounded-full overflow-hidden"
          style={{
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.5s ease 0.4s',
          }}
        >
          <div
            className="h-full bg-[#D4AF37] rounded-full origin-left"
            style={{
              animation: visible ? 'welcome-progress 2.4s ease forwards' : 'none',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes welcome-progress {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>
    </div>
  )
}