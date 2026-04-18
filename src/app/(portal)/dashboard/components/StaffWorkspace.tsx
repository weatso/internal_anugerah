'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, ClipboardList, FileText, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { formatDate } from '@/lib/utils'
import { getEntityAccentColor, getDivisionConfig } from '@/lib/division-config'
import type { WorkspaceLog, Invoice } from '@/types'

export function StaffWorkspace() {
  const { profile, effectiveEntityId, effectiveEntity } = useUser()
  const supabase = createClient()

  const [myLogs, setMyLogs]       = useState<WorkspaceLog[]>([])
  const [myInvoices, setMyInvoices] = useState<Invoice[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (!effectiveEntityId || !profile?.id) return
    fetchData()
  }, [effectiveEntityId, profile?.id])

  async function fetchData() {
    setLoading(true)
    const [{ data: logs }, { data: invs }] = await Promise.all([
      supabase
        .from('workspace_logs')
        .select('*, entity:entities(*)')
        .eq('entity_id', effectiveEntityId!)
        .eq('created_by', profile!.id)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('invoices')
        .select('*')
        .eq('entity_id', effectiveEntityId!)
        .eq('created_by', profile!.id)
        .order('created_at', { ascending: false })
        .limit(5),
    ])
    setMyLogs((logs ?? []) as WorkspaceLog[])
    setMyInvoices((invs ?? []) as Invoice[])
    setLoading(false)
  }

  const accentColor = getEntityAccentColor(effectiveEntity)
  const config      = getDivisionConfig(effectiveEntity?.name)
  const firstName   = profile?.full_name.split(' ')[0] ?? ''

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
          <span className="text-xl">{config.emoji}</span>
          <p className="text-xs uppercase tracking-[0.3em] font-bold" style={{ color: accentColor }}>
            Staff · {effectiveEntity?.name ?? 'Divisi'}
          </p>
        </div>
        <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight">
          Halo, <span style={{ color: accentColor }}>{firstName}</span> 👋
        </h1>
        <p className="text-[--color-text-muted] text-sm mt-1">
          Kelola tugas dan laporan harian kamu di sini.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3 flex-wrap">
        <Link href="/workspace/create"
          className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-md transition-all hover:opacity-80"
          style={{ background: accentColor, color: '#050505' }}>
          <Plus className="w-4 h-4" /> Buat Log Baru
        </Link>
        <Link href="/invoicing/create"
          className="flex items-center gap-2 border text-[--color-text-secondary] text-sm font-bold px-4 py-2.5 rounded-md hover:text-[--color-text-primary] hover:bg-white/5 transition-colors"
          style={{ borderColor: `${accentColor}30` }}>
          <Plus className="w-4 h-4" /> Buat Invoice
        </Link>
      </div>

      {/* Recent Logs */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[--color-border]">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" style={{ color: accentColor }} />
            <h2 className="text-[--color-text-primary] font-bold text-sm">Log Saya</h2>
          </div>
          <Link href="/workspace" className="text-xs font-semibold hover:underline" style={{ color: accentColor }}>
            Lihat semua
          </Link>
        </div>
        {myLogs.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-[--color-text-muted] text-sm">Belum ada log.</p>
            <Link href="/workspace/create" className="text-xs font-semibold mt-2 inline-flex items-center gap-1 hover:underline" style={{ color: accentColor }}>
              Buat yang pertama <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[--color-border]">
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

      {/* Recent Invoices */}
      {myInvoices.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[--color-border]">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: accentColor }} />
              <h2 className="text-[--color-text-primary] font-bold text-sm">Invoice Saya</h2>
            </div>
            <Link href="/invoicing" className="text-xs font-semibold hover:underline" style={{ color: accentColor }}>
              Lihat semua
            </Link>
          </div>
          <div className="divide-y divide-[--color-border]">
            {myInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-[--color-text-primary] text-sm font-medium">{inv.client_name}</p>
                  <p className="text-[--color-text-muted] text-xs mt-0.5">{inv.invoice_number ?? 'Draft'}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${{
                  PENDING_APPROVAL: 'text-amber-400 border-amber-400/20 bg-amber-400/10',
                  APPROVED:         'text-emerald-400 border-emerald-400/20 bg-emerald-400/10',
                  SENT:             'text-blue-400 border-blue-400/20 bg-blue-400/10',
                }[inv.status]}`}>
                  {inv.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
