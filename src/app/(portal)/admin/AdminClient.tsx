'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Building2, ShieldCheck, Edit2, Plus, Trash2, Shield, X, Loader2, UserPlus, UploadCloud, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Profile, Entity, UserRole, UserRoleAssignment } from '@/types'
import { ROLE_LABELS } from '@/types'

const ALL_ROLES: UserRole[] = ['CEO', 'HEAD', 'FINANCE', 'DESIGN', 'STAFF']

interface AdminClientProps {
  initialProfiles: Profile[]
  initialEntities: Entity[]
  initialUserRoles: (UserRoleAssignment & { entity?: Entity })[]
  currentUser: Profile
}

export default function AdminClient({ initialProfiles, initialEntities, initialUserRoles, currentUser }: AdminClientProps) {
  const supabase = createClient()
  const router = useRouter()
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<'users' | 'divisions'>('users')
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles)
  const [entities, setEntities] = useState<Entity[]>(initialEntities)
  const [userRoles, setUserRoles] = useState(initialUserRoles)

  // Edit user state
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)
  const [roleAssignments, setRoleAssignments] = useState<{ entity_id: string; role: UserRole }[]>([])
  const [editName, setEditName] = useState('')

  // New user form
  const [newUser, setNewUser] = useState({ full_name: '', email: '', password: '', entity_id: '', role: 'STAFF' as UserRole })

  // Entity form
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)
  const [entityForm, setEntityForm] = useState({
    name: '', type: 'DIVISION', logo_key: '', primary_color: '#C5A028',
    address: '', phone: '', email: '', tagline: '', logo_url: ''
  })

  const [loading, setLoading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const cardStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8 }
  const inputCls = 'w-full rounded-md px-3.5 py-2.5 text-sm outline-none transition-all input-field'

  const getLogoSrc = (key: string | null | undefined) => {
    if (!key) return null
    if (key.startsWith('http')) return key
    return `/api/storage/file?key=${encodeURIComponent(key)}`
  }

  function getUserRoles(userId: string) {
    return userRoles.filter(ur => ur.user_id === userId)
  }

  function selectUser(u: Profile) {
    setSelectedUser(u)
    setEditName(u.full_name)
    const urs = getUserRoles(u.id)
    setRoleAssignments(urs.map(ur => ({ entity_id: ur.entity_id, role: ur.role })))
  }

  async function handleSaveRoles(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUser) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/update-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUser.id,
          assignments: roleAssignments.filter(r => r.entity_id && r.role),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan role')

      await supabase.from('profiles').update({ full_name: editName }).eq('id', selectedUser.id)

      toast.success('Data pengguna berhasil diperbarui.')
      setSelectedUser(null)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newUser, entity_id: newUser.entity_id || entities[0]?.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal membuat akun')
      toast.success(`Akun ${newUser.full_name} berhasil dibuat.`)
      setNewUser({ full_name: '', email: '', password: '', entity_id: '', role: 'STAFF' })
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveEntity(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (selectedEntity) {
        const { error } = await supabase.from('entities').update(entityForm).eq('id', selectedEntity.id)
        if (error) throw error
        toast.success('Entitas diperbarui.')
      } else {
        const { error } = await supabase.from('entities').insert([entityForm])
        if (error) throw error
        toast.success('Entitas baru ditambahkan.')
      }
      setSelectedEntity(null)
      setEntityForm({ name: '', type: 'DIVISION', logo_key: '', primary_color: '#C5A028', address: '', phone: '', email: '', tagline: '', logo_url: '' })
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteEntity(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Hapus divisi ini secara permanen?')) return
    setLoading(true)
    try {
      const { error } = await supabase.from('entities').delete().eq('id', id)
      if (error) throw error
      toast.success('Divisi berhasil dihapus.')
      if (selectedEntity?.id === id) setSelectedEntity(null)
      router.refresh()
    } catch (err: any) {
      toast.error('Gagal menghapus: Pastikan divisi ini tidak memiliki proyek atau dokumen terkait.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogoUpload(file: File) {
    if (!file.type.startsWith('image/')) { toast.error('Harus gambar'); return }
    setUploadingLogo(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('folder', 'logos')
    fd.append('entity_id', selectedEntity?.id || 'new_entity')
    try {
      const res = await fetch('/api/storage/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEntityForm(p => ({ ...p, logo_key: data.key, logo_url: data.url || data.key }))
      toast.success('Logo diunggah.')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploadingLogo(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] font-bold mb-1" style={{ color: 'var(--gold)' }}>CEO Control Panel</p>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <ShieldCheck className="w-6 h-6" style={{ color: 'var(--gold)' }} />
            Admin Panel
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Kelola ekosistem divisi dan otorisasi tim Anda.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        {[
          { id: 'users', label: 'Manajemen Tim', icon: Users },
          { id: 'divisions', label: 'Ekosistem Divisi', icon: Building2 },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className="flex items-center gap-2 px-6 py-3 font-bold text-xs uppercase tracking-widest transition-all border-b-2"
            style={activeTab === tab.id
              ? { color: 'var(--gold)', borderColor: 'var(--gold)' }
              : { color: 'var(--text-muted)', borderColor: 'transparent' }
            }>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        
        {/* ── TAB: USERS (Human Capital) ── */}
        {activeTab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Kolom Kiri: Create User */}
            <div className="xl:col-span-1 space-y-4">
              <div className="p-4 rounded-lg border" style={cardStyle}>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--gold)' }}>Buat Akun Baru</p>
                <form onSubmit={handleCreateUser} className="space-y-2.5">
                  <input className={inputCls} placeholder="Nama Lengkap" required
                    value={newUser.full_name} onChange={e => setNewUser(p => ({ ...p, full_name: e.target.value }))} />
                  <input className={inputCls} type="email" placeholder="Email" required
                    value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
                  <input className={inputCls} placeholder="Password (min 6)" required minLength={6}
                    value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <select className="select-field text-sm" required
                      value={newUser.entity_id || (entities[0]?.id ?? '')}
                      onChange={e => setNewUser(p => ({ ...p, entity_id: e.target.value }))}>
                      <option value="" disabled>Pilih Divisi</option>
                      {entities.map(ent => <option key={ent.id} value={ent.id}>{ent.name}</option>)}
                    </select>
                    <select className="select-field text-sm"
                      value={newUser.role}
                      onChange={e => setNewUser(p => ({ ...p, role: e.target.value as UserRole }))}>
                      {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </select>
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full py-2.5 rounded-md text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                    style={{ background: 'var(--gold)', color: '#050505' }}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4" /> Tambah Staf</>}
                  </button>
                </form>
              </div>
            </div>

            {/* Kolom Kanan: Tabel Tim & Otorisasi */}
            <div className="xl:col-span-2 space-y-4">
              
              {!selectedUser ? (
                <div className="border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                  <table className="w-full text-left">
                    <thead className="text-xs uppercase font-bold" style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                      <tr>
                        <th className="px-6 py-4">Nama Staf</th>
                        <th className="px-6 py-4">Akses Divisi</th>
                        <th className="px-6 py-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                      {profiles.map(user => {
                        const urs = getUserRoles(user.id)
                        return (
                          <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                                  style={{ background: 'var(--gold-glow)', color: 'var(--gold)' }}>
                                  {user.full_name.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{user.full_name}</div>
                                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>ID: {user.id.slice(0, 6)}...</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {urs.length > 0 ? urs.map((ur, i) => (
                                  <span key={i} className="px-2 py-0.5 text-[10px] rounded border uppercase font-bold tracking-wide"
                                    style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}>
                                    {ur.role} @ {(ur as any).entity?.name ?? '?'}
                                  </span>
                                )) : <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>No Access</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => selectUser(user)} className="p-2 rounded text-blue-400 hover:bg-blue-500/10 transition-colors">
                                <ShieldCheck className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* FORM EDIT USER */
                <div className="p-6 rounded-lg border space-y-5" style={cardStyle}>
                  <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-lg"
                        style={{ background: 'var(--gold)', color: '#050505' }}>
                        {selectedUser.full_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>Kelola Otorisasi</p>
                        <p className="text-xs font-bold" style={{ color: 'var(--gold)' }}>{selectedUser.full_name}</p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-white/10 rounded" style={{ color: 'var(--text-muted)' }}>
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveRoles} className="space-y-5">
                    <div>
                      <label className="section-label block mb-1.5">Ubah Nama (Opsional)</label>
                      <input className={inputCls} value={editName} onChange={e => setEditName(e.target.value)} />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="section-label flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5" /> Peta Akses Divisi
                        </label>
                        <button type="button"
                          onClick={() => setRoleAssignments(p => [...p, { entity_id: entities[0]?.id ?? '', role: 'STAFF' }])}
                          className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded"
                          style={{ background: 'var(--gold-glow)', color: 'var(--gold)' }}>
                          <Plus className="w-3 h-3" /> Tambah Relasi
                        </button>
                      </div>
                      <div className="space-y-2">
                        {roleAssignments.length === 0 && (
                          <p className="text-sm text-center py-4 rounded-lg" style={{ color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
                            Staf ini belum memiliki akses ke divisi manapun.
                          </p>
                        )}
                        {roleAssignments.map((ra, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-3 rounded-lg border" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
                            <div className="flex-1 grid grid-cols-2 gap-3">
                              <select className="select-field text-sm font-medium" value={ra.entity_id}
                                onChange={e => setRoleAssignments(p => p.map((r, i) => i === idx ? { ...r, entity_id: e.target.value } : r))}>
                                {entities.map(ent => <option key={ent.id} value={ent.id}>{ent.name}</option>)}
                              </select>
                              <select className="select-field text-sm font-medium" value={ra.role}
                                onChange={e => setRoleAssignments(p => p.map((r, i) => i === idx ? { ...r, role: e.target.value as UserRole } : r))}>
                                {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                              </select>
                            </div>
                            <button type="button" onClick={() => setRoleAssignments(p => p.filter((_, i) => i !== idx))}
                              className="p-2 rounded hover:bg-red-500/10 hover:text-red-400 transition-colors" style={{ color: 'var(--text-muted)' }}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button type="submit" disabled={loading}
                      className="w-full py-3 rounded-md text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                      style={{ background: 'var(--gold)', color: '#050505' }}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Otorisasi'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── TAB: DIVISIONS (Entities) ── */}
        {activeTab === 'divisions' && (
          <motion.div key="divisions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* Entity Grid (Modern Framer Motion Style) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Daftar Entitas Aktif
                </p>
                <button onClick={() => { setSelectedEntity(null); setEntityForm({ name: '', type: 'DIVISION', logo_key: '', primary_color: '#C5A028', address: '', phone: '', email: '', tagline: '', logo_url: '' }) }}
                  className="text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1"
                  style={{ background: 'var(--gold-glow)', color: 'var(--gold)' }}>
                  <Plus className="w-3 h-3" /> Divisi Baru
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-1">
                {entities.map(ent => (
                  <motion.div key={ent.id} layout
                    className="p-5 rounded-xl border flex flex-col justify-between group"
                    style={selectedEntity?.id === ent.id ? { background: 'var(--gold-glow)', borderColor: 'var(--gold)' } : { ...cardStyle }}>
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center font-black"
                           style={{ background: 'var(--bg-secondary)', color: ent.primary_color || 'var(--gold)' }}>
                        {ent.logo_url || ent.logo_key ? (
                          <img src={ent.logo_url || getLogoSrc(ent.logo_key)!} alt={ent.name} className="w-full h-full object-contain p-1" />
                        ) : ent.name.charAt(0)}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => {
                          setSelectedEntity(ent)
                          setEntityForm({
                            name: ent.name, type: ent.type, logo_key: ent.logo_key ?? '', primary_color: ent.primary_color ?? '#C5A028',
                            address: (ent as any).address ?? '', phone: (ent as any).phone ?? '', email: (ent as any).email ?? '', tagline: (ent as any).tagline ?? '', logo_url: (ent as any).logo_url ?? ''
                          })
                        }} className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => handleDeleteEntity(ent.id, e)} className="p-2 hover:bg-red-500/10 rounded-lg text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{ent.name}</h3>
                      <p className="text-[10px] uppercase font-bold mt-1" style={{ color: 'var(--gold)' }}>{ent.type}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Entity Form */}
            <div className="p-6 rounded-xl border h-fit" style={cardStyle}>
              <p className="text-xs font-bold uppercase tracking-wider mb-5 flex items-center gap-2" style={{ color: 'var(--gold)' }}>
                {selectedEntity ? <><Settings2 className="w-4 h-4"/> Konfigurasi: {selectedEntity.name}</> : <><Plus className="w-4 h-4"/> Daftarkan Entitas Baru</>}
              </p>
              <form onSubmit={handleSaveEntity} className="space-y-4">
                {/* Logo Uploader */}
                <div>
                  <label className="section-label block mb-1.5">Identitas Visual (Logo URL & File)</label>
                  <div className="flex items-start gap-3">
                    <div className="w-16 h-16 shrink-0 rounded-lg flex items-center justify-center overflow-hidden border"
                      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-medium)' }}>
                      {(entityForm.logo_url || entityForm.logo_key) ? (
                        <img src={entityForm.logo_url || getLogoSrc(entityForm.logo_key)!} className="w-full h-full object-contain p-1.5" alt="Logo" />
                      ) : (
                        <div className="text-xl font-black" style={{ color: entityForm.primary_color }}>
                          {entityForm.name?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex items-center gap-3 p-2.5 rounded-lg border-2 border-dashed cursor-pointer hover:bg-white/5 transition-colors"
                        style={{ borderColor: 'var(--border-medium)', background: 'var(--bg-secondary)' }}
                        onClick={() => logoInputRef.current?.click()}>
                        <input type="file" ref={logoInputRef} className="hidden" accept="image/*"
                          onChange={e => { if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]) }} />
                        {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: 'var(--gold)' }} />
                          : <UploadCloud className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />}
                        <div>
                          <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {uploadingLogo ? 'Sedang mengunggah...' : 'Unggah File (R2 Storage)'}
                          </p>
                        </div>
                      </div>
                      <input className={inputCls + ' font-mono text-xs'} placeholder="Atau tempel URL CDN / Path Public..."
                        value={entityForm.logo_url} onChange={e => setEntityForm(p => ({ ...p, logo_url: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="section-label block mb-1.5">Nama Legal Entitas</label>
                  <input className={inputCls} required value={entityForm.name}
                    onChange={e => setEntityForm(p => ({ ...p, name: e.target.value }))} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="section-label block mb-1.5">Tipe Entitas</label>
                    <select className="select-field text-sm" value={entityForm.type}
                      onChange={e => setEntityForm(p => ({ ...p, type: e.target.value as any }))}>
                      <option value="DIVISION">Division (Operasional)</option>
                      <option value="HOLDING">Holding (Induk)</option>
                    </select>
                  </div>
                  <div>
                    <label className="section-label block mb-1.5">Warna Aksen</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                        value={entityForm.primary_color}
                        onChange={e => setEntityForm(p => ({ ...p, primary_color: e.target.value }))} />
                      <input className={`${inputCls} font-mono uppercase`}
                        value={entityForm.primary_color}
                        onChange={e => setEntityForm(p => ({ ...p, primary_color: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {/* FIELDS PDF */}
                <div className="pt-4 border-t mt-2" style={{ borderColor: 'var(--border-subtle)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: 'var(--gold)' }}>
                    <Edit2 className="w-3 h-3" /> Kop Surat & Dokumen
                  </p>
                  <div className="space-y-3">
                    <div>
                      <label className="section-label block mb-1.5">Alamat Resmi</label>
                      <textarea rows={2} className={inputCls + ' resize-none'} placeholder="Alamat lengkap untuk dicetak di PDF..."
                        value={entityForm.address} onChange={e => setEntityForm(p => ({ ...p, address: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="section-label block mb-1.5">Telepon Kontak</label>
                        <input className={inputCls} placeholder="08..." value={entityForm.phone}
                          onChange={e => setEntityForm(p => ({ ...p, phone: e.target.value }))} />
                      </div>
                      <div>
                        <label className="section-label block mb-1.5">Email Bisnis</label>
                        <input className={inputCls} placeholder="hello@..." value={entityForm.email}
                          onChange={e => setEntityForm(p => ({ ...p, email: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label className="section-label block mb-1.5">Tagline Footer (Opsional)</label>
                      <input className={inputCls} placeholder="Bespoke Enterprise Consultancy..."
                        value={entityForm.tagline} onChange={e => setEntityForm(p => ({ ...p, tagline: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button type="submit" disabled={loading || uploadingLogo}
                    className="w-full py-3 rounded-md text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                    style={{ background: 'var(--gold)', color: '#050505' }}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Konfigurasi Entitas'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}