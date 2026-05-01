'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { formatRupiah } from '@/lib/utils'
import { Loader2, TrendingUp, CheckCircle2, Coins, ArrowRight, X } from 'lucide-react'
import type { Stakeholder, ChartOfAccount } from '@/types'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function DividendsPage() {
  const { profile, loading: userLoading } = useUser()
  const supabase = createClient()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [journals, setJournals] = useState<any[]>([])
  const [distributions, setDistributions] = useState<any[]>([])

  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedBankId, setSelectedBankId] = useState<string>('')
  
  // Persentase sisa laba bersih (setelah profit split investor) yang akan dibagikan ke Owner (sisanya = Laba Ditahan)
  const [ownerPayoutRatio, setOwnerPayoutRatio] = useState<number>(100) 

  useEffect(() => {
    if (!userLoading && profile?.role !== 'CEO') {
      toast.error('Akses ditolak.')
      router.push('/finance')
      return
    }
    if (profile?.role === 'CEO') {
      fetchData()
    }
  }, [profile, userLoading, filterMonth, filterYear])

  const periodMonthStr = `${filterYear}-${filterMonth.toString().padStart(2, '0')}`

  async function fetchData() {
    setLoading(true)
    
    const [{ data: sData }, { data: aData }, { data: jData }, { data: dData }] = await Promise.all([
      supabase.from('stakeholders').select('*').order('name'),
      supabase.from('chart_of_accounts').select('*'),
      supabase.from('journal_entries').select('*, lines:journal_lines(*)').eq('status', 'APPROVED'),
      supabase.from('dividend_distributions').select('*').eq('period_month', periodMonthStr)
    ])

    if (sData) setStakeholders(sData)
    if (aData) setAccounts(aData)
    if (jData) setJournals(jData)
    if (dData) setDistributions(dData)
      
    setLoading(false)
  }

  // Calculate Net Profit
  const netProfit = useMemo(() => {
    let rev = 0
    let exp = 0
    
    const monthJournals = journals.filter(j => {
      const parts = j.transaction_date.split('-')
      if (parts.length < 3) return false
      return Number(parts[1]) === filterMonth && Number(parts[0]) === filterYear
    })

    const revIds = accounts.filter(a => a.account_class === 'REVENUE').map(a => a.id)
    const expIds = accounts.filter(a => a.account_class === 'EXPENSE' || a.account_class === 'COGS').map(a => a.id)

    monthJournals.forEach(j => {
      j.lines.forEach((l: any) => {
        if (revIds.includes(l.account_id)) {
          rev += (l.credit - l.debit)
        } else if (expIds.includes(l.account_id)) {
          exp += (l.debit - l.credit)
        }
      })
    })

    return rev - exp
  }, [journals, accounts, filterMonth, filterYear])

  const hasDistributed = distributions.length > 0
  const bankAccounts = accounts.filter(a => a.is_bank)

  // --- CALCULATION LOGIC ---
  
  // 1. Investor Profit Split (dari Laba Bersih Kotor)
  const investors = stakeholders.filter(s => s.type === 'INVESTOR' && s.profit_split_percentage > 0)
  const investorAllocations = investors.map(s => ({
    stakeholder_id: s.id,
    name: s.name,
    type: s.type,
    percentage: s.profit_split_percentage,
    percentage_label: 'Profit Split',
    distributed_amount: netProfit > 0 ? (netProfit * (s.profit_split_percentage / 100)) : 0
  }))

  const totalInvestorSplit = investorAllocations.reduce((s, a) => s + a.distributed_amount, 0)
  
  // 2. Sisa Laba setelah dipotong Investor
  const netProfitAfterSplit = Math.max(0, netProfit - totalInvestorSplit)

  // 3. Porsi Dividen Pemegang Saham (Owner)
  const totalOwnerDividend = netProfitAfterSplit * (ownerPayoutRatio / 100)
  
  // 4. Laba Ditahan (Retained Earnings yang benar-benar tersimpan)
  const retainedInCompany = netProfitAfterSplit - totalOwnerDividend

  // 5. Alokasi per Owner berdasarkan persentase saham (Equity)
  const owners = stakeholders.filter(s => s.type === 'OWNER')
  const totalOwnerEquity = owners.reduce((s, o) => s + Number(o.equity_percentage), 0)
  
  const ownerAllocations = owners.map(s => {
    // Normalisasi jika total equity tidak 100%
    const relativeShare = totalOwnerEquity > 0 ? (Number(s.equity_percentage) / totalOwnerEquity) : 0
    return {
      stakeholder_id: s.id,
      name: s.name,
      type: s.type,
      percentage: s.equity_percentage,
      percentage_label: 'Saham',
      distributed_amount: totalOwnerDividend * relativeShare
    }
  }).filter(a => a.distributed_amount > 0)

  // Gabungkan semua alokasi untuk disubmit ke API
  const allAllocations = [...investorAllocations, ...ownerAllocations]
  const totalDistributed = allAllocations.reduce((s, a) => s + a.distributed_amount, 0)

  async function handleDistribute(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedBankId) return toast.error('Pilih rekening bank sumber dana')
    if (netProfit <= 0) return toast.error('Tidak ada profit untuk dibagikan')
    if (allAllocations.length === 0) return toast.error('Tidak ada stakeholder untuk dibagikan')
    
    setSubmitting(true)
    try {
      const res = await fetch('/api/finance/dividends/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period_month: periodMonthStr,
          bank_account_id: selectedBankId,
          total_net_profit: netProfit,
          distributions: allAllocations
        })
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      toast.success('Dividen / Profit Share berhasil dieksekusi!')
      setShowModal(false)
      fetchData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && journals.length === 0) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" /></div>
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6 animate-[slide-up_0.4s_ease]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[#D4AF37] text-xs uppercase tracking-[0.3em] font-bold mb-1">Financial Distribution</p>
          <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight">Dividen & Profit Share</h1>
          <p className="text-[--color-text-muted] text-sm mt-1">Sistem otomatis distribusi laba bersih ke Owner & Investor.</p>
        </div>
        
        {/* Periode Filter */}
        <div className="flex items-center gap-3 bg-black/50 p-2 rounded-lg border border-white/10">
          <span className="text-xs text-gray-400 font-bold uppercase tracking-widest pl-2">Periode Profit:</span>
          <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} className="bg-transparent text-[--color-text-primary] text-sm font-bold focus:outline-none cursor-pointer">
            {Array.from({ length: 12 }).map((_, i) => <option key={i} value={i + 1} className="bg-[--color-bg-primary]">{new Date(0, i).toLocaleString('id-ID', { month: 'long' })}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="bg-transparent text-[--color-text-primary] text-sm font-bold focus:outline-none cursor-pointer pr-2">
            {[2025, 2026, 2027].map(y => <option key={y} value={y} className="bg-[--color-bg-primary]">{y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Net Profit Card */}
        <div className="glass-card p-6 md:col-span-2 relative overflow-hidden border border-white/5">
          <div className="absolute top-0 right-0 p-6 opacity-10"><Coins className="w-32 h-32 text-[#D4AF37]" /></div>
          <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1 relative z-10">Laba Bersih Kotor (Net Profit)</h3>
          <p className="text-sm text-gray-500 mb-4 relative z-10">Konsolidasi Holding • {new Date(filterYear, filterMonth - 1).toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</p>
          <p className={`text-5xl font-black relative z-10 tracking-tight ${netProfit >= 0 ? 'text-[#D4AF37]' : 'text-red-500'}`}>
            {formatRupiah(netProfit)}
          </p>
          
          <div className="grid grid-cols-2 gap-4 mt-6 relative z-10 border-t border-white/10 pt-4">
            <div>
               <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Total Hak Investor ({totalInvestorSplit > 0 ? (totalInvestorSplit/netProfit*100).toFixed(0) : 0}%)</p>
               <p className="text-emerald-400 font-bold">{formatRupiah(totalInvestorSplit)}</p>
            </div>
            <div>
               <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Sisa Laba Pemegang Saham</p>
               <p className="text-blue-400 font-bold">{formatRupiah(netProfitAfterSplit)}</p>
            </div>
          </div>

          {hasDistributed && (
            <div className="mt-6 flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded border border-emerald-500/20 inline-flex text-xs font-bold uppercase tracking-widest">
              <CheckCircle2 className="w-4 h-4" /> Dividen Periode Ini Telah Dibagikan
            </div>
          )}
        </div>

        {/* Action Card */}
        <div className="glass-card p-6 flex flex-col justify-center border-l-4 border-l-blue-500 border-y border-r border-white/5">
          <div className="mb-6">
            <h3 className="text-[--color-text-primary] font-bold text-sm mb-2">Kebijakan Dividen Pemegang Saham</h3>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">Dari Sisa Laba <strong className="text-blue-400">{formatRupiah(netProfitAfterSplit)}</strong>, berapa persentase yang ingin dicairkan sebagai Dividen Owner?</p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input 
                  type="range" min="0" max="100" step="5" 
                  value={ownerPayoutRatio} 
                  onChange={e => setOwnerPayoutRatio(Number(e.target.value))}
                  disabled={hasDistributed}
                  className="flex-1 accent-blue-500"
                />
                <span className="text-[--color-text-primary] font-bold font-mono bg-white/10 px-2 py-1 rounded text-xs">{ownerPayoutRatio}%</span>
              </div>
              
              <div className="bg-blue-500/10 p-3 rounded border border-blue-500/20">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-blue-400">Dividen Cair:</span>
                  <span className="text-[--color-text-primary] font-bold">{formatRupiah(totalOwnerDividend)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Laba Ditahan:</span>
                  <span className="text-[--color-text-primary] font-bold">{formatRupiah(retainedInCompany)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            disabled={hasDistributed || netProfit <= 0 || allAllocations.length === 0}
            onClick={() => setShowModal(true)}
            className="w-full bg-[#D4AF37] hover:bg-[#F5D678] disabled:opacity-30 disabled:hover:bg-[#D4AF37] text-black font-black uppercase tracking-widest text-xs py-4 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            Eksekusi Pembagian <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stakeholders Allocation Table */}
      <div className="glass-card overflow-hidden border border-white/5">
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-[--color-text-primary] font-bold">Rincian Alokasi Transfer</h3>
          <span className="text-xs bg-white/10 text-gray-300 px-3 py-1 rounded-full">{allAllocations.length} Rekening Tujuan</span>
        </div>
        
        {allAllocations.length === 0 ? (
          <div className="p-10 text-center text-gray-500 text-sm">Tidak ada stakeholder atau laba yang bisa dibagikan.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {allAllocations.map((a, i) => (
              <div key={i} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border ${a.type === 'INVESTOR' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                    {a.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-[--color-text-primary] font-bold">{a.name}</h4>
                    <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{a.type}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-8 md:text-right">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">{a.percentage_label}</p>
                    <p className={`${a.type === 'INVESTOR' ? 'text-emerald-400' : 'text-blue-400'} font-mono font-bold text-sm`}>{a.percentage}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Nominal Cair</p>
                    <p className="text-[--color-text-primary] font-black text-lg">{formatRupiah(a.distributed_amount)}</p>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="p-5 flex justify-between items-center bg-white/5">
               <span className="text-gray-400 font-bold uppercase tracking-widest text-xs">Total Kas Keluar</span>
               <span className="text-[#D4AF37] font-black text-xl">{formatRupiah(totalDistributed)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Eksekusi Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[--color-text-primary] font-black text-lg">Konfirmasi Pembagian</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-[--color-text-primary]"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg">
                <p className="text-xs text-emerald-400 uppercase tracking-widest font-bold mb-1">Total Kas Yang Dikeluarkan</p>
                <p className="text-2xl font-black text-[--color-text-primary]">{formatRupiah(totalDistributed)}</p>
                <div className="flex gap-2 mt-2 text-[10px] text-gray-400 font-mono">
                  <span>INV: {formatRupiah(totalInvestorSplit)}</span> | 
                  <span>OWNER: {formatRupiah(totalOwnerDividend)}</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-2 block">Pilih Rekening Sumber Dana (Kas)</label>
                <select 
                  value={selectedBankId} 
                  onChange={e => setSelectedBankId(e.target.value)}
                  className="w-full bg-black border border-white/20 rounded-md px-4 py-3 text-[--color-text-primary] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] outline-none transition-all font-medium"
                >
                  <option value="">-- Pilih Rekening Bank --</option>
                  {bankAccounts.map(b => (
                    <option key={b.id} value={b.id}>{b.account_name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-500 mt-2">Aksi ini akan mencatat Jurnal Pengeluaran (Kredit: Bank, Debit: Prive/Dividen) dan memotong saldo real perusahaan.</p>
              </div>

              <button 
                onClick={handleDistribute}
                disabled={submitting || !selectedBankId}
                className="w-full bg-[#D4AF37] hover:bg-[#F5D678] disabled:opacity-50 text-black font-black uppercase tracking-widest text-xs py-4 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Keluarkan Dana & Jurnal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
