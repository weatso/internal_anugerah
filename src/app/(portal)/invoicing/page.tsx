import { cookies } from 'next/headers'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server' // DIPERBAIKI: menggunakan createClient
import { formatRupiah } from '@/lib/utils'
import { Plus, FileText, FileSignature, Receipt, CheckCircle, AlertCircle } from 'lucide-react'
import InvoicingClientActions from './InvoicingClientActions'

// Konfigurasi Visual Status
const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-white/10 text-neutral-400',
  SENT: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  APPROVED: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  UNPAID: 'bg-red-500/10 text-red-400 border border-red-500/20',
  PAID: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
}

export default async function CommercialHubPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }> | { tab?: string }
}) {
  const resolvedParams = await searchParams
  const currentTab = resolvedParams?.tab || 'QUOTATION'

  const cookieStore = await cookies()
  const activeEntityId = cookieStore.get('active_entity_id')?.value
  const activeRole = cookieStore.get('active_role')?.value

  if (!activeEntityId) {
    return <div className="flex h-screen items-center justify-center text-[var(--gold)] animate-pulse">Menyelaraskan Konteks Divisi...</div>
  }

  // DIPERBAIKI: Pemanggilan fungsi async yang tepat dari server.ts Anda
  const supabase = await createClient()

  // TARIK DATA DOKUMEN DAN BANK SEKALIGUS
  const [docsResponse, banksResponse] = await Promise.all([
    supabase
      .from('commercial_documents')
      .select(`
        *,
        clients(company_name, pic_name),
        entities(name)
      `)
      .eq('entity_id', activeEntityId)
      .order('created_at', { ascending: false }),
    supabase
      .from('chart_of_accounts')
      .select('id, account_name')
      .eq('is_bank', true)
      .eq('is_active', true)
  ])

  const documents = docsResponse.data || []
  const bankAccounts = banksResponse.data || []

  // Arsitektur Tab yang Benar secara Bisnis
  const TABS = [
    { id: 'QUOTATION', label: 'Penawaran', icon: FileText },
    { id: 'SPK', label: 'SPK / Kontrak', icon: FileSignature },
    { id: 'PROFORMA', label: 'Proforma DP', icon: AlertCircle },
    { id: 'INVOICE', label: 'Tagihan Aktif', icon: Receipt },
    { id: 'RECEIPT', label: 'Lunas / Kwitansi', icon: CheckCircle },
  ]

  // DIPERBAIKI: Menyuntikkan tipe (d: any)
  const filteredDocs = documents.filter((d: any) => d.doc_type === currentTab)

  const isCEOOrFinance = ['CEO', 'FINANCE'].includes(activeRole || '')
  
  const canConvert = (doc: any) => ['SPK', 'PROFORMA'].includes(doc.doc_type) && doc.status !== 'PAID'
  const canPay = (doc: any) => doc.doc_type === 'INVOICE' && doc.status !== 'PAID'

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold mb-2" style={{ color: 'var(--gold)' }}>Commercial Hub</p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter" style={{ color: 'var(--text-primary)' }}>Arus Kas Komersial</h1>
        </div>
        
        {['CEO', 'HEAD', 'FINANCE'].includes(activeRole || '') && (
          <Link href="/invoicing/create" 
            className="group flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-bold transition-all relative overflow-hidden"
            style={{ background: 'var(--gold)', color: '#050505' }}>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <Plus className="w-4 h-4 relative z-10" /> 
            <span className="relative z-10 tracking-wide uppercase text-xs">Buat Dokumen</span>
          </Link>
        )}
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex flex-wrap md:flex-nowrap gap-1 p-1.5 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
        {TABS.map(tab => {
          // DIPERBAIKI: Menyuntikkan tipe (d: any)
          const count = documents.filter((d: any) => d.doc_type === tab.id).length
          const isActive = currentTab === tab.id
          
          return (
            <Link key={tab.id} href={`/invoicing?tab=${tab.id}`}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition-all duration-300 ${isActive ? 'shadow-lg' : 'hover:bg-white/5'}`}
              style={isActive 
                ? { background: 'var(--gold)', color: '#050505' } 
                : { color: 'var(--text-muted)' }
              }>
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {count > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-black"
                  style={{ background: isActive ? 'rgba(0,0,0,0.2)' : 'var(--border-subtle)' }}>
                  {count}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* TABLE DATA */}
      <div className="rounded-xl border overflow-hidden shadow-2xl relative" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-30" />
        
        {filteredDocs.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
              <FileText className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="font-medium text-lg tracking-wide" style={{ color: 'var(--text-primary)' }}>Arsip Kosong</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Tidak ada dokumen {currentTab} di divisi ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-[10px] uppercase tracking-[0.2em] font-bold bg-black/40"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                <tr>
                  <th className="px-6 py-5 whitespace-nowrap">No. Dokumen</th>
                  <th className="px-6 py-5">Klien & Proyek</th>
                  {currentTab === 'INVOICE' && <th className="px-6 py-5">Termin</th>}
                  <th className="px-6 py-5 text-right whitespace-nowrap">Nilai (Rp)</th>
                  <th className="px-6 py-5 text-center">Status</th>
                  <th className="px-6 py-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {/* DIPERBAIKI: Menyuntikkan tipe (doc: any) */}
                {filteredDocs.map((doc: any) => (
                  <tr key={doc.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-mono text-xs font-bold tracking-wide" style={{ color: 'var(--gold)' }}>{doc.doc_number}</p>
                      <p className="text-[10px] mt-1 uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                        {new Date(doc.issue_date).toLocaleDateString('id-ID')}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-[13px] tracking-wide" style={{ color: 'var(--text-primary)' }}>
                        {doc.clients?.company_name || doc.clients?.pic_name}
                      </p>
                      <p className="text-[11px] mt-1 line-clamp-1 max-w-[250px]" style={{ color: 'var(--text-muted)' }}>{doc.title}</p>
                    </td>
                    
                    {currentTab === 'INVOICE' && (
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-[4px] text-[10px] font-bold uppercase tracking-wider" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
                          {doc.termin_name || 'Pelunasan'}
                        </span>
                      </td>
                    )}

                    <td className="px-6 py-4 text-right">
                      <p className="font-mono font-bold text-[13px] tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        {formatRupiah(doc.grand_total)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-sm text-[9px] uppercase tracking-widest font-bold ${STATUS_STYLE[doc.status] || 'bg-white/5 text-neutral-400'}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <InvoicingClientActions 
                        doc={doc} 
                        canConvert={canConvert(doc)} 
                        canPay={canPay(doc)} 
                        isCEOOrFinance={isCEOOrFinance}
                        bankAccounts={bankAccounts}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}