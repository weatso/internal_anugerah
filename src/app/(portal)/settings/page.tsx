'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { formatDateTime, getStatusLabel, cn } from '@/lib/utils'
import { Plus, Loader2, Users, Trash2, X } from 'lucide-react'
import type { Entity, Profile } from '@/types'

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
