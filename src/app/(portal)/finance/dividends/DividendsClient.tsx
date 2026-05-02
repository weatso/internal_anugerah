'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { formatRupiah } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Loader2, CheckCircle2, History, TrendingUp, Landmark, Plus, X, Edit2 } from 'lucide-react'

const COLORS = ['#D4AF37','#10b981','#6366f1','#f97316','#a855f7','#ef4444']
const TABS = ['Profit Split','Dividen','History'] as const
type Tab = typeof TABS[number]

export default function DividendsClient({ stakeholders:initSh, entities, bankAccounts, history, coas }:
  { stakeholders:any[]; entities:any[]; bankAccounts:any[]; history:any[]; coas:any[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('Profit Split')
  const [stakeholders, setStakeholders] = useState(initSh)
  const [entity, setEntity] = useState(entities[0]?.id||'')
  const [period, setPeriod] = useState(()=>{const n=new Date();return`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`})
  const [bank, setBank] = useState(bankAccounts[0]?.id||'')
  const [loading,setLoading]=useState(false)
  const [netProfit,setNetProfit]=useState<number|null>(null)
  // Dividen manual
  const [divAmount,setDivAmount]=useState('')
  const [divBank,setDivBank]=useState(bankAccounts[0]?.id||'')
  const [divPeriod,setDivPeriod]=useState(()=>{const n=new Date();return`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`})
  const [divEq, setDivEq] = useState(entities[0]?.id||'')
  const [distributing,setDistributing]=useState(false)
  // Stakeholder modal
  const [shModal,setShModal]=useState<'add'|'edit'|null>(null)
  const [editSh,setEditSh]=useState<any>(null)
  const [shForm,setShForm]=useState({name:'',payout_type:'PROFIT_SPLIT',equity_percentage:0,profit_split_percentage:0,bank_name:'',bank_account_number:'',bank_account_holder:'',is_active:true})
  const inp='w-full rounded-md px-3 py-2.5 text-sm outline-none input-field'
  const psSh=stakeholders.filter(s=>s.is_active&&(s.payout_type==='PROFIT_SPLIT'||!s.payout_type))
  const divSh=stakeholders.filter(s=>s.is_active&&s.payout_type==='DIVIDEND')
  const totalSplit=psSh.reduce((a,s)=>a+Number(s.profit_split_percentage),0)
  const pieData=psSh.map((s,i)=>({name:s.name,value:Number(s.profit_split_percentage),color:COLORS[i%COLORS.length]}))

  async function calcNetProfit(){
    setLoading(true);setNetProfit(null)
    try{
      const[y,m]=period.split('-').map(Number)
      const start=`${period}-01`,end=new Date(y,m,0).toISOString().slice(0,10)
      const{data:js}=await supabase.from('journal_entries').select('id').eq('entity_id',entity).eq('status','APPROVED').gte('transaction_date',start).lte('transaction_date',end)
      const ids=(js||[]).map((j:any)=>j.id)
      if(!ids.length){toast.error('Tidak ada transaksi');setLoading(false);return}
      const{data:lines}=await supabase.from('journal_lines').select('debit,credit,chart_of_accounts(account_class)').in('journal_id',ids)
      let rev=0,cost=0
      for(const l of(lines||[])as any[]){
        const cls=l.chart_of_accounts?.account_class
        if(cls==='REVENUE')rev+=Number(l.credit)-Number(l.debit)
        if(cls==='COGS'||cls==='EXPENSE')cost+=Number(l.debit)-Number(l.credit)
      }
      setNetProfit(rev-cost)
    }catch{toast.error('Gagal menghitung')}
    setLoading(false)
  }

  async function distributePS(){
    setDistributing(true)
    try{
      const res=await fetch('/api/finance/dividends/distribute',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({entity_id:entity,period_month:period,bank_account_id:bank,distribution_type:'PROFIT_SPLIT'})})
      const d=await res.json()
      if(!res.ok)throw new Error(d.error)
      toast.success(`Profit Split ke ${d.distributed} stakeholder!`)
      setNetProfit(null);router.refresh()
    }catch(e:any){toast.error(e.message)}
    setDistributing(false)
  }

  async function distributeDiv(){
    if(!divAmount||Number(divAmount)<=0)return toast.error('Masukkan nominal dividen')
    setDistributing(true)
    try{
      const res=await fetch('/api/finance/dividends/distribute',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({entity_id:divEq,period_month:divPeriod,bank_account_id:divBank,distribution_type:'DIVIDEND',manual_amount:Number(divAmount)})})
      const d=await res.json()
      if(!res.ok)throw new Error(d.error)
      toast.success(`Dividen ke ${d.distributed} stakeholder!`)
      setDivAmount('');router.refresh()
    }catch(e:any){toast.error(e.message)}
    setDistributing(false)
  }

  async function saveSh(e:React.FormEvent){
    e.preventDefault()
    try{
      if(shModal==='edit'&&editSh)await supabase.from('stakeholders').update(shForm).eq('id',editSh.id)
      else await supabase.from('stakeholders').insert([shForm])
      toast.success('Stakeholder disimpan');setShModal(null);router.refresh()
    }catch(err:any){toast.error(err.message)}
  }

  return(
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] font-bold mb-1" style={{color:'var(--gold)'}}>Finance</p>
          <h1 className="text-2xl font-black" style={{color:'var(--text-primary)'}}>Profit Split & Dividen</h1>
        </div>
        <button onClick={()=>{setShForm({name:'',payout_type:'PROFIT_SPLIT',equity_percentage:0,profit_split_percentage:0,bank_name:'',bank_account_number:'',bank_account_holder:'',is_active:true});setShModal('add')}}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg" style={{background:'var(--gold-glow)',color:'var(--gold)'}}>
          <Plus className="w-3.5 h-3.5"/>Stakeholder
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{background:'var(--bg-secondary)'}}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t)} className="px-5 py-2 rounded-md text-sm font-bold transition-all"
            style={tab===t?{background:'var(--gold)',color:'#050505'}:{color:'var(--text-muted)'}}>
            {t==='Profit Split'?'📊 Profit Split':t==='Dividen'?'💰 Dividen':'📋 History'}
          </button>
        ))}
      </div>

      {/* PROFIT SPLIT TAB */}
      {tab==='Profit Split'&&(
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider" style={{color:'var(--text-muted)'}}>PROFIT SPLIT Stakeholders</p>
            {pieData.length>0&&(
              <div className="glass-card p-4">
                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value">
                      {pieData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Pie><Tooltip formatter={(v:any)=>`${v}%`} contentStyle={{background:'var(--bg-elevated)',border:'1px solid var(--border-subtle)',borderRadius:8,fontSize:12}}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className={`text-center text-xs font-bold mt-1 ${totalSplit===100?'text-emerald-500':'text-amber-500'}`}>
                  Total: {totalSplit}% {totalSplit!==100&&'⚠️ harus 100%'}
                </p>
              </div>
            )}
            {psSh.map((sh,i)=>(
              <div key={sh.id} className="glass-card p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{background:COLORS[i%COLORS.length]}}/>
                  <div>
                    <p className="text-sm font-bold" style={{color:'var(--text-primary)'}}>{sh.name}</p>
                    <p className="text-[11px]" style={{color:'var(--text-muted)'}}>{sh.profit_split_percentage}% profit</p>
                  </div>
                </div>
                <button onClick={()=>{setEditSh(sh);setShForm(sh);setShModal('edit')}} style={{color:'var(--text-muted)'}}>
                  <Edit2 className="w-3.5 h-3.5"/>
                </button>
              </div>
            ))}
            {psSh.length===0&&<p className="text-xs text-center py-6" style={{color:'var(--text-muted)'}}>Belum ada stakeholder Profit Split.</p>}
          </div>
          <div className="xl:col-span-2 glass-card p-6 space-y-4">
            <h2 className="text-sm font-bold" style={{color:'var(--text-primary)'}}>Hitung & Distribusikan dari Net Profit</h2>
            <p className="text-xs" style={{color:'var(--text-muted)'}}>Net Profit = Revenue − COGS − Expense (dari General Ledger bulan tersebut)</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="section-label block mb-1.5">Divisi</label>
                <select className="select-field w-full" value={entity} onChange={e=>setEntity(e.target.value)}>
                  {entities.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div><label className="section-label block mb-1.5">Periode</label>
                <input type="month" className="input-field w-full px-3 py-2.5 text-sm rounded-md" value={period} onChange={e=>setPeriod(e.target.value)}/>
              </div>
            </div>
            <button onClick={calcNetProfit} disabled={loading} className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
              style={{background:'var(--bg-secondary)',color:'var(--text-primary)',border:'1px solid var(--border-subtle)'}}>
              {loading?<Loader2 className="w-4 h-4 animate-spin"/>:<><TrendingUp className="w-4 h-4"/>Hitung Net Profit</>}
            </button>
            {netProfit!==null&&(
              <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="p-5 rounded-xl space-y-4" style={{background:'var(--bg-secondary)',border:'1px solid var(--border-subtle)'}}>
                <div className="text-center">
                  <p className="text-xs uppercase tracking-widest font-bold mb-1" style={{color:'var(--text-muted)'}}>Net Profit</p>
                  <p className={`text-3xl font-black tabular-nums ${netProfit>=0?'text-emerald-400':'text-red-400'}`}>{formatRupiah(netProfit)}</p>
                </div>
                {netProfit>0&&<>
                  <div className="space-y-2">
                    {psSh.map((sh,i)=>(
                      <div key={sh.id} className="flex justify-between text-sm">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{background:COLORS[i%COLORS.length]}}/><span style={{color:'var(--text-secondary)'}}>{sh.name} ({sh.profit_split_percentage}%)</span></div>
                        <span className="font-bold tabular-nums" style={{color:COLORS[i%COLORS.length]}}>{formatRupiah(Math.round(netProfit*Number(sh.profit_split_percentage)/100))}</span>
                      </div>
                    ))}
                  </div>
                  <div><label className="section-label block mb-1.5">Debet dari Rekening</label>
                    <select className="select-field w-full" value={bank} onChange={e=>setBank(e.target.value)}>
                      {bankAccounts.map(b=><option key={b.id} value={b.id}>{b.account_name}</option>)}
                    </select>
                  </div>
                  <button onClick={distributePS} disabled={distributing||totalSplit!==100}
                    className="w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                    style={{background:totalSplit===100?'var(--gold)':'var(--bg-secondary)',color:totalSplit===100?'#050505':'var(--text-muted)'}}>
                    {distributing?<Loader2 className="w-4 h-4 animate-spin"/>:<><CheckCircle2 className="w-4 h-4"/>Distribusikan Profit Split</>}
                  </button>
                  {totalSplit!==100&&<p className="text-xs text-amber-500 text-center">Total split harus 100%</p>}
                </>}
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* DIVIDEN TAB */}
      {tab==='Dividen'&&(
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider" style={{color:'var(--text-muted)'}}>DIVIDEN Stakeholders (Shareholders)</p>
            {divSh.map((sh,i)=>(
              <div key={sh.id} className="glass-card p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{background:COLORS[i%COLORS.length]}}/>
                  <div>
                    <p className="text-sm font-bold" style={{color:'var(--text-primary)'}}>{sh.name}</p>
                    <p className="text-[11px]" style={{color:'var(--text-muted)'}}>{sh.equity_percentage}% equity</p>
                  </div>
                </div>
                <button onClick={()=>{setEditSh(sh);setShForm(sh);setShModal('edit')}} style={{color:'var(--text-muted)'}}><Edit2 className="w-3.5 h-3.5"/></button>
              </div>
            ))}
            {divSh.length===0&&<p className="text-xs text-center py-6" style={{color:'var(--text-muted)'}}>Belum ada stakeholder Dividen.<br/>Tambah stakeholder dengan payout_type=DIVIDEND.</p>}
          </div>
          <div className="xl:col-span-2 glass-card p-6 space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg" style={{background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.2)'}}>
              <Landmark className="w-5 h-5 mt-0.5 shrink-0" style={{color:'#6366f1'}}/>
              <div>
                <p className="text-sm font-bold" style={{color:'#818cf8'}}>Dividen dari Retained Earnings</p>
                <p className="text-xs mt-0.5" style={{color:'var(--text-muted)'}}>Berbeda dari Profit Split — dividen diambil dari laba yang ditahan (akumulatif). Input nominal total yang akan dibagikan, sistem akan membagi proporsional per equity %.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="section-label block mb-1.5">Entitas</label>
                <select className="select-field w-full" value={divEq} onChange={e=>setDivEq(e.target.value)}>
                  {entities.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div><label className="section-label block mb-1.5">Periode</label>
                <input type="month" className="input-field w-full px-3 py-2.5 text-sm rounded-md" value={divPeriod} onChange={e=>setDivPeriod(e.target.value)}/>
              </div>
            </div>
            <div><label className="section-label block mb-1.5">Total Nominal Dividen (Rp)</label>
              <input type="number" className="input-field w-full px-3 py-2.5 text-sm rounded-md" placeholder="500000000" value={divAmount} onChange={e=>setDivAmount(e.target.value)}/>
            </div>
            {divAmount&&Number(divAmount)>0&&divSh.length>0&&(
              <div className="glass-card p-4 space-y-2">
                <p className="text-xs font-bold uppercase" style={{color:'var(--text-muted)'}}>Preview Distribusi</p>
                {divSh.map((sh,i)=>(
                  <div key={sh.id} className="flex justify-between text-sm">
                    <span style={{color:'var(--text-secondary)'}}>{sh.name} ({sh.equity_percentage}%)</span>
                    <span className="font-bold tabular-nums" style={{color:COLORS[i%COLORS.length]}}>{formatRupiah(Math.round(Number(divAmount)*Number(sh.equity_percentage)/100))}</span>
                  </div>
                ))}
              </div>
            )}
            <div><label className="section-label block mb-1.5">Debet dari Rekening</label>
              <select className="select-field w-full" value={divBank} onChange={e=>setDivBank(e.target.value)}>
                {bankAccounts.map(b=><option key={b.id} value={b.id}>{b.account_name}</option>)}
              </select>
            </div>
            <button onClick={distributeDiv} disabled={distributing||!divAmount||divSh.length===0}
              className="w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
              style={{background:'#6366f1',color:'#fff',opacity:divSh.length===0?0.5:1}}>
              {distributing?<Loader2 className="w-4 h-4 animate-spin"/>:<><CheckCircle2 className="w-4 h-4"/>Distribusikan Dividen</>}
            </button>
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {tab==='History'&&(
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-2" style={{borderColor:'var(--border-subtle)'}}>
            <History className="w-4 h-4" style={{color:'var(--gold)'}}/>
            <p className="font-bold text-sm" style={{color:'var(--text-primary)'}}>Riwayat Distribusi</p>
          </div>
          {history.length===0?<div className="text-center py-12" style={{color:'var(--text-muted)'}}>Belum ada riwayat distribusi.</div>:(
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase font-bold border-b" style={{borderColor:'var(--border-subtle)',background:'var(--bg-secondary)',color:'var(--text-muted)'}}>
                <tr>
                  <th className="px-5 py-3 text-left">Penerima</th>
                  <th className="px-5 py-3 text-left">Periode</th>
                  <th className="px-5 py-3 text-left">Tipe</th>
                  <th className="px-5 py-3 text-left">Ref Jurnal</th>
                  <th className="px-5 py-3 text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{borderColor:'var(--border-subtle)'}}>
                {history.map(h=>(
                  <tr key={h.id} className="hover:bg-white/[0.015]">
                    <td className="px-5 py-3 font-bold" style={{color:'var(--text-primary)'}}>{(h.stakeholder as any)?.name||'—'}</td>
                    <td className="px-5 py-3 font-mono text-xs" style={{color:'var(--text-muted)'}}>{h.period_month}</td>
                    <td className="px-5 py-3">
                      <span className="text-[10px] font-bold px-2 py-1 rounded uppercase"
                        style={h.distribution_type==='PROFIT_SPLIT'?{background:'rgba(16,185,129,0.1)',color:'#10b981'}:{background:'rgba(99,102,241,0.1)',color:'#818cf8'}}>
                        {h.distribution_type||'DIVIDEND'}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs" style={{color:'var(--gold)'}}>{(h.journal as any)?.reference_number||'—'}</td>
                    <td className="px-5 py-3 text-right font-bold tabular-nums text-emerald-400">{formatRupiah(Number(h.distributed_amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Stakeholder Modal */}
      {shModal&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)'}}>
          <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} className="w-full max-w-md p-6 rounded-xl space-y-4"
            style={{background:'var(--bg-elevated)',border:'1px solid var(--border-subtle)'}}>
            <div className="flex items-center justify-between">
              <h2 className="font-black" style={{color:'var(--text-primary)'}}>{shModal==='add'?'Tambah':'Edit'} Stakeholder</h2>
              <button onClick={()=>setShModal(null)} style={{color:'var(--text-muted)'}}><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={saveSh} className="space-y-3">
              <input className={inp} placeholder="Nama" required value={shForm.name} onChange={e=>setShForm(p=>({...p,name:e.target.value}))}/>
              <div><label className="section-label block mb-1.5">Tipe Penerima</label>
                <select className="select-field w-full" value={shForm.payout_type} onChange={e=>setShForm(p=>({...p,payout_type:e.target.value}))}>
                  <option value="PROFIT_SPLIT">Profit Split (dari Net Profit bulan berjalan)</option>
                  <option value="DIVIDEND">Dividen (dari Retained Earnings)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className={inp} type="number" placeholder="Equity %" min={0} max={100} value={shForm.equity_percentage} onChange={e=>setShForm(p=>({...p,equity_percentage:Number(e.target.value)}))}/>
                <input className={inp} type="number" placeholder="Profit Split %" min={0} max={100} value={shForm.profit_split_percentage} onChange={e=>setShForm(p=>({...p,profit_split_percentage:Number(e.target.value)}))}/>
              </div>
              <input className={inp} placeholder="Nama Bank" value={shForm.bank_name||''} onChange={e=>setShForm(p=>({...p,bank_name:e.target.value}))}/>
              <input className={inp} placeholder="No. Rekening" value={shForm.bank_account_number||''} onChange={e=>setShForm(p=>({...p,bank_account_number:e.target.value}))}/>
              <input className={inp} placeholder="Atas Nama" value={shForm.bank_account_holder||''} onChange={e=>setShForm(p=>({...p,bank_account_holder:e.target.value}))}/>
              <button type="submit" className="w-full py-2.5 rounded-lg font-bold text-sm" style={{background:'var(--gold)',color:'#050505'}}>Simpan</button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
