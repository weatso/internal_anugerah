'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah, formatDate, getStatusLabel, cn } from '@/lib/utils'
import { Plus, Receipt, Loader2, X } from 'lucide-react'
import type { ChartOfAccount } from '@/types'
import { toast } from 'sonner'

export default function TransactionsPage() {
  const supabase = createClient()
  
  // Data
  const [journals, setJournals] = useState<any[]>([])
  const [banks, setBanks] = useState<ChartOfAccount[]>([])
  const [categories, setCategories] = useState<ChartOfAccount[]>([])
  
  // Otoritas & Identitas
  const [effectiveRole, setEffectiveRole] = useState<string | null>(null)
  const [effectiveEntityId, setEffectiveEntityId] = useState<string | null>(null)

  // UI State
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL')
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Form state
  const [form, setForm] = useState({
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    amount: '',
    bank_account_id: '',
    category_id: '',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
  })
  const [proofFile, setProofFile] = useState<File | null>(null)

  useEffect(() => {
    // SINGKIRKAN useUser. BACA LANGSUNG DARI COOKIE.
    const role = document.cookie.match(new RegExp('(^| )active_role=([^;]+)'))?.pop()?.toUpperCase() || null
    const entityId = document.cookie.match(new RegExp('(^| )active_entity_id=([^;]+)'))?.pop() || null
    
    setEffectiveRole(role)
    setEffectiveEntityId(entityId)
    
    if (role && entityId) {
      fetchInitData(role, entityId)
    } else {
      setLoading(false)
      toast.error('Kapasitas Kerja Anda tidak terdeteksi. Silakan pilih di Sidebar.')
    }
  }, [])

  async function fetchInitData(role: string, entityId: string) {
    setLoading(true)
    
    // 1. Tarik Rekening & COA
    const { data: coaData } = await supabase.from('chart_of_accounts').select('*').eq('is_active', true)
    if (coaData) {
      setBanks(coaData.filter(a => a.is_bank))
      setCategories(coaData.filter(a => !a.is_bank))
    }

    // 2. Tarik Riwayat Jurnal
    let q = supabase.from('journal_entries')
      .select('*, entity:entities(id,name), lines:journal_lines(*, account:chart_of_accounts(*))')
      .order('created_at', { ascending: false })
      
    // Filter visibilitas berdasarkan Role Mutlak
    if (role !== 'CEO' && role !== 'FINANCE') {
      q = q.eq('entity_id', entityId)
    }

    const { data } = await q
    setJournals(data || [])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!effectiveEntityId) return
    setSubmitting(true)

    try {
      let proof_storage_key: string | null = null

      // Upload struk jika ada
      if (proofFile) {
        const formData = new FormData()
        formData.append('file', proofFile)
        formData.append('folder', 'receipts')
        formData.append('entity_id', effectiveEntityId)
        const res = await fetch('/api/storage/upload', { method: 'POST', body: formData })
        if (!res.ok) throw new Error('Gagal mengupload struk')
        const json = await res.json()
        proof_storage_key = json.key ?? null
      }

      const res = await fetch('/api/finance/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          amount: Number(form.amount.replace(/\D/g, '')),
          bank_account_id: form.bank_account_id,
          category_id: form.category_id,
          description: form.description,
          transaction_date: form.transaction_date,
          proof_storage_key
        })
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      toast.success('Transaksi berhasil dicatat dan masuk ke buku besar.')
      setForm({ type: 'EXPENSE', amount: '', bank_account_id: '', category_id: '', description: '', transaction_date: new Date().toISOString().split('T')[0] })
      setProofFile(null)
      setShowForm(false)
      if (effectiveRole && effectiveEntityId) fetchInitData(effectiveRole, effectiveEntityId)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const parseJournal = (j: any) => {
    const isIncome = j.lines?.some((l: any) => l.account?.account_class === 'REVENUE' && l.credit > 0)
    const type = isIncome ? 'INCOME' : 'EXPENSE'
    const bankLine = j.lines?.find((l: any) => l.account?.is_bank)
    const catLine = j.lines?.find((l: any) => !l.account?.is_bank)
    const amount = bankLine ? Math.max(bankLine.debit, bankLine.credit) : 0
    return { ...j, parsedType: type, amount, bank: bankLine?.account, category: catLine?.account }
  }

  const parsedJournals = journals.map(parseJournal).filter(j => filterType === 'ALL' || j.parsedType === filterType)
  const totalIncome = journals.map(parseJournal).filter(t => t.parsedType === 'INCOME' && t.status === 'APPROVED').reduce((s, t) => s + t.amount, 0)
  const totalExpense = journals.map(parseJournal).filter(t => t.parsedType === 'EXPENSE' && t.status === 'APPROVED').reduce((s, t) => s + t.amount, 0)

  const availableCategories = categories.filter(c => {
    if (form.type === 'INCOME') return c.account_class === 'REVENUE' || c.account_class === 'EQUITY' || c.account_class === 'LIABILITY'
    if (form.type === 'EXPENSE') return c.account_class === 'EXPENSE' || c.account_class === 'COGS' || c.account_class === 'ASSET'
    return true
  })

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" /></div>
  }

  return (
    <div className="p-6 md:p-8 space-y-6 animate-[slide-up_0.4s_ease]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[#D4AF37] text-xs uppercase tracking-[0.3em] font-bold mb-1">Finance</p>
          <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight">Transaksi Rekening Bank</h1>
          <p className="text-[--color-text-muted] text-sm mt-1">Lacak mutasi rekening riil. Data Bank dan Kategori ditarik dari Master COA.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-[#D4AF37] text-[--color-bg-primary] font-bold px-4 py-2 rounded-md text-sm hover:bg-[#F5D678] transition-all uppercase tracking-widest">
          <Plus className="w-4 h-4" /> Input Mutasi
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 border border-white/5 border-l-emerald-500/50 border-l-2">
          <p className="text-[--color-text-muted] text-[10px] uppercase tracking-widest mb-1 font-bold">Total Masuk</p>
          <p className="text-emerald-400 font-black text-xl tracking-tight">{formatRupiah(totalIncome)}</p>
        </div>
        <div className="glass-card p-5 border border-white/5 border-l-red-500/50 border-l-2">
          <p className="text-[--color-text-muted] text-[10px] uppercase tracking-widest mb-1 font-bold">Total Keluar</p>
          <p className="text-red-400 font-black text-xl tracking-tight">{formatRupiah(totalExpense)}</p>
        </div>
        <div className="glass-card p-5 border border-white/5 border-l-blue-500/50 border-l-2">
          <p className="text-[--color-text-muted] text-[10px] uppercase tracking-widest mb-1 font-bold">Net Flow (Arus Kas)</p>
          <p className={`font-black text-xl tracking-tight ${totalIncome - totalExpense >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatRupiah(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex rounded-md border border-white/10 w-fit overflow-hidden text-sm">
        {(['ALL', 'INCOME', 'EXPENSE'] as const).map(t => (
          <button key={t} onClick={() => setFilterType(t)} className={cn('px-6 py-2.5 transition-colors font-bold text-xs uppercase tracking-widest', filterType === t ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'text-gray-500 hover:text-white')}>
            {t === 'ALL' ? 'Semua' : getStatusLabel(t)}
          </button>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-xl p-6 border border-white/10">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-3">
              <h2 className="font-bold text-[#D4AF37] uppercase tracking-widest text-sm">Input Mutasi Bank</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Arah Transaksi</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value as any})} className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2.5 text-sm text-white mt-1 focus:border-[#D4AF37]/50">
                    <option value="INCOME">Uang Masuk (Income)</option>
                    <option value="EXPENSE">Uang Keluar (Expense)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rekening Bank Anda</label>
                  <select required value={form.bank_account_id} onChange={e => setForm({...form, bank_account_id: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2.5 text-sm text-white mt-1 focus:border-[#D4AF37]/50">
                    <option value="" disabled>-- Pilih Rekening --</option>
                    {banks.map(b => <option key={b.id} value={b.id}>{b.account_name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kategori Jurnal (COA)</label>
                <select required value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2.5 text-sm text-white mt-1 focus:border-[#D4AF37]/50">
                  <option value="" disabled>-- Pilih Kategori Tujuan --</option>
                  {availableCategories.map(c => <option key={c.id} value={c.id}>{c.account_code} - {c.account_name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nominal (Rp)</label>
                  <input required type="text" value={form.amount} onChange={e => { const v = e.target.value.replace(/\D/g, ''); setForm({...form, amount: v ? parseInt(v).toLocaleString('id-ID') : ''}) }} placeholder="1.000.000" className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2.5 text-sm text-white mt-1 focus:border-[#D4AF37]/50 font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tanggal</label>
                  <input required type="date" value={form.transaction_date} onChange={e => setForm({...form, transaction_date: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2.5 text-sm text-white mt-1 focus:border-[#D4AF37]/50" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Keterangan / Deskripsi</label>
                <input required type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Catatan transaksi..." className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2.5 text-sm text-white mt-1 focus:border-[#D4AF37]/50" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Bukti Transfer (Opsional)</label>
                <input type="file" ref={fileRef} onChange={e => setProofFile(e.target.files?.[0] || null)} className="text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-white hover:file:bg-[#D4AF37]/20 transition-all" />
              </div>

              <button type="submit" disabled={submitting} className="w-full bg-[#D4AF37] text-black font-bold py-3.5 rounded-md transition-all text-xs uppercase tracking-widest mt-4 hover:bg-[#F5D678] disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Simpan Mutasi Jurnal'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Table List */}
      <div className="glass-card border border-white/5 overflow-hidden">
        {parsedJournals.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-[--color-text-muted]">
            <Receipt className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">Belum ada transaksi di rekening.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left px-5 py-3 text-gray-400 text-[10px] uppercase tracking-widest font-bold">Tanggal & Ref</th>
                <th className="text-left px-5 py-3 text-gray-400 text-[10px] uppercase tracking-widest font-bold">Divisi</th>
                <th className="text-left px-5 py-3 text-gray-400 text-[10px] uppercase tracking-widest font-bold">Rekening Bank</th>
                <th className="text-left px-5 py-3 text-gray-400 text-[10px] uppercase tracking-widest font-bold">Kategori</th>
                <th className="text-right px-5 py-3 text-gray-400 text-[10px] uppercase tracking-widest font-bold">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {parsedJournals.map(j => (
                <tr key={j.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-bold text-white mb-0.5">{j.description}</p>
                    <p className="text-[10px] text-gray-500 font-mono">{formatDate(j.transaction_date)} · {j.reference_number}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[10px] bg-white/10 px-2 py-1 rounded font-bold uppercase tracking-widest text-[#D4AF37]">{j.entity?.name ?? 'Holding'}</span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-white">{j.bank?.account_name ?? '-'}</p>
                    <p className="text-[10px] text-gray-500 font-mono">{j.bank?.account_code ?? '-'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-white">{j.category?.account_name ?? '-'}</p>
                    <p className="text-[10px] text-gray-500 font-mono">{j.category?.account_code ?? '-'}</p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className={`font-black font-mono tracking-tighter ${j.parsedType === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {j.parsedType === 'INCOME' ? '+' : '−'}{formatRupiah(j.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}