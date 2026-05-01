'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { ChartOfAccount, AccountClass, DivisionFinancialSetting, Entity, Stakeholder } from '@/types'
import { toast } from 'sonner'
import { Loader2, Landmark, Tags, PiggyBank, Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

export default function MasterDataPage() {
  const { profile, loading: userLoading } = useUser()
  const router = useRouter()
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<'accounts' | 'limit' | 'stakeholders'>('accounts')
  
  // States
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [limits, setLimits] = useState<(DivisionFinancialSetting & { entity?: Entity })[]>([])
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  
  const [loading, setLoading] = useState(false)

  // Fetch Data
  useEffect(() => {
    if (!userLoading && profile?.role !== 'CEO') {
      toast.error('Akses ditolak.')
      router.push('/finance')
      return
    }

    if (profile?.role === 'CEO') {
      fetchMasterData()
    }
  }, [profile, userLoading, router])

  async function fetchMasterData() {
    // Accounts
    const { data: aData } = await supabase.from('chart_of_accounts').select('*').order('account_code', { ascending: true })
    if (aData) setAccounts(aData)

    // Limits
    const { data: lData } = await supabase.from('division_financial_settings').select('*, entity:entities(*)')
    if (lData) setLimits(lData)

    // Stakeholders
    const { data: sData } = await supabase.from('stakeholders').select('*').order('created_at', { ascending: true })
    if (sData) setStakeholders(sData)
  }

  // --- Account Actions ---
  const [accForm, setAccForm] = useState({ account_class: 'EXPENSE' as AccountClass, account_name: '', is_bank: false })
  
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Auto Generate Code Logic
    const prefixMap: Record<AccountClass, string> = {
      'ASSET': '1', 'LIABILITY': '2', 'EQUITY': '3', 'REVENUE': '4', 'COGS': '5', 'EXPENSE': '6'
    }
    const prefix = prefixMap[accForm.account_class]
    
    // Find highest code in this class
    const classAccounts = accounts.filter(a => a.account_class === accForm.account_class)
    let nextNum = 1000
    if (classAccounts.length > 0) {
      const nums = classAccounts.map(a => parseInt(a.account_code.split('-')[1]))
      nextNum = Math.max(...nums) + 10 // increment by 10
    }
    
    const generatedCode = `${prefix}-${nextNum}`

    const { error } = await supabase.from('chart_of_accounts').insert([{
      account_class: accForm.account_class,
      account_code: generatedCode,
      account_name: accForm.account_name,
      is_bank: accForm.account_class === 'ASSET' ? accForm.is_bank : false
    }])

    if (error) toast.error(error.message)
    else { 
      toast.success(`Akun ditambahkan dengan kode ${generatedCode}`)
      setAccForm({ account_class: 'EXPENSE', account_name: '', is_bank: false })
      fetchMasterData() 
    }
    setLoading(false)
  }

  const toggleAccountStatus = async (id: string, currentStatus: boolean) => {
    await supabase.from('chart_of_accounts').update({ is_active: !currentStatus }).eq('id', id)
    fetchMasterData()
  }

  // --- Limit Actions ---
  const handleUpdateLimit = async (entity_id: string, newLimit: number) => {
    const { error } = await supabase.from('division_financial_settings').update({ monthly_auto_approve_limit: newLimit }).eq('entity_id', entity_id)
    if (error) toast.error(error.message)
    else { toast.success('Limit diperbarui'); fetchMasterData() }
  }

  // --- Stakeholder Actions ---
  const [stkForm, setStkForm] = useState({ name: '', type: 'INVESTOR' as 'OWNER'|'INVESTOR', equity_percentage: 0, profit_split_percentage: 0 })
  const handleSaveStakeholder = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('stakeholders').insert([stkForm])
    if (error) toast.error(error.message)
    else { 
      toast.success('Stakeholder ditambahkan')
      setStkForm({ name: '', type: 'INVESTOR', equity_percentage: 0, profit_split_percentage: 0 })
      fetchMasterData() 
    }
    setLoading(false)
  }

  if (userLoading || profile?.role !== 'CEO') {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" /></div>
  }

  // Group accounts
  const groupedAccounts = accounts.reduce((acc, curr) => {
    if (!acc[curr.account_class]) acc[curr.account_class] = []
    acc[curr.account_class].push(curr)
    return acc
  }, {} as Record<string, ChartOfAccount[]>)

  const accountClasses: AccountClass[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE']

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-[slide-up_0.4s_ease]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[#D4AF37] text-xs uppercase tracking-[0.3em] font-bold mb-1">ERP Foundation</p>
          <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight">KAP Configuration</h1>
          <p className="text-[--color-text-muted] text-sm mt-1">Kelola Bank, Chart of Accounts, dan limit budget divisi.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-6 mb-8 border-b border-white/5 pb-4">
        <button onClick={() => setActiveTab('accounts')} className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 ${activeTab === 'accounts' ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'text-gray-500 hover:text-[--color-text-primary]'}`}><Landmark className="w-4 h-4" /> Chart of Accounts</button>
        <button onClick={() => setActiveTab('stakeholders')} className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 ${activeTab === 'stakeholders' ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'text-gray-500 hover:text-[--color-text-primary]'}`}><Users className="w-4 h-4" /> Stakeholders</button>
        <button onClick={() => setActiveTab('limit')} className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 ${activeTab === 'limit' ? 'bg-[#D4AF37]/15 text-[#D4AF37]' : 'text-gray-500 hover:text-[--color-text-primary]'}`}><PiggyBank className="w-4 h-4" /> Budget Limits</button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'accounts' && (
          <motion.div key="accounts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
              <div className="glass-card p-6 sticky top-8 border border-white/5">
                <h2 className="text-sm font-bold text-[--color-text-primary] mb-4">Tambah Akun KAP</h2>
                <form onSubmit={handleSaveAccount} className="space-y-4">
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Klasifikasi Akun</label>
                    <select value={accForm.account_class} onChange={e=>setAccForm({...accForm, account_class: e.target.value as AccountClass})} className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-[--color-text-primary] mt-1 focus:border-[#D4AF37]/50">
                      <option value="ASSET">Aset (Kas/Bank/Piutang)</option>
                      <option value="LIABILITY">Liabilitas (Utang/Pajak)</option>
                      <option value="EQUITY">Ekuitas (Modal/Laba)</option>
                      <option value="REVENUE">Pendapatan (Revenue)</option>
                      <option value="COGS">Harga Pokok (COGS)</option>
                      <option value="EXPENSE">Beban Operasional (Expense)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Nama Akun</label>
                    <input type="text" required value={accForm.account_name} onChange={e=>setAccForm({...accForm, account_name: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-[--color-text-primary] mt-1 focus:border-[#D4AF37]/50" placeholder="e.g. Kas Besar, Pendapatan SMM" />
                  </div>
                  {accForm.account_class === 'ASSET' && (
                    <label className="flex items-center gap-2 cursor-pointer mt-2 bg-white/5 p-3 rounded-md">
                      <input type="checkbox" checked={accForm.is_bank} onChange={e=>setAccForm({...accForm, is_bank: e.target.checked})} className="accent-[#D4AF37] w-4 h-4" />
                      <span className="text-xs text-[--color-text-primary]">Akun ini adalah Rekening Bank (Bisa dipilih saat input transaksi riil)</span>
                    </label>
                  )}
                  <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-md mt-2">
                    <p className="text-[10px] text-blue-400 leading-relaxed">Sistem akan secara otomatis me-<i>generate</i> Kode KAP sesuai urutan kelas tanpa perlu input manual.</p>
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-white/10 hover:bg-[#D4AF37]/20 text-[--color-text-primary] font-bold py-2.5 rounded-md transition-all text-xs uppercase tracking-widest mt-2">{loading ? 'Saving...' : 'Buat Akun'}</button>
                </form>
              </div>
            </div>
            
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
              {accountClasses.map(cls => (
                <div key={cls} className="space-y-3">
                  <h3 className="text-xs font-bold text-[#D4AF37] uppercase tracking-[0.2em] mb-4 border-b border-white/10 pb-2">{cls}</h3>
                  {(!groupedAccounts[cls] || groupedAccounts[cls].length === 0) ? (
                    <p className="text-xs text-gray-500 italic">Belum ada akun.</p>
                  ) : (
                    groupedAccounts[cls].map(acc => (
                      <div key={acc.id} className={`glass-card p-3 flex items-center justify-between ${!acc.is_active && 'opacity-40 grayscale'}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">{acc.account_code}</span>
                          <div>
                            <p className="font-bold text-[--color-text-primary] text-xs">{acc.account_name}</p>
                            {acc.is_bank && <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest">Bank Rekening</span>}
                          </div>
                        </div>
                        <button onClick={() => toggleAccountStatus(acc.id, acc.is_active)} className="text-[10px] text-gray-500 hover:text-[--color-text-primary] px-2 py-1 uppercase font-bold tracking-widest">
                          {acc.is_active ? 'Matikan' : 'Aktifkan'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'stakeholders' && (
          <motion.div key="stakeholders" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="glass-card p-6 border border-white/5">
                <h2 className="text-sm font-bold text-[--color-text-primary] mb-4">Tambah Stakeholder</h2>
                <form onSubmit={handleSaveStakeholder} className="space-y-4">
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Nama Lengkap</label>
                    <input type="text" required value={stkForm.name} onChange={e=>setStkForm({...stkForm, name: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-[--color-text-primary] mt-1 focus:border-[#D4AF37]/50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Tipe Stakeholder</label>
                    <select value={stkForm.type} onChange={e=>setStkForm({...stkForm, type: e.target.value as 'OWNER'|'INVESTOR'})} className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-[--color-text-primary] mt-1 focus:border-[#D4AF37]/50">
                      <option value="OWNER">Pemilik Utama (Owner)</option>
                      <option value="INVESTOR">Investor Eksternal / Partner</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Persentase Saham (Equity) %</label>
                    <input type="number" step="0.01" min="0" max="100" required value={stkForm.equity_percentage} onChange={e=>setStkForm({...stkForm, equity_percentage: parseFloat(e.target.value)})} className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-[--color-text-primary] mt-1 focus:border-[#D4AF37]/50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Persentase Profit Split %</label>
                    <input type="number" step="0.01" min="0" max="100" required value={stkForm.profit_split_percentage} onChange={e=>setStkForm({...stkForm, profit_split_percentage: parseFloat(e.target.value)})} className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-[--color-text-primary] mt-1 focus:border-[#D4AF37]/50" />
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-white/10 hover:bg-[#D4AF37]/20 text-[--color-text-primary] font-bold py-2.5 rounded-md transition-all text-xs uppercase tracking-widest mt-2">{loading ? 'Saving...' : 'Simpan Stakeholder'}</button>
                </form>
              </div>
            </div>
            
            <div className="lg:col-span-2 space-y-4">
              {stakeholders.length === 0 ? (
                <div className="glass-card p-6 text-center text-gray-400 text-sm border border-white/5">Belum ada stakeholder terdaftar.</div>
              ) : (
                stakeholders.map(s => (
                  <div key={s.id} className="glass-card p-5 flex items-center justify-between border-l-2 border-l-[#D4AF37] border-y border-r border-white/5">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-[--color-text-primary] text-base">{s.name}</h3>
                        <span className="text-[9px] bg-white/10 text-[--color-text-primary] px-2 py-0.5 rounded uppercase tracking-widest font-bold">{s.type}</span>
                      </div>
                      <div className="flex items-center gap-6 mt-2 text-xs">
                        <div>
                          <p className="text-gray-500 uppercase tracking-widest text-[9px] font-bold">Saham / Kepemilikan</p>
                          <p className="text-[--color-text-primary] font-mono mt-0.5">{s.equity_percentage}%</p>
                        </div>
                        <div>
                          <p className="text-gray-500 uppercase tracking-widest text-[9px] font-bold">Hak Profit Split</p>
                          <p className="text-[#D4AF37] font-bold font-mono mt-0.5">{s.profit_split_percentage}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'limit' && (
          <motion.div key="limit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="glass-card p-6 mb-4 border border-white/5">
              <h2 className="text-sm font-bold text-[--color-text-primary]">Division Auto-Approve Limits</h2>
              <p className="text-xs text-gray-400 mt-1">Atur limit pengeluaran per bulan bagi Head Division untuk melakukan auto-approve tanpa menunggu persetujuan CEO.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {limits.map(limit => (
                <div key={limit.entity_id} className="glass-card p-5 relative overflow-hidden group border border-white/5">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-[#D4AF37]/5 rounded-bl-full -z-10 transition-transform group-hover:scale-150" />
                  <h3 className="font-bold text-[--color-text-primary] mb-4">{limit.entity?.name}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Limit Bulanan (Rp)</label>
                      <input 
                        type="number" 
                        defaultValue={limit.monthly_auto_approve_limit} 
                        onBlur={(e) => handleUpdateLimit(limit.entity_id, Number(e.target.value))}
                        className="w-full bg-black/50 border border-white/10 rounded-md px-3 py-2 text-sm text-[--color-text-primary] mt-1 focus:border-[#D4AF37]/50" 
                      />
                    </div>
                    <div className="flex justify-between items-end p-3 rounded bg-white/5 border border-white/5">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Terpakai Bulan Ini</p>
                        <p className="text-sm font-bold text-[--color-text-primary]">Rp {Number(limit.current_month_usage).toLocaleString('id-ID')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1">Reset</p>
                        <p className="text-xs font-mono text-gray-300">{new Date(limit.last_reset_month).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
