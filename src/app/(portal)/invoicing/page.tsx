import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatRupiah } from '@/lib/utils'
import { Plus, Receipt, Globe, Search, Filter } from 'lucide-react'
import InvoicingClientActions from './InvoicingClientActions'
import CommercialListClient from './CommercialListClient'

export default async function CommercialHubPage() {
  const cookieStore = await cookies()
  const activeEntityId = cookieStore.get('active_entity_id')?.value
  const activeRole = cookieStore.get('active_role')?.value?.toUpperCase() || 'STAFF'

  if (!activeEntityId) {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  const { data: entity } = await supabase
    .from('entities')
    .select('name')
    .eq('id', activeEntityId)
    .single()

  const isCEO = activeRole === 'CEO'
  const isHolding = entity?.name?.toLowerCase().includes('anugerah') || entity?.name?.toLowerCase().includes('holding')

  // Ambil semua entitas untuk filter
  const { data: allEntities } = await supabase.from('entities').select('id, name').order('name')

  let query = supabase
    .from('commercial_documents')
    .select('*, client:clients(company_name), entity:entities(name)')
    .order('created_at', { ascending: false })

  if (!(isCEO && isHolding)) {
    query = query.eq('entity_id', activeEntityId)
  }

  const { data: docs } = await query

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
  const canEditRoles = ['CEO', 'HEAD'].includes(activeRole)

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

      {/* Client Component handles filtering + list rendering */}
      <CommercialListClient
        docs={docs || []}
        bankAccounts={bankAccounts || []}
        allEntities={allEntities || []}
        isCEOOrFinance={isCEOOrFinance}
        canEditRoles={canEditRoles}
        isHolding={isCEO && isHolding}
      />
    </div>
  )
}