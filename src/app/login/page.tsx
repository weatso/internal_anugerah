'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email atau password salah. Silakan coba lagi.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#050505] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(212,175,55,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(212,175,55,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Glow center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#D4AF37] opacity-[0.04] blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative w-16 h-16 mb-4">
            <Image src="/logo.png" alt="Anugerah Ventures" fill className="object-contain" priority />
          </div>
          <h1 className="text-white font-black text-2xl tracking-tight">Anugerah OS</h1>
          <p className="text-neutral-500 text-xs tracking-[0.3em] uppercase mt-1">
            Vision. Velocity. Ventures.
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <h2 className="text-white font-bold text-lg mb-1">Masuk ke Sistem</h2>
          <p className="text-neutral-500 text-sm mb-6">Akses terbatas untuk tim internal.</p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-neutral-400 text-xs font-medium uppercase tracking-widest mb-2 block">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="nama@anugerah.id"
                className="w-full bg-white/[0.04] border border-white/10 rounded-md px-4 py-3 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
              />
            </div>

            <div>
              <label className="text-neutral-400 text-xs font-medium uppercase tracking-widest mb-2 block">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-md px-4 py-3 pr-12 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-md px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              id="btn-login"
              type="submit"
              disabled={loading}
              className="mt-2 w-full bg-[#D4AF37] text-[#050505] font-bold py-3 rounded-md text-sm uppercase tracking-widest hover:bg-[#F5D678] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</>
              ) : (
                'Masuk'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-neutral-700 text-xs mt-8 tracking-wide">
          © 2026 Anugerah Ventures. Confidential.
        </p>
      </div>
    </main>
  )
}
