'use client'

import { useState, useMemo } from 'react'
import { formatRupiah } from '@/lib/utils'
import { Globe, Receipt, Search, X } from 'lucide-react'
import InvoicingClientActions from './InvoicingClientActions'

const DOC_TYPES = ['QUOTATION', 'SPK', 'INVOICE', 'RECEIPT', 'CR']
const STATUSES   = ['DRAFT', 'APPROVED', 'UNPAID', 'PAID', 'CANCELLED']

const STATUS_COLOR: Record<string, string> = {
  PAID:      '#10b981',
  DRAFT:     'var(--text-muted)',
  APPROVED:  '#3b82f6',
  UNPAID:    '#f59e0b',
  CANCELLED: '#ef4444',
}

interface Props {
  docs: any[]
  bankAccounts: any[]
  allEntities: any[]
  isCEOOrFinance: boolean
  canEditRoles: boolean
  isHolding: boolean
}

export default function CommercialListClient({
  docs, bankAccounts, allEntities, isCEOOrFinance, canEditRoles, isHolding,
}: Props) {
  const [search, setSearch]       = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterEntity, setFilterEntity] = useState('')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')

  const filtered = useMemo(() => {
    return docs.filter(doc => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        doc.doc_number?.toLowerCase().includes(q) ||
        doc.title?.toLowerCase().includes(q) ||
        doc.client?.company_name?.toLowerCase().includes(q)

      const matchType   = !filterType   || doc.doc_type === filterType
      const matchStatus = !filterStatus || doc.status === filterStatus
      const matchEntity = !filterEntity || doc.entity_id === filterEntity

      const issueDate = doc.issue_date ? new Date(doc.issue_date) : null
      const matchFrom = !dateFrom || (issueDate && issueDate >= new Date(dateFrom))
      const matchTo   = !dateTo   || (issueDate && issueDate <= new Date(dateTo))

      return matchSearch && matchType && matchStatus && matchEntity && matchFrom && matchTo
    })
  }, [docs, search, filterType, filterStatus, filterEntity, dateFrom, dateTo])

  const hasFilter = search || filterType || filterStatus || filterEntity || dateFrom || dateTo

  function clearFilters() {
    setSearch(''); setFilterType(''); setFilterStatus('')
    setFilterEntity(''); setDateFrom(''); setDateTo('')
  }

  return (
    <div className="space-y-4">
      {/* ─── Filter Bar ────────────────────────────────────────────────── */}
      <div className="glass-card p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-md outline-none input-field"
            placeholder="Cari no. dokumen, judul proyek, atau nama klien..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap gap-2">
          {/* Tipe Dokumen */}
          <select
            className="select-field text-xs px-3 py-2 rounded-md"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="">Semua Tipe</option>
            {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          {/* Status */}
          <select
            className="select-field text-xs px-3 py-2 rounded-md"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">Semua Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Divisi (hanya jika holding/CEO) */}
          {isHolding && (
            <select
              className="select-field text-xs px-3 py-2 rounded-md"
              value={filterEntity}
              onChange={e => setFilterEntity(e.target.value)}
            >
              <option value="">Semua Divisi</option>
              {allEntities.map(en => <option key={en.id} value={en.id}>{en.name}</option>)}
            </select>
          )}

          {/* Date Range */}
          <div className="flex items-center gap-1">
            <input type="date" className="input-field text-xs px-2 py-2 rounded-md"
              value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
            <input type="date" className="input-field text-xs px-2 py-2 rounded-md"
              value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>

          {/* Clear */}
          {hasFilter && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 text-xs px-3 py-2 rounded-md font-bold transition-colors"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
              <X className="w-3 h-3" /> Reset
            </button>
          )}
        </div>

        {/* Result count */}
        <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
          Menampilkan <span className="font-bold" style={{ color: 'var(--gold)' }}>{filtered.length}</span> dari {docs.length} dokumen
        </p>
      </div>

      {/* ─── Document List ─────────────────────────────────────────────── */}
      <div className="glass-card overflow-hidden border border-white/5">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Receipt className="w-10 h-10 mx-auto mb-3 opacity-20 text-white" />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {hasFilter ? 'Tidak ada dokumen yang cocok dengan filter.' : 'Belum ada dokumen yang diterbitkan.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map(doc => {
              const isPaid    = doc.status === 'PAID'
              const isUnpaid  = doc.status === 'UNPAID'
              // Bisa convert: QUO→SPK, SPK→INV (bukan PROFORMA)
              const canConvert = (doc.doc_type === 'QUOTATION' || doc.doc_type === 'SPK') && !isPaid
              const canPay    = doc.doc_type === 'INVOICE' && isUnpaid
              // Edit: semua status kecuali PAID dan UNPAID
              const canEdit   = canEditRoles && !isPaid && !isUnpaid

              return (
                <div key={doc.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.015] transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-[#D4AF37]/50 text-[#D4AF37] bg-[#D4AF37]/10">
                        {doc.doc_type}
                      </span>
                      {isHolding && doc.entity?.name && (
                        <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border border-blue-500/30 text-blue-400 bg-blue-500/10 flex items-center gap-1">
                          <Globe className="w-3 h-3" /> {doc.entity.name}
                        </span>
                      )}
                      {doc.termin_name && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase"
                          style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316' }}>
                          {doc.termin_name}
                        </span>
                      )}
                      <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{doc.doc_number}</span>
                    </div>
                    <p className="font-bold text-base text-[--color-text-primary] mt-1">{doc.title}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Klien: {doc.client?.company_name || '—'} · Terbit: {new Date(doc.issue_date).toLocaleDateString('id-ID')}
                    </p>
                  </div>

                  <div className="text-left md:text-right shrink-0">
                    <p className="font-black font-mono text-lg text-[--color-text-primary]">{formatRupiah(doc.grand_total)}</p>
                    <p className="text-[10px] uppercase font-bold tracking-widest mt-1"
                      style={{ color: STATUS_COLOR[doc.status] || 'var(--text-muted)' }}>
                      STATUS: {doc.status}
                    </p>
                  </div>

                  <div className="shrink-0 mt-3 md:mt-0 border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-4">
                    <InvoicingClientActions
                      doc={doc}
                      canConvert={canConvert}
                      canPay={canPay}
                      canEdit={canEdit}
                      isCEOOrFinance={isCEOOrFinance}
                      bankAccounts={bankAccounts}
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
