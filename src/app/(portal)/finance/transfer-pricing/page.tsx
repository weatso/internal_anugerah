'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { formatRupiah, formatDate, getStatusColor, getStatusLabel, cn } from '@/lib/utils'
import { Plus, CheckCircle, Loader2, ArrowRight, X } from 'lucide-react'
import type { Entity, InternalBilling, ChartOfAccount } from '@/types'
import { toast } from 'sonner'

export default function TransferPricingPage() {
  const { profile, highestRole } = useUser()
  const supabase = createClient()
  
  const [billings, setBillings] = useState<InternalBilling[]>([])
  const [entities, setEntities] = useState<Entity[]>([])
  const [expenseAccounts, setExpenseAccounts] = useState<ChartOfAccount[]>([])
  const [revenueAccounts, setRevenueAccounts] = useState<ChartOfAccount[]>([])
  const [loading, setLoading] = useState(true)
  
  // UI states
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<string>('')

  // Form
  const [allocations, setAllocations] = useState<{ entity_id: string; amount: string; description: string }[]>([])

  async function fetchData() {
    setLoading(true)
    const [{ data: b }, { data: e }, { data: accs }] = await Promise.all([
      supabase.from('internal_billings').select('*, from_entity_data:entities!internal_billings_from_entity_id_fkey(id,name,type), to_entity_data:entities!internal_billings_to_entity_id_fkey(id,name,type)').order('created_at', { ascending: false }),
      supabase.from('entities').select('*'),
      supabase.from('chart_of_accounts').select('*').in('account_class', ['EXPENSE', 'COGS', 'REVENUE']).eq('is_active', true)
    ])
    
    // Filter billings based on role
    let filteredBillings = (b || []) as InternalBilling[]
    if (highestRole === 'HEAD') {
      filteredBillings = filteredBillings.filter(x => x.to_entity_id === profile?.entity_id || x.from_entity_id === profile?.entity_id)
    } else if (highestRole !== 'CEO' && highestRole !== 'FINANCE') {
      filteredBillings = []
    }

    setBillings(filteredBillings)
    setEntities((e ?? []) as Entity[])
    setExpenseAccounts((accs || []).filter(a => a.account_class === 'EXPENSE' || a.account_class === 'COGS'))
    setRevenueAccounts((accs || []).filter(a => a.account_class === 'REVENUE'))
    setLoading(false)
  }

  useEffect(() => { if (profile) fetchData() }, [profile])

  function addAllocation() {
    setAllocations(a => [...a, { entity_id: '', amount: '', description: '' }])
  }

  const [formFromEntity, setFormFromEntity] = useState<string>('')
  const [formRevenueAcc, setFormRevenueAcc] = useState<string>('')

  // Init form defaults
  useEffect(() => {
    if (highestRole === 'HEAD' && profile?.entity_id) {
      setFormFromEntity(profile.entity_id)
    }
  }, [profile])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    if (!formFromEntity) return toast.error('Pilih Divisi Penagih')
    setSubmitting(true)

    const rows = allocations.filter(a => a.entity_id && a.amount).map(a => ({
      from_entity_id: formFromEntity,
      to_entity_id: a.entity_id,
      amount: Number(a.amount.replace(/\D/g, '')),
      status: 'PENDING_APPROVAL',
      description: a.description || 'Transfer Pricing',
      created_by: profile.id,
      revenue_account_id: formRevenueAcc || null
    }))

    if (rows.length === 0) {
      toast.error('Data tidak valid')
      setSubmitting(false)
      return
    }

    const { error } = await supabase.from('internal_billings').insert(rows)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Tagihan antar divisi berhasil dibuat')
      setShowForm(false)
      setAllocations([])
      fetchData()
    }
    setSubmitting(false)
  }

  async function handleApprove(billing_id: string) {
    if (!selectedExpenseCategory) {
      toast.error('Pilih kategori beban (expense) terlebih dahulu!')
      return
    }
    
    setApprovingId(billing_id)
    try {
      const res = await fetch('/api/finance/transfer-pricing/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billing_id, expense_category_id: selectedExpenseCategory })
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      
      toast.success('Transfer Pricing telah di-approve dan Jurnal Beban tercatat.')
      fetchData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setApprovingId(null)
      setSelectedExpenseCategory('')
    }
  }

  const isCeoOrFinance = highestRole === 'CEO' || highestRole === 'FINANCE'
  const isCeo = highestRole === 'CEO'

  return (
    <div className="p-6 md:p-8 space-y-6 animate-[slide-up_0.4s_ease]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[#D4AF37] text-xs uppercase tracking-[0.3em] font-bold mb-1">Finance</p>
          <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight">Transfer Pricing</h1>
          <p className="text-[--color-text-muted] text-sm mt-1">Alokasi biaya virtual antar-divisi (Internal Billing).</p>
        </div>
        {isCeo && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-[#D4AF37] text-[--color-bg-primary] font-bold px-4 py-2 rounded-md text-sm hover:bg-[#F5D678] transition-all uppercase tracking-widest shadow-lg shadow-[#D4AF37]/10">
            <Plus className="w-4 h-4" /> Tagih Divisi
          </button>
        )}
      </div>

      {/* Billings list */}
      <div className="glass-card border border-white/5 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" /></div>
        ) : billings.length === 0 ? (
          <div className="py-16 text-center text-[--color-text-muted] text-sm">Belum ada transfer pricing.</div>
        ) : (
          <div className="divide-y divide-[--color-border]">
            {billings.map(b => (
              <div key={b.id} className="flex flex-col lg:flex-row lg:items-center justify-between px-5 py-5 gap-6">
                <div className="flex items-start lg:items-center gap-4 min-w-0">
                  <div className="text-center text-xs text-[--color-text-muted] shrink-0 w-32 border border-white/5 bg-white/5 rounded p-2">
                    <p className="font-bold text-[--color-text-primary]">{b.from_entity_data?.name ?? 'Holding'}</p>
                    <ArrowRight className="w-4 h-4 mx-auto my-1.5 text-[#D4AF37]" />
                    <p className="font-bold text-[#D4AF37]">{b.to_entity_data?.name ?? 'Divisi'}</p>
                  </div>
                  <div>
                    <p className="text-emerald-400 font-black text-lg">{formatRupiah(b.amount)}</p>
                    <p className="text-[--color-text-primary] text-sm mt-1 font-medium">{b.description}</p>
                    <p className="text-[--color-text-muted] text-xs mt-1">{formatDate(b.created_at)}</p>
                  </div>
                </div>
                
                <div className="flex flex-col lg:items-end gap-3 shrink-0">
                  <span className={cn('px-2 py-1 inline-flex w-fit rounded border text-xs font-bold uppercase tracking-widest', getStatusColor(b.status))}>
                    {b.status.replace('_', ' ')}
                  </span>
                  
                  {b.status === 'PENDING_APPROVAL' && (highestRole === 'CEO' || (highestRole === 'HEAD' && profile?.entity_id === b.to_entity_id)) && (
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 mt-2">
                      <select value={selectedExpenseCategory} onChange={e => setSelectedExpenseCategory(e.target.value)}
                        className="bg-black/50 border border-white/10 rounded-md px-3 py-2 text-[--color-text-primary] text-xs focus:border-[#D4AF37]/50 w-full lg:w-48">
                        <option value="">Pilih Akun Beban...</option>
                        {expenseAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.account_code} - {acc.account_name}</option>)}
                      </select>
                      
                      <button onClick={() => handleApprove(b.id)} disabled={approvingId === b.id}
                        className="flex items-center justify-center gap-1 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-md transition-all disabled:opacity-50">
                        {approvingId === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} 
                        Terima & Jurnal
                      </button>
                    </div>
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
          <div className="glass-card w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[--color-text-primary] font-bold">Tagih Divisi (Transfer Pricing)</h2>
              <button onClick={() => setShowForm(false)} className="text-[--color-text-muted] hover:text-[--color-text-primary]"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-md mb-6">
              <p className="text-[10px] text-blue-400 leading-relaxed">
                Penagihan antar divisi (Transfer Pricing) akan memotong limit divisi yang ditagih dan menambah "Utang Afiliasi" mereka. Divisi yang menagih akan otomatis bertambah "Piutang Afiliasi" dan Pendapatannya.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">Divisi Penagih (Yang Mengirim Bill)</label>
                  <select required value={formFromEntity} onChange={e => setFormFromEntity(e.target.value)} disabled={highestRole === 'HEAD'}
                    className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-[--color-text-primary] text-sm focus:border-[#D4AF37]/50 disabled:opacity-50">
                    <option value="">-- Pilih Penagih --</option>
                    {entities.map(en => <option key={en.id} value={en.id}>{en.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">Akun Pendapatan Penagih (Opsional)</label>
                  <select value={formRevenueAcc} onChange={e => setFormRevenueAcc(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-[--color-text-primary] text-sm focus:border-[#D4AF37]/50">
                    <option value="">-- Abaikan jika tidak diakui sbg pendapatan --</option>
                    {revenueAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.account_code} - {acc.account_name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                  <label className="text-[--color-text-primary] text-sm font-bold">Daftar Divisi yang Ditagih</label>
                  <button type="button" onClick={addAllocation} className="text-[#D4AF37] text-xs font-bold uppercase tracking-widest hover:text-[#F5D678] bg-[#D4AF37]/10 px-3 py-1.5 rounded">+ Tambah Baris</button>
                </div>
                
                {allocations.map((alloc, i) => (
                  <div key={i} className="flex flex-col md:flex-row gap-3 mb-4 bg-white/5 p-3 rounded border border-white/5 relative">
                    <button type="button" onClick={() => setAllocations(a => a.filter((_, j) => j !== i))} className="absolute -top-2 -right-2 bg-red-500 text-[--color-text-primary] rounded-full p-1 hover:bg-red-400"><X className="w-3 h-3" /></button>
                    
                    <div className="flex-1 space-y-2">
                      <select value={alloc.entity_id} onChange={e => setAllocations(a => a.map((x, j) => j === i ? { ...x, entity_id: e.target.value } : x))}
                        className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50">
                        <option value="">-- Pilih Divisi --</option>
                        {entities.filter(e => e.id !== formFromEntity).map(en => <option key={en.id} value={en.id}>{en.name}</option>)}
                      </select>
                      <input type="text" placeholder="Deskripsi (misal: Tagihan VPS Bulanan)" value={alloc.description}
                        onChange={e => setAllocations(a => a.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                        className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50"
                      />
                    </div>
                    <div className="md:w-1/3">
                      <input type="text" placeholder="Nominal (IDR)" value={alloc.amount}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '')
                          setAllocations(a => a.map((x, j) => j === i ? { ...x, amount: val ? parseInt(val).toLocaleString('id-ID') : '' } : x))
                        }}
                        className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50 h-full"
                      />
                    </div>
                  </div>
                ))}
                {allocations.length === 0 && <div className="text-center py-8 border-2 border-dashed border-white/10 rounded-md"><p className="text-[--color-text-muted] text-sm">Belum ada data penagihan. Klik "+ Tambah Baris"</p></div>}
              </div>
              
              <button type="submit" disabled={submitting || allocations.length === 0}
                className="w-full bg-[#D4AF37] text-[--color-bg-primary] font-bold py-3.5 rounded-md text-sm hover:bg-[#F5D678] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest mt-4">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : 'Kirim Tagihan ke Divisi'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
