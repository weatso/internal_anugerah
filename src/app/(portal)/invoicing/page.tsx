import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatRupiah } from '@/lib/utils'
import { Plus, Receipt, Globe } from 'lucide-react'
import InvoicingClientActions from './InvoicingClientActions'

export default async function CommercialHubPage() {
  const cookieStore = await cookies()
  const activeEntityId = cookieStore.get('active_entity_id')?.value
  const activeRole = cookieStore.get('active_role')?.value?.toUpperCase() || 'STAFF'

  if (!activeEntityId) {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  // Ambil Entitas Aktif
  const { data: entity } = await supabase
    .from('entities')
    .select('name')
    .eq('id', activeEntityId)
    .single()

  const isCEO = activeRole === 'CEO'
  // Deteksi apakah entitas saat ini adalah Holding / Anugerah
  const isHolding = entity?.name?.toLowerCase().includes('anugerah') || entity?.name?.toLowerCase().includes('holding')

  // LOGIKA HELICOPTER VIEW: Jika CEO berada di Holding, tarik semua data komersial dari semua divisi.
  let query = supabase
    .from('commercial_documents')
    .select('*, client:clients(company_name), entity:entities(name)')
    .order('created_at', { ascending: false })

  // Jika BUKAN CEO di Holding, kunci ketat data berdasarkan divisinya (Zero-Trust)
  if (!(isCEO && isHolding)) {
    query = query.eq('entity_id', activeEntityId)
  }

  const { data: docs } = await query

  // Ambil Rekening Bank (Tarik semua bank jika CEO di Holding agar bisa bayar invoice Weatso dari dasbor Anugerah)
  let bankQuery = supabase
    .from('chart_of_accounts')
    .select('id, account_name, entity:entities(name)')
    .eq('is_bank', true)
    .eq('is_active', true)

  if (!(isCEO && isHolding)) {
    bankQuery = bankQuery.eq('entity_id', activeEntityId)
  }
  const { data: bankAccounts } = await bankQuery

  const isCEOOrFinance = ['CEO', 'FINANCE'].includes(activeRole)

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 animate-[slide-up_0.4s_ease]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold mb-1 text-[#D4AF37]">Commercial Hub</p>
          <h1 className="text-2xl font-black tracking-tight text-[--color-text-primary]">Daftar Dokumen Komersial</h1>
          <p className="text-sm mt-1 text-[--color-text-muted] flex items-center gap-2">
            Kapasitas Aktif: 
            <span className="font-bold text-[--color-text-primary]">{entity?.name || 'Unknown'}</span>
            {isCEO && isHolding && (
              <span className="text-[9px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded uppercase tracking-widest font-bold border border-blue-500/20">
                Holding View Active
              </span>
            )}
          </p>
        </div>
        <Link 
          href="/invoicing/create" 
          className="flex items-center gap-2 font-bold px-4 py-2.5 rounded-md text-sm transition-all uppercase tracking-widest hover:opacity-90 bg-[#D4AF37] text-[#050505]"
        >
          <Plus className="w-4 h-4" /> Buat Dokumen Baru
        </Link>
      </div>

      {/* Document List */}
      <div className="glass-card overflow-hidden border border-white/5">
        {!docs || docs.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="w-10 h-10 mx-auto mb-3 opacity-20 text-white" />
            <p className="text-sm text-[--color-text-muted]">Belum ada dokumen yang diterbitkan.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {docs.map(doc => {
              const canConvert = doc.doc_type === 'QUOTATION' || doc.doc_type === 'SPK' || doc.doc_type === 'PROFORMA'
              const canPay = doc.doc_type === 'INVOICE' && doc.status !== 'PAID'
              
              return (
                <div key={doc.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.015] transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-[#D4AF37]/50 text-[#D4AF37] bg-[#D4AF37]/10">
                        {doc.doc_type}
                      </span>
                      {/* Lencana Identitas Divisi (Hanya muncul jika di Helicopter View) */}
                      {isCEO && isHolding && doc.entity?.name && (
                        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-blue-500/30 text-blue-400 bg-blue-500/10 flex items-center gap-1">
                          <Globe className="w-3 h-3" /> {doc.entity.name}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-[--color-text-muted]">{doc.doc_number}</span>
                    </div>
                    <p className="font-bold text-base text-[--color-text-primary] mt-1">{doc.title}</p>
                    <p className="text-xs mt-1 text-[--color-text-muted]">
                      Klien: {doc.client?.company_name} · Terbit: {new Date(doc.issue_date).toLocaleDateString('id-ID')}
                    </p>
                  </div>
                  
                  <div className="text-left md:text-right shrink-0">
                    <p className="font-black font-mono text-lg text-[--color-text-primary]">{formatRupiah(doc.grand_total)}</p>
                    <p className="text-[10px] uppercase font-bold tracking-widest mt-1" 
                      style={{ color: doc.status === 'PAID' ? '#10b981' : doc.status === 'DRAFT' ? 'var(--text-muted)' : '#f59e0b' }}>
                      STATUS: {doc.status}
                    </p>
                  </div>

                  <div className="shrink-0 mt-3 md:mt-0 border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-4">
                    <InvoicingClientActions 
                      doc={doc} 
                      canConvert={canConvert} 
                      canPay={canPay} 
                      isCEOOrFinance={isCEOOrFinance} 
                      bankAccounts={bankAccounts || []} 
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}