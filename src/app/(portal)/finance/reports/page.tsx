'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { formatRupiah } from '@/lib/utils'
import { Loader2, TrendingUp, Download, CheckCircle2 } from 'lucide-react'
import { ChartOfAccount, Entity } from '@/types'

export default function ReportsPage() {
  const { profile } = useUser()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [journals, setJournals] = useState<any[]>([])
  const [entities, setEntities] = useState<Entity[]>([])

  // Filters
  const [reportType, setReportType] = useState<'LABA_RUGI' | 'NERACA' | 'ARUS_KAS'>('LABA_RUGI')
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [filterDivision, setFilterDivision] = useState<string>('ALL')

  useEffect(() => {
    if (profile) fetchData()
  }, [profile])

  async function fetchData() {
    setLoading(true)
    
    // 1. Chart of Accounts
    const { data: coaData } = await supabase.from('chart_of_accounts').select('*').order('account_code', { ascending: true })
    if (coaData) setAccounts(coaData)

    // 2. Entities (Divisions)
    const { data: entityData } = await supabase.from('entities').select('*')
    if (entityData) setEntities(entityData)

    // 3. Approved Journals Only
    const { data: journalData } = await supabase.from('journal_entries')
      .select('*, lines:journal_lines(*)')
      .eq('status', 'APPROVED')
      .order('transaction_date', { ascending: true })

    if (journalData) setJournals(journalData)
    setLoading(false)
  }

  // --- Calculations ---

  // Helper: Filter by month/year (exact month)
  const isSelectedMonth = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.getMonth() + 1 === filterMonth && d.getFullYear() === filterYear
  }

  // Helper: Filter by "up to" month/year (for Balance Sheet)
  const isUpToSelectedMonth = (dateStr: string) => {
    const d = new Date(dateStr)
    if (d.getFullYear() < filterYear) return true
    if (d.getFullYear() === filterYear && d.getMonth() + 1 <= filterMonth) return true
    return false
  }

  // Calculate Balance for a set of journals and accounts
  const calculateAccountBalances = (targetJournals: any[], targetAccounts: ChartOfAccount[], isNormalCredit: boolean) => {
    const balances: Record<string, number> = {}
    targetAccounts.forEach(a => balances[a.id] = 0)

    targetJournals.forEach(j => {
      j.lines.forEach((line: any) => {
        if (balances[line.account_id] !== undefined) {
          if (isNormalCredit) {
            balances[line.account_id] += (line.credit - line.debit)
          } else {
            balances[line.account_id] += (line.debit - line.credit)
          }
        }
      })
    })

    return targetAccounts.map(a => ({
      ...a,
      balance: balances[a.id] || 0
    })).filter(a => a.balance !== 0)
  }

  // LABA RUGI (INCOME STATEMENT)
  const generateLabaRugi = () => {
    let filteredJournals = journals.filter(j => isSelectedMonth(j.transaction_date))
    if (filterDivision !== 'ALL') {
      filteredJournals = filteredJournals.filter(j => j.entity_id === filterDivision)
    }

    const revAccs = accounts.filter(a => a.account_class === 'REVENUE')
    const cogsAccs = accounts.filter(a => a.account_class === 'COGS')
    const expAccs = accounts.filter(a => a.account_class === 'EXPENSE')

    const revenues = calculateAccountBalances(filteredJournals, revAccs, true)
    const cogs = calculateAccountBalances(filteredJournals, cogsAccs, false)
    const expenses = calculateAccountBalances(filteredJournals, expAccs, false)

    const totalRevenue = revenues.reduce((s, a) => s + a.balance, 0)
    const totalCogs = cogs.reduce((s, a) => s + a.balance, 0)
    const grossProfit = totalRevenue - totalCogs
    const totalExpense = expenses.reduce((s, a) => s + a.balance, 0)
    const netIncome = grossProfit - totalExpense

    return { revenues, cogs, expenses, totalRevenue, totalCogs, grossProfit, totalExpense, netIncome }
  }

  // NERACA (BALANCE SHEET) - Consolidated (Up to selected date)
  const generateNeraca = () => {
    const filteredJournals = journals.filter(j => isUpToSelectedMonth(j.transaction_date))

    const assetAccs = accounts.filter(a => a.account_class === 'ASSET')
    const liabAccs = accounts.filter(a => a.account_class === 'LIABILITY')
    const eqAccs = accounts.filter(a => a.account_class === 'EQUITY')

    const assets = calculateAccountBalances(filteredJournals, assetAccs, false)
    const liabilities = calculateAccountBalances(filteredJournals, liabAccs, true)
    const equity = calculateAccountBalances(filteredJournals, eqAccs, true)

    // Calculate Laba Ditahan (Retained Earnings) dynamically
    const revAccs = accounts.filter(a => a.account_class === 'REVENUE')
    const cogsAccs = accounts.filter(a => a.account_class === 'COGS')
    const expAccs = accounts.filter(a => a.account_class === 'EXPENSE')
    
    const totalRev = calculateAccountBalances(filteredJournals, revAccs, true).reduce((s, a) => s + a.balance, 0)
    const totalCogs = calculateAccountBalances(filteredJournals, cogsAccs, false).reduce((s, a) => s + a.balance, 0)
    const totalExp = calculateAccountBalances(filteredJournals, expAccs, false).reduce((s, a) => s + a.balance, 0)
    const retainedEarnings = totalRev - totalCogs - totalExp

    const totalAssets = assets.reduce((s, a) => s + a.balance, 0)
    const totalLiab = liabilities.reduce((s, a) => s + a.balance, 0)
    const totalEq = equity.reduce((s, a) => s + a.balance, 0) + retainedEarnings

    return { assets, liabilities, equity, retainedEarnings, totalAssets, totalLiab, totalEq }
  }

  // ARUS KAS (CASH FLOW) - Simple Cash In / Cash Out
  const generateArusKas = () => {
    const filteredJournals = journals.filter(j => isSelectedMonth(j.transaction_date))
    // For simplicity, Cash Flow is consolidated
    const bankAccIds = accounts.filter(a => a.is_bank).map(a => a.id)

    const cashIn: any[] = []
    const cashOut: any[] = []

    filteredJournals.forEach(j => {
      const isBankDebit = j.lines.find((l: any) => bankAccIds.includes(l.account_id) && l.debit > 0)
      const isBankCredit = j.lines.find((l: any) => bankAccIds.includes(l.account_id) && l.credit > 0)
      const relatedCategory = j.lines.find((l: any) => !bankAccIds.includes(l.account_id))

      if (isBankDebit && relatedCategory) {
        cashIn.push({
          date: j.transaction_date,
          ref: j.reference_number,
          account_name: accounts.find(a => a.id === relatedCategory.account_id)?.account_name,
          amount: isBankDebit.debit
        })
      } else if (isBankCredit && relatedCategory) {
        cashOut.push({
          date: j.transaction_date,
          ref: j.reference_number,
          account_name: accounts.find(a => a.id === relatedCategory.account_id)?.account_name,
          amount: isBankCredit.credit
        })
      }
    })

    const totalIn = cashIn.reduce((s, c) => s + c.amount, 0)
    const totalOut = cashOut.reduce((s, c) => s + c.amount, 0)

    return { cashIn, cashOut, totalIn, totalOut, netCashFlow: totalIn - totalOut }
  }


  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" /></div>

  const lr = generateLabaRugi()
  const nr = generateNeraca()
  const ak = generateArusKas()

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-[slide-up_0.4s_ease]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[#D4AF37] text-xs uppercase tracking-[0.3em] font-bold mb-1">Financial Reports</p>
          <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight">Laporan Keuangan</h1>
          <p className="text-[--color-text-muted] text-sm mt-1">Neraca, Laba Rugi, dan Arus Kas secara real-time.</p>
        </div>
        
        {/* Controllers */}
        <div className="flex flex-wrap items-center gap-3 bg-black/50 p-2 rounded-lg border border-white/10">
          <select value={filterDivision} onChange={e => setFilterDivision(e.target.value)} disabled={reportType === 'NERACA' || reportType === 'ARUS_KAS'} className="bg-transparent text-[--color-text-primary] text-xs font-bold disabled:opacity-50 cursor-pointer outline-none">
            <option value="ALL" className="bg-[--color-bg-primary]">Semua Divisi (Konsolidasi)</option>
            {entities.map(e => <option key={e.id} value={e.id} className="bg-[--color-bg-primary]">{e.name}</option>)}
          </select>
          <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} className="bg-transparent text-[--color-text-primary] text-xs font-bold cursor-pointer outline-none">
            {Array.from({ length: 12 }).map((_, i) => <option key={i} value={i + 1} className="bg-[--color-bg-primary]">{new Date(0, i).toLocaleString('id-ID', { month: 'long' })}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="bg-transparent text-[--color-text-primary] text-xs font-bold cursor-pointer outline-none">
            {[2025, 2026, 2027].map(y => <option key={y} value={y} className="bg-[--color-bg-primary]">{y}</option>)}
          </select>
          <button className="text-[#D4AF37] hover:text-[#F5D678] transition-colors p-1"><Download className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-4">
        {(['LABA_RUGI', 'NERACA', 'ARUS_KAS'] as const).map(type => (
          <button key={type} onClick={() => setReportType(type)}
            className={`px-4 py-2 rounded-md text-[10px] font-bold transition-all uppercase tracking-widest ${reportType === type ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'text-gray-500 hover:text-[--color-text-primary]'}`}>
            {type.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* LABA RUGI View */}
      {reportType === 'LABA_RUGI' && (
        <div className="glass-card p-8 border border-white/5">
          <div className="text-center mb-8 border-b border-white/10 pb-6">
            <h2 className="text-xl font-black text-[--color-text-primary]">LAPORAN LABA RUGI</h2>
            <p className="text-gray-400 text-sm mt-1">Periode: {new Date(filterYear, filterMonth - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</p>
            {filterDivision !== 'ALL' && <p className="text-[#D4AF37] text-xs font-bold mt-2 bg-[#D4AF37]/10 inline-block px-3 py-1 rounded">Divisi: {entities.find(e => e.id === filterDivision)?.name}</p>}
          </div>

          <div className="space-y-6">
            {/* Revenue */}
            <div>
              <h3 className="text-[#D4AF37] font-bold border-b border-white/10 pb-2 mb-3 uppercase text-xs tracking-widest">Pendapatan (Revenue)</h3>
              {lr.revenues.map(a => (
                <div key={a.id} className="flex justify-between py-1.5 text-sm text-gray-300"><span>{a.account_name}</span><span>{formatRupiah(a.balance)}</span></div>
              ))}
              <div className="flex justify-between py-2 text-sm font-bold text-[--color-text-primary] border-t border-white/10 mt-2"><span>Total Pendapatan</span><span>{formatRupiah(lr.totalRevenue)}</span></div>
            </div>

            {/* COGS */}
            <div>
              <h3 className="text-[#D4AF37] font-bold border-b border-white/10 pb-2 mb-3 uppercase text-xs tracking-widest">Harga Pokok Penjualan (HPP)</h3>
              {lr.cogs.length === 0 ? <p className="text-xs text-gray-500 italic">Tidak ada transaksi.</p> : lr.cogs.map(a => (
                <div key={a.id} className="flex justify-between py-1.5 text-sm text-gray-300"><span>{a.account_name}</span><span>{formatRupiah(a.balance)}</span></div>
              ))}
              <div className="flex justify-between py-2 text-sm font-bold text-[--color-text-primary] border-t border-white/10 mt-2"><span>Total HPP</span><span>{formatRupiah(lr.totalCogs)}</span></div>
            </div>

            {/* Gross Profit */}
            <div className="bg-emerald-500/10 p-4 rounded border border-emerald-500/20 flex justify-between font-bold text-emerald-400">
              <span>Laba Kotor (Gross Profit)</span><span>{formatRupiah(lr.grossProfit)}</span>
            </div>

            {/* Opex */}
            <div>
              <h3 className="text-[#D4AF37] font-bold border-b border-white/10 pb-2 mb-3 uppercase text-xs tracking-widest">Biaya Operasional (Opex)</h3>
              {lr.expenses.length === 0 ? <p className="text-xs text-gray-500 italic">Tidak ada transaksi.</p> : lr.expenses.map(a => (
                <div key={a.id} className="flex justify-between py-1.5 text-sm text-gray-300"><span>{a.account_name}</span><span>{formatRupiah(a.balance)}</span></div>
              ))}
              <div className="flex justify-between py-2 text-sm font-bold text-[--color-text-primary] border-t border-white/10 mt-2"><span>Total Biaya Operasional</span><span>{formatRupiah(lr.totalExpense)}</span></div>
            </div>

            {/* Net Income */}
            <div className={`p-4 rounded border flex justify-between font-black text-lg mt-4 ${lr.netIncome >= 0 ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-red-500/20 border-red-500/50 text-red-400'}`}>
              <span>Laba Bersih (Net Income)</span><span>{formatRupiah(lr.netIncome)}</span>
            </div>
          </div>
        </div>
      )}

      {/* NERACA View */}
      {reportType === 'NERACA' && (
        <div className="glass-card p-8 border border-white/5">
          <div className="text-center mb-8 border-b border-white/10 pb-6">
            <h2 className="text-xl font-black text-[--color-text-primary]">NERACA (BALANCE SHEET)</h2>
            <p className="text-gray-400 text-sm mt-1">Per {new Date(filterYear, filterMonth, 0).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="text-blue-400 text-xs font-bold mt-2 bg-blue-500/10 inline-block px-3 py-1 rounded">Konsolidasi Holding</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* ASSETS */}
            <div>
              <h3 className="text-emerald-400 font-bold border-b border-emerald-400/20 pb-2 mb-4 uppercase tracking-widest">ASET (HARTA)</h3>
              {nr.assets.map(a => (
                <div key={a.id} className="flex justify-between py-1.5 text-sm text-gray-300"><span>{a.account_name}</span><span>{formatRupiah(a.balance)}</span></div>
              ))}
              <div className="flex justify-between py-3 text-base font-black text-emerald-400 border-t border-emerald-400/20 mt-4 bg-emerald-400/5 px-2 rounded">
                <span>TOTAL ASET</span><span>{formatRupiah(nr.totalAssets)}</span>
              </div>
            </div>

            {/* LIABILITIES & EQUITY */}
            <div className="space-y-8">
              <div>
                <h3 className="text-red-400 font-bold border-b border-red-400/20 pb-2 mb-4 uppercase tracking-widest">LIABILITAS (UTANG)</h3>
                {nr.liabilities.length === 0 ? <p className="text-xs text-gray-500 italic">Nihil.</p> : nr.liabilities.map(a => (
                  <div key={a.id} className="flex justify-between py-1.5 text-sm text-gray-300"><span>{a.account_name}</span><span>{formatRupiah(a.balance)}</span></div>
                ))}
                <div className="flex justify-between py-2 text-sm font-bold text-red-400 border-t border-red-400/20 mt-2">
                  <span>Total Utang</span><span>{formatRupiah(nr.totalLiab)}</span>
                </div>
              </div>

              <div>
                <h3 className="text-[#D4AF37] font-bold border-b border-[#D4AF37]/20 pb-2 mb-4 uppercase tracking-widest">EKUITAS (MODAL)</h3>
                {nr.equity.map(a => (
                  <div key={a.id} className="flex justify-between py-1.5 text-sm text-gray-300"><span>{a.account_name}</span><span>{formatRupiah(a.balance)}</span></div>
                ))}
                <div className="flex justify-between py-1.5 text-sm text-blue-300">
                  <span>Laba Bersih Berjalan</span><span>{formatRupiah(nr.retainedEarnings)}</span>
                </div>
                <div className="flex justify-between py-2 text-sm font-bold text-[#D4AF37] border-t border-[#D4AF37]/20 mt-2">
                  <span>Total Ekuitas</span><span>{formatRupiah(nr.totalEq)}</span>
                </div>
              </div>

              <div className="flex justify-between py-3 text-base font-black text-[--color-text-primary] border-t border-white/20 mt-4 bg-white/5 px-2 rounded">
                <span>TOTAL LIABILITAS & EKUITAS</span><span>{formatRupiah(nr.totalLiab + nr.totalEq)}</span>
              </div>

              {/* Balance Check Indicator */}
              <div className={`flex items-center justify-center gap-2 text-xs font-bold p-2 rounded ${nr.totalAssets === (nr.totalLiab + nr.totalEq) ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                {nr.totalAssets === (nr.totalLiab + nr.totalEq) ? <><CheckCircle2 className="w-4 h-4"/> NERACA SEIMBANG (BALANCED)</> : 'NERACA TIDAK SEIMBANG! CEK JURNAL.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ARUS KAS View */}
      {reportType === 'ARUS_KAS' && (
        <div className="glass-card p-8 border border-white/5">
          <div className="text-center mb-8 border-b border-white/10 pb-6">
            <h2 className="text-xl font-black text-[--color-text-primary]">ARUS KAS (CASH FLOW)</h2>
            <p className="text-gray-400 text-sm mt-1">Periode: {new Date(filterYear, filterMonth - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* CASH IN */}
            <div>
              <h3 className="text-emerald-400 font-bold border-b border-emerald-400/20 pb-2 mb-4 uppercase tracking-widest text-sm">UANG MASUK</h3>
              <div className="space-y-2">
                {ak.cashIn.map((c, i) => (
                  <div key={i} className="bg-emerald-400/5 p-3 rounded border border-emerald-400/10 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-[--color-text-primary]">{c.account_name}</p>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">{c.date} | {c.ref}</p>
                    </div>
                    <span className="text-emerald-400 font-bold text-sm">+{formatRupiah(c.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between py-3 text-sm font-black text-emerald-400 mt-4 border-t border-emerald-400/20">
                <span>TOTAL UANG MASUK</span><span>{formatRupiah(ak.totalIn)}</span>
              </div>
            </div>

            {/* CASH OUT */}
            <div>
              <h3 className="text-red-400 font-bold border-b border-red-400/20 pb-2 mb-4 uppercase tracking-widest text-sm">UANG KELUAR</h3>
              <div className="space-y-2">
                {ak.cashOut.map((c, i) => (
                  <div key={i} className="bg-red-400/5 p-3 rounded border border-red-400/10 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-[--color-text-primary]">{c.account_name}</p>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">{c.date} | {c.ref}</p>
                    </div>
                    <span className="text-red-400 font-bold text-sm">-{formatRupiah(c.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between py-3 text-sm font-black text-red-400 mt-4 border-t border-red-400/20">
                <span>TOTAL UANG KELUAR</span><span>{formatRupiah(ak.totalOut)}</span>
              </div>
            </div>
          </div>

          {/* NET CASH FLOW */}
          <div className="mt-8 border-t-2 border-[#D4AF37]/50 pt-6">
             <div className={`p-6 rounded-lg border-2 flex justify-between items-center ${ak.netCashFlow >= 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <div>
                  <h3 className="text-[--color-text-primary] font-black text-lg">CASH FLOW BERSIH BULAN INI</h3>
                  <p className="text-xs text-gray-400 mt-1">Selisih total uang masuk dan keluar pada bulan ini</p>
                </div>
                <span className={`text-3xl font-black ${ak.netCashFlow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatRupiah(ak.netCashFlow)}</span>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
