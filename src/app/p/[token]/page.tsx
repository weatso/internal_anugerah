import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText, ExternalLink, CheckCircle2, Circle } from 'lucide-react'
import ClientBASTActions from './ClientBASTActions'

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function ClientPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const db = admin()

  const { data: project } = await db
    .from('projects')
    .select(`
      id, name, status, magic_link_active, spk_id,
      start_date, end_date, invoice_id, bast_url, bast_signed_at,
      client:clients ( company_name, pic_name ),
      invoice:commercial_documents!projects_invoice_id_fkey (
        id, doc_number, grand_total, status, doc_type, issue_date,
        entities ( name, primary_color, logo_key )
      )
    `)
    .eq('magic_link_token', token)
    .single()

  if (!project || !project.magic_link_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505]">
        <div className="text-center space-y-4 p-8 max-w-md">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
            <FileText className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-black text-white uppercase tracking-tight">Tautan Tidak Valid</h1>
          <p className="text-neutral-500 text-sm">Tautan ini tidak aktif atau tidak ditemukan. Silakan hubungi tim kami untuk mendapatkan tautan baru.</p>
        </div>
      </div>
    )
  }

  const { data: logs } = await db
    .from('workspace_logs')
    .select('*')
    .eq('project_id', project.id)
    .eq('visibility', 'CLIENT')        // kolom visibility: hanya CLIENT
    .neq('status', 'INTERNAL_ONLY')   // filter ganda: status juga dicek
    .order('created_at', { ascending: true })

  const { data: relatedInvoices } = await db
    .from('commercial_documents')
    .select('id, doc_number, title, grand_total, status, doc_type, issue_date, termin_name, parent_id')
    .or(`id.eq.${project.invoice_id},id.eq.${project.spk_id},parent_id.eq.${project.spk_id}`)
    .in('status', ['SENT', 'UNPAID', 'PAID', 'APPROVED'])
    .order('created_at', { ascending: true })

  const { data: tasks } = await db
    .from('project_tasks')
    .select('*')
    .eq('project_id', project.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  const entity = (project.invoice as any)?.entities || {}
  const client = project.client as any
  const invoice = project.invoice as any
  const accentColor = entity?.primary_color || '#D4AF37'

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
  const formatRupiah = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v)

  return (
    <div className="min-h-screen" style={{ background: '#070707', color: '#e5e5e5', fontFamily: 'system-ui, sans-serif' }}>
      {/* Hero Header */}
      <div className="border-b" style={{ borderColor: `${accentColor}20`, background: `${accentColor}08` }}>
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              {entity?.logo_key && (
                <img src={`/api/storage/file?key=${entity.logo_key}`} alt={entity?.name} className="h-10 object-contain" />
              )}
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: accentColor }}>{entity?.name || 'Anugerah Ventures'}</span>
            </div>
            <span className="text-[10px] text-neutral-600 font-mono uppercase">Client Portal</span>
          </div>

          <p className="text-xs uppercase tracking-widest font-bold mb-2" style={{ color: accentColor }}>Proyek Aktif</p>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-1">{project.name}</h1>
          <p className="text-neutral-500 text-sm">{client?.company_name} · PIC: {client?.pic_name}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { label: 'Status', value: project.status || 'ACTIVE' },
              { label: 'Mulai', value: formatDate(project.start_date) },
              { label: 'Selesai', value: formatDate(project.end_date) },
              { label: 'Nilai Proyek', value: invoice?.grand_total ? formatRupiah(invoice.grand_total) : '—' },
            ].map(item => (
              <div key={item.label} className="rounded-lg p-3" style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}20` }}>
                <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: accentColor }}>{item.label}</p>
                <p className="text-sm font-bold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
        {/* Progress Timeline */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: accentColor }}>
            Progress & Update Terkini
          </h2>
          {!logs || logs.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-dashed border-neutral-800">
              <p className="text-neutral-600 text-sm">Belum ada update yang dibagikan.</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px" style={{ background: `${accentColor}20` }} />
              <div className="space-y-6">
                {(logs as any[]).map((log, i) => (
                  <div key={log.id} className="flex gap-4 relative">
                    <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-black z-10"
                      style={{ background: i === logs.length - 1 ? accentColor : `${accentColor}20`, color: i === logs.length - 1 ? '#050505' : accentColor }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 pb-2">
                      <p className="font-bold text-white text-sm">{log.title}</p>
                      <p className="text-neutral-400 text-sm mt-1 leading-relaxed">{log.content}</p>
                      <p className="text-[11px] text-neutral-600 mt-2">
                        {formatDate(log.created_at)}
                        {log.deadline && ` · Deadline: ${formatDate(log.deadline)}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Download Invoices */}
        {(relatedInvoices && relatedInvoices.length > 0) && (
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: accentColor }}>Dokumen Invoicing</h2>
            <div className="space-y-3">
              {relatedInvoices.map((inv: any) => (
                <div key={inv.id} className="rounded-xl p-4 border flex items-center justify-between gap-4" style={{ background: `${accentColor}08`, borderColor: `${accentColor}25` }}>
                  <div>
                    <p className="font-bold text-white text-sm">{inv.doc_type} - {inv.termin_name || 'Dokumen Utama'}</p>
                    <p className="text-[11px] text-neutral-500 mt-1">No. {inv.doc_number} · Status: <span className="font-bold text-white">{inv.status}</span></p>
                  </div>
                  <a href={`/api/generate-pdf?id=${inv.id}&token=${token}`} target="_blank"
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 hover:opacity-90"
                    style={{ background: accentColor, color: '#050505' }}>
                    <FileText className="w-3.5 h-3.5" /> Lihat PDF
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BAST Upload Actions */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: accentColor }}>Serah Terima</h2>
          <ClientBASTActions project={project} accentColor={accentColor} />
        </div>

        {/* Tasks List */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: accentColor }}>Daftar Tugas (Tasks)</h2>
          {!tasks || tasks.length === 0 ? (
            <div className="text-center py-8 rounded-xl border border-dashed border-neutral-800">
              <p className="text-neutral-600 text-sm">Belum ada tugas yang diinput.</p>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-subtle)' }}>
              {tasks.map((task: any, i: number) => (
                <div key={task.id} className="flex items-start gap-4 p-4 border-b last:border-0" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                  {task.status === 'DONE' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-5 h-5 text-neutral-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-bold text-white" style={{ opacity: task.status === 'DONE' ? 0.6 : 1, textDecoration: task.status === 'DONE' ? 'line-through' : 'none' }}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-[11px] text-neutral-400 mt-1">{task.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-neutral-700 pb-4">
          Halaman ini dibuat secara otomatis oleh sistem {entity?.name || 'Anugerah Ventures'}.
          Hanya dapat diakses melalui tautan unik yang diberikan.
        </p>
      </div>
    </div>
  )
}
