'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2, ChevronDown } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEmailForm, setShowEmailForm] = useState(false)

  async function handleGoogleLogin() {
    setError(null)
    setLoadingGoogle(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) {
      setError('Gagal login dengan Google. Coba lagi.')
      setLoadingGoogle(false)
    }
    // Jika sukses, browser redirect otomatis ke Google
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoadingEmail(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email atau password salah.')
      setLoadingEmail(false)
      return
    }
    router.push('/welcome')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[--color-bg-primary] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(212,175,55,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(212,175,55,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      {/* Gold glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#D4AF37] opacity-[0.04] blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative w-16 h-16 mb-4">
            <Image src="/logo.png" alt="Anugerah Ventures" fill className="object-contain" priority />
          </div>
          <h1 className="text-[--color-text-primary] font-black text-2xl tracking-tight">Anugerah OS</h1>
          <p className="text-[--color-text-muted] text-xs tracking-[0.3em] uppercase mt-1">
            Vision. Velocity. Ventures.
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <h2 className="text-[--color-text-primary] font-bold text-lg mb-1">Masuk ke Sistem</h2>
          <p className="text-[--color-text-muted] text-sm mb-6">Akses terbatas untuk tim internal Anugerah Ventures.</p>

          {/* Google Login — Primary */}
          <button
            id="btn-login-google"
            onClick={handleGoogleLogin}
            disabled={loadingGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white text-[#111] font-bold py-3 rounded-md text-sm hover:bg-neutral-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {loadingGoogle ? (
              <Loader2 className="w-4 h-4 animate-spin text-[--color-text-muted]" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
            )}
            Masuk dengan Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/10" />
            <button
              onClick={() => setShowEmailForm(!showEmailForm)}
              className="flex items-center gap-1 text-neutral-600 text-xs hover:text-[--color-text-muted] transition-colors"
            >
              atau email
              <ChevronDown className={`w-3 h-3 transition-transform ${showEmailForm ? 'rotate-180' : ''}`} />
            </button>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email Form — Collapsible */}
          {showEmailForm && (
            <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
              <div>
                <label className="text-[--color-text-muted] text-xs font-medium uppercase tracking-widest mb-1.5 block">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="nama@anugerah.id"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-md px-4 py-2.5 text-[--color-text-primary] text-sm placeholder:text-neutral-600 focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-[--color-text-muted] text-xs font-medium uppercase tracking-widest mb-1.5 block">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full bg-white/[0.04] border border-white/10 rounded-md px-4 py-2.5 pr-11 text-[--color-text-primary] text-sm placeholder:text-neutral-600 focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[--color-text-muted] hover:text-neutral-300 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                id="btn-login-email"
                type="submit"
                disabled={loadingEmail}
                className="w-full bg-[#D4AF37] text-[--color-bg-primary] font-bold py-2.5 rounded-md text-sm uppercase tracking-widest hover:bg-[#F5D678] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loadingEmail ? <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</> : 'Masuk'}
              </button>
            </form>
          )}

          {error && (
            <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-md px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        <p className="text-center text-neutral-700 text-xs mt-8 tracking-wide">
          © 2026 Anugerah Ventures. Confidential.
        </p>
      </div>
    </main>
  )
}
