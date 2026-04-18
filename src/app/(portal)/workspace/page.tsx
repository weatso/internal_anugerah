'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { FolderKanban, Plus, Search, Calendar, User, AlignLeft, CheckCircle2, AlertCircle, Eye, FileText, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { formatDateTime, getStatusLabel } from '@/lib/utils'
import { getEntityAccentColor, getDivisionConfig } from '@/lib/division-config'
import type { WorkspaceLog, WorkspaceMetadata } from '@/types'

const FADE_UP = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }

export default function WorkspacePage() {
  const { profile, effectiveEntityId, effectiveEntity } = useUser()
  const supabase = createClient()

  const [logs, setLogs]           = useState<WorkspaceLog[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')

  useEffect(() => {
    fetchData()
  }, [effectiveEntityId])

  async function fetchData() {
    setLoading(true)
    let query = supabase
      .from('workspace_logs')
      .select('*, entity:entities(*), creator:profiles!workspace_logs_created_by_fkey(id,full_name)')
      .order('created_at', { ascending: false })

    if (effectiveEntityId) {
      query = query.eq('entity_id', effectiveEntityId)
    }

    const { data } = await query
    setLogs((data ?? []) as WorkspaceLog[])
    setLoading(false)
  }

  const accentColor = getEntityAccentColor(effectiveEntity)
  const divConfig = getDivisionConfig(effectiveEntity?.name)

  const filteredLogs = logs.filter(l =>
    !search ||
    l.title.toLowerCase().includes(search.toLowerCase()) ||
    l.content.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold mb-1" style={{ color: accentColor }}>
            Polymorphic Workspace
          </p>
          <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight flex items-center gap-3">
            <span className="text-3xl">{divConfig.emoji}</span>
            Workspace {effectiveEntity?.name ?? 'Global'}
          </h1>
          <p className="text-[--color-text-muted] text-sm mt-1">
            Task and Log management • {divConfig.displayName} Format
          </p>
        </div>
        <Link href="/workspace/create"
          className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-md transition-all hover:opacity-80 shrink-0"
          style={{ background: accentColor, color: '#050505' }}>
          <Plus className="w-4 h-4" /> Log Baru
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-text-muted]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={`Cari log di ${effectiveEntity?.name ?? 'semua divisi'}...`}
            className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-[--color-border] rounded-md text-[--color-text-primary] text-sm placeholder:text-[--color-text-muted] focus:outline-none transition-colors"
            style={{ '--tw-ring-color': accentColor } as any}
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: accentColor, borderTopColor: 'transparent' }} />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-20 glass-card">
          <p className="text-[--color-text-muted] text-sm">Tidak ditemukan log.</p>
        </div>
      ) : (
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }} className="space-y-3">
          {filteredLogs.map(log => {
            const meta = (log.metadata ?? {}) as any
            const isMe = log.created_by === profile?.id
            const eColor = getEntityAccentColor(log.entity)

            return (
              <motion.div key={log.id} variants={FADE_UP} className="glass-card hover:bg-white/[0.015] transition-colors group">
                <Link href={`/workspace/${log.id}`} className="p-4 md:p-5 flex flex-col md:flex-row gap-4 md:items-center">
                  
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-widest shrink-0"
                        style={{ color: eColor, borderColor: `${eColor}30`, background: `${eColor}10` }}>
                        {log.entity?.name} {log.log_type}
                      </span>
                      {log.status === 'NEEDS_ACTION' && <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 uppercase"><AlertCircle className="w-3 h-3" /> Action</span>}
                      {log.status === 'REVIEWED_BY_CEO' && <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase"><CheckCircle2 className="w-3 h-3" /> Reviewed</span>}
                      {log.status === 'SUBMITTED' && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20 uppercase tracking-widest">Submitted</span>}
                    </div>
                    
                    <h2 className="text-[--color-text-primary] font-bold text-base md:text-lg truncate group-hover:text-white transition-colors">
                      {log.title}
                    </h2>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-[--color-text-muted] flex-wrap">
                      <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {(log as any).creator?.full_name} {isMe && '(Anda)'}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDateTime(log.created_at)}</span>
                      {log.attachments?.length ? <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> {log.attachments.length} files</span> : null}
                    </div>
                  </div>

                  {/* Right: Dynamic Metadata Preview */}
                  <div className="shrink-0 w-full md:w-64 flex flex-col gap-1.5 md:items-end justify-center border-t md:border-t-0 md:border-l border-[--color-border] pt-3 md:pt-0 md:pl-5">
                     <MetadataPreview logType={log.log_type} meta={meta} color={eColor} />
                  </div>

                  <div className="hidden md:flex shrink-0 items-center justify-center p-2 text-[--color-text-muted] group-hover:text-white transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}

function MetadataPreview({ logType, meta, color }: { logType: string, meta: any, color: string }) {
  if (!meta || Object.keys(meta).length === 0) return <span className="text-xs text-[--color-text-muted] italic">Regular Log</span>

  switch (logType) {
    case 'WEATSO':
      return (
        <>
          {meta.sprint && <span className="text-xs font-mono px-2 py-0.5 bg-white/5 rounded text-[--color-text-primary]">Sprint: {meta.sprint}</span>}
          {meta.sprint_status && <span className="text-[10px] uppercase font-bold text-[--color-text-secondary]">{meta.sprint_status}</span>}
        </>
      )
    case 'LOKAL':
      return (
        <>
          {meta.sales_volume && <span className="text-sm font-bold" style={{ color }}>{meta.sales_volume} Pcs Sold</span>}
          {meta.top_product && <span className="text-xs text-[--color-text-muted] truncate max-w-[150px]">Top: {meta.top_product}</span>}
        </>
      )
    case 'EVORY':
      return (
        <>
          {meta.event_date && <span className="text-xs text-[--color-text-primary] px-2 py-0.5 bg-white/5 rounded">{meta.event_date}</span>}
          {meta.vendor_status && <span className="text-[10px] uppercase font-bold text-[--color-text-secondary]">Vendors: {meta.vendor_status}</span>}
        </>
      )
    case 'COLABZ':
      return (
        <>
          {meta.showreel_progress != null && (
            <div className="w-32">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-[--color-text-muted]">Showreel</span>
                <span className="font-bold" style={{ color }}>{meta.showreel_progress}%</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full" style={{ width: `${meta.showreel_progress}%`, background: color }} /></div>
            </div>
          )}
        </>
      )
    case 'LADDIFY':
      return (
        <>
          {meta.provider && <span className="text-xs font-semibold px-2 py-0.5 bg-white/5 rounded text-[--color-text-primary] truncate max-w-[150px]">{meta.provider}</span>}
          {meta.margin && <span className="text-[10px] font-bold uppercase text-[--color-text-muted]">Margin: {meta.margin}%</span>}
        </>
      )
    default: // GENERAL
      return (
        <>
          {meta.priority && <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${meta.priority === 'HIGH' ? 'text-red-400 border-red-500/30 bg-red-500/10' : meta.priority === 'MEDIUM' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' : 'text-blue-400 border-blue-500/30 bg-blue-500/10'}`}>{meta.priority} Priority</span>}
          {meta.due_date && <span className="text-[10px] text-[--color-text-muted]">Due: {meta.due_date}</span>}
        </>
      )
  }
}
