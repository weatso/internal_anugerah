'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { formatRupiah } from '@/lib/utils'
import { Copy, FileText, Eye, EyeOff, Plus, Send, ArrowLeft, Timer, CheckCircle2, ListChecks, Trash2, Circle } from 'lucide-react'

const SUBTABS = ['Overview', 'Tasks', 'Dokumen', 'Log Aktivitas', 'Reminders'] as const
type SubTab = typeof SUBTABS[number]

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#10b981',
}
const TASK_STATUS_CYCLE: Record<string, string> = {
  TODO: 'IN_PROGRESS', IN_PROGRESS: 'DONE', DONE: 'TODO', BLOCKED: 'TODO',
}

export default function ProjectWarRoom({ project, logs: initLogs, documents, currentUserId }: {
  project: any; logs: any[]; documents: any[]; currentUserId: string
}) {
  const supabase = createClient()
  const [subTab, setSubTab] = useState<SubTab>('Overview')
  const [logs, setLogs] = useState(initLogs)
  const [newLog, setNewLog] = useState('')
  const [newLogTitle, setNewLogTitle] = useState('')
  const [clientVisible, setClientVisible] = useState(false)
  const [posting, setPosting] = useState(false)
  // Tasks state
  const [tasks, setTasks] = useState<any[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'MEDIUM', due_date: '' })
  const [addingTask, setAddingTask] = useState(false)
  const [showTaskForm, setShowTaskForm] = useState(false)

  const accentColor = project.entities?.primary_color || 'var(--gold)'
  const client = project.clients
  const magicLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${project.magic_link_token}`

  useEffect(() => { if (subTab === 'Tasks') fetchTasks() }, [subTab])

  async function fetchTasks() {
    setTasksLoading(true)
    const { data } = await supabase.from('project_tasks')
      .select('*, assignee:profiles!project_tasks_assignee_profile_id_fkey(full_name)')
      .eq('project_id', project.id).order('sort_order').order('created_at')
    setTasks(data || [])
    setTasksLoading(false)
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!taskForm.title.trim()) return
    setAddingTask(true)
    const { error } = await supabase.from('project_tasks').insert({
      project_id: project.id,
      title: taskForm.title,
      description: taskForm.description || null,
      priority: taskForm.priority,
      due_date: taskForm.due_date || null,
      created_by: currentUserId,
      status: 'TODO',
    })
    if (error) { toast.error(error.message) }
    else { toast.success('Task ditambahkan!'); setTaskForm({ title: '', description: '', priority: 'MEDIUM', due_date: '' }); setShowTaskForm(false); fetchTasks() }
    setAddingTask(false)
  }

  async function cycleTaskStatus(task: any) {
    const next = TASK_STATUS_CYCLE[task.status] || 'TODO'
    await supabase.from('project_tasks').update({ status: next, updated_at: new Date().toISOString() }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t))
  }

  async function deleteTask(id: string) {
    await supabase.from('project_tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
    toast.success('Task dihapus')
  }

  function copyLink() {
    navigator.clipboard.writeText(magicLink)
    toast.success('Magic link tersalin! Bagikan ke klien.')
  }

  async function postLog(e: React.FormEvent) {
    e.preventDefault()
    if (!newLog.trim() || !newLogTitle.trim()) return
    setPosting(true)
    try {
      const { data, error } = await supabase.from('workspace_logs').insert({
        entity_id: project.entity_id,
        project_id: project.id,
        title: newLogTitle,
        content: newLog,
        visibility: clientVisible ? 'CLIENT_VISIBLE' : 'INTERNAL',
        created_by: currentUserId,
        log_type: 'PROJECT_UPDATE',
        status: 'SUBMITTED',
      }).select('*, creator:profiles!workspace_logs_created_by_fkey(full_name)').single()
      if (error) throw error
      setLogs(prev => [data, ...prev])
      setNewLog(''); setNewLogTitle('')
      toast.success(clientVisible ? 'Log ditambahkan & terlihat oleh klien' : 'Log internal ditambahkan')
    } catch (err: any) { toast.error(err.message) }
    setPosting(false)
  }

  async function toggleVisibility(logId: string, current: string) {
    const newVis = current === 'CLIENT_VISIBLE' ? 'INTERNAL' : 'CLIENT_VISIBLE'
    await supabase.from('workspace_logs').update({ visibility: newVis }).eq('id', logId)
    setLogs(prev => prev.map(l => l.id === logId ? { ...l, visibility: newVis } : l))
    toast.success(newVis === 'CLIENT_VISIBLE' ? 'Sekarang terlihat oleh klien' : 'Disembunyikan dari klien')
  }

  // Countdown
  const daysLeft = project.end_date
    ? Math.ceil((new Date(project.end_date).getTime() - Date.now()) / 86400000)
    : null
  const progressPct = project.start_date && project.end_date
    ? Math.min(100, Math.max(0, Math.round(
      (Date.now() - new Date(project.start_date).getTime()) /
      (new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) * 100
    )))
    : 0

  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
  const STATUS_STYLE: Record<string, string> = { DRAFT: 'text-neutral-400', PAID: 'text-emerald-500', SENT: 'text-blue-400' }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <Link href="/workspace" className="flex items-center gap-1.5 text-xs font-bold mb-4 transition-colors"
          style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Workspace
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase" style={{ background: `${accentColor}20`, color: accentColor }}>
                {project.status}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                {project.entities?.name}
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{project.name}</h1>
            {client && <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>👤 {client.company_name} · {client.pic_name}</p>}
          </div>
          <button onClick={copyLink}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold shrink-0"
            style={{ background: accentColor, color: '#050505' }}>
            <Copy className="w-4 h-4" /> Copy Client Link
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 rounded-lg overflow-x-auto" style={{ background: 'var(--bg-secondary)' }}>
        {SUBTABS.map(t => (
          <button key={t} onClick={() => setSubTab(t)}
            className="flex-1 py-2 px-3 rounded-md text-xs font-bold transition-all whitespace-nowrap"
            style={subTab === t ? { background: 'var(--gold)', color: '#050505' } : { color: 'var(--text-muted)' }}>
            {t === 'Tasks' ? `✅ Tasks (${tasks.length})` : t}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {subTab === 'Overview' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="glass-card p-5 space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: accentColor }}>Info Klien</h2>
            {client ? (
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Perusahaan', value: client.company_name },
                  { label: 'PIC', value: client.pic_name },
                  { label: 'Phone', value: client.pic_phone },
                  { label: 'Email', value: client.pic_email },
                  { label: 'Industri', value: client.industry_type },
                ].map(r => (
                  <div key={r.label} className="flex justify-between gap-4">
                    <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
                    <span className="font-semibold text-right" style={{ color: 'var(--text-primary)' }}>{r.value || '—'}</span>
                  </div>
                ))}
              </div>
            ) : <p style={{ color: 'var(--text-muted)' }}>Tidak ada klien terhubung.</p>}
          </div>
          <div className="space-y-4">
            <div className="glass-card p-5 space-y-3">
              <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: accentColor }}>Timeline</h2>
              <div className="text-sm space-y-1.5">
                <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Mulai</span><span className="font-bold" style={{ color: 'var(--text-primary)' }}>{fmtDate(project.start_date)}</span></div>
                <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Selesai</span>
                  <span className="font-bold" style={{ color: daysLeft !== null && daysLeft < 0 ? '#ef4444' : daysLeft !== null && daysLeft <= 7 ? '#f59e0b' : 'var(--text-primary)' }}>
                    {fmtDate(project.end_date)}
                  </span>
                </div>
              </div>
              {project.start_date && project.end_date && (
                <div>
                  <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
                    <span>Progress Timeline</span><span>{progressPct}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: accentColor }} />
                  </div>
                </div>
              )}
            </div>
            <div className="glass-card p-4">
              <p className="text-[10px] uppercase tracking-wider font-bold mb-2" style={{ color: 'var(--text-muted)' }}>Magic Link Klien</p>
              <div className="flex items-center gap-2 p-2 rounded" style={{ background: 'var(--bg-secondary)' }}>
                <p className="text-xs font-mono flex-1 truncate" style={{ color: 'var(--gold)' }}>/p/{project.magic_link_token}</p>
                <button onClick={copyLink} className="p-1 rounded" style={{ color: 'var(--gold)' }}><Copy className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* TASKS */}
      {subTab === 'Tasks' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Add Task Button */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              {tasks.filter(t=>t.status==='DONE').length}/{tasks.length} selesai
            </p>
            <button onClick={() => setShowTaskForm(p => !p)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold"
              style={{ background: 'var(--gold)', color: '#050505' }}>
              <Plus className="w-3.5 h-3.5" /> Tambah Task
            </button>
          </div>

          {/* Add Task Form */}
          {showTaskForm && (
            <form onSubmit={addTask} className="glass-card p-4 space-y-3">
              <input className="input-field w-full px-3 py-2 text-sm rounded-md" placeholder="Judul task *"
                required value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} />
              <textarea rows={2} className="input-field w-full px-3 py-2 text-sm rounded-md resize-none"
                placeholder="Deskripsi (opsional)" value={taskForm.description}
                onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))} />
              <div className="flex gap-3">
                <select className="select-field flex-1" value={taskForm.priority}
                  onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))}>
                  <option value="LOW">🟢 Low</option>
                  <option value="MEDIUM">🟡 Medium</option>
                  <option value="HIGH">🟠 High</option>
                  <option value="CRITICAL">🔴 Critical</option>
                </select>
                <input type="date" className="input-field flex-1 px-3 py-2 text-sm rounded-md"
                  value={taskForm.due_date} onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={addingTask}
                  className="flex-1 py-2 rounded-lg text-sm font-bold"
                  style={{ background: 'var(--gold)', color: '#050505' }}>
                  {addingTask ? 'Menyimpan...' : 'Simpan Task'}
                </button>
                <button type="button" onClick={() => setShowTaskForm(false)}
                  className="px-4 py-2 rounded-lg text-sm font-bold"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>Batal</button>
              </div>
            </form>
          )}

          {/* Progress Bar */}
          {tasks.length > 0 && (
            <div className="glass-card p-4">
              <div className="flex justify-between text-[10px] mb-2" style={{ color: 'var(--text-muted)' }}>
                <span>Task Progress</span>
                <span>{Math.round(tasks.filter(t=>t.status==='DONE').length/tasks.length*100)}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                <div className="h-full rounded-full transition-all" style={{
                  width: `${Math.round(tasks.filter(t=>t.status==='DONE').length/tasks.length*100)}%`,
                  background: accentColor
                }} />
              </div>
            </div>
          )}

          {/* Task List grouped by status */}
          {tasksLoading ? (
            <div className="py-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>Memuat tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-16 glass-card">
              <ListChecks className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-muted)' }}>Belum ada task. Klik "Tambah Task" untuk mulai.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(['TODO','IN_PROGRESS','BLOCKED','DONE'] as const).map(status => {
                const group = tasks.filter(t => t.status === status)
                if (group.length === 0) return null
                const statusMeta: Record<string, {label:string,color:string}> = {
                  TODO:        { label: '⏳ To Do',      color: '#6366f1' },
                  IN_PROGRESS: { label: '⚡ In Progress', color: '#f59e0b' },
                  BLOCKED:     { label: '🚫 Blocked',    color: '#ef4444' },
                  DONE:        { label: '✅ Done',        color: '#10b981' },
                }
                const sm = statusMeta[status]
                return (
                  <div key={status}>
                    <p className="text-[10px] font-black uppercase tracking-widest px-1 mb-2" style={{ color: sm.color }}>
                      {sm.label} · {group.length}
                    </p>
                    <div className="space-y-1.5">
                      {group.map(task => (
                        <div key={task.id} className="glass-card p-3 flex items-start gap-3 group">
                          <button onClick={() => cycleTaskStatus(task)} className="mt-0.5 shrink-0 transition-transform hover:scale-110">
                            {task.status === 'DONE'
                              ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                              : task.status === 'BLOCKED'
                              ? <Circle className="w-5 h-5 text-red-400" />
                              : <Circle className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold" style={{
                              color: 'var(--text-primary)',
                              textDecoration: task.status === 'DONE' ? 'line-through' : 'none',
                              opacity: task.status === 'DONE' ? 0.5 : 1
                            }}>{task.title}</p>
                            {task.description && (
                              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{task.description}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                                style={{ background: `${PRIORITY_COLOR[task.priority||'MEDIUM']}15`, color: PRIORITY_COLOR[task.priority||'MEDIUM'] }}>
                                {task.priority || 'MEDIUM'}
                              </span>
                              {task.due_date && (
                                <span className="text-[9px] font-bold" style={{ color: 'var(--text-muted)' }}>
                                  📅 {new Date(task.due_date).toLocaleDateString('id-ID', { day:'numeric', month:'short' })}
                                </span>
                              )}
                              {task.assignee?.full_name && (
                                <span className="text-[9px] font-bold" style={{ color: 'var(--text-muted)' }}>
                                  👤 {task.assignee.full_name}
                                </span>
                              )}
                            </div>
                          </div>
                          <button onClick={() => deleteTask(task.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
                            style={{ color: 'var(--text-muted)' }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* DOCUMENTS */}
      {subTab === 'Dokumen' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card overflow-hidden">
          {documents.length === 0 ? (
            <div className="text-center py-16"><FileText className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} /><p style={{ color: 'var(--text-muted)' }}>Belum ada dokumen terhubung.</p></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase font-bold border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                <tr>
                  <th className="px-5 py-3 text-left">No. Dokumen</th>
                  <th className="px-5 py-3 text-left">Perihal</th>
                  <th className="px-5 py-3 text-right">Nilai</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {documents.map(doc => (
                  <tr key={doc.id}>
                    <td className="px-5 py-3 font-mono text-xs" style={{ color: 'var(--gold)' }}>{doc.doc_number}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--text-primary)' }}>{doc.title}</td>
                    <td className="px-5 py-3 text-right font-mono" style={{ color: 'var(--text-primary)' }}>{formatRupiah(doc.grand_total)}</td>
                    <td className="px-5 py-3 text-center"><span className={`text-[10px] font-bold uppercase ${STATUS_STYLE[doc.status] || 'text-neutral-400'}`}>{doc.status}</span></td>
                    <td className="px-5 py-3 text-right">
                      <a href={`/api/generate-pdf?id=${doc.id}`} target="_blank" className="p-1.5 rounded inline-flex" style={{ background: 'var(--gold-glow)', color: 'var(--gold)' }}>
                        <FileText className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>
      )}

      {/* LOG AKTIVITAS */}
      {subTab === 'Log Aktivitas' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* Post form */}
          <form onSubmit={postLog} className="glass-card p-5 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--gold)' }}>Tambah Update Proyek</h2>
            <input className="input-field w-full px-3 py-2.5 text-sm rounded-md" placeholder="Judul update / aktivitas"
              value={newLogTitle} onChange={e => setNewLogTitle(e.target.value)} />
            <textarea rows={3} className="input-field w-full px-3 py-2.5 text-sm rounded-md resize-none"
              placeholder="Detail aktivitas, catatan, atau perkembangan..." value={newLog} onChange={e => setNewLog(e.target.value)} />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                <input type="checkbox" checked={clientVisible} onChange={e => setClientVisible(e.target.checked)} className="accent-[var(--gold)]" />
                {clientVisible ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4" />}
                <span className={clientVisible ? 'text-emerald-400 font-bold' : ''}>Tampilkan ke Klien</span>
              </label>
              <button type="submit" disabled={posting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold"
                style={{ background: 'var(--gold)', color: '#050505' }}>
                <Send className="w-3.5 h-3.5" /> Post Update
              </button>
            </div>
          </form>

          {/* Log list */}
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px" style={{ background: 'var(--border-subtle)' }} />
            <div className="space-y-4">
              {logs.map(log => (
                <div key={log.id} className="flex gap-4 relative">
                  <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center z-10 border-2 ${log.visibility === 'CLIENT_VISIBLE' ? 'border-emerald-500 bg-emerald-500/10' : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)]'}`}>
                    {log.visibility === 'CLIENT_VISIBLE' ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
                  </div>
                  <div className="flex-1 glass-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{log.title}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {log.creator?.full_name} · {new Date(log.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <button onClick={() => toggleVisibility(log.id, log.visibility)}
                        className="text-[10px] font-bold px-2 py-1 rounded transition-colors shrink-0"
                        style={log.visibility === 'CLIENT_VISIBLE'
                          ? { background: 'rgba(16,185,129,0.15)', color: '#10b981' }
                          : { background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                        {log.visibility === 'CLIENT_VISIBLE' ? 'Publik' : 'Internal'}
                      </button>
                    </div>
                    <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{log.content}</p>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="text-center py-10 ml-10" style={{ color: 'var(--text-muted)' }}>Belum ada log aktivitas.</div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* REMINDERS */}
      {subTab === 'Reminders' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="glass-card p-6 text-center space-y-4">
            <Timer className="w-12 h-12 mx-auto" style={{ color: daysLeft !== null && daysLeft < 0 ? '#ef4444' : daysLeft !== null && daysLeft <= 7 ? '#f59e0b' : 'var(--gold)' }} />
            {daysLeft === null ? (
              <p style={{ color: 'var(--text-muted)' }}>Tidak ada end_date yang ditetapkan untuk proyek ini.</p>
            ) : daysLeft < 0 ? (
              <>
                <p className="text-3xl font-black text-red-400">{Math.abs(daysLeft)} Hari Terlambat</p>
                <p style={{ color: 'var(--text-muted)' }}>Deadline {fmtDate(project.end_date)} telah terlewat.</p>
              </>
            ) : daysLeft === 0 ? (
              <>
                <p className="text-3xl font-black text-amber-400">DEADLINE HARI INI!</p>
                <p style={{ color: 'var(--text-muted)' }}>Pastikan deliverable telah diserahkan ke klien.</p>
              </>
            ) : (
              <>
                <p className="text-5xl font-black" style={{ color: daysLeft <= 7 ? '#f59e0b' : 'var(--gold)' }}>{daysLeft}</p>
                <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Hari Tersisa</p>
                <p style={{ color: 'var(--text-muted)' }}>Deadline: {fmtDate(project.end_date)}</p>
              </>
            )}
            {project.start_date && project.end_date && (
              <div className="max-w-sm mx-auto">
                <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  <span>{fmtDate(project.start_date)}</span><span>{fmtDate(project.end_date)}</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: daysLeft !== null && daysLeft < 0 ? '#ef4444' : daysLeft !== null && daysLeft <= 7 ? '#f59e0b' : accentColor }} />
                </div>
                <p className="text-xs text-center mt-1 font-bold" style={{ color: 'var(--text-muted)' }}>{progressPct}% timeline berlalu</p>
              </div>
            )}
          </div>

          {/* SLA Checklist */}
          <div className="glass-card p-5 space-y-3">
            <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--gold)' }}>SLA Checklist</h2>
            {[
              { label: 'Kick-off Meeting dengan Klien', done: !!project.start_date },
              { label: 'Invoice diterbitkan', done: !!project.invoice_id },
              { label: 'Pembayaran diterima', done: project.invoice?.status === 'PAID' },
              { label: 'Proyek aktif / ongoing', done: ['ONGOING','MAINTENANCE','COMPLETED'].includes(project.status) },
              { label: 'Project selesai', done: project.status === 'COMPLETED' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${item.done ? 'text-emerald-400' : ''}`}
                  style={!item.done ? { color: 'var(--text-muted)' } : {}} />
                <span style={{ color: item.done ? 'var(--text-primary)' : 'var(--text-muted)', textDecoration: item.done ? 'none' : 'none' }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
