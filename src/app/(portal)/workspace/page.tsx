'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { formatDate, getStatusColor, getStatusLabel, cn } from '@/lib/utils'
import { Plus, Loader2, FolderKanban, ChevronRight } from 'lucide-react'
import type { WorkspaceLog } from '@/types'
import Link from 'next/link'

export default function WorkspacePage() {
  const { profile } = useUser()
  const supabase = createClient()
  const [logs, setLogs] = useState<WorkspaceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('ALL')

  async function fetchLogs() {
    setLoading(true)
    let q = supabase.from('workspace_logs')
      .select('*, entity:entities(id,name,type,logo_key,primary_color), creator:profiles!workspace_logs_created_by_fkey(id,full_name,role,entity_id)')
      .order('created_at', { ascending: false })
    if (filterStatus !== 'ALL') q = q.eq('status', filterStatus)
    const { data } = await q
    setLogs((data ?? []) as WorkspaceLog[])
    setLoading(false)
  }

  useEffect(() => { if (profile) fetchLogs() }, [profile, filterStatus])

  const statuses = ['ALL', 'SUBMITTED', 'REVIEWED_BY_CEO', 'NEEDS_ACTION']

  return (
    <div className="p-6 md:p-8 space-y-6 animate-[slide-up_0.4s_ease]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[#D4AF37] text-xs uppercase tracking-[0.3em] font-bold mb-1">Workspace</p>
          <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight">Log Aktivitas</h1>
          <p className="text-[--color-text-muted] text-sm mt-1">Update mingguan, progress report, dan tindak lanjut.</p>
        </div>
        <Link href="/workspace/create"
          className="flex items-center gap-2 bg-[#D4AF37] text-[#050505] font-bold px-4 py-2 rounded-md text-sm hover:bg-[#F5D678] transition-colors">
          <Plus className="w-4 h-4" /> Buat Log
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={cn('px-4 py-1.5 rounded-full text-xs font-bold border transition-all uppercase tracking-widest',
              filterStatus === s
                ? s === 'ALL' ? 'bg-[#D4AF37]/15 text-[#D4AF37] border-[#D4AF37]/30' : getStatusColor(s) + ' border-opacity-40'
                : 'border-[--color-border] text-[--color-text-muted] hover:text-[--color-text-primary]')}>
            {s === 'ALL' ? 'Semua' : getStatusLabel(s)}
          </button>
        ))}
      </div>

      {/* Log List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" /></div>
      ) : logs.length === 0 ? (
        <div className="glass-card py-16 flex flex-col items-center text-[--color-text-muted]">
          <FolderKanban className="w-8 h-8 mb-3 opacity-30" />
          <p className="text-sm">Belum ada log.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <Link key={log.id} href={`/workspace/${log.id}`}
              className="glass-card px-5 py-4 flex items-center justify-between gap-4 hover:border-[--color-border-hover] transition-all group">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn('px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider shrink-0', getStatusColor(log.status))}>
                    {getStatusLabel(log.status)}
                  </span>
                  {log.entity && (
                    <span className="text-[--color-text-muted] text-xs">{log.entity.name}</span>
                  )}
                  {log.deadline && (
                    <span className="text-amber-400 text-xs">Deadline: {formatDate(log.deadline)}</span>
                  )}
                </div>
                <h3 className="text-[--color-text-primary] font-semibold truncate">{log.title}</h3>
                <p className="text-[--color-text-muted] text-xs mt-0.5">
                  oleh {log.creator?.full_name ?? '—'} · {formatDate(log.created_at)}
                  {log.attachments && log.attachments.length > 0 && ` · ${log.attachments.length} lampiran`}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-[--color-text-muted] group-hover:text-[#D4AF37] group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
