'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { formatDateTime, getStatusLabel, cn } from '@/lib/utils'
import { Plus, Loader2, X, Pencil, Check, Trash2 } from 'lucide-react'
import type { Entity } from '@/types'

interface UserProfile {
  id: string
  entity_id: string
  full_name: string
  role: string
  created_at: string
  email: string
  entity_name: string
  entity_type: string
}

export default function SettingsPage() {
  const { profile: currentUser } = useUser()
  const supabase = createClient()
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState('')
  const [editEntityId, setEditEntityId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('STAFF')
  const [inviteEntity, setInviteEntity] = useState('')
  const [inviteFullName, setInviteFullName] = useState('')
  const [invitePassword, setInvitePassword] = useState('')

  async function fetchData() {
    setLoading(true)
    const [{ data: p }, { data: e }] = await Promise.all([
      // Gunakan view user_profiles yang sudah include email
      supabase.from('user_profiles').select('*').order('full_name'),
      supabase.from('entities').select('*').order('name'),
    ])
    setProfiles((p ?? []) as UserProfile[])
    setEntities((e ?? []) as Entity[])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  function startEdit(p: UserProfile) {
    setEditingId(p.id)
    setEditRole(p.role)
    setEditEntityId(p.entity_id)
  }

  async function saveEdit(id: string) {
    setSubmitting(true)
    await supabase.from('profiles').update({
      role: editRole,
      entity_id: editEntityId,
    }).eq('id', id)
    setEditingId(null)
    setSaveMsg('Berhasil disimpan')
    setTimeout(() => setSaveMsg(null), 2000)
    setSubmitting(false)
    fetchData()
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: inviteEmail,
        password: invitePassword,
        full_name: inviteFullName,
        role: inviteRole,
        entity_id: inviteEntity,
      }),
    })
    setSubmitting(false)
    if (res.ok) {
      setShowInvite(false)
      setInviteEmail(''); setInvitePassword(''); setInviteFullName('')
      setInviteRole('STAFF'); setInviteEntity('')
      fetchData()
    } else {
      const { error } = await res.json()
      alert(`Gagal: ${error ?? 'Unknown error'}`)
    }
  }

  const ROLES = ['CEO', 'HEAD', 'FINANCE', 'STAFF']
  const ROLE_BADGE: Record<string, string> = {
    CEO: 'bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30',
    FINANCE: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    HEAD: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
    STAFF: 'bg-neutral-400/10 text-neutral-400 border-neutral-400/20',
  }

  return (
    <div className="p-6 md:p-8 space-y-6 animate-[slide-up_0.4s_ease]">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[#D4AF37] text-xs uppercase tracking-[0.3em] font-bold mb-1">Settings</p>
          <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight">Manajemen Pengguna</h1>
          <p className="text-[--color-text-muted] text-sm mt-1">
            {profiles.length} pengguna terdaftar di sistem.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveMsg && (
            <span className="text-emerald-400 text-xs flex items-center gap-1">
              <Check className="w-3 h-3" /> {saveMsg}
            </span>
          )}
          <button onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 bg-[#D4AF37] text-[#050505] font-bold px-4 py-2 rounded-md text-sm hover:bg-[#F5D678] transition-colors">
            <Plus className="w-4 h-4" /> Tambah User
          </button>
        </div>
      </div>

      {/* User Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" /></div>
        ) : profiles.length === 0 ? (
          <div className="py-12 text-center text-[--color-text-muted] text-sm">
            <p className="mb-2">Belum ada profil pengguna.</p>
            <p className="text-xs">Pastikan sudah menjalankan <strong>bootstrap_ceo.sql</strong> di Supabase.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[--color-border]">
                  {['Nama', 'Email', 'Divisi', 'Role', 'Bergabung', 'Aksi'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[--color-text-muted] text-xs uppercase tracking-wider font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[--color-border]">
                {profiles.map(p => {
                  const isEditing = editingId === p.id
                  const isMe = p.id === currentUser?.id
                  return (
                    <tr key={p.id} className={cn('hover:bg-white/[0.02] transition-colors', isEditing && 'bg-[#D4AF37]/5')}>
                      {/* Nama */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37] text-xs font-bold shrink-0">
                            {p.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-[--color-text-primary] font-medium">{p.full_name}</span>
                            {isMe && <span className="ml-2 text-[10px] text-[#D4AF37] bg-[#D4AF37]/10 px-1.5 py-0.5 rounded">Anda</span>}
                          </div>
                        </div>
                      </td>
                      {/* Email */}
                      <td className="px-5 py-3 text-[--color-text-muted] font-mono text-xs">{p.email}</td>
                      {/* Divisi */}
                      <td className="px-5 py-3">
                        {isEditing ? (
                          <select value={editEntityId} onChange={e => setEditEntityId(e.target.value)}
                            className="bg-[--color-bg-card] border border-[--color-border] rounded px-2 py-1.5 text-[--color-text-primary] text-xs focus:outline-none focus:border-[#D4AF37]/50 w-full max-w-[160px]">
                            {entities.map(en => <option key={en.id} value={en.id}>{en.name}</option>)}
                          </select>
                        ) : (
                          <span className="text-[--color-text-secondary]">{p.entity_name ?? '—'}</span>
                        )}
                      </td>
                      {/* Role */}
                      <td className="px-5 py-3">
                        {isEditing ? (
                          <select value={editRole} onChange={e => setEditRole(e.target.value)}
                            className="bg-[--color-bg-card] border border-[--color-border] rounded px-2 py-1.5 text-[--color-text-primary] text-xs focus:outline-none focus:border-[#D4AF37]/50">
                            {ROLES.map(r => <option key={r} value={r}>{getStatusLabel(r)}</option>)}
                          </select>
                        ) : (
                          <span className={cn('px-2 py-0.5 rounded border text-xs font-bold uppercase tracking-widest', ROLE_BADGE[p.role] ?? ROLE_BADGE.STAFF)}>
                            {getStatusLabel(p.role)}
                          </span>
                        )}
                      </td>
                      {/* Tanggal */}
                      <td className="px-5 py-3 text-[--color-text-muted] text-xs">{formatDateTime(p.created_at)}</td>
                      {/* Aksi */}
                      <td className="px-5 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <button onClick={() => saveEdit(p.id)} disabled={submitting}
                              className="flex items-center gap-1 text-xs font-bold text-emerald-400 border border-emerald-400/20 px-2.5 py-1.5 rounded hover:bg-emerald-400/5 transition-all">
                              {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Simpan
                            </button>
                            <button onClick={() => setEditingId(null)} className="text-[--color-text-muted] hover:text-[--color-text-primary]">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(p)}
                            disabled={isMe}
                            title={isMe ? 'Tidak bisa edit diri sendiri' : 'Edit role/divisi'}
                            className="text-[--color-text-muted] hover:text-[#D4AF37] transition-colors disabled:opacity-20 disabled:cursor-not-allowed">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Entities */}
      <div>
        <h2 className="text-[--color-text-primary] font-bold mb-3 text-sm">Daftar Entitas / Divisi</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {entities.map(en => (
            <div key={en.id} className="glass-card p-4">
              <p className={cn('text-[10px] uppercase tracking-widest mb-1', en.type === 'HOLDING' ? 'text-[#D4AF37]' : 'text-[--color-text-muted]')}>{en.type}</p>
              <p className="text-[--color-text-primary] font-bold text-sm">{en.name}</p>
              <p className="text-[--color-text-muted] text-[10px] font-mono mt-1 truncate">{en.id}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Add User Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[--color-text-primary] font-bold">Tambah User Baru</h2>
                <p className="text-[--color-text-muted] text-xs mt-0.5">User akan login dengan email + password yang diset di sini.</p>
              </div>
              <button onClick={() => setShowInvite(false)} className="text-[--color-text-muted] hover:text-[--color-text-primary]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              {[
                { label: 'Nama Lengkap', value: inviteFullName, set: setInviteFullName, placeholder: 'John Doe', type: 'text' },
                { label: 'Email', value: inviteEmail, set: setInviteEmail, placeholder: 'john@anugerah.id', type: 'email' },
                { label: 'Password Awal', value: invitePassword, set: setInvitePassword, placeholder: 'Min. 8 karakter', type: 'password' },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">{f.label}</label>
                  <input required type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                    className="w-full bg-white/[0.04] border border-[--color-border] rounded-md px-4 py-2.5 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50" />
                </div>
              ))}
              <div>
                <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">Divisi</label>
                <select required value={inviteEntity} onChange={e => setInviteEntity(e.target.value)}
                  className="w-full bg-[--color-bg-card] border border-[--color-border] rounded-md px-4 py-2.5 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50">
                  <option value="">Pilih divisi...</option>
                  {entities.map(en => <option key={en.id} value={en.id}>{en.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map(r => (
                    <button key={r} type="button" onClick={() => setInviteRole(r)}
                      className={cn('py-2 rounded-md text-xs font-bold border transition-all uppercase tracking-wider',
                        inviteRole === r ? ROLE_BADGE[r] : 'border-[--color-border] text-[--color-text-muted] hover:text-[--color-text-primary]')}>
                      {getStatusLabel(r)}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={submitting}
                className="w-full bg-[#D4AF37] text-[#050505] font-bold py-3 rounded-md text-sm hover:bg-[#F5D678] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Membuat...</> : 'Buat User'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}


export default function SettingsPage() {
  const { profile: currentUser } = useUser()
  const supabase = createClient()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('STAFF')
  const [inviteEntity, setInviteEntity] = useState('')
  const [inviteFullName, setInviteFullName] = useState('')
  const [invitePassword, setInvitePassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function fetchData() {
    setLoading(true)
    const [{ data: p }, { data: e }] = await Promise.all([
      supabase.from('profiles').select('*, entity:entities(id,name,type,logo_key,primary_color)').order('full_name'),
      supabase.from('entities').select('*').order('name'),
    ])
    setProfiles((p ?? []) as Profile[])
    setEntities((e ?? []) as Entity[])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    // Buat user via service role (API route)
    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: inviteEmail,
        password: invitePassword,
        full_name: inviteFullName,
        role: inviteRole,
        entity_id: inviteEntity,
      }),
    })

    setSubmitting(false)
    if (res.ok) {
      setShowInvite(false)
      setInviteEmail('')
      setInvitePassword('')
      setInviteFullName('')
      setInviteRole('STAFF')
      setInviteEntity('')
      fetchData()
    } else {
      alert('Gagal membuat user. Cek kembali data dan pastikan email belum digunakan.')
    }
  }

  const ROLES = ['CEO', 'HEAD', 'FINANCE', 'STAFF']
  const ROLE_BADGE: Record<string, string> = {
    CEO: 'bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30',
    FINANCE: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    HEAD: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
    STAFF: 'bg-neutral-400/10 text-neutral-400 border-neutral-400/20',
  }

  return (
    <div className="p-6 md:p-8 space-y-6 animate-[slide-up_0.4s_ease]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[#D4AF37] text-xs uppercase tracking-[0.3em] font-bold mb-1">Settings</p>
          <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight">Manajemen Pengguna</h1>
          <p className="text-[--color-text-muted] text-sm mt-1">Kelola akses dan role seluruh anggota tim.</p>
        </div>
        <button onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 bg-[#D4AF37] text-[#050505] font-bold px-4 py-2 rounded-md text-sm hover:bg-[#F5D678] transition-colors">
          <Plus className="w-4 h-4" /> Tambah User
        </button>
      </div>

      {/* User Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[--color-border]">
                  {['Nama', 'Email', 'Divisi', 'Role', 'Bergabung'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-[--color-text-muted] text-xs uppercase tracking-wider font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[--color-border]">
                {profiles.map(p => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37] text-xs font-bold shrink-0">
                          {p.full_name.charAt(0)}
                        </div>
                        <span className="text-[--color-text-primary] font-medium">{p.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[--color-text-muted] font-mono text-xs">{(p as any).email ?? '—'}</td>
                    <td className="px-5 py-3 text-[--color-text-secondary]">{p.entity?.name ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={cn('px-2 py-0.5 rounded border text-xs font-bold uppercase tracking-widest', ROLE_BADGE[p.role] ?? ROLE_BADGE.STAFF)}>
                        {getStatusLabel(p.role)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[--color-text-muted]">{formatDateTime(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Entities */}
      <div>
        <h2 className="text-[--color-text-primary] font-bold mb-3">Daftar Entitas</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {entities.map(en => (
            <div key={en.id} className="glass-card p-4">
              <p className="text-[--color-text-muted] text-[10px] uppercase tracking-widest mb-1">{en.type}</p>
              <p className="text-[--color-text-primary] font-bold text-sm">{en.name}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[--color-text-primary] font-bold">Tambah User Baru</h2>
              <button onClick={() => setShowInvite(false)} className="text-[--color-text-muted] hover:text-[--color-text-primary]"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              {[
                { label: 'Nama Lengkap', value: inviteFullName, set: setInviteFullName, placeholder: 'John Doe', type: 'text' },
                { label: 'Email', value: inviteEmail, set: setInviteEmail, placeholder: 'john@anugerah.id', type: 'email' },
                { label: 'Password Awal', value: invitePassword, set: setInvitePassword, placeholder: 'Min. 8 karakter', type: 'password' },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">{f.label}</label>
                  <input required type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                    className="w-full bg-white/[0.04] border border-[--color-border] rounded-md px-4 py-2.5 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50" />
                </div>
              ))}
              <div>
                <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">Divisi</label>
                <select required value={inviteEntity} onChange={e => setInviteEntity(e.target.value)}
                  className="w-full bg-[--color-bg-card] border border-[--color-border] rounded-md px-4 py-2.5 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50">
                  <option value="">Pilih divisi...</option>
                  {entities.map(en => <option key={en.id} value={en.id}>{en.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map(r => (
                    <button key={r} type="button" onClick={() => setInviteRole(r)}
                      className={cn('py-2 rounded-md text-xs font-bold border transition-all uppercase tracking-wider',
                        inviteRole === r ? ROLE_BADGE[r] : 'border-[--color-border] text-[--color-text-muted]')}>
                      {getStatusLabel(r)}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={submitting}
                className="w-full bg-[#D4AF37] text-[#050505] font-bold py-3 rounded-md text-sm hover:bg-[#F5D678] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Membuat...</> : 'Buat User'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
