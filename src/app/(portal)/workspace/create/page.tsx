'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { ArrowLeft, Upload, X, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function CreateLogPage() {
  const { profile } = useUser()
  const supabase = createClient()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [deadline, setDeadline] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])

  function handleFileAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    setAttachments(prev => [...prev, ...files])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSubmitting(true)

    // Upload attachments ke R2
    const uploadedAttachments = []
    for (const file of attachments) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'workspace')
      formData.append('entity_id', profile.entity_id)
      const res = await fetch('/api/storage/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.key) {
        uploadedAttachments.push({ key: json.key, filename: file.name, size: file.size })
      }
    }

    await supabase.from('workspace_logs').insert({
      entity_id: profile.entity_id,
      created_by: profile.id,
      title,
      content,
      deadline: deadline || null,
      attachments: uploadedAttachments.length > 0 ? uploadedAttachments : null,
      status: 'SUBMITTED',
    })

    router.push('/workspace')
  }

  return (
    <div className="p-6 md:p-8 space-y-6 animate-[slide-up_0.4s_ease] max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/workspace" className="text-[--color-text-muted] hover:text-[--color-text-primary] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <p className="text-[#D4AF37] text-xs uppercase tracking-[0.3em] font-bold mb-1">Workspace</p>
          <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight">Buat Log Baru</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="glass-card p-6 space-y-4">
          <div>
            <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">Judul *</label>
            <input required value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Weekly Update — 17 April 2026"
              className="w-full bg-white/[0.04] border border-[--color-border] rounded-md px-4 py-2.5 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50" />
          </div>
          <div>
            <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">Konten / Update *</label>
            <textarea required value={content} onChange={e => setContent(e.target.value)} rows={8}
              placeholder="Tulis update, progress, atau laporan di sini. Markdown didukung."
              className="w-full bg-white/[0.04] border border-[--color-border] rounded-md px-4 py-3 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50 resize-none font-mono" />
            <p className="text-[--color-text-muted] text-xs mt-1">Markdown dirender saat CEO membuka detail log.</p>
          </div>
          <div>
            <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">Deadline (opsional)</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
              className="bg-white/[0.04] border border-[--color-border] rounded-md px-4 py-2.5 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50" />
          </div>
        </div>

        {/* Attachments */}
        <div className="glass-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[--color-text-muted] text-xs uppercase tracking-widest">Lampiran (opsional)</label>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1 text-[#D4AF37] text-xs font-bold hover:text-[#F5D678] transition-colors">
              <Upload className="w-3.5 h-3.5" /> Upload
            </button>
          </div>
          <input ref={fileRef} type="file" multiple onChange={handleFileAdd} className="hidden" />
          {attachments.length === 0 ? (
            <div
              onClick={() => fileRef.current?.click()}
              className="border border-dashed border-[--color-border] rounded-md py-8 text-center text-[--color-text-muted] text-sm hover:border-[#D4AF37]/30 hover:text-[#D4AF37] transition-all cursor-pointer">
              Klik atau drag & drop file di sini
            </div>
          ) : (
            <div className="space-y-2">
              {attachments.map((f, i) => (
                <div key={i} className="flex items-center justify-between bg-white/[0.03] border border-[--color-border] rounded-md px-3 py-2">
                  <span className="text-[--color-text-primary] text-sm truncate">{f.name}</span>
                  <button type="button" onClick={() => setAttachments(a => a.filter((_, j) => j !== i))} className="text-[--color-text-muted] hover:text-red-400 ml-2">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => fileRef.current?.click()} className="text-[#D4AF37] text-xs hover:text-[#F5D678]">
                + Tambah file lagi
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/workspace" className="px-5 py-2.5 border border-[--color-border] rounded-md text-sm text-[--color-text-secondary] hover:text-[--color-text-primary] transition-colors">
            Batal
          </Link>
          <button type="submit" disabled={submitting}
            className="flex items-center gap-2 bg-[#D4AF37] text-[#050505] font-bold px-6 py-2.5 rounded-md text-sm hover:bg-[#F5D678] transition-colors disabled:opacity-50">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : 'Submit Log'}
          </button>
        </div>
      </form>
    </div>
  )
}
