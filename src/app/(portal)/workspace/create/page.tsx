'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, ArrowLeft, Upload, File, X, Info } from 'lucide-react'
import { useUser } from '@/components/providers/UserProvider'
import { getEntityAccentColor, getEntityWorkspaceType } from '@/lib/division-config'
import type { LogAttachment, WorkspaceType } from '@/types'

export default function CreateWorkspaceLogPage() {
  const router = useRouter()
  const { effectiveEntity, effectiveEntityId } = useUser()
  const accentColor = getEntityAccentColor(effectiveEntity)
  const logType = getEntityWorkspaceType(effectiveEntity)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [metadata, setMetadata] = useState<any>({})
  
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!effectiveEntityId) return

    setUploading(true)
    setError(null)

    try {
      let attachments: LogAttachment[] = []

      // 1. Upload File if selected
      if (file) {
        const presignRes = await fetch('/api/storage/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: `workspace/${effectiveEntityId}/${Date.now()}-${file.name}`,
            contentType: file.type,
          }),
        })
        if (!presignRes.ok) throw new Error('Gagal upload file')
        const { url, key } = await presignRes.json()

        const uploadRes = await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
        if (!uploadRes.ok) throw new Error('Upload file ke storage gagal')
        
        attachments.push({ key, filename: file.name, size: file.size })
      }

      // 2. Submit Log parameters
      const payload = {
        title,
        content,
        log_type: logType,
        metadata,
        entity_id: effectiveEntityId,
        attachments: attachments.length > 0 ? attachments : null
      }

      const res = await fetch('/api/workspace/create', { // You must implement this API later or just use Supabase direct.
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      // Since workspace direct insert is possible via client if RLS permits, let's just use supabase direct insert for simplicity
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      
      const { error: sbError } = await supabase.from('workspace_logs').insert({
        entity_id: effectiveEntityId,
        title,
        content,
        log_type: logType,
        metadata,
        attachments: attachments.length > 0 ? attachments : null,
      })

      if (sbError) throw sbError

      router.push('/workspace')
    } catch (err: any) {
      setError(err.message ?? 'Terjadi kesalahan')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-[--color-text-muted] hover:text-[--color-text-primary] transition-colors mb-6 font-medium">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Workspace
        </button>

        <div className="mb-8">
          <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight">Buat Log Baru</h1>
          <p className="text-[--color-text-muted] text-sm mt-1">
            Format log otomatis disesuaikan untuk divisi <span className="font-bold" style={{ color: accentColor }}>{effectiveEntity?.name ?? 'General'}</span>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="glass-card p-5 md:p-6 space-y-5">
            <div>
              <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">Judul Task / Activity *</label>
              <input required value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Contoh: Eksekusi Campaign Q3"
                className="w-full bg-white/[0.04] border border-[--color-border] rounded-md px-4 py-2.5 text-[--color-text-primary] text-sm focus:outline-none transition-colors"
                style={{ '--tw-ring-color': accentColor } as any}
              />
            </div>
            <div>
              <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">Deskripsi Detail *</label>
              <textarea required value={content} onChange={e => setContent(e.target.value)} rows={5}
                placeholder="Jabarkan apa yang dikerjakan, progress, atau kendala..."
                className="w-full bg-white/[0.04] border border-[--color-border] rounded-md px-4 py-2.5 text-[--color-text-primary] text-sm focus:outline-none resize-y transition-colors"
              />
            </div>
          </div>

          <div className="glass-card p-5 md:p-6 space-y-5">
            <div className="flex items-center gap-2 mb-2 pb-3 border-b border-[--color-border]">
              <Info className="w-4 h-4" style={{ color: accentColor }} />
              <h2 className="text-[--color-text-primary] font-bold text-sm">Spesifikasi {logType}</h2>
            </div>
            
            <DynamicMetadataForm 
              logType={logType} 
              metadata={metadata} 
              setMetadata={setMetadata} 
              accentColor={accentColor} 
            />
          </div>

          <div className="glass-card p-5 md:p-6">
            <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-2 block">Lampiran (Opsional)</label>
            {file ? (
              <div className="bg-white/5 border border-[--color-border] rounded-md px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <File className="w-5 h-5" style={{ color: accentColor }} />
                  <div>
                    <p className="text-[--color-text-primary] text-sm font-medium">{file.name}</p>
                    <p className="text-[--color-text-muted] text-xs">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                </div>
                <button type="button" onClick={() => setFile(null)} className="text-[--color-text-muted] hover:text-red-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="block border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-all hover:opacity-80 hover:bg-white/[0.02]"
                style={{ borderColor: `${accentColor}40` }}>
                <Upload className="w-6 h-6 mx-auto mb-2 opacity-50" style={{ color: accentColor }} />
                <p className="text-[--color-text-muted] text-sm">Lampirkan file pendukung</p>
                <input type="file" className="hidden" accept="*/*" onChange={e => setFile(e.target.files?.[0] ?? null)} />
              </label>
            )}
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-md">{error}</div>}

          <div className="flex justify-end pt-4">
            <button type="submit" disabled={uploading}
              className="flex items-center justify-center gap-2 font-bold px-8 py-3 rounded-md text-sm transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: accentColor, color: '#050505' }}>
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : 'Simpan Log'}
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  )
}

function DynamicMetadataForm({ logType, metadata, setMetadata, accentColor }: { logType: WorkspaceType, metadata: any, setMetadata: (v: any) => void, accentColor: string }) {
  const update = (key: string, val: any) => setMetadata((p: any) => ({ ...p, [key]: val }))

  const InputNode = ({ label, keyName, placeholder, type = 'text' }: any) => (
    <div>
      <label className="text-[--color-text-muted] text-[10px] uppercase tracking-widest mb-1.5 block">{label}</label>
      <input type={type} value={metadata[keyName] || ''} onChange={e => update(keyName, e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/[0.02] border border-[--color-border] rounded-md px-3 py-2 text-[--color-text-primary] text-sm focus:outline-none"
      />
    </div>
  )

  switch (logType) {
    case 'WEATSO':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputNode label="Sprint Name" keyName="sprint" placeholder="Contoh: Sprint 24 v2" />
          <InputNode label="GitHub PR Link" keyName="github_link" placeholder="https://github.com/..." />
          <div>
            <label className="text-[--color-text-muted] text-[10px] uppercase tracking-widest mb-1.5 block">Sprint Status</label>
            <select value={metadata.sprint_status || ''} onChange={e => update('sprint_status', e.target.value)}
              className="w-full bg-white/[0.02] border border-[--color-border] rounded-md px-3 py-2 text-[--color-text-primary] text-sm focus:outline-none">
              <option value="">Pilih status...</option>
              <option value="PLANNING">Planning</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="REVIEW">Review</option>
              <option value="DONE">Done</option>
            </select>
          </div>
          <InputNode label="Bug Count" keyName="bug_count" type="number" placeholder="0" />
        </div>
      )
    case 'LOKAL':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputNode label="Sales Volume (Pcs)" keyName="sales_volume" type="number" placeholder="Contoh: 15" />
          <InputNode label="Top Selling Product" keyName="top_product" placeholder="Nama produk..." />
          <InputNode label="Sales Channel" keyName="channel" placeholder="Shopee / Tokopedia / Offline" />
        </div>
      )
    case 'EVORY':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputNode label="Tanggal Event" keyName="event_date" type="date" />
          <InputNode label="Venue / Lokasi" keyName="venue" placeholder="Nama gedung..." />
          <div>
            <label className="text-[--color-text-muted] text-[10px] uppercase tracking-widest mb-1.5 block">Status Vendor</label>
            <select value={metadata.vendor_status || ''} onChange={e => update('vendor_status', e.target.value)}
              className="w-full bg-white/[0.02] border border-[--color-border] rounded-md px-3 py-2 text-[--color-text-primary] text-sm focus:outline-none">
              <option value="">Pilih status vendor...</option>
              <option value="PENDING">Pending (Belum DP)</option>
              <option value="CONFIRMED">Confirmed (Sudah DP)</option>
              <option value="DONE">Done (Lunas)</option>
            </select>
          </div>
          <InputNode label="Estimasi Jumlah Tamu" keyName="guest_count" type="number" placeholder="0" />
        </div>
      )
    case 'COLABZ':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[--color-text-muted] text-[10px] uppercase tracking-widest mb-1.5 block">
              Showreel Progress ({metadata.showreel_progress || 0}%)
            </label>
            <input type="range" min="0" max="100" value={metadata.showreel_progress || 0}
              onChange={e => update('showreel_progress', parseInt(e.target.value))}
              className="w-full accent-[#ec4899] h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
              style={{ accentColor: accentColor }}
            />
          </div>
          <InputNode label="Jadwal Kelas / Syuting" keyName="class_schedule" placeholder="Senin, 14:00" />
          <InputNode label="Estimasi Peserta" keyName="student_count" type="number" placeholder="0" />
          <InputNode label="Tipe Konten" keyName="content_type" placeholder="Video / Foto / Desain" />
        </div>
      )
    case 'LADDIFY':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputNode label="SMM Provider Name" keyName="provider" placeholder="Nama provider panel..." />
          <InputNode label="Platform SMM" keyName="smm_platform" placeholder="Instagram / TikTok / dll" />
          <div>
            <label className="text-[--color-text-muted] text-[10px] uppercase tracking-widest mb-1.5 block">Client Status</label>
            <select value={metadata.client_status || ''} onChange={e => update('client_status', e.target.value)}
              className="w-full bg-white/[0.02] border border-[--color-border] rounded-md px-3 py-2 text-[--color-text-primary] text-sm focus:outline-none">
              <option value="">Pilih status...</option>
              <option value="PROSPECT">Prospect</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <InputNode label="Margin (%)" keyName="margin" type="number" placeholder="Contoh: 20" />
        </div>
      )
    default: // GENERAL
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[--color-text-muted] text-[10px] uppercase tracking-widest mb-1.5 block">Prioritas</label>
            <select value={metadata.priority || ''} onChange={e => update('priority', e.target.value)}
              className="w-full bg-white/[0.02] border border-[--color-border] rounded-md px-3 py-2 text-[--color-text-primary] text-sm focus:outline-none">
              <option value="">Pilih prioritas...</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
          <InputNode label="Tenggat Waktu / Due Date" keyName="due_date" type="date" />
          <InputNode label="Assignee (Opsional)" keyName="assignee" placeholder="Nama penugasan..." />
        </div>
      )
  }
}
