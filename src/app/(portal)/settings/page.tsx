'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { Entity } from '@/types'
import { toast } from 'sonner'
import { 
  Lock, 
  Users, 
  ShieldCheck, 
  UserPlus, 
  ChevronRight, 
  Loader2,
  Mail,
  User,
  Building2,
  KeyRound
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SettingsPage() {
  const { profile, loading: userLoading } = useUser()
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'security' | 'team'>('security')
  const supabase = createClient()

  // Form State: Update Password
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  })

  // Form State: Manajemen Pengguna
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'STAFF',
    entity_id: ''
  })

  useEffect(() => {
    async function fetchEntities() {
      const { data } = await supabase.from('entities').select('*').order('name')
      if (data) {
        setEntities(data)
        if (data.length > 0) setFormData(prev => ({ ...prev, entity_id: data[0].id }))
      }
    }
    if (profile?.role === 'CEO' || profile?.role === 'HEAD') {
      fetchEntities()
    }
  }, [profile, supabase])

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal membuat akun')

      toast.success('Akun tim berhasil diciptakan.')
      setFormData({ ...formData, email: '', password: '', full_name: '' })
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
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
    { id: 'security', label: 'Keamanan Akun', icon: Lock, roles: ['ANY'] },
    { id: 'team', label: 'Manajemen Tim', icon: Users, roles: ['CEO', 'HEAD'] }
  ].filter(item => item.roles.includes('ANY') || (profile?.role && item.roles.includes(profile.role)))

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-full md:w-64 space-y-2">
          <div className="px-3 mb-6">
            <h1 className="text-2xl font-bold text-white tracking-tight">Pengaturan</h1>
            <p className="text-xs text-[--color-text-muted] uppercase tracking-widest mt-1">Sistem Konfigurasi</p>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 group ${
                  activeTab === item.id 
                    ? 'bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20' 
                    : 'text-[--color-text-secondary] hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-[#D4AF37]' : 'text-[--color-text-muted] group-hover:text-white'}`} />
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
                      <h2 className="text-lg font-bold text-white">Keamanan Akun</h2>
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
                            className="w-full bg-[--color-bg-elevated] border border-[--color-border] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 focus:outline-none transition-all"
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
                            className="w-full bg-[--color-bg-elevated] border border-[--color-border] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20 focus:outline-none transition-all"
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
                      className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white text-[11px] font-bold px-6 py-3 rounded-lg transition-all uppercase tracking-widest disabled:opacity-50"
                    >
                      {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                      Update Password
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {activeTab === 'team' && (profile?.role === 'CEO' || profile?.role === 'HEAD') && (
              <motion.div
                key="team"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-card border border-[#D4AF37]/20 overflow-hidden"
              >
                <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold gold-text">Manajemen Pengguna</h2>
                      <p className="text-xs text-[--color-text-muted]">Otoritas tingkat {profile.role === 'CEO' ? 'Holding' : 'Divisi'}</p>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  <form onSubmit={handleCreateUser} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[--color-text-muted] uppercase tracking-widest ml-1">Informasi Personal</label>
                        <div className="relative group">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-text-muted] group-focus-within:text-[#D4AF37]" />
                          <input type="text" placeholder="Nama Lengkap" required 
                            className="w-full bg-[--color-bg-elevated] border border-[--color-border] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-[#D4AF37]/50 focus:outline-none transition-all"
                            value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[--color-text-muted] uppercase tracking-widest ml-1">Kredensial Bisnis</label>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-text-muted] group-focus-within:text-[#D4AF37]" />
                          <input type="email" placeholder="Email Bisnis" required 
                            className="w-full bg-[--color-bg-elevated] border border-[--color-border] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-[#D4AF37]/50 focus:outline-none transition-all"
                            value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[--color-text-muted] uppercase tracking-widest ml-1">Jabatan / Role</label>
                        <select className="w-full bg-[--color-bg-elevated] border border-[--color-border] rounded-lg px-4 py-2.5 text-sm text-white focus:border-[#D4AF37]/50 focus:outline-none transition-all appearance-none cursor-pointer"
                          value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                          {profile.role === 'CEO' && <option value="HEAD">Head Division</option>}
                          {profile.role === 'CEO' && <option value="FINANCE">Finance</option>}
                          {profile.role === 'CEO' && <option value="DESIGN">Design Team</option>}
                          <option value="STAFF">Staff</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[--color-text-muted] uppercase tracking-widest ml-1">Penempatan Divisi</label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-text-muted] pointer-events-none" />
                          <select className="w-full bg-[--color-bg-elevated] border border-[--color-border] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-[#D4AF37]/50 focus:outline-none transition-all appearance-none cursor-pointer"
                            value={formData.entity_id} onChange={e => setFormData({...formData, entity_id: e.target.value})}>
                            {entities.map(ent => (
                              <option key={ent.id} value={ent.id}>{ent.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[--color-text-muted] uppercase tracking-widest ml-1">Password Sementara</label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-text-muted] group-focus-within:text-[#D4AF37]" />
                        <input type="text" placeholder="Masukkan password sementara" required minLength={6} 
                          className="w-full bg-[--color-bg-elevated] border border-[--color-border] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-[#D4AF37]/50 focus:outline-none transition-all"
                          value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={loading} 
                      className="w-full bg-[#D4AF37] hover:bg-[#B8962E] text-black font-bold py-3.5 rounded-lg transition-all disabled:opacity-50 uppercase tracking-[0.2em] text-[11px] shadow-lg shadow-[#D4AF37]/10"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Memproses...
                        </span>
                      ) : 'Ciptakan Akun Tim'}
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