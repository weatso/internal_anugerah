'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { toast } from 'sonner'
import { 
  Lock, 
  ShieldCheck, 
  ChevronRight, 
  Loader2,
  User,
  KeyRound,
  UploadCloud,
  Image as ImageIcon
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SettingsPage() {
  const { profile, loading: userLoading } = useUser()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile')
  const supabase = createClient()

  const [profileForm, setProfileForm] = useState({
    full_name: '',
    avatar_url: ''
  })
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        avatar_url: profile.avatar_url || ''
      })
    }
  }, [profile])

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  })

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Password konfirmasi tidak cocok.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword })
    
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password berhasil diperbarui.')
      setPasswordForm({ newPassword: '', confirmPassword: '' })
    }
    setLoading(false)
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('profiles').update({
      full_name: profileForm.full_name,
      avatar_url: profileForm.avatar_url
    }).eq('id', profile?.id)
    
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Profil berhasil diperbarui.')
      setTimeout(() => window.location.reload(), 1000)
    }
    setLoading(false)
  }

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar')
      return
    }
    setUploadingAvatar(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'avatars')
    formData.append('entity_id', profile?.id || 'general')

    try {
      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      setProfileForm(prev => ({ ...prev, avatar_url: data.key }))
      toast.success('Foto berhasil diunggah. Jangan lupa simpan profil.')
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengunggah foto')
    } finally {
      setUploadingAvatar(false)
    }
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    )
  }

  const navItems = [
    { id: 'profile', label: 'Profil Pengguna', icon: User },
    { id: 'security', label: 'Keamanan Akun', icon: Lock }
  ]

  const getAvatarSrc = (key: string) => {
    if (!key) return null
    if (key.startsWith('http')) return key
    return `/api/storage/file?key=${encodeURIComponent(key)}`
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-full md:w-64 space-y-2">
          <div className="px-3 mb-6">
            <h1 className="text-2xl font-bold text-[--color-text-primary] tracking-tight">Pengaturan</h1>
            <p className="text-xs text-[--color-text-muted] uppercase tracking-widest mt-1">Konfigurasi Personal</p>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 group ${
                  activeTab === item.id 
                    ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20' 
                    : 'text-[--color-text-secondary] hover:bg-white/5 hover:text-[--color-text-primary]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-[#D4AF37]' : 'text-[--color-text-muted] group-hover:text-[--color-text-primary]'}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                {activeTab === item.id && <ChevronRight className="w-4 h-4" />}
              </button>
            ))}
          </nav>
        </aside>

        {/* CONTENT AREA */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-card border border-white/5 overflow-hidden"
              >
                <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#C5A028]/10 text-[#C5A028]">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[--color-text-primary]">Profil Pengguna</h2>
                      <p className="text-xs text-[--color-text-muted]">Ubah nama dan foto profil Anda</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-8">
                  <form onSubmit={handleUpdateProfile} className="max-w-md space-y-6">
                    <div className="space-y-6">
                      
                      {/* Avatar Upload (Drag & Drop) */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-[--color-text-muted] uppercase tracking-widest ml-1">Foto Profil</label>
                        <div 
                          className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all cursor-pointer bg-[--color-bg-elevated]
                            ${uploadingAvatar ? 'border-[#D4AF37]/50 bg-[#D4AF37]/5' : 'border-[--color-border] hover:border-[#D4AF37]/50'}`}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault()
                            if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0])
                          }}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <input type="file" className="hidden" ref={fileInputRef} accept="image/*"
                            onChange={(e) => {
                              if (e.target.files?.[0]) handleFileUpload(e.target.files[0])
                            }} />
                          
                          {uploadingAvatar ? (
                            <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin mb-2" />
                          ) : profileForm.avatar_url ? (
                            <div className="relative w-20 h-20 rounded-full overflow-hidden mb-3 border-2 border-white/10">
                              <img src={getAvatarSrc(profileForm.avatar_url)!} alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                              <UploadCloud className="w-5 h-5 text-[--color-text-muted]" />
                            </div>
                          )}
                          <p className="text-sm font-bold text-[--color-text-primary] mb-1">
                            {uploadingAvatar ? 'Mengunggah...' : 'Klik atau Drag file foto'}
                          </p>
                          <p className="text-xs text-[--color-text-muted]">Maks 2MB (JPG/PNG)</p>
                        </div>
                      </div>

                      <div className="relative">
                        <label className="block text-[10px] font-bold text-[--color-text-muted] uppercase tracking-widest mb-1.5 ml-1">Nama Lengkap</label>
                        <div className="relative group">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-text-muted] group-focus-within:text-[#D4AF37] transition-colors" />
                          <input 
                            type="text" 
                            required 
                            className="w-full bg-[--color-bg-elevated] border border-[--color-border] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[--color-text-primary] focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 focus:outline-none transition-all"
                            value={profileForm.full_name}
                            onChange={e => setProfileForm({...profileForm, full_name: e.target.value})}
                            placeholder="Nama Anda"
                          />
                        </div>
                      </div>

                    </div>

                    <button 
                      type="submit" 
                      disabled={loading || uploadingAvatar} 
                      className="inline-flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#B8962E] text-black text-[11px] font-bold px-6 py-3 rounded-lg transition-all uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-[#D4AF37]/10"
                    >
                      {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                      Simpan Profil
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-card border border-white/5 overflow-hidden"
              >
                <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[--color-text-primary]">Keamanan Akun</h2>
                      <p className="text-xs text-[--color-text-muted]">Kelola kredensial akses Anda</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-8">
                  <form onSubmit={handleUpdatePassword} className="max-w-md space-y-6">
                    <div className="space-y-4">
                      <div className="relative">
                        <label className="block text-[10px] font-bold text-[--color-text-muted] uppercase tracking-widest mb-1.5 ml-1">Password Baru</label>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-text-muted] group-focus-within:text-[#D4AF37] transition-colors" />
                          <input 
                            type="password" 
                            required 
                            minLength={6}
                            className="w-full bg-[--color-bg-elevated] border border-[--color-border] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[--color-text-primary] focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 focus:outline-none transition-all"
                            value={passwordForm.newPassword}
                            onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                            placeholder="••••••••"
                          />
                        </div>
                      </div>

                      <div className="relative">
                        <label className="block text-[10px] font-bold text-[--color-text-muted] uppercase tracking-widest mb-1.5 ml-1">Konfirmasi Password</label>
                        <div className="relative group">
                          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-text-muted] group-focus-within:text-[#D4AF37] transition-colors" />
                          <input 
                            type="password" 
                            required 
                            minLength={6}
                            className="w-full bg-[--color-bg-elevated] border border-[--color-border] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[--color-text-primary] focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 focus:outline-none transition-all"
                            value={passwordForm.confirmPassword}
                            onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                            placeholder="••••••••"
                          />
                        </div>
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={loading} 
                      className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-[--color-text-primary] text-[11px] font-bold px-6 py-3 rounded-lg transition-all uppercase tracking-widest disabled:opacity-50"
                    >
                      {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                      Update Password
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}