'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { formatDateTime } from '@/lib/utils'
import { Plus, FolderKanban, AlignLeft, ChevronRight, GripVertical, ExternalLink, X, Send, Building2, LayoutList, LayoutGrid } from 'lucide-react'
import { toast } from 'sonner'

const PRIORITY_STYLE: Record<string, { label: string; color: string }> = {
  CRITICAL: { label: '🔴 Critical', color: '#ef4444' },
  HIGH:     { label: '🟠 High',     color: '#f97316' },
  MEDIUM:   { label: '🟡 Medium',   color: '#f59e0b' },
  LOW:      { label: '🟢 Low',      color: '#10b981' },
}

const KANBAN_COLS = [
  { key: 'LEADS',       label: 'Leads',       color: '#6366f1', emoji: '🎯' },
  { key: 'ONGOING',     label: 'Ongoing',     color: '#f59e0b', emoji: '⚡' },
  { key: 'MAINTENANCE', label: 'Maintenance', color: '#3b82f6', emoji: '🔧' },
  { key: 'COMPLETED',   label: 'Selesai',     color: '#10b981', emoji: '✅' },
]

const LOG_STATUS_STYLE: Record<string, string> = {
  NEEDS_ACTION: 'text-red-400 bg-red-500/10',
  REVIEWED_BY_CEO: 'text-emerald-400 bg-emerald-500/10',
  SUBMITTED: 'text-amber-400 bg-amber-500/10',
  RESOLVED: 'text-neutral-500 bg-neutral-500/10',
}

export default function WorkspacePage() {
  const { profile, effectiveEntityId, effectiveEntity, highestRole } = useUser()
  const supabase = createClient()
  const [tab, setTab] = useState<'general' | 'projects'>('general')

  // General state
  const [logs, setLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(true)

  // Projects state
  const [projects, setProjects] = useState<any[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  // CEO entity switcher (local — does not change global context)
  const [ceoEntityFilter, setCeoEntityFilter] = useState<string>('ALL')
  const [entities, setEntities] = useState<any[]>([])
  // View toggle
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [showLogModal, setShowLogModal] = useState(false)
  const [logForm, setLogForm] = useState({ title: '', content: '', visibility: 'INTERNAL' })
  const [posting, setPosting] = useState(false)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  useEffect(() => {
    if (highestRole === 'CEO') {
      supabase.from('entities').select('id,name').order('name').then(({ data }) => setEntities(data || []))
    }
    fetchLogs(); fetchProjects()
  }, [effectiveEntityId])

  async function fetchLogs() {
    setLogsLoading(true)
    let q = supabase.from('workspace_logs').select('*, entity:entities(name), creator:profiles!workspace_logs_created_by_fkey(id,full_name)')
      .eq('is_general', true).order('created_at', { ascending: false })
    if (effectiveEntityId && highestRole !== 'CEO') q = q.eq('entity_id', effectiveEntityId)
    const { data } = await q
    setLogs(data || [])
    setLogsLoading(false)
  }

  async function fetchProjects() {
    setProjectsLoading(true)
    let q = supabase.from('projects').select('*, clients(company_name), entities(name,primary_color)')
      .order('created_at', { ascending: false })
    if (effectiveEntityId && highestRole !== 'CEO') q = q.eq('entity_id', effectiveEntityId)
    const { data } = await q
    setProjects(data || [])
    setProjectsLoading(false)
  }

  async function moveProject(id: string, newStatus: string) {
    await supabase.from('projects').update({ status: newStatus }).eq('id', id)
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p))
  }

  async function postLog(e: React.FormEvent) {
    e.preventDefault()
    if (!logForm.title.trim() || !logForm.content.trim()) return
    if (!profile) return
    setPosting(true)
    try {
      const { error } = await supabase.from('workspace_logs').insert([{
        entity_id: effectiveEntityId,
        title: logForm.title,
        content: logForm.content,
        visibility: logForm.visibility,
        is_general: true,
        created_by: profile.id,
        log_type: 'GENERAL',
        status: 'SUBMITTED',
      }])
      if (error) throw error
      toast.success('Log umum berhasil ditambahkan!')
      setShowLogModal(false)
      setLogForm({ title: '', content: '', visibility: 'INTERNAL' })
      fetchLogs()
    } catch (err: any) { toast.error(err.message) }
    setPosting(false)
  }

  // Drag handlers
  function handleDragStart(e: React.DragEvent<HTMLDivElement>, id: string) {
    setDragging(id)
    e.dataTransfer.effectAllowed = 'move'
  }
  function handleDrop(e: React.DragEvent<HTMLDivElement>, colKey: string) {
    e.preventDefault()
    if (dragging && dragging !== colKey) moveProject(dragging, colKey)
    setDragging(null); setDragOver(null)
  }

  const daysUntil = (date: string | null) => {
    if (!date) return null
    return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
  }

  // Apply CEO entity filter
  const filteredProjects = highestRole === 'CEO' && ceoEntityFilter !== 'ALL'
    ? projects.filter(p => p.entity_id === ceoEntityFilter)
    : projects

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] font-bold mb-1" style={{ color: 'var(--gold)' }}>Operations</p>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Workspace</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* CEO Entity Switcher */}
          {highestRole === 'CEO' && entities.length > 0 && tab === 'projects' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
              <Building2 className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--gold)' }} />
              <select value={ceoEntityFilter} onChange={e => setCeoEntityFilter(e.target.value)}
                className="bg-transparent text-xs font-bold outline-none pr-2" style={{ color: 'var(--text-primary)' }}>
                <option value="ALL">Semua Divisi</option>
                {entities.map(en => <option key={en.id} value={en.id}>{en.name}</option>)}
              </select>
            </div>
          )}
          {/* View Toggle (Projects tab) */}
          {tab === 'projects' && (
            <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
              <button onClick={() => setView('kanban')} className="p-1.5 rounded transition-all"
                style={view === 'kanban' ? { background: 'var(--gold)', color: '#050505' } : { color: 'var(--text-muted)' }}>
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setView('list')} className="p-1.5 rounded transition-all"
                style={view === 'list' ? { background: 'var(--gold)', color: '#050505' } : { color: 'var(--text-muted)' }}>
                <LayoutList className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {tab === 'general' && (
            <button onClick={() => setShowLogModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold"
              style={{ background: 'var(--gold)', color: '#050505' }}>
              <Plus className="w-4 h-4" /> Log Umum
            </button>
          )}
          {tab === 'projects' && (
            <Link href="/workspace/projects/new" className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold"
              style={{ background: 'var(--gold)', color: '#050505' }}>
              <Plus className="w-4 h-4" /> Proyek Baru
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--bg-secondary)' }}>
        {[{ key: 'general', label: '📋 General / Memo' }, { key: 'projects', label: '🗂 Proyek' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className="px-5 py-2 rounded-md text-sm font-bold transition-all"
            style={tab === t.key ? { background: 'var(--gold)', color: '#050505' } : { color: 'var(--text-muted)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* GENERAL TAB */}
      {tab === 'general' && (
        <div className="space-y-3">
          {logsLoading ? (
            <div className="py-20 text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Memuat...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 glass-card">
              <AlignLeft className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-muted)' }}>Belum ada memo / reminder umum.</p>
            </div>
          ) : (
            logs.map(log => (
              <Link key={log.id} href={`/workspace/${log.id}`}>
                <div className="glass-card p-4 hover:bg-white/[0.015] transition-colors flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded" style={{ background: 'var(--gold-glow)', color: 'var(--gold)' }}>
                        {log.entity?.name}
                      </span>
                      {log.status && (
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${LOG_STATUS_STYLE[log.status] || ''}`}>
                          {log.status}
                        </span>
                      )}
                    </div>
                    <p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>{log.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {log.creator?.full_name} · {formatDateTime(log.created_at)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* PROJECTS TAB */}
      {tab === 'projects' && (
        <>
          {projectsLoading ? (
            <div className="py-20 text-center text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Memuat proyek...</div>
          ) : view === 'kanban' ? (
            /* KANBAN VIEW */
            <div className="overflow-x-auto pb-4">
              <div className="grid grid-cols-4 gap-4 min-w-[900px]">
                {KANBAN_COLS.map(col => {
                  const colProjects = filteredProjects.filter(p => p.status === col.key)
                  return (
                    <div key={col.key}
                      className="rounded-xl p-3 min-h-[400px]"
                      style={{ background: `${col.color}08`, border: `1px solid ${col.color}20` }}
                      onDragOver={e => { e.preventDefault(); setDragOver(col.key) }}
                      onDrop={e => handleDrop(e, col.key)}
                      onDragLeave={() => setDragOver(null)}
                    >
                      <div className="flex items-center justify-between mb-3 px-1">
                        <div className="flex items-center gap-2">
                          <span>{col.emoji}</span>
                          <p className="text-xs font-black uppercase tracking-widest" style={{ color: col.color }}>{col.label}</p>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${col.color}20`, color: col.color }}>
                          {colProjects.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {colProjects.map(project => {
                          const days = daysUntil(project.end_date)
                          const isOverdue = days !== null && days < 0
                          const isSoon = days !== null && days >= 0 && days <= 7
                          const prio = PRIORITY_STYLE[project.priority || 'MEDIUM']
                          return (
                            <div key={project.id}
                              draggable onDragStart={(e: React.DragEvent<HTMLDivElement>) => handleDragStart(e, project.id)}
                              className="rounded-lg p-3 cursor-grab active:cursor-grabbing group transition-all"
                              style={{
                                background: 'var(--bg-elevated)',
                                border: `1px solid ${dragging === project.id ? col.color : 'var(--border-subtle)'}`,
                                opacity: dragging === project.id ? 0.5 : 1,
                              }}>
                              <div className="flex items-start justify-between gap-1 mb-1">
                                <p className="text-sm font-bold leading-snug flex-1" style={{ color: 'var(--text-primary)' }}>{project.name}</p>
                                <GripVertical className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-0 group-hover:opacity-40 transition-opacity" style={{ color: 'var(--text-muted)' }} />
                              </div>
                              {/* Priority badge */}
                              <span className="inline-block text-[9px] font-black px-1.5 py-0.5 rounded mb-1"
                                style={{ background: `${prio.color}15`, color: prio.color }}>
                                {prio.label}
                              </span>
                              {project.clients?.company_name && (
                                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>👤 {project.clients.company_name}</p>
                              )}
                              {project.end_date && (
                                <p className={`text-[10px] mt-1 font-bold ${isOverdue ? 'text-red-400' : isSoon ? 'text-amber-400' : ''}`}
                                  style={!isOverdue && !isSoon ? { color: 'var(--text-muted)' } : {}}>
                                  📅 {isOverdue ? `Terlambat ${Math.abs(days!)} hari` : days === 0 ? 'Deadline hari ini!' : `${days} hari lagi`}
                                </p>
                              )}
                              <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                                  style={{ background: `${project.entities?.primary_color || '#888'}15`, color: project.entities?.primary_color || 'var(--text-muted)' }}>
                                  {project.entities?.name}
                                </span>
                                <Link href={`/workspace/projects/${project.id}`}
                                  className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded transition-colors"
                                  style={{ background: `${col.color}15`, color: col.color }}>
                                  War Room <ExternalLink className="w-2.5 h-2.5" />
                                </Link>
                              </div>
                            </div>
                          )
                        })}
                        {colProjects.length === 0 && (
                          <div className="text-center py-8 border-2 border-dashed rounded-lg text-xs"
                            style={{ borderColor: `${col.color}30`, color: 'var(--text-muted)' }}>
                            Drop proyek di sini
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* LIST VIEW */
            <div className="glass-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase tracking-widest border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
                  <tr>
                    <th className="px-4 py-3 text-left font-bold" style={{ color: 'var(--text-muted)' }}>Proyek</th>
                    <th className="px-4 py-3 text-left font-bold" style={{ color: 'var(--text-muted)' }}>Divisi</th>
                    <th className="px-4 py-3 text-left font-bold" style={{ color: 'var(--text-muted)' }}>Klien</th>
                    <th className="px-4 py-3 text-left font-bold" style={{ color: 'var(--text-muted)' }}>Status</th>
                    <th className="px-4 py-3 text-left font-bold" style={{ color: 'var(--text-muted)' }}>Prioritas</th>
                    <th className="px-4 py-3 text-left font-bold" style={{ color: 'var(--text-muted)' }}>Deadline</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {filteredProjects.map(project => {
                    const days = daysUntil(project.end_date)
                    const isOverdue = days !== null && days < 0
                    const isSoon = days !== null && days >= 0 && days <= 7
                    const prio = PRIORITY_STYLE[project.priority || 'MEDIUM']
                    const colColor = KANBAN_COLS.find(c => c.key === project.status)?.color || '#888'
                    return (
                      <tr key={project.id} className="hover:bg-white/[0.015] transition-colors">
                        <td className="px-4 py-3 font-bold" style={{ color: 'var(--text-primary)' }}>{project.name}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                            style={{ background: `${project.entities?.primary_color || '#888'}15`, color: project.entities?.primary_color || 'var(--text-muted)' }}>
                            {project.entities?.name || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {project.clients?.company_name || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[9px] font-black uppercase px-2 py-1 rounded"
                            style={{ background: `${colColor}15`, color: colColor }}>
                            {project.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[9px] font-black px-2 py-1 rounded"
                            style={{ background: `${prio.color}15`, color: prio.color }}>
                            {prio.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {project.end_date ? (
                            <span className={`font-bold ${isOverdue ? 'text-red-400' : isSoon ? 'text-amber-400' : ''}`}
                              style={!isOverdue && !isSoon ? { color: 'var(--text-muted)' } : {}}>
                              {isOverdue ? `⚠️ Terlambat ${Math.abs(days!)}hr` : days === 0 ? '🔴 Hari ini' : `${days} hari`}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-3">
                          <Link href={`/workspace/projects/${project.id}`}
                            className="flex items-center gap-1 text-[9px] font-bold px-2 py-1.5 rounded transition-colors"
                            style={{ background: `${colColor}15`, color: colColor }}>
                            War Room <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredProjects.length === 0 && (
                    <tr><td colSpan={7} className="py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Tidak ada proyek ditemukan.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Log Umum Modal */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg p-6 rounded-xl space-y-4"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center justify-between">
                <h2 className="font-black" style={{ color: 'var(--text-primary)' }}>Log / Memo Umum</h2>
                <button onClick={() => setShowLogModal(false)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={postLog} className="space-y-3">
                <input className="input-field w-full px-3 py-2.5 text-sm rounded-md" placeholder="Judul memo / log *"
                  required value={logForm.title} onChange={e => setLogForm(p => ({ ...p, title: e.target.value }))} />
                <textarea rows={4} className="input-field w-full px-3 py-2.5 text-sm rounded-md resize-none"
                  placeholder="Konten, catatan, atau arahan..." required
                  value={logForm.content} onChange={e => setLogForm(p => ({ ...p, content: e.target.value }))} />
                <div><label className="section-label block mb-1.5">Visibilitas</label>
                  <select className="select-field w-full" value={logForm.visibility} onChange={e => setLogForm(p => ({ ...p, visibility: e.target.value }))}>
                    <option value="INTERNAL">Internal (hanya staff)</option>
                    <option value="CLIENT_VISIBLE">Visible ke Klien (Client Portal)</option>
                  </select>
                </div>
                <button type="submit" disabled={posting}
                  className="w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                  style={{ background: 'var(--gold)', color: '#050505' }}>
                  {posting ? <span className="animate-pulse">Menyimpan...</span> : <><Send className="w-4 h-4" /> Post Log</>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
