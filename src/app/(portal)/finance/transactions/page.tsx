'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { formatRupiah, formatDate, getStatusColor, getStatusLabel, cn } from '@/lib/utils'
import { Plus, Upload, ExternalLink, Filter, X, Loader2, Receipt } from 'lucide-react'
import type { Transaction } from '@/types'

const CATEGORIES = ['Operational', 'API Cost', 'Server', 'Marketing', 'Salary', 'Equipment', 'Tax', 'Other']

export default function TransactionsPage() {
  const { profile } = useUser()
  const supabase = createClient()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL')
  const [filterCategory, setFilterCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Form state
  const [form, setForm] = useState({
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    amount: '',
    category: '',
    description: '',
  })
  const [proofFile, setProofFile] = useState<File | null>(null)

  async function fetchTransactions() {
    setLoading(true)
    let q = supabase.from('transactions').select('*, entity:entities(id,name,type,logo_key,primary_color)').order('created_at', { ascending: false })
    if (filterType !== 'ALL') q = q.eq('type', filterType)
    if (filterCategory) q = q.eq('category', filterCategory)
    const { data } = await q
    setTransactions((data ?? []) as Transaction[])
    setLoading(false)
  }

  useEffect(() => { if (profile) fetchTransactions() }, [profile, filterType, filterCategory])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSubmitting(true)

    let proof_storage_key: string | null = null

    // Upload struk jika ada
    if (proofFile) {
      const formData = new FormData()
      formData.append('file', proofFile)
      formData.append('folder', 'receipts')
      formData.append('entity_id', profile.entity_id)
      const res = await fetch('/api/storage/upload', { method: 'POST', body: formData })
      const json = await res.json()
      proof_storage_key = json.key ?? null
    }

    await supabase.from('transactions').insert({
      entity_id: profile.entity_id,
      type: form.type,
      amount: Number(form.amount.replace(/\D/g, '')),
      category: form.category,
      description: form.description || null,
      proof_storage_key,
      created_by: profile.id,
    })

    setForm({ type: 'EXPENSE', amount: '', category: '', description: '' })
    setProofFile(null)
    setShowForm(false)
    setSubmitting(false)
    fetchTransactions()
  }

  async function openProof(key: string) {
    const res = await fetch('/api/storage/presigned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    })
    const { url } = await res.json()
    window.open(url, '_blank')
  }

  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="p-6 md:p-8 space-y-6 animate-[slide-up_0.4s_ease]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[#D4AF37] text-xs uppercase tracking-[0.3em] font-bold mb-1">Finance</p>
          <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight">Transaksi</h1>
        </div>
        <button
          id="btn-add-transaction"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-[#D4AF37] text-[#050505] font-bold px-4 py-2 rounded-md text-sm hover:bg-[#F5D678] transition-colors"
        >
          <Plus className="w-4 h-4" /> Tambah Transaksi
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <p className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1">Pemasukan</p>
          <p className="text-emerald-400 font-black text-lg">{formatRupiah(totalIncome)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1">Pengeluaran</p>
          <p className="text-red-400 font-black text-lg">{formatRupiah(totalExpense)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1">Net</p>
          <p className={`font-black text-lg ${totalIncome - totalExpense >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="bg-[--color-bg-card] border border-[--color-border] text-[--color-text-primary] text-sm rounded-md px-3 py-2 focus:outline-none focus:border-[#D4AF37]/50"
        >
          <option value="">Semua Kategori</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[#D4AF37]" /></div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-[--color-text-muted]">
            <Receipt className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">Belum ada transaksi.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[--color-border]">
                  <th className="text-left px-5 py-3 text-[--color-text-muted] text-xs uppercase tracking-wider font-medium">Tanggal</th>
                  <th className="text-left px-5 py-3 text-[--color-text-muted] text-xs uppercase tracking-wider font-medium">Tipe</th>
                  <th className="text-left px-5 py-3 text-[--color-text-muted] text-xs uppercase tracking-wider font-medium">Kategori</th>
                  <th className="text-left px-5 py-3 text-[--color-text-muted] text-xs uppercase tracking-wider font-medium">Deskripsi</th>
                  <th className="text-right px-5 py-3 text-[--color-text-muted] text-xs uppercase tracking-wider font-medium">Jumlah</th>
                  <th className="text-center px-5 py-3 text-[--color-text-muted] text-xs uppercase tracking-wider font-medium">Struk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[--color-border]">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 text-[--color-text-muted]">{formatDate(tx.created_at)}</td>
                    <td className="px-5 py-3">
                      <span className={cn('px-2 py-0.5 rounded border text-xs font-bold uppercase tracking-wider', getStatusColor(tx.type))}>
                        {getStatusLabel(tx.type)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[--color-text-primary]">{tx.category}</td>
                    <td className="px-5 py-3 text-[--color-text-secondary] max-w-[200px] truncate">{tx.description ?? '—'}</td>
                    <td className={`px-5 py-3 text-right font-bold ${tx.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.type === 'INCOME' ? '+' : '-'}{formatRupiah(tx.amount)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {tx.proof_storage_key ? (
                        <button onClick={() => openProof(tx.proof_storage_key!)} className="text-[#D4AF37] hover:text-[#F5D678] transition-colors">
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
          <div className="glass-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[--color-text-primary] font-bold">Tambah Transaksi</h2>
              <button onClick={() => setShowForm(false)} className="text-[--color-text-muted] hover:text-[--color-text-primary]"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                {(['INCOME', 'EXPENSE'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={cn('flex-1 py-2 rounded-md text-sm font-bold border transition-all',
                      form.type === t
                        ? t === 'INCOME' ? 'bg-emerald-400/15 text-emerald-400 border-emerald-400/30' : 'bg-red-400/15 text-red-400 border-red-400/30'
                        : 'border-[--color-border] text-[--color-text-muted]'
                    )}>
                    {getStatusLabel(t)}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">Jumlah (IDR)</label>
                <input type="text" required value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="5.000.000"
                  className="w-full bg-white/[0.04] border border-[--color-border] rounded-md px-4 py-2.5 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50"
                />
              </div>
              <div>
                <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">Kategori</label>
                <select required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-[--color-bg-card] border border-[--color-border] rounded-md px-4 py-2.5 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50">
                  <option value="">Pilih kategori...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">Deskripsi (opsional)</label>
                <input type="text" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Tagihan VPS Agustus"
                  className="w-full bg-white/[0.04] border border-[--color-border] rounded-md px-4 py-2.5 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50"
                />
              </div>
              <div>
                <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">Upload Struk (opsional)</label>
                <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={e => setProofFile(e.target.files?.[0] ?? null)} className="hidden" />
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="w-full border border-dashed border-[--color-border] rounded-md py-3 text-sm text-[--color-text-muted] hover:border-[#D4AF37]/50 hover:text-[#D4AF37] transition-all flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" />
                  {proofFile ? proofFile.name : 'Klik untuk upload'}
                </button>
              </div>
              <button type="submit" disabled={submitting}
                className="w-full bg-[#D4AF37] text-[#050505] font-bold py-3 rounded-md text-sm hover:bg-[#F5D678] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : 'Simpan Transaksi'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
