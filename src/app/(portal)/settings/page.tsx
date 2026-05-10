'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { 
  Lock, 
  ShieldCheck, 
  ChevronRight, 
  Loader2,
  User,
  KeyRound,
  UploadCloud,
  CreditCard,
  Building
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'bank'>('profile')

  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [roles, setRoles] = useState<string[]>([])

  const [profileForm, setProfileForm] = useState({
    full_name: '',
    avatar_url: '',
    bank_name: '',
    bank_account_number: '',
    bank_account_holder: ''
  })
  
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  })

  // 1. GANTIKAN useUser DENGAN FETCH MANDIRI
  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setPageLoading(false)
        return
      }

      setUserId(user.id)
      setEmail(user.email || '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        setProfileForm({
          full_name: profile.full_name || '',
          avatar_url: profile.avatar_url || '',
          bank_name: profile.bank_name || '',
          bank_account_number: profile.bank_account_number || '',
          bank_account_holder: profile.bank_account_holder || ''
        })
        setRoles(profile.roles || [])
      }
      setPageLoading(false)
    }
    fetchProfile()
  }, [])

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
    if (!userId) return
    setLoading(true)
    const { error } = await supabase.from('profiles').update({
      full_name: profileForm.full_name,
      avatar_url: profileForm.avatar_url,
      bank_name: profileForm.bank_name,
      bank_account_number: profileForm.bank_account_number,
      bank_account_holder: profileForm.bank_account_holder
    }).eq('id', userId)
    
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
    formData.append('entity_id', userId || 'general')

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

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    )
  }

  const navItems = [
    { id: 'profile', label: 'Profil Pengguna', icon: User },
    { id: 'bank', label: 'Rekening Komisi', icon: CreditCard },
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

          {/* Read Only Stats */}
          <div className="mt-8 px-4 py-5 rounded-xl border border-white/5 bg-white/[0.01]">
             <div className="flex items-center gap-2 text-[--color-text-muted] mb-3">
                <Building className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-widest font-bold">Status Otoritas</span>
             </div>
             <p className="text-[10px] text-[--color-text-muted] truncate mb-2">{email}</p>
             <div className="flex flex-wrap gap-1.5">
                {roles.map(r => (
                  <span key={r} className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20">
                    {r}
                  </span>
                ))}
             </div>
          </div>
        </aside>

        {/* CONTENT AREA */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass-card border border-white/5 overflow-hidden">
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

                    <button type="submit" disabled={loading || uploadingAvatar} className="inline-flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#B8962E] text-black text-[11px] font-bold px-6 py-3 rounded-lg transition-all uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-[#D4AF37]/10">
                      {loading && <Loader2 className="w-3 h-3 animate-spin" />} Simpan Profil
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* TAB REKENING BANK BARU */}
            {activeTab === 'bank' && (
              <motion.div key="bank" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass-card border border-white/5 overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-[--color-text-primary]">Rekening Pencairan</h2>
                      <p className="text-xs text-[--color-text-muted]">Data rekening untuk menerima komisi atau dividen</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-8">
                  <form onSubmit={handleUpdateProfile} className="max-w-md space-y-6">
                    <div className="space-y-4">
                      <div className="relative">
                        <label className="block text-[10px] font-bold text-[--color-text-muted] uppercase tracking-widest mb-1.5 ml-1">Nama Bank</label>
                        <input type="text" className="w-full bg-[--color-bg-elevated] border border-[--color-border] rounded-lg px-4 py-2.5 text-sm text-[--color-text-primary] focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 focus:outline-none transition-all"
                          value={profileForm.bank_name} onChange={e => setProfileForm({...profileForm, bank_name: e.target.value})} placeholder="Contoh: BCA / Bank Mandiri" />
                      </div>

                      <div className="relative">
                        <label className="block text-[10px] font-bold text-[--color-text-muted] uppercase tracking-widest mb-1.5 ml-1">Nomor Rekening</label>
                        <input type="text" className="w-full bg-[--color-bg-elevated] border border-[--color-border] rounded-lg px-4 py-2.5 text-sm text-[--color-text-primary] font-mono focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 focus:outline-none transition-all"
                          value={profileForm.bank_account_number} onChange={e => setProfileForm({...profileForm, bank_account_number: e.target.value.replace(/\D/g, '')})} placeholder="1234567890" />
                      </div>

                      <div className="relative">
                        <label className="block text-[10px] font-bold text-[--color-text-muted] uppercase tracking-widest mb-1.5 ml-1">Nama Pemilik Rekening</label>
                        <input type="text" className="w-full bg-[--color-bg-elevated] border border-[--color-border] rounded-lg px-4 py-2.5 text-sm text-[--color-text-primary] focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 focus:outline-none transition-all"
                          value={profileForm.bank_account_holder} onChange={e => setProfileForm({...profileForm, bank_account_holder: e.target.value})} placeholder="Sesuai buku tabungan" />
                      </div>
                    </div>

                    <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 bg-[#D4AF37] hover:bg-[#B8962E] text-black text-[11px] font-bold px-6 py-3 rounded-lg transition-all uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-[#D4AF37]/10">
                      {loading && <Loader2 className="w-3 h-3 animate-spin" />} Simpan Rekening
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {activeTab === 'security' && (
              <motion.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="glass-card border border-white/5 overflow-hidden">
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
                            type="password" required minLength={6}
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
                            type="password" required minLength={6}
                            className="w-full bg-[--color-bg-elevated] border border-[--color-border] rounded-lg pl-10 pr-4 py-2.5 text-sm text-[--color-text-primary] focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 focus:outline-none transition-all"
                            value={passwordForm.confirmPassword}
                            onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                            placeholder="••••••••"
                          />
                        </div>
                      </div>
                    </div>

                    <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-[--color-text-primary] text-[11px] font-bold px-6 py-3 rounded-lg transition-all uppercase tracking-widest disabled:opacity-50">
                      {loading && <Loader2 className="w-3 h-3 animate-spin" />} Update Password
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