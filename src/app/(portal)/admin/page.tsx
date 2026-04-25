'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { Entity } from '@/types'
import { toast } from 'sonner'
import { 
  Users, 
  UserPlus, 
  ChevronRight, 
  Loader2,
  Mail,
  User,
  Building2,
  Lock,
  UploadCloud,
  Image as ImageIcon
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const { profile, loading: userLoading } = useUser()
  const router = useRouter()
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'entities' | 'team'>('entities')
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)
  const [users, setUsers] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState<any | null>(null)
  const supabase = createClient()

  // Verify CEO Role
  useEffect(() => {
    if (!userLoading && profile && profile.role !== 'CEO') {
      toast.error('Akses ditolak. Halaman ini khusus untuk CEO.')
      router.push('/dashboard')
    }
  }, [profile, userLoading, router])

  // Form State: Entity
  const [entityForm, setEntityForm] = useState({
    name: '',
    type: 'DIVISION',
    logo_key: '',
    primary_color: '#C5A028'
  })
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selectedEntity) {
      setEntityForm({
        name: selectedEntity.name || '',
        type: selectedEntity.type || 'DIVISION',
        logo_key: selectedEntity.logo_key || '',
        primary_color: selectedEntity.primary_color || '#C5A028'
      })
    } else {
      setEntityForm({
        name: '',
        type: 'DIVISION',
        logo_key: '',
        primary_color: '#C5A028'
      })
    }
  }, [selectedEntity])

  // Form State: Manajemen Pengguna
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'STAFF',
    entity_id: ''
  })

  useEffect(() => {
    async function fetchData() {
      if (!profile || profile.role !== 'CEO') return

      const { data: entData } = await supabase.from('entities').select('*').order('name')
      if (entData) {
        setEntities(entData)
        if (entData.length > 0) setFormData(prev => ({ ...prev, entity_id: entData[0].id }))
      }

      const { data: usrData } = await supabase.from('profiles').select('*, entity:entities(name)').order('created_at', { ascending: false })
      if (usrData) setUsers(usrData)
    }
    fetchData()
  }, [profile, supabase])

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
      
      // Refresh users
      const { data: usrData } = await supabase.from('profiles').select('*, entity:entities(name)').order('created_at', { ascending: false })
      if (usrData) setUsers(usrData)
      
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    setLoading(true)

    const { error } = await supabase.from('profiles').update({
      full_name: selectedUser.full_name,
      role: selectedUser.role,
      entity_id: selectedUser.entity_id
    }).eq('id', selectedUser.id)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Data pengguna berhasil diperbarui.')
      // Refresh users
      const { data: usrData } = await supabase.from('profiles').select('*, entity:entities(name)').order('created_at', { ascending: false })
      if (usrData) setUsers(usrData)
      setSelectedUser(null)
    }
    setLoading(false)
  }

  const handleSaveEntity = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    if (selectedEntity) {
      const { error } = await supabase.from('entities').update(entityForm).eq('id', selectedEntity.id)
      if (error) toast.error(error.message)
      else toast.success('Entitas berhasil diperbarui.')
    } else {
      const { error } = await supabase.from('entities').insert([entityForm])
      if (error) toast.error(error.message)
      else toast.success('Entitas baru berhasil ditambahkan.')
    }
    
    // Refresh entities
    const { data } = await supabase.from('entities').select('*').order('name')
    if (data) setEntities(data)
    
    setSelectedEntity(null)
    setLoading(false)
  }

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar')
      return
    }
    setUploadingLogo(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', 'logos')
    fd.append('entity_id', selectedEntity?.id || 'new_entity')

    try {
      const res = await fetch('/api/storage/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      setEntityForm(prev => ({ ...prev, logo_key: data.key }))
      toast.success('Logo diunggah. Jangan lupa simpan entitas.')
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengunggah logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  if (userLoading || profile?.role !== 'CEO') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    )
  }

  const navItems = [
    { id: 'entities', label: 'Entitas Bisnis', icon: Building2 },
    { id: 'team', label: 'Manajemen Pengguna', icon: Users }
  ]

  const getLogoSrc = (key: string) => {
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
            <h1 className="text-2xl font-bold text-white tracking-tight">Admin</h1>
            <p className="text-[#D4AF37] text-[10px] font-bold uppercase tracking-[0.2em] mt-1">CEO Control Panel</p>
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
            {activeTab === 'entities' && (
              <motion.div
                key="entities"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-card border border-[#D4AF37]/20 overflow-hidden"
              >
                <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37]">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold gold-text">Manajemen Entitas</h2>
                        <p className="text-xs text-[--color-text-muted]">Kelola divisi dan profil perusahaan</p>
                      </div>
                    </div>
                    {selectedEntity && (
                      <button onClick={() => setSelectedEntity(null)} className="text-[10px] text-[--color-text-muted] hover:text-white uppercase tracking-widest font-bold px-3 py-1.5 border border-white/10 rounded">
                        + Entitas Baru
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-8 grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {/* Daftar Entitas */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-[--color-text-muted] uppercase tracking-widest mb-3">Daftar Entitas</h3>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                      {entities.map(ent => (
                        <button
                          key={ent.id}
                          onClick={() => setSelectedEntity(ent)}
                          className={`w-full text-left p-4 rounded-lg border transition-all ${
                            selectedEntity?.id === ent.id 
                              ? 'bg-white/10 border-[#D4AF37]/50' 
                              : 'bg-[--color-bg-elevated] border-[--color-border] hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white flex items-center gap-2">
                              {ent.logo_key && <img src={getLogoSrc(ent.logo_key)!} alt="" className="w-5 h-5 object-contain" />}
                              {ent.name}
                            </span>
                            <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `${ent.primary_color || '#fff'}20`, color: ent.primary_color || '#fff' }}>
                              {ent.type}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Form Entitas */}
                  <div className="bg-white/[0.02] p-5 rounded-lg border border-white/5 h-fit">
                    <h3 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest mb-4">
                      {selectedEntity ? `Edit: ${selectedEntity.name}` : 'Buat Entitas Baru'}
                    </h3>
                    <form onSubmit={handleSaveEntity} className="space-y-5">
                      
                      {/* Logo Upload Drag & Drop */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[--color-text-muted] uppercase tracking-widest ml-1">Logo Entitas</label>
                        <div 
                          className={`relative flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl transition-all cursor-pointer bg-[--color-bg-elevated]
                            ${uploadingLogo ? 'border-[#D4AF37]/50 bg-[#D4AF37]/5' : 'border-[--color-border] hover:border-[#D4AF37]/50'}`}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault()
                            if (e.dataTransfer.files?.[0]) handleLogoUpload(e.dataTransfer.files[0])
                          }}
                          onClick={() => logoInputRef.current?.click()}
                        >
                          <input type="file" className="hidden" ref={logoInputRef} accept="image/*"
                            onChange={(e) => {
                              if (e.target.files?.[0]) handleLogoUpload(e.target.files[0])
                            }} />
                          
                          {uploadingLogo ? (
                            <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin mb-2" />
                          ) : entityForm.logo_key ? (
                            <div className="relative w-16 h-16 rounded overflow-hidden mb-2 border border-white/10 bg-white/5 p-1">
                              <img src={getLogoSrc(entityForm.logo_key)!} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2">
                              <UploadCloud className="w-4 h-4 text-[--color-text-muted]" />
                            </div>
                          )}
                          <p className="text-[11px] font-bold text-white mb-0.5">
                            {uploadingLogo ? 'Mengunggah...' : 'Drop logo (PNG/JPG)'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[--color-text-muted] uppercase tracking-widest ml-1">Nama Entitas</label>
                        <input type="text" required 
                          className="w-full bg-[--color-bg-elevated] border border-[--color-border] rounded-lg px-4 py-2.5 text-sm text-white focus:border-[#D4AF37]/50 focus:outline-none transition-all"
                          value={entityForm.name} onChange={e => setEntityForm({...entityForm, name: e.target.value})} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[--color-text-muted] uppercase tracking-widest ml-1">Tipe</label>
                          <select className="w-full bg-[--color-bg-elevated] border border-[--color-border] rounded-lg px-4 py-2.5 text-sm text-white focus:border-[#D4AF37]/50 focus:outline-none transition-all appearance-none cursor-pointer"
                            value={entityForm.type} onChange={e => setEntityForm({...entityForm, type: e.target.value as 'DIVISION' | 'HOLDING'})}>
                            <option value="DIVISION">Division</option>
                            <option value="HOLDING">Holding</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[--color-text-muted] uppercase tracking-widest ml-1">Warna Utama</label>
                          <div className="flex gap-2">
                            <input type="color" className="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0"
                              value={entityForm.primary_color} onChange={e => setEntityForm({...entityForm, primary_color: e.target.value})} />
                            <input type="text" required pattern="^#[0-9A-Fa-f]{6}$"
                              className="flex-1 bg-[--color-bg-elevated] border border-[--color-border] rounded-lg px-3 py-2 text-sm text-white focus:border-[#D4AF37]/50 focus:outline-none uppercase font-mono"
                              value={entityForm.primary_color} onChange={e => setEntityForm({...entityForm, primary_color: e.target.value})} />
                          </div>
                        </div>
                      </div>

                      <button type="submit" disabled={loading || uploadingLogo} 
                        className="w-full bg-white/10 hover:bg-[#D4AF37]/20 text-white hover:text-[#D4AF37] font-bold py-3 rounded-lg transition-all disabled:opacity-50 uppercase tracking-widest text-[11px] mt-4 border border-transparent hover:border-[#D4AF37]/30"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Simpan Entitas'}
                      </button>
                    </form>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'team' && (
              <motion.div
                key="team"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-card border border-white/5 overflow-hidden"
              >
                <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                        <UserPlus className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white">Manajemen Pengguna</h2>
                        <p className="text-xs text-[--color-text-muted]">Daftar dan buat akun tim</p>
                      </div>
                    </div>
                    {selectedUser && (
                      <button onClick={() => setSelectedUser(null)} className="text-[10px] text-[--color-text-muted] hover:text-white uppercase tracking-widest font-bold px-3 py-1.5 border border-white/10 rounded">
                        + Akun Baru
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-8 grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {/* Daftar Pengguna */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-[--color-text-muted] uppercase tracking-widest mb-3">Daftar Pengguna</h3>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                      {users.map(u => (
                        <button
                          key={u.id}
                          onClick={() => setSelectedUser(u)}
                          className={`w-full text-left p-4 rounded-lg border transition-all flex items-center gap-3 ${
                            selectedUser?.id === u.id 
                              ? 'bg-blue-500/10 border-blue-500/50' 
                              : 'bg-[--color-bg-elevated] border-[--color-border] hover:border-white/20'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full shrink-0 relative overflow-hidden border border-white/10 bg-white/5">
                            {u.avatar_url ? (
                              <img src={getLogoSrc(u.avatar_url)!} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-xs text-white">
                                {u.full_name?.charAt(0) || '?'}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <span className="text-sm font-bold text-white truncate block">{u.full_name}</span>
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest block truncate">
                              {u.role} • {u.entity?.name || 'Unknown'}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Form Pengguna */}
                  <div className="bg-white/[0.02] p-5 rounded-lg border border-white/5 h-fit">
                    {!selectedUser ? (
                      <>
                        <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-4">Buat Akun Tim Baru</h3>
                        <form onSubmit={handleCreateUser} className="space-y-5">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-[--color-text-muted] uppercase tracking-widest ml-1">Nama Lengkap</label>
                            <div className="relative group">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-text-muted] group-focus-within:text-blue-400" />
                              <input type="text" placeholder="John Doe" required 
                                className="w-full bg-[--color-bg-elevated] border border-[--color-border] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-all"
                                value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-[--color-text-muted] uppercase tracking-widest ml-1">Email Bisnis</label>
                            <div className="relative group">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-text-muted] group-focus-within:text-blue-400" />
                              <input type="email" placeholder="john@anugerah.com" required 
                                className="w-full bg-[--color-bg-elevated] border border-[--color-border] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-all"
                                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-[--color-text-muted] uppercase tracking-widest ml-1">Jabatan / Role</label>
                              <select className="w-full bg-[--color-bg-elevated] border border-[--color-border] rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-all appearance-none cursor-pointer"
                                value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                                <option value="CEO">CEO</option>
                                <option value="HEAD">Head Division</option>
                                <option value="FINANCE">Finance</option>
                                <option value="DESIGN">Design Team</option>
                                <option value="STAFF">Staff</option>
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-[--color-text-muted] uppercase tracking-widest ml-1">Penempatan Divisi</label>
                              <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-text-muted] pointer-events-none" />
                                <select className="w-full bg-[--color-bg-elevated] border border-[--color-border] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-all appearance-none cursor-pointer"
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
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-text-muted] group-focus-within:text-blue-400" />
                              <input type="text" placeholder="Masukkan password (min 6 char)" required minLength={6} 
                                className="w-full bg-[--color-bg-elevated] border border-[--color-border] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-all"
                                value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                            </div>
                          </div>

                          <button 
                            type="submit" 
                            disabled={loading} 
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3.5 rounded-lg transition-all disabled:opacity-50 uppercase tracking-[0.2em] text-[11px] shadow-lg shadow-blue-500/20"
                          >
                            {loading ? (
                              <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Memproses...
                              </span>
                            ) : 'Ciptakan Akun'}
                          </button>
                        </form>
                      </>
                    ) : (
                      <>
                        <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-4">Profil: {selectedUser.full_name}</h3>
                        <form onSubmit={handleUpdateUser} className="space-y-5">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-full shrink-0 relative overflow-hidden border-2 border-white/10 bg-white/5">
                              {selectedUser.avatar_url ? (
                                <img src={getLogoSrc(selectedUser.avatar_url)!} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-lg text-white">
                                  {selectedUser.full_name?.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-xs text-[--color-text-muted]">Akun Terdaftar</p>
                              <p className="text-white text-sm font-bold">{selectedUser.full_name}</p>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-[--color-text-muted] uppercase tracking-widest ml-1">Nama Lengkap</label>
                            <input type="text" required 
                              className="w-full bg-[--color-bg-elevated] border border-[--color-border] rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-all"
                              value={selectedUser.full_name} onChange={e => setSelectedUser({...selectedUser, full_name: e.target.value})} />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-[--color-text-muted] uppercase tracking-widest ml-1">Jabatan / Role</label>
                              <select className="w-full bg-[--color-bg-elevated] border border-[--color-border] rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-all appearance-none cursor-pointer"
                                value={selectedUser.role} onChange={e => setSelectedUser({...selectedUser, role: e.target.value})}>
                                <option value="CEO">CEO</option>
                                <option value="HEAD">Head Division</option>
                                <option value="FINANCE">Finance</option>
                                <option value="DESIGN">Design Team</option>
                                <option value="STAFF">Staff</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-[--color-text-muted] uppercase tracking-widest ml-1">Penempatan Divisi</label>
                              <select className="w-full bg-[--color-bg-elevated] border border-[--color-border] rounded-lg px-4 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-all appearance-none cursor-pointer"
                                value={selectedUser.entity_id} onChange={e => setSelectedUser({...selectedUser, entity_id: e.target.value})}>
                                {entities.map(ent => (
                                  <option key={ent.id} value={ent.id}>{ent.name}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <button type="submit" disabled={loading} 
                            className="w-full bg-white/10 hover:bg-blue-500/20 text-white hover:text-blue-400 font-bold py-3 rounded-lg transition-all disabled:opacity-50 uppercase tracking-widest text-[11px] mt-4 border border-transparent hover:border-blue-500/30"
                          >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Simpan Perubahan'}
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}
