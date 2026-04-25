'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, Palette, FolderOpen, ArrowRight, Image as ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { formatDate } from '@/lib/utils'
import { getEntityAccentColor, getDivisionConfig } from '@/lib/division-config'
import type { WorkspaceLog, SalesKitItem } from '@/types'

export function DesignCommandCenter() {
  const { profile, effectiveEntityId, effectiveEntity } = useUser()
  const supabase = createClient()

  const [myLogs, setMyLogs] = useState<WorkspaceLog[]>([])
  const [recentAssets, setRecentAssets] = useState<SalesKitItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!effectiveEntityId || !profile?.id) return
    fetchData()
  }, [effectiveEntityId, profile?.id])

  async function fetchData() {
    setLoading(true)
    const [{ data: logs }, { data: assets }] = await Promise.all([
      supabase
        .from('workspace_logs')
        .select('*, entity:entities(*)')
        .eq('entity_id', effectiveEntityId!)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('sales_kit_items')
        .select('*')
        .eq('entity_id', effectiveEntityId!)
        .order('created_at', { ascending: false })
        .limit(5),
    ])
    setMyLogs((logs ?? []) as WorkspaceLog[])
    setRecentAssets((assets ?? []) as SalesKitItem[])
    setLoading(false)
  }

  const accentColor = getEntityAccentColor(effectiveEntity)
  const config = getDivisionConfig(effectiveEntity?.name)
  const firstName = profile?.full_name.split(' ')[0] ?? ''

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: accentColor, borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className="p-4 md:p-6 lg:p-8 space-y-6"
    >
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🎨</span>
          <p className="text-xs uppercase tracking-[0.3em] font-bold" style={{ color: accentColor }}>
            Design & Content · {effectiveEntity?.name ?? 'Divisi'}
          </p>
        </div>
        <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight">
          Halo, <span style={{ color: accentColor }}>{firstName}</span> ✨
        </h1>
        <p className="text-[--color-text-muted] text-sm mt-1">
          Kelola aset kreatif dan daftar tugas konten harian di sini.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 flex-wrap">
        <Link href="/workspace/create"
          className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-md transition-all hover:opacity-80"
          style={{ background: accentColor, color: '#050505' }}>
          <Plus className="w-4 h-4" /> Tambah Tugas Konten
        </Link>
        <Link href="/sales-kit/upload"
          className="flex items-center gap-2 border text-[--color-text-secondary] text-sm font-bold px-4 py-2.5 rounded-md hover:text-[--color-text-primary] hover:bg-white/5 transition-colors"
          style={{ borderColor: `${accentColor}30` }}>
          <Plus className="w-4 h-4" /> Upload Aset Kreatif
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Design Logs */}
        <div className="glass-card overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[--color-border]">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4" style={{ color: accentColor }} />
              <h2 className="text-[--color-text-primary] font-bold text-sm">Tugas Desain & Konten</h2>
            </div>
            <Link href="/workspace" className="text-xs font-semibold hover:underline" style={{ color: accentColor }}>
              Lihat semua
            </Link>
          </div>
          {myLogs.length === 0 ? (
            <div className="py-10 text-center flex-1 flex flex-col justify-center">
              <p className="text-[--color-text-muted] text-sm">Belum ada tugas desain.</p>
              <Link href="/workspace/create" className="text-xs font-semibold mt-2 inline-flex items-center justify-center gap-1 hover:underline" style={{ color: accentColor }}>
                Buat log baru <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[--color-border] flex-1">
              {myLogs.map((log) => (
                <Link key={log.id} href={`/workspace/${log.id}`}
                  className="flex items-start justify-between px-5 py-3 hover:bg-white/[0.015] transition-colors group">
                  <div className="min-w-0 flex-1">
                    <p className="text-[--color-text-primary] text-sm font-medium truncate group-hover:text-white transition-colors">{log.title}</p>
                    <p className="text-[--color-text-muted] text-xs mt-0.5">{formatDate(log.created_at)}</p>
                  </div>
                  <span className={`ml-4 shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${{
                    SUBMITTED: 'text-amber-400 border-amber-400/20 bg-amber-400/10',
                    REVIEWED_BY_CEO: 'text-emerald-400 border-emerald-400/20 bg-emerald-400/10',
                    NEEDS_ACTION: 'text-red-400 border-red-400/20 bg-red-400/10',
                  }[log.status]}`}>
                    {log.status.replace('_', ' ')}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Assets */}
        <div className="glass-card overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[--color-border]">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" style={{ color: accentColor }} />
              <h2 className="text-[--color-text-primary] font-bold text-sm">Aset Kreatif Terbaru</h2>
            </div>
            <Link href="/sales-kit" className="text-xs font-semibold hover:underline" style={{ color: accentColor }}>
              Buka Sales Kit
            </Link>
          </div>
          {recentAssets.length === 0 ? (
            <div className="py-10 text-center flex-1 flex flex-col justify-center">
              <p className="text-[--color-text-muted] text-sm">Belum ada aset terbaru.</p>
              <Link href="/sales-kit/upload" className="text-xs font-semibold mt-2 inline-flex items-center justify-center gap-1 hover:underline" style={{ color: accentColor }}>
                Upload aset <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[--color-border] flex-1">
              {recentAssets.map((asset) => (
                <div key={asset.id} className="flex items-center justify-between px-5 py-3 group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center shrink-0 text-gray-400 group-hover:text-white transition-colors">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[--color-text-primary] text-sm font-medium truncate">{asset.title}</p>
                      <p className="text-[--color-text-muted] text-xs mt-0.5 capitalize">{asset.category.replace('_', ' ')}</p>
                    </div>
                  </div>
                  {asset.file_size && (
                    <span className="text-[--color-text-muted] text-xs tabular-nums ml-4 shrink-0">
                      {(asset.file_size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}