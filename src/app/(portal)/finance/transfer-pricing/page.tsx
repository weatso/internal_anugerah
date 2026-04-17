'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { formatRupiah, formatDate, getStatusColor, getStatusLabel, cn } from '@/lib/utils'
import { Plus, CheckCircle, Loader2, ArrowRight, X } from 'lucide-react'
import type { Entity, InternalBilling, Transaction } from '@/types'

export default function TransferPricingPage() {
  const { profile } = useUser()
  const supabase = createClient()
  const [billings, setBillings] = useState<InternalBilling[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [holdingTx, setHoldingTx] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form
  const [sourceTxId, setSourceTxId] = useState('')
  const [allocations, setAllocations] = useState<{ entity_id: string; amount: string }[]>([])

  async function fetchData() {
    setLoading(true)
    const [{ data: b }, { data: e }, { data: htx }] = await Promise.all([
      supabase.from('internal_billings').select('*, from_entity_data:entities!internal_billings_from_entity_fkey(id,name,type,logo_key,primary_color), to_entity_data:entities!internal_billings_to_entity_fkey(id,name,type,logo_key,primary_color)').order('created_at', { ascending: false }),
      supabase.from('entities').select('*'),
      supabase.from('transactions').select('*').eq('entity_id', (await supabase.from('entities').select('id').eq('type', 'HOLDING').single()).data?.id ?? '').order('created_at', { ascending: false }).limit(20),
    ])
    setBillings((b ?? []) as InternalBilling[])
    setEntities((e ?? []).filter(en => en.type === 'DIVISION') as Entity[])
    setHoldingTx((htx ?? []) as Transaction[])
    setLoading(false)
  }

  useEffect(() => { if (profile) fetchData() }, [profile])

  function addAllocation() {
    setAllocations(a => [...a, { entity_id: '', amount: '' }])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !sourceTxId) return
    setSubmitting(true)

    const holdingEntity = entities.find(() => true) // will be replaced with actual holding id
    const { data: holdingData } = await supabase.from('entities').select('id').eq('type', 'HOLDING').single()

    const rows = allocations.filter(a => a.entity_id && a.amount).map(a => ({
      source_transaction_id: sourceTxId || null,
      from_entity: holdingData?.id,
      to_entity: a.entity_id,
      amount: Number(a.amount.replace(/\D/g, '')),
      status: 'PENDING',
      description: `Transfer pricing dari transaksi holding`,
    }))

    await supabase.from('internal_billings').insert(rows)
    setShowForm(false)
    setAllocations([])
    setSourceTxId('')
    setSubmitting(false)
    fetchData()
  }

  async function handleApprove(billing: InternalBilling) {
    // 1. Update status
    await supabase.from('internal_billings').update({
      status: 'APPROVED',
      approved_at: new Date().toISOString(),
      approved_by: profile!.id,
    }).eq('id', billing.id)

    // 2. Inject expense ke divisi yang ditagih
    await supabase.from('transactions').insert({
      entity_id: billing.to_entity,
      type: 'EXPENSE',
      amount: billing.amount,
      category: 'Transfer Pricing',
      description: billing.description,
      source_billing_id: billing.id,
      created_by: profile!.id,
    })

    fetchData()
  }

  const isCeoOrFinance = profile?.role === 'CEO' || profile?.role === 'FINANCE'

  return (
    <div className="p-6 md:p-8 space-y-6 animate-[slide-up_0.4s_ease]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[#D4AF37] text-xs uppercase tracking-[0.3em] font-bold mb-1">Finance</p>
          <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight">Transfer Pricing</h1>
          <p className="text-[--color-text-muted] text-sm mt-1">Alokasikan biaya Holding ke divisi secara terstruktur.</p>
        </div>
        {isCeoOrFinance && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-[#D4AF37] text-[#050505] font-bold px-4 py-2 rounded-md text-sm hover:bg-[#F5D678] transition-colors">
            <Plus className="w-4 h-4" /> Buat Alokasi
          </button>
        )}
      </div>

      {/* Billings list */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" /></div>
        ) : billings.length === 0 ? (
          <div className="py-16 text-center text-[--color-text-muted] text-sm">Belum ada transfer pricing.</div>
        ) : (
          <div className="divide-y divide-[--color-border]">
            {billings.map(b => (
              <div key={b.id} className="flex items-center justify-between px-5 py-4 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="text-center text-xs text-[--color-text-muted] shrink-0">
                    <p className="font-semibold text-[--color-text-secondary]">{b.from_entity_data?.name ?? '—'}</p>
                    <ArrowRight className="w-3 h-3 mx-auto my-1 text-[#D4AF37]" />
                    <p className="font-semibold text-[--color-text-secondary]">{b.to_entity_data?.name ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-[--color-text-primary] font-bold">{formatRupiah(b.amount)}</p>
                    <p className="text-[--color-text-muted] text-xs">{b.description ?? '—'} · {formatDate(b.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={cn('px-2 py-1 rounded border text-xs font-bold uppercase', getStatusColor(b.status))}>
                    {getStatusLabel(b.status)}
                  </span>
                  {b.status === 'PENDING' && profile?.role === 'CEO' && (
                    <button onClick={() => handleApprove(b)}
                      className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 border border-emerald-400/20 px-3 py-1.5 rounded-md hover:bg-emerald-400/5 transition-all">
                      <CheckCircle className="w-3 h-3" /> Approve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[--color-text-primary] font-bold">Buat Transfer Pricing</h2>
              <button onClick={() => setShowForm(false)} className="text-[--color-text-muted] hover:text-[--color-text-primary]"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">Transaksi Induk Holding (opsional)</label>
                <select value={sourceTxId} onChange={e => setSourceTxId(e.target.value)}
                  className="w-full bg-[--color-bg-card] border border-[--color-border] rounded-md px-4 py-2.5 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50">
                  <option value="">— Tanpa referensi transaksi —</option>
                  {holdingTx.map(tx => (
                    <option key={tx.id} value={tx.id}>{tx.category} – {formatRupiah(tx.amount)} – {formatDate(tx.created_at)}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[--color-text-muted] text-xs uppercase tracking-widest">Alokasi ke Divisi</label>
                  <button type="button" onClick={addAllocation} className="text-[#D4AF37] text-xs hover:underline">+ Tambah Divisi</button>
                </div>
                {allocations.map((alloc, i) => (
                  <div key={i} className="flex gap-3 mb-2">
                    <select value={alloc.entity_id} onChange={e => setAllocations(a => a.map((x, j) => j === i ? { ...x, entity_id: e.target.value } : x))}
                      className="flex-1 bg-[--color-bg-card] border border-[--color-border] rounded-md px-3 py-2 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50">
                      <option value="">Pilih divisi</option>
                      {entities.map(en => <option key={en.id} value={en.id}>{en.name}</option>)}
                    </select>
                    <input type="text" placeholder="nominal" value={alloc.amount}
                      onChange={e => setAllocations(a => a.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))}
                      className="w-36 bg-white/[0.04] border border-[--color-border] rounded-md px-3 py-2 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50"
                    />
                    <button type="button" onClick={() => setAllocations(a => a.filter((_, j) => j !== i))} className="text-[--color-text-muted] hover:text-red-400"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                {allocations.length === 0 && <p className="text-[--color-text-muted] text-xs">Klik "+ Tambah Divisi" untuk memulai.</p>}
              </div>
              <button type="submit" disabled={submitting || allocations.length === 0}
                className="w-full bg-[#D4AF37] text-[#050505] font-bold py-3 rounded-md text-sm hover:bg-[#F5D678] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : 'Submit Transfer Pricing'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
