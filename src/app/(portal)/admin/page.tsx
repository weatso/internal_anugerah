'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { Entity, UserRole, UserRoleAssignment, ROLE_LABELS } from '@/types'
import { toast } from 'sonner'
import {
  Users, UserPlus, Building2, Lock, UploadCloud,
  Loader2, Plus, Trash2, X, ChevronDown, Shield
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

// ─── Types ───────────────────────────────────────────────────────────────────
interface AdminUser {
  id: string
  full_name: string
  avatar_url: string | null
  entity_id: string | null
  roles: UserRole[]
  created_at: string
  entity?: { name: string } | null
  userRoles?: UserRoleAssignment[]
}

const ALL_ROLES: UserRole[] = ['CEO', 'HEAD', 'FINANCE', 'DESIGN', 'STAFF']

export default function AdminPage() {
  const { profile, highestRole, loading: userLoading } = useUser()
  const router = useRouter()
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<'entities' | 'users'>('users')
  const [entities, setEntities] = useState<Entity[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)
  const [loading, setLoading] = useState(false)

  // Entity form
  const [entityForm, setEntityForm] = useState({ name: '', type: 'DIVISION', logo_key: '', primary_color: '#C5A028' })
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // New user form
  const [newUserForm, setNewUserForm] = useState({ email: '', password: '', full_name: '' })

  // Role assignment form: array of {entity_id, role}
  const [roleAssignments, setRoleAssignments] = useState<{ entity_id: string; role: UserRole }[]>([])

  // Gate: CEO only
  useEffect(() => {
    if (!userLoading && highestRole !== 'CEO') {
      toast.error('Akses ditolak. Halaman ini khusus untuk CEO.')
      router.push('/dashboard')
    }
  }, [highestRole, userLoading])

  useEffect(() => {
    if (highestRole === 'CEO') fetchAll()
  }, [highestRole])

  async function fetchAll() {
    try {
      const [
        { data: ents },
        { data: usrs },
        { data: allUserRoles },
      ] = await Promise.all([
        supabase.from('entities').select('*').order('name'),
        supabase.from('profiles').select('*, entity:entities(name)').order('created_at', { ascending: false }),
        // user_roles mungkin belum ada jika SQL migration belum dijalankan — aman jika null
        supabase.from('user_roles').select('*, entity:entities(*)'),
      ])

      if (ents) setEntities(ents)

      if (usrs) {
        const enriched: AdminUser[] = usrs.map(u => ({
          ...u,
          userRoles: (allUserRoles ?? []).filter((ur: any) => ur.user_id === u.id),
        }))
        setUsers(enriched)
      }
    } catch (err) {
      console.error('[AdminPage] fetchAll error:', err)
    }
  }

  // ── Select user: pre-fill roleAssignments ────────────────────────────────
  function selectUser(u: AdminUser) {
    setSelectedUser(u)
    setRoleAssignments(
      (u.userRoles ?? []).map(ur => ({ entity_id: ur.entity_id, role: ur.role }))
    )
  }

  // ── Save role assignments ────────────────────────────────────────────────
  async function handleSaveRoles(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUser) return
    setLoading(true)
    try {
      // 1. Delete all existing roles for this user
      await supabase.from('user_roles').delete().eq('user_id', selectedUser.id)

      // 2. Insert new assignments (filter out incomplete rows)
      const valid = roleAssignments.filter(r => r.entity_id && r.role)
      if (valid.length > 0) {
        const { error } = await supabase.from('user_roles').insert(
          valid.map(r => ({ user_id: selectedUser.id, entity_id: r.entity_id, role: r.role }))
        )
        if (error) throw error
      }

      // 3. Update full_name if changed
      await supabase.from('profiles').update({ full_name: selectedUser.full_name }).eq('id', selectedUser.id)

      toast.success('Data pengguna berhasil diperbarui.')
      setSelectedUser(null)
      await fetchAll()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Create new user ──────────────────────────────────────────────────────
  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newUserForm, role: 'STAFF', entity_id: entities[0]?.id || '' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal membuat akun')
      toast.success(`Akun ${newUserForm.full_name} berhasil dibuat.`)
      setNewUserForm({ email: '', password: '', full_name: '' })
      await fetchAll()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Save entity ──────────────────────────────────────────────────────────
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
      setEntityForm({ name: '', type: 'DIVISION', logo_key: '', primary_color: '#C5A028' })
      await fetchAll()
    } catch (err: any) {
      toast.error(err.message)
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
      setEntityForm(prev => ({ ...prev, logo_key: data.key }))
      toast.success('Logo diunggah.')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploadingLogo(false)
    }
  }

  const getLogoSrc = (key: string | null) => {
    if (!key) return null
    if (key.startsWith('http')) return key
    return `/api/storage/file?key=${encodeURIComponent(key)}`
  }

  if (userLoading || highestRole !== 'CEO') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--gold)' }} />
      </div>
    )
  }

  // ── Styles helpers ────────────────────────────────────────────────────────
  const cardStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 8 }
  const inputCls = 'w-full rounded-md px-3.5 py-2.5 text-sm outline-none transition-all input-field'

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-[0.3em] font-bold mb-1" style={{ color: 'var(--gold)' }}>CEO Control Panel</p>
        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Admin Panel</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Kelola entitas, pengguna, dan penugasan role.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-md w-fit" style={{ background: 'var(--bg-secondary)' }}>
        {[
          { id: 'users', label: 'Pengguna', icon: Users },
          { id: 'entities', label: 'Entitas', icon: Building2 },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className="flex items-center gap-2 px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all"
            style={activeTab === tab.id
              ? { background: 'var(--bg-elevated)', color: 'var(--gold)', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }
              : { color: 'var(--text-muted)' }
            }>
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── TAB: USERS ─────────────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <motion.div key="users" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* User List */}
            <div className="xl:col-span-1 space-y-3">
              <p className="section-label">Daftar Pengguna ({users.length})</p>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {users.map(u => {
                  const allRoles = u.userRoles ?? []
                  return (
                    <button key={u.id} onClick={() => selectUser(u)}
                      className="w-full text-left p-3.5 rounded-lg border transition-all"
                      style={selectedUser?.id === u.id
                        ? { background: 'var(--gold-glow)', borderColor: 'var(--gold)' }
                        : { ...cardStyle, borderColor: 'var(--border-subtle)' }
                      }>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center font-bold text-xs"
                          style={{ background: 'var(--gold)', color: '#050505' }}>
                          {u.full_name?.charAt(0) || '?'}
                        </div>
                        <div className="overflow-hidden flex-1">
                          <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{u.full_name}</p>
                          {allRoles.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {allRoles.map((ur, i) => (
                                <span key={i} className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                                  {ur.role} @ {(ur as any).entity?.name ?? '?'}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Belum ada role</p>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Create New User */}
              <div className="p-4 rounded-lg border mt-4" style={cardStyle}>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--gold)' }}>Buat Akun Baru</p>
                <form onSubmit={handleCreateUser} className="space-y-3">
                  <input className={inputCls} placeholder="Nama Lengkap" required
                    value={newUserForm.full_name} onChange={e => setNewUserForm(p => ({ ...p, full_name: e.target.value }))} />
                  <input className={inputCls} type="email" placeholder="Email Bisnis" required
                    value={newUserForm.email} onChange={e => setNewUserForm(p => ({ ...p, email: e.target.value }))} />
                  <input className={inputCls} placeholder="Password Sementara (min 6)" required minLength={6}
                    value={newUserForm.password} onChange={e => setNewUserForm(p => ({ ...p, password: e.target.value }))} />
                  <button type="submit" disabled={loading}
                    className="w-full py-2.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                    style={{ background: 'var(--gold)', color: '#050505' }}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4" /> Buat Akun</>}
                  </button>
                </form>
              </div>
            </div>

            {/* Edit User Panel */}
            <div className="xl:col-span-2">
              {selectedUser ? (
                <div className="p-6 rounded-lg border space-y-6" style={cardStyle}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-lg"
                        style={{ background: 'var(--gold)', color: '#050505' }}>
                        {selectedUser.full_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black" style={{ color: 'var(--text-primary)' }}>{selectedUser.full_name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>ID: {selectedUser.id.slice(0, 8)}…</p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedUser(null)} style={{ color: 'var(--text-muted)' }}>
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveRoles} className="space-y-5">
                    {/* Basic Info */}
                    <div>
                      <label className="section-label block mb-1.5">Nama Lengkap</label>
                      <input className={inputCls} value={selectedUser.full_name}
                        onChange={e => setSelectedUser(p => p ? { ...p, full_name: e.target.value } : p)} />
                    </div>

                    {/* Role Assignments */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="section-label flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5" /> Penugasan Role
                        </label>
                        <button type="button"
                          onClick={() => setRoleAssignments(p => [...p, { entity_id: entities[0]?.id ?? '', role: 'STAFF' }])}
                          className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded transition-all"
                          style={{ background: 'var(--gold-glow)', color: 'var(--gold)' }}>
                          <Plus className="w-3 h-3" /> Tambah Role
                        </button>
                      </div>

                      <div className="space-y-2">
                        {roleAssignments.length === 0 && (
                          <p className="text-sm text-center py-4 rounded-lg" style={{ color: 'var(--text-muted)', background: 'var(--bg-secondary)' }}>
                            Belum ada role. Klik "Tambah Role" untuk menambahkan.
                          </p>
                        )}
                        {roleAssignments.map((ra, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <select className="select-field text-sm"
                                value={ra.entity_id}
                                onChange={e => setRoleAssignments(p => p.map((r, i) => i === idx ? { ...r, entity_id: e.target.value } : r))}>
                                {entities.map(ent => <option key={ent.id} value={ent.id}>{ent.name}</option>)}
                              </select>
                              <select className="select-field text-sm"
                                value={ra.role}
                                onChange={e => setRoleAssignments(p => p.map((r, i) => i === idx ? { ...r, role: e.target.value as UserRole } : r))}>
                                {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                              </select>
                            </div>
                            <button type="button" onClick={() => setRoleAssignments(p => p.filter((_, i) => i !== idx))}
                              className="p-1.5 rounded transition-colors hover:text-red-400"
                              style={{ color: 'var(--text-muted)' }}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button type="submit" disabled={loading}
                      className="w-full py-3 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                      style={{ background: 'var(--gold)', color: '#050505' }}>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Perubahan'}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 rounded-lg border"
                  style={{ ...cardStyle, borderStyle: 'dashed' }}>
                  <Users className="w-8 h-8 mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Pilih pengguna untuk mengedit</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── TAB: ENTITIES ──────────────────────────────────────────────── */}
        {activeTab === 'entities' && (
          <motion.div key="entities" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* Entity List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="section-label">Daftar Entitas ({entities.length})</p>
                <button onClick={() => { setSelectedEntity(null); setEntityForm({ name: '', type: 'DIVISION', logo_key: '', primary_color: '#C5A028' }) }}
                  className="text-xs font-bold px-3 py-1.5 rounded transition-all"
                  style={{ background: 'var(--gold-glow)', color: 'var(--gold)' }}>
                  + Baru
                </button>
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {entities.map(ent => (
                  <button key={ent.id} onClick={() => { setSelectedEntity(ent); setEntityForm({ name: ent.name, type: ent.type, logo_key: ent.logo_key ?? '', primary_color: ent.primary_color ?? '#C5A028' }) }}
                    className="w-full text-left p-4 rounded-lg border transition-all"
                    style={selectedEntity?.id === ent.id
                      ? { background: 'var(--gold-glow)', borderColor: 'var(--gold)' }
                      : { ...cardStyle }
                    }>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {ent.logo_key ? (
                          <img src={getLogoSrc(ent.logo_key)!} className="w-7 h-7 object-contain rounded" alt={ent.name} />
                        ) : (
                          <div className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold"
                            style={{ background: `${ent.primary_color ?? '#D4AF37'}20`, color: ent.primary_color ?? '#D4AF37' }}>
                            {ent.name.charAt(0)}
                          </div>
                        )}
                        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{ent.name}</span>
                      </div>
                      <span className="text-[9px] font-bold uppercase px-2 py-1 rounded"
                        style={{ background: `${ent.primary_color ?? '#fff'}18`, color: ent.primary_color ?? 'var(--text-muted)' }}>
                        {ent.type}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Entity Form */}
            <div className="p-6 rounded-lg border h-fit" style={cardStyle}>
              <p className="text-xs font-bold uppercase tracking-wider mb-5" style={{ color: 'var(--gold)' }}>
                {selectedEntity ? `Edit: ${selectedEntity.name}` : 'Entitas Baru'}
              </p>
              <form onSubmit={handleSaveEntity} className="space-y-4">
                {/* Logo */}
                <div>
                  <label className="section-label block mb-1.5">Logo</label>
                  <div className="flex items-start gap-3">
                    {/* Current logo preview */}
                    <div className="w-16 h-16 shrink-0 rounded-lg flex items-center justify-center overflow-hidden border"
                      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-medium)' }}>
                      {entityForm.logo_key ? (
                        <img src={getLogoSrc(entityForm.logo_key)!} className="w-full h-full object-contain p-1.5" alt="Logo" />
                      ) : (
                        <div className="text-xl font-black" style={{ color: entityForm.primary_color }}>
                          {entityForm.name?.charAt(0) || '?'}
                        </div>
                      )}
                    </div>
                    {/* Drop zone */}
                    <div className="flex-1 flex items-center gap-3 p-3.5 rounded-lg border-2 border-dashed cursor-pointer transition-all"
                      style={{ borderColor: 'var(--border-medium)', background: 'var(--bg-secondary)' }}
                      onClick={() => logoInputRef.current?.click()}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); if (e.dataTransfer.files?.[0]) handleLogoUpload(e.dataTransfer.files[0]) }}>
                      <input type="file" ref={logoInputRef} className="hidden" accept="image/*"
                        onChange={e => { if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]) }} />
                      {uploadingLogo
                        ? <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: 'var(--gold)' }} />
                        : <UploadCloud className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                      }
                      <div>
                        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                          {uploadingLogo ? 'Mengunggah...' : entityForm.logo_key ? 'Ganti logo' : 'Drop atau klik'}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>PNG, JPG, SVG</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="section-label block mb-1.5">Nama Entitas</label>
                  <input className={inputCls} required value={entityForm.name}
                    onChange={e => setEntityForm(p => ({ ...p, name: e.target.value }))} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="section-label block mb-1.5">Tipe</label>
                    <select className="select-field text-sm" value={entityForm.type}
                      onChange={e => setEntityForm(p => ({ ...p, type: e.target.value as any }))}>
                      <option value="DIVISION">Division</option>
                      <option value="HOLDING">Holding</option>
                    </select>
                  </div>
                  <div>
                    <label className="section-label block mb-1.5">Warna Utama</label>
                    <div className="flex gap-2 items-center">
                      <input type="color" className="w-10 h-10 rounded cursor-pointer border-0 p-0 bg-transparent"
                        value={entityForm.primary_color}
                        onChange={e => setEntityForm(p => ({ ...p, primary_color: e.target.value }))} />
                      <input className={`${inputCls} font-mono uppercase`} pattern="^#[0-9A-Fa-f]{6}$"
                        value={entityForm.primary_color}
                        onChange={e => setEntityForm(p => ({ ...p, primary_color: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={loading || uploadingLogo}
                  className="w-full py-3 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 mt-2"
                  style={{ background: 'var(--gold)', color: '#050505' }}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan Entitas'}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
