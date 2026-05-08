'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, FileEdit, ArrowRight, FolderKanban } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'

interface StaffWorkspaceProps {
  userId: string
  entityId?: string
}

export default function StaffWorkspace({ userId, entityId }: StaffWorkspaceProps) {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !entityId) {
      setLoading(false)
      return
    }
    fetchStaffData()
  }, [userId, entityId])

  async function fetchStaffData() {
    setLoading(true)
    try {
      const { data: pData } = await supabase.from('profiles').select('*').eq('id', userId).single()
      setProfile(pData)

      // Ambil Tugas yang ditugaskan ke staf ini (Belum selesai)
      const { data: tData } = await supabase
        .from('project_tasks')
        .select('*, projects(name, spk_id)')
        .eq('assignee_id', userId)
        .neq('status', 'COMPLETED')
        .order('priority', { ascending: false })
        .limit(10)
      
      setTasks(tData || [])

      // Ambil riwayat log terakhir dari staf ini
      const { data: lData } = await supabase
        .from('workspace_logs')
        .select('*, projects(name)')
        .eq('user_id', userId)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(5)
      
      setRecentLogs(lData || [])
    } catch (e) {
      console.error('Staff Data Error:', e)
    } finally {
      setLoading(false)
    }
  }

  if (!entityId && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-3">
        <p className="text-neutral-400 text-sm">Akses Divisi Ditolak.</p>
        <p className="text-xs uppercase tracking-widest text-[var(--gold)]">Harap pilih Kapasitas Kerja di Sidebar.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-t-transparent border-[var(--gold)] rounded-full animate-spin" />
      </div>
    )
  }

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Tim'

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 md:space-y-8">
      
      {/* Header Staf */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] font-bold text-[var(--gold)] mb-1">Ruang Operasional</p>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Fokus, {firstName}.</h1>
          <p className="text-sm mt-1 text-neutral-400">Pekerjaan Anda menggerakkan divisi ini. Selesaikan tugas Anda di bawah.</p>
        </div>
        <Link href="/workspace/create" className="btn-primary py-2.5 px-4 text-xs flex items-center gap-2">
          <FileEdit className="w-4 h-4" /> Catat Log Pekerjaan
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel Tugas Aktif */}
        <div className="glass-card p-5 md:p-6 flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold flex items-center gap-2 text-white">
              <FolderKanban className="w-4 h-4 text-[var(--gold)]" /> Tugas Prioritas Anda
            </h2>
            <span className="text-[10px] bg-white/10 px-2 py-1 rounded font-mono">{tasks.length} Tersisa</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {tasks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-500 space-y-2">
                <CheckCircle2 className="w-8 h-8 opacity-20" />
                <p className="text-xs">Tidak ada tugas aktif. Anda bersih.</p>
              </div>
            ) : (
              tasks.map(task => (
                <div key={task.id} className="p-4 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-[var(--gold)] mb-1">{task.projects?.name}</p>
                      <p className="text-sm text-white font-medium">{task.task_name}</p>
                    </div>
                    {task.priority === 'HIGH' && (
                      <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">High</span>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {task.deadline ? formatDate(task.deadline) : 'Tanpa Tenggat'}
                    </span>
                    <Link href={`/workspace/projects/${task.project_id}`} className="text-[10px] text-[var(--gold)] font-bold hover:underline flex items-center gap-1">
                      Buka War Room <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel Log Terbaru */}
        <div className="glass-card p-5 md:p-6 flex flex-col h-[500px]">
          <h2 className="text-sm font-bold flex items-center gap-2 text-white mb-6">
            <Clock className="w-4 h-4 text-[var(--gold)]" /> Riwayat Log Anda (Terakhir)
          </h2>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {recentLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-500">
                <p className="text-xs">Anda belum mencatat log kerja apa pun.</p>
              </div>
            ) : (
              <div className="relative border-l border-white/10 ml-3 space-y-6">
                {recentLogs.map(log => (
                  <div key={log.id} className="relative pl-5">
                    <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-[var(--gold)] shadow-[0_0_8px_var(--gold)]" />
                    <p className="text-[10px] text-neutral-400 mb-1">{formatDate(log.created_at)}</p>
                    <div className="bg-white/5 border border-white/5 p-3 rounded-lg">
                      <p className="text-[11px] font-bold text-[var(--gold)] mb-1">{log.projects?.name || 'Operasional Umum'}</p>
                      <p className="text-xs text-neutral-200 leading-relaxed">{log.description}</p>
                      <p className="text-[10px] text-neutral-500 mt-2 font-mono">Durasi: {log.duration_minutes} Menit</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}