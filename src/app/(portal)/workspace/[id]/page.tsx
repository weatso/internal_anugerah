'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { formatDate, getStatusColor, getStatusLabel, cn } from '@/lib/utils'
import { ArrowLeft, Download, Loader2, CheckCheck, AlertCircle, Clock } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import Link from 'next/link'
import type { WorkspaceLog } from '@/types'

export default function LogDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { profile, highestRole } = useUser()
  const supabase = createClient()
  const router = useRouter()
  const [log, setLog] = useState<WorkspaceLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [ceoNotes, setCeoNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function fetchLog() {
    const { data } = await supabase.from('workspace_logs')
      .select('*, entity:entities(id,name,type,logo_key,primary_color), creator:profiles!workspace_logs_created_by_fkey(id,full_name,role,entity_id)')
      .eq('id', id)
      .single()
    if (data) {
      setLog(data as WorkspaceLog)
      setCeoNotes(data.ceo_notes ?? '')
    }
    setLoading(false)
  }

  useEffect(() => { if (profile) fetchLog() }, [profile])

  async function updateStatus(status: string) {
    setSaving(true)
    await supabase.from('workspace_logs').update({
      status,
      ceo_notes: ceoNotes || null,
      reviewed_at: new Date().toISOString(),
    }).eq('id', id)
    setSaving(false)
    fetchLog()
  }

  async function openAttachment(key: string) {
    const res = await fetch('/api/storage/presigned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    })
    const { url } = await res.json()
    window.open(url, '_blank')
  }

  if (loading) return <div className="flex justify-center items-center h-full"><Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" /></div>
  if (!log) return <div className="p-8 text-[--color-text-muted]">Log tidak ditemukan.</div>

  const isCeo = highestRole === 'CEO'
  const statusIcons: Record<string, React.ReactNode> = {
    SUBMITTED: <Clock className="w-4 h-4" />,
    REVIEWED_BY_CEO: <CheckCheck className="w-4 h-4" />,
    NEEDS_ACTION: <AlertCircle className="w-4 h-4" />,
  }

  return (
    <div className="p-6 md:p-8 space-y-6 animate-[slide-up_0.4s_ease] max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-[--color-text-muted] hover:text-[--color-text-primary] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-[#D4AF37] text-xs uppercase tracking-[0.3em] font-bold mb-1">Workspace</p>
          <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight">{log.title}</h1>
        </div>
      </div>

      {/* Meta */}
      <div className="glass-card p-4 flex flex-wrap items-center gap-4 text-sm">
        <span className={cn('flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-widest', getStatusColor(log.status))}>
          {statusIcons[log.status]} {getStatusLabel(log.status)}
        </span>
        <span className="text-[--color-text-muted]">Divisi: <strong className="text-[--color-text-primary]">{log.entity?.name}</strong></span>
        <span className="text-[--color-text-muted]">Oleh: <strong className="text-[--color-text-primary]">{log.creator?.full_name}</strong></span>
        <span className="text-[--color-text-muted]">{formatDate(log.created_at)}</span>
        {log.deadline && <span className="text-amber-400 text-xs font-medium">Deadline: {formatDate(log.deadline)}</span>}
      </div>

      {/* Konten */}
      <div className="glass-card p-6">
        <div className="prose prose-sm prose-invert max-w-none text-[--color-text-primary] [&_h1]:text-[--color-text-primary] [&_h2]:text-[--color-text-primary] [&_h3]:text-[#D4AF37] [&_strong]:text-[--color-text-primary] [&_a]:text-[#D4AF37] [&_code]:bg-white/5 [&_code]:px-1.5 [&_code]:rounded [&_blockquote]:border-l-[#D4AF37]">
          <ReactMarkdown>{log.content}</ReactMarkdown>
        </div>
      </div>

      {/* Attachments */}
      {log.attachments && log.attachments.length > 0 && (
        <div className="glass-card p-5 space-y-2">
          <h3 className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-3">Lampiran</h3>
          {log.attachments.map((att, i) => (
            <button key={i} onClick={() => openAttachment(att.key)}
              className="flex items-center gap-3 w-full bg-white/[0.03] border border-[--color-border] rounded-md px-4 py-2.5 hover:border-[#D4AF37]/30 hover:text-[#D4AF37] transition-all text-left">
              <Download className="w-4 h-4 shrink-0" />
              <span className="text-sm truncate">{att.filename}</span>
              <span className="text-[--color-text-muted] text-xs ml-auto shrink-0">{(att.size / 1024).toFixed(0)} KB</span>
            </button>
          ))}
        </div>
      )}

      {/* CEO Notes & Action */}
      {isCeo && (
        <div className="glass-card p-6 space-y-4 border-[#D4AF37]/20">
          <h3 className="text-[#D4AF37] text-xs uppercase tracking-widest font-bold">CEO Review Panel</h3>
          <div>
            <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">CEO Notes</label>
            <textarea value={ceoNotes} onChange={e => setCeoNotes(e.target.value)} rows={4}
              placeholder="Tambahkan catatan, arahan, atau feedback..."
              className="w-full bg-white/[0.04] border border-[--color-border] rounded-md px-4 py-3 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50 resize-none" />
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => updateStatus('REVIEWED_BY_CEO')} disabled={saving}
              className="flex items-center gap-2 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold px-4 py-2 rounded-md text-sm hover:bg-emerald-500/25 transition-colors disabled:opacity-50">
              <CheckCheck className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Mark Reviewed'}
            </button>
            <button onClick={() => updateStatus('NEEDS_ACTION')} disabled={saving}
              className="flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 font-bold px-4 py-2 rounded-md text-sm hover:bg-red-500/20 transition-colors disabled:opacity-50">
              <AlertCircle className="w-4 h-4" /> Needs Action
            </button>
          </div>
        </div>
      )}

      {/* CEO Notes readonly (untuk non-CEO) */}
      {!isCeo && log.ceo_notes && (
        <div className="glass-card p-5 border-l-4 border-[#D4AF37]">
          <p className="text-[#D4AF37] text-xs uppercase tracking-widest font-bold mb-2">CEO Notes</p>
          <p className="text-[--color-text-primary] text-sm leading-relaxed">{log.ceo_notes}</p>
          {log.reviewed_at && <p className="text-[--color-text-muted] text-xs mt-2">Direviewed {formatDate(log.reviewed_at)}</p>}
        </div>
      )}
    </div>
  )
}
