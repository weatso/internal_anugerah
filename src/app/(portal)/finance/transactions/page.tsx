'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { formatRupiah, formatDate, getStatusColor, getStatusLabel, cn } from '@/lib/utils'
import { Plus, Upload, ExternalLink, X, Loader2, Receipt, Building2 } from 'lucide-react'
import type { ChartOfAccount, JournalEntry } from '@/types'
import { toast } from 'sonner'

export default function TransactionsPage() {
  const { profile, highestRole } = useUser()
  const supabase = createClient()
  
  // Data
  const [journals, setJournals] = useState<any[]>([])
  const [banks, setBanks] = useState<ChartOfAccount[]>([])
  const [categories, setCategories] = useState<ChartOfAccount[]>([])
  
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

  async function fetchInitData() {
    setLoading(true)
    
    // Fetch Chart of Accounts
    const { data: coaData } = await supabase.from('chart_of_accounts').select('*').eq('is_active', true)
    if (coaData) {
      setBanks(coaData.filter(a => a.is_bank))
      setCategories(coaData.filter(a => !a.is_bank))
    }

    // Fetch Journals (Transactions)
    let q = supabase.from('journal_entries')
      .select('*, entity:entities(id,name), lines:journal_lines(*, account:chart_of_accounts(*))')
      .order('created_at', { ascending: false })
      
    // Apply entity filter (Only see own division unless CEO/FINANCE)
    if (highestRole !== 'CEO' && highestRole !== 'FINANCE') {
      q = q.eq('entity_id', profile?.entity_id)
    }

    const { data } = await q
    setJournals(data || [])
    setLoading(false)
  }

  useEffect(() => { if (profile) fetchInitData() }, [profile])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSubmitting(true)

    try {
      let proof_storage_key: string | null = null

      // Upload struk jika ada
      if (proofFile) {
        const formData = new FormData()
        formData.append('file', proofFile)
        formData.append('folder', 'receipts')
        formData.append('entity_id', profile.entity_id ?? 'general')
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

      toast.success('Transaksi berhasil dicatat')
      setForm({ type: 'EXPENSE', amount: '', bank_account_id: '', category_id: '', description: '', transaction_date: new Date().toISOString().split('T')[0] })
      setProofFile(null)
      setShowForm(false)
      fetchInitData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function openProof(key: string) {
    const res = await fetch('/api/storage/file?key=' + encodeURIComponent(key))
    if (res.ok) window.open(res.url, '_blank')
  }

  // Helper to parse Journal Entry Type from lines
  const parseJournal = (j: any) => {
    // Basic heuristics: if Revenue credit > 0 -> INCOME. If Expense debit > 0 -> EXPENSE.
    const isIncome = j.lines?.some((l: any) => l.account?.account_class === 'REVENUE' && l.credit > 0)
    const type = isIncome ? 'INCOME' : 'EXPENSE'
    
    // Find Bank Line
    const bankLine = j.lines?.find((l: any) => l.account?.is_bank)
    // Find Non-Bank (Category) Line
    const catLine = j.lines?.find((l: any) => !l.account?.is_bank)

    const amount = bankLine ? Math.max(bankLine.debit, bankLine.credit) : 0
    return { ...j, parsedType: type, amount, bank: bankLine?.account, category: catLine?.account }
  }

  const parsedJournals = journals.map(parseJournal).filter(j => filterType === 'ALL' || j.parsedType === filterType)

  const totalIncome = journals.map(parseJournal).filter(t => t.parsedType === 'INCOME' && t.status === 'APPROVED').reduce((s, t) => s + t.amount, 0)
  const totalExpense = journals.map(parseJournal).filter(t => t.parsedType === 'EXPENSE' && t.status === 'APPROVED').reduce((s, t) => s + t.amount, 0)

  // Filter categories for the form dropdown based on selected type
  const availableCategories = categories.filter(c => {
    if (form.type === 'INCOME') return c.account_class === 'REVENUE' || c.account_class === 'EQUITY' || c.account_class === 'LIABILITY'
    if (form.type === 'EXPENSE') return c.account_class === 'EXPENSE' || c.account_class === 'COGS' || c.account_class === 'ASSET'
    return true
  })

  return (
    <div className="p-6 md:p-8 space-y-6 animate-[slide-up_0.4s_ease]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[#D4AF37] text-xs uppercase tracking-[0.3em] font-bold mb-1">Finance</p>
          <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight">Transaksi Bank</h1>
          <p className="text-[--color-text-muted] text-sm mt-1">Catat uang masuk/keluar ke rekening riil beserta struk bukti.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-[#D4AF37] text-[--color-bg-primary] font-bold px-4 py-2 rounded-md text-sm hover:bg-[#F5D678] transition-all uppercase tracking-widest shadow-lg shadow-[#D4AF37]/10"
        >
          <Plus className="w-4 h-4" /> Tambah Transaksi
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 border border-white/5 border-l-emerald-500/50 border-l-2">
          <p className="text-[--color-text-muted] text-[10px] uppercase tracking-widest mb-1 font-bold">Pemasukan (Approved)</p>
          <p className="text-emerald-400 font-black text-xl tracking-tight">{formatRupiah(totalIncome)}</p>
        </div>
        <div className="glass-card p-5 border border-white/5 border-l-red-500/50 border-l-2">
          <p className="text-[--color-text-muted] text-[10px] uppercase tracking-widest mb-1 font-bold">Pengeluaran (Approved)</p>
          <p className="text-red-400 font-black text-xl tracking-tight">{formatRupiah(totalExpense)}</p>
        </div>
        <div className="glass-card p-5 border border-white/5 border-l-blue-500/50 border-l-2">
          <p className="text-[--color-text-muted] text-[10px] uppercase tracking-widest mb-1 font-bold">Net Flow</p>
          <p className={`font-black text-xl tracking-tight ${totalIncome - totalExpense >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatRupiah(totalIncome - totalExpense)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-md border border-[--color-border] overflow-hidden text-sm">
          {(['ALL', 'INCOME', 'EXPENSE'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={cn('px-4 py-2 transition-colors font-medium', filterType === t ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'text-[--color-text-secondary] hover:text-[--color-text-primary]')}>
              {t === 'ALL' ? 'Semua' : getStatusLabel(t)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card border border-white/5 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" /></div>
        ) : parsedJournals.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-[--color-text-muted]">
            <Receipt className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">Belum ada transaksi.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[--color-border]">
                  <th className="text-left px-5 py-3 text-[--color-text-muted] text-xs uppercase tracking-wider font-medium">No. Ref</th>
                  <th className="text-left px-5 py-3 text-[--color-text-muted] text-xs uppercase tracking-wider font-medium">Detail Jurnal</th>
                  <th className="text-left px-5 py-3 text-[--color-text-muted] text-xs uppercase tracking-wider font-medium">Divisi</th>
                  <th className="text-left px-5 py-3 text-[--color-text-muted] text-xs uppercase tracking-wider font-medium">Status</th>
                  <th className="text-right px-5 py-3 text-[--color-text-muted] text-xs uppercase tracking-wider font-medium">Jumlah</th>
                  <th className="text-center px-5 py-3 text-[--color-text-muted] text-xs uppercase tracking-wider font-medium">Struk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--color-border]">
                {parsedJournals.map(tx => (
                  <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-mono text-xs text-[#D4AF37]">{tx.reference_number}</p>
                      <p className="text-[10px] text-gray-500">{formatDate(tx.transaction_date)}</p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider', tx.parsedType === 'INCOME' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500')}>
                          {tx.parsedType}
                        </span>
                        <span className="text-[--color-text-primary] text-xs font-bold">{tx.category?.account_name || 'N/A'}</span>
                      </div>
                      <p className="text-gray-400 text-xs truncate max-w-[200px]">{tx.description}</p>
                      <p className="text-[10px] text-gray-500 mt-1">Via: {tx.bank?.account_name || 'Unknown Bank'}</p>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-300">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 text-gray-500" />
                        {tx.entity?.name}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn('px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider', 
                        tx.status === 'APPROVED' ? 'bg-blue-500/10 text-blue-400' : 
                        tx.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' : 
                        'bg-yellow-500/10 text-yellow-400'
                      )}>
                        {tx.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className={`px-5 py-3 text-right font-bold ${tx.parsedType === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.parsedType === 'INCOME' ? '+' : '-'}{formatRupiah(tx.amount)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {tx.proof_storage_key ? (
                        <button onClick={() => openProof(tx.proof_storage_key!)} className="text-[#D4AF37] hover:text-[#F5D678] transition-colors bg-[#D4AF37]/10 p-1.5 rounded">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      ) : <span className="text-[--color-text-muted]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6 border-[#D4AF37]/20 border">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[--color-text-primary] font-bold">Input Transaksi Baru</h2>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Sistem Ledger Otomatis</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-[--color-text-muted] hover:text-[--color-text-primary] bg-white/5 p-1.5 rounded"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                {(['INCOME', 'EXPENSE'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t, category_id: '' }))}
                    className={cn('flex-1 py-2.5 rounded-md text-xs uppercase tracking-widest font-bold border transition-all',
                      form.type === t
                        ? t === 'INCOME' ? 'bg-emerald-400/15 text-emerald-400 border-emerald-400/30' : 'bg-red-400/15 text-red-400 border-red-400/30'
                        : 'border-[--color-border] text-[--color-text-muted] hover:bg-white/5'
                    )}>
                    {t}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">Tanggal Transaksi</label>
                  <input type="date" required value={form.transaction_date}
                    onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))}
                    className="w-full bg-black/50 border border-white/10 rounded-md px-4 py-2.5 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50"
                  />
                </div>
                <div>
                  <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">Jumlah (IDR)</label>
                  <input type="text" required value={form.amount}
                    onChange={e => {
                      const val = e.target.value.replace(/\D/g, '')
                      setForm(f => ({ ...f, amount: val ? parseInt(val).toLocaleString('id-ID') : '' }))
                    }}
                    placeholder="5.000.000"
                    className="w-full bg-black/50 border border-white/10 rounded-md px-4 py-2.5 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50"
                  />
                </div>
              </div>
              <div>
                <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">Rekening Bank (Kas)</label>
                <select required value={form.bank_account_id} onChange={e => setForm(f => ({ ...f, bank_account_id: e.target.value }))}
                  className="w-full bg-black/50 border border-white/10 rounded-md px-4 py-2.5 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50">
                  <option value="">Pilih rekening...</option>
                  {banks.map(b => <option key={b.id} value={b.id}>{b.account_code} - {b.account_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">Kategori Jurnal (Akun)</label>
                <select required value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                  className="w-full bg-black/50 border border-white/10 rounded-md px-4 py-2.5 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50">
                  <option value="">Pilih kategori KAP...</option>
                  {availableCategories.map(c => <option key={c.id} value={c.id}>{c.account_code} - {c.account_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">Keterangan Khusus</label>
                <input type="text" required value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Pembayaran / Penagihan..."
                  className="w-full bg-black/50 border border-white/10 rounded-md px-4 py-2.5 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50"
                />
              </div>
              <div>
                <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">Upload Struk Bukti</label>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={e => setProofFile(e.target.files?.[0] ?? null)} className="hidden" />
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full bg-black/30 border border-dashed border-white/20 rounded-md py-3 text-sm text-[--color-text-muted] hover:border-[#D4AF37]/50 hover:text-[#D4AF37] transition-all flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" />
                  {proofFile ? proofFile.name : 'Klik untuk memilih file'}
                </button>
              </div>
              <button type="submit" disabled={submitting}
                className="w-full bg-[#D4AF37] text-[--color-bg-primary] font-bold py-3.5 rounded-md text-sm hover:bg-[#F5D678] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest mt-4">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Merekam Jurnal...</> : 'Proses Jurnal Transaksi'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
