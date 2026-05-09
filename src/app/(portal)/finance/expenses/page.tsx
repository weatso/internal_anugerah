'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Loader2, Receipt, AlertTriangle, FileText } from 'lucide-react'
import { formatRupiah, formatDate } from '@/lib/utils'

interface Expense {
  id: string
  expense_date: string
  amount: number
  description: string
  category: string | null
  status?: string
  proof_url: string | null
  journal_id: string | null
  project?: { name: string } | null
  created_at: string
}

interface COAccount {
  id: string
  account_code: string
  account_name: string
  account_class: string
  is_bank: boolean
}

export default function ExpensesPage() {
  const supabase = createClient()

  const [effectiveEntityId, setEffectiveEntityId] = useState<string | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseAccounts, setExpenseAccounts] = useState<COAccount[]>([])
  const [bankAccounts, setBankAccounts] = useState<COAccount[]>([])
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [voidingId, setVoidingId] = useState<string | null>(null)

  // Form state
  const [form, setForm] = useState({
    description: '',
    amount: 0,
    expense_date: new Date().toISOString().slice(0, 10),
    category: '',
    expense_account_id: '',
    bank_account_id: '',
    project_id: '',
    proof_url: '',
  })

  useEffect(() => {
    // BACA COOKIE SECARA LANGSUNG
    const entityId = document.cookie.match(new RegExp('(^| )active_entity_id=([^;]+)'))?.pop() || null
    if (entityId) {
      setEffectiveEntityId(entityId)
      fetchData(entityId)
    } else {
      setLoading(false)
      toast.error('Kapasitas Kerja belum dipilih. Silakan pilih di Sidebar.')
    }
  }, [])

  async function fetchData(entityId: string) {
    setLoading(true)
    const [{ data: expData }, { data: coaData }, { data: projData }] = await Promise.all([
      supabase
        .from('expenses')
        .select('*, project:projects(name)')
        .eq('entity_id', entityId)
        .order('expense_date', { ascending: false }),
      supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, account_class, is_bank')
        .eq('is_active', true)
        .order('account_code'),
      supabase
        .from('projects')
        .select('id, name')
        .eq('entity_id', entityId)
        .eq('status', 'ACTIVE')
        .order('name'),
    ])

    if (expData) setExpenses(expData as Expense[])
    if (coaData) {
      setExpenseAccounts(coaData.filter((a: any) => a.account_class === 'EXPENSE' || a.account_class === 'COGS'))
      setBankAccounts(coaData.filter((a: any) => a.is_bank))
    }
    if (projData) setProjects(projData)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description || !form.amount || !form.expense_account_id || !form.bank_account_id) {
      toast.error('Lengkapi: Deskripsi, Nominal, Kategori Biaya, dan Rekening Bank.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/finance/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id: effectiveEntityId,
          project_id: form.project_id || null,
          expense_date: form.expense_date,
          amount: form.amount,
          description: form.description,
          category: form.category || expenseAccounts.find(a => a.id === form.expense_account_id)?.account_name || '',
          proof_url: form.proof_url || null,
          expense_account_id: form.expense_account_id,
          bank_account_id: form.bank_account_id,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Gagal menyimpan')

      toast.success('Pengeluaran berhasil dicatat & jurnal otomatis dibuat.')
      setForm({ description: '', amount: 0, expense_date: new Date().toISOString().slice(0, 10), category: '', expense_account_id: '', bank_account_id: '', project_id: '', proof_url: '' })
      setShowForm(false)
      if (effectiveEntityId) fetchData(effectiveEntityId)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVoid(expenseId: string) {
    if (!confirm('Apakah Anda yakin ingin VOID / membatalkan pengeluaran ini? Sistem akan membuat jurnal reversal otomatis.')) return

    setVoidingId(expenseId)
    try {
      const res = await fetch(`/api/finance/expenses?id=${expenseId}&reason=Pembatalan manual oleh pengguna`, {
        method: 'DELETE',
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Gagal membatalkan')

      toast.success(`Berhasil di-VOID. Jurnal reversal: ${result.reversal_reference}`)
      if (effectiveEntityId) fetchData(effectiveEntityId)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setVoidingId(null)
    }
  }

  const fieldCls = 'w-full rounded-md px-3 py-2.5 text-sm outline-none input-field'
  const activeExpenses = expenses.filter(e => (e as any).status !== 'VOID')
  const voidedExpenses = expenses.filter(e => (e as any).status === 'VOID')
  const totalActive = activeExpenses.reduce((s, e) => s + Number(e.amount), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    )
  }

  const hasNoCOA = expenseAccounts.length === 0 || bankAccounts.length === 0

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[#D4AF37] text-xs uppercase tracking-[0.3em] font-bold mb-1">Finance Module</p>
          <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight">Biaya & Pengeluaran</h1>
          <p className="text-[--color-text-muted] text-sm mt-1">
            Catat setiap rupiah yang keluar (OPEX/COGS). Data ini memotong Revenue di Laporan P&L.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-widest font-bold text-[--color-text-muted]">Total Aktif</p>
            <p className="text-lg font-black text-red-400 font-mono">{formatRupiah(totalActive)}</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            disabled={hasNoCOA}
            className="flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-40"
            style={{ background: '#D4AF37', color: '#050505' }}
          >
            <Plus className="w-4 h-4" /> Catat Baru
          </button>
        </div>
      </div>

      {/* Warning: No COA */}
      {hasNoCOA && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-400">Data Master Belum Siap</p>
            <p className="text-xs text-amber-400/70 mt-1">
              {expenseAccounts.length === 0 && 'Belum ada akun Biaya (EXPENSE/COGS) di Chart of Accounts. '}
              {bankAccounts.length === 0 && 'Belum ada akun Bank (Rekening) di Chart of Accounts. '}
              Minta CEO untuk mengisi data di <strong>Master COA</strong> terlebih dahulu.
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <AnimatePresence>
        {showForm && !hasNoCOA && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5" style={{ borderTopColor: '#D4AF37', borderTopWidth: 2 }}>
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Input Pengeluaran Baru</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-[--color-text-muted] uppercase tracking-widest font-bold block mb-1.5">Deskripsi *</label>
                  <input className={fieldCls} placeholder="Contoh: Bayar vendor desain poster" required
                    value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-[--color-text-muted] uppercase tracking-widest font-bold block mb-1.5">Nominal (Rp) *</label>
                  <input type="number" min={1} className={`${fieldCls} font-mono`} required
                    value={form.amount || ''} onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-[10px] text-[--color-text-muted] uppercase tracking-widest font-bold block mb-1.5">Kategori Biaya (COA) *</label>
                  <select className={fieldCls} required
                    value={form.expense_account_id} onChange={e => setForm(p => ({ ...p, expense_account_id: e.target.value }))}>
                    <option value="" disabled>-- Pilih Akun Biaya --</option>
                    {expenseAccounts.map(a => <option key={a.id} value={a.id}>{a.account_code} · {a.account_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[--color-text-muted] uppercase tracking-widest font-bold block mb-1.5">Asal Uang (Bank) *</label>
                  <select className={fieldCls} required
                    value={form.bank_account_id} onChange={e => setForm(p => ({ ...p, bank_account_id: e.target.value }))}>
                    <option value="" disabled>-- Pilih Rekening --</option>
                    {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.account_code} · {a.account_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[--color-text-muted] uppercase tracking-widest font-bold block mb-1.5">Tanggal</label>
                  <input type="date" className={fieldCls}
                    value={form.expense_date} onChange={e => setForm(p => ({ ...p, expense_date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-[--color-text-muted] uppercase tracking-widest font-bold block mb-1.5">Proyek (Opsional)</label>
                  <select className={fieldCls}
                    value={form.project_id} onChange={e => setForm(p => ({ ...p, project_id: e.target.value }))}>
                    <option value="">-- Tidak Terkait Proyek --</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-md text-xs font-bold uppercase tracking-widest transition-all"
                  style={{ background: '#D4AF37', color: '#050505' }}>
                  {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan...</> : '✓ Simpan & Jurnal Otomatis'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="text-xs font-bold text-[--color-text-muted] hover:text-[--color-text-primary] transition-colors">
                  Batal
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expense List */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-[--color-text-primary] font-bold text-sm">Riwayat Pengeluaran</h2>
          </div>
          <span className="text-[10px] uppercase tracking-widest font-bold text-[--color-text-muted]">
            {activeExpenses.length} aktif · {voidedExpenses.length} void
          </span>
        </div>

        {activeExpenses.length === 0 && voidedExpenses.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="w-10 h-10 mx-auto text-white/10 mb-3" />
            <p className="text-[--color-text-muted] text-sm">Belum ada pengeluaran tercatat.</p>
            <p className="text-[--color-text-muted] text-xs mt-1">Klik "Catat Baru" untuk mulai.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {expenses.map(exp => {
              const isVoid = (exp as any).status === 'VOID'
              const isVoiding = voidingId === exp.id
              return (
                <div key={exp.id} className={`flex items-center justify-between px-5 py-3.5 transition-colors ${isVoid ? 'opacity-40' : 'hover:bg-white/[0.015]'}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium text-[--color-text-primary] truncate ${isVoid ? 'line-through' : ''}`}>
                        {exp.description}
                      </p>
                      {isVoid && (
                        <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                          VOID
                        </span>
                      )}
                    </div>
                    <p className="text-[--color-text-muted] text-xs mt-0.5">
                      {formatDate(exp.expense_date)}
                      {exp.category && ` · ${exp.category}`}
                      {exp.project && ` · Proyek: ${exp.project.name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <span className={`text-sm font-bold font-mono tabular-nums ${isVoid ? 'text-neutral-500' : 'text-red-400'}`}>
                      −{formatRupiah(exp.amount)}
                    </span>
                    {!isVoid && (
                      <button
                        onClick={() => handleVoid(exp.id)}
                        disabled={isVoiding}
                        className="p-1.5 rounded hover:bg-red-500/10 hover:text-red-400 transition-colors text-[--color-text-muted]"
                        title="Void / Batalkan"
                      >
                        {isVoiding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    )}
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