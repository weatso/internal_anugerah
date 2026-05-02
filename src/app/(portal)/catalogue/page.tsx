'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { formatRupiah } from '@/lib/utils'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Plus, Tag, Repeat, CheckCircle2, X, Briefcase, BookOpen, Star } from 'lucide-react'

const TABS = ['Katalog Layanan', 'Portofolio Proyek'] as const
type Tab = typeof TABS[number]

const CLASS_COLOR: Record<string, string> = {
  Weatso: '#3b82f6', Evory: '#a855f7', 'Anugerah Ventures': '#D4AF37',
}

export default function CataloguePage() {
  const { highestRole } = useUser()
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('Katalog Layanan')
  const [services, setServices] = useState<any[]>([])
  const [portfolio, setPortfolio] = useState<any[]>([])
  const [coas, setCoas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', base_price: '', is_recurring: false, default_duration_months: 1, revenue_account_id: '', deferred_account_id: '' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: s }, { data: p }, { data: c }] = await Promise.all([
      supabase.from('service_catalog').select('*, revenue_account:chart_of_accounts!service_catalog_revenue_account_id_fkey(account_code,account_name), deferred_account:chart_of_accounts!service_catalog_deferred_account_id_fkey(account_code,account_name)').eq('is_active', true).order('name'),
      supabase.from('projects').select('*, clients(company_name), entities(name,primary_color)').eq('status', 'COMPLETED').order('updated_at', { ascending: false }),
      supabase.from('chart_of_accounts').select('id,account_code,account_name,account_class').eq('is_active', true),
    ])
    setServices(s || []); setPortfolio(p || []); setCoas(c || [])
    setLoading(false)
  }

  async function saveService(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('service_catalog').insert([{
      name: form.name, description: form.description,
      base_price: Number(form.base_price), is_recurring: form.is_recurring,
      default_duration_months: form.default_duration_months,
      revenue_account_id: form.revenue_account_id || null,
      deferred_account_id: form.deferred_account_id || null,
    }])
    if (error) return toast.error(error.message)
    toast.success('Layanan ditambahkan!'); setShowForm(false)
    setForm({ name: '', description: '', base_price: '', is_recurring: false, default_duration_months: 1, revenue_account_id: '', deferred_account_id: '' })
    fetchAll()
  }

  async function toggleService(id: string, current: boolean) {
    await supabase.from('service_catalog').update({ is_active: !current }).eq('id', id)
    fetchAll()
  }

  const isCEO = highestRole === 'CEO'
  const revenueAccs = coas.filter(c => c.account_class === 'REVENUE')
  const deferredAccs = coas.filter(c => c.account_class === 'LIABILITY')
  const inp = 'w-full rounded-md px-3 py-2.5 text-sm outline-none input-field'

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] font-bold mb-1" style={{ color: 'var(--gold)' }}>Sales & Marketing</p>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Katalog & Portofolio</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Pricelist layanan & rekam jejak proyek selesai.</p>
        </div>
        {isCEO && tab === 'Katalog Layanan' && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold"
            style={{ background: 'var(--gold)', color: '#050505' }}>
            <Plus className="w-4 h-4" /> Layanan Baru
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'var(--bg-secondary)' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className="px-5 py-2 rounded-md text-sm font-bold transition-all"
            style={tab === t ? { background: 'var(--gold)', color: '#050505' } : { color: 'var(--text-muted)' }}>
            {t === 'Katalog Layanan' ? '📦 Katalog & Pricelist' : '🏆 Portofolio'}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-16 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Memuat...</div>}

      {/* KATALOG */}
      {!loading && tab === 'Katalog Layanan' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {services.map((svc, i) => (
            <motion.div key={svc.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="glass-card p-5 flex flex-col gap-3 relative group">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-lg" style={{ background: 'var(--gold-glow)' }}>
                  <BookOpen className="w-5 h-5" style={{ color: 'var(--gold)' }} />
                </div>
                {svc.is_recurring && (
                  <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-1 rounded uppercase"
                    style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>
                    <Repeat className="w-3 h-3" /> Recurring
                  </span>
                )}
              </div>
              <div>
                <h2 className="font-black text-base" style={{ color: 'var(--text-primary)' }}>{svc.name}</h2>
                {svc.description && <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{svc.description}</p>}
              </div>
              <div className="mt-auto pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <p className="text-xl font-black tabular-nums" style={{ color: 'var(--gold)' }}>{formatRupiah(svc.base_price)}</p>
                {svc.is_recurring && <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>/ bulan · {svc.default_duration_months} bulan kontrak</p>}
              </div>
              <div className="space-y-1">
                {svc.revenue_account && (
                  <p className="text-[10px] font-mono flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <Tag className="w-3 h-3" /> Rev: {svc.revenue_account.account_code} {svc.revenue_account.account_name}
                  </p>
                )}
                {svc.deferred_account && (
                  <p className="text-[10px] font-mono flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <Tag className="w-3 h-3" /> Defer: {svc.deferred_account.account_code} {svc.deferred_account.account_name}
                  </p>
                )}
              </div>
              {isCEO && (
                <button onClick={() => toggleService(svc.id, svc.is_active)}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-[10px] px-2 py-1 rounded transition-all"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  Nonaktifkan
                </button>
              )}
            </motion.div>
          ))}
          {services.length === 0 && (
            <div className="col-span-3 text-center py-16 glass-card">
              <BookOpen className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-muted)' }}>Belum ada layanan. {isCEO && 'Klik "Layanan Baru" untuk mulai.'}</p>
            </div>
          )}
        </div>
      )}

      {/* PORTOFOLIO */}
      {!loading && tab === 'Portofolio Proyek' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {portfolio.map((proj, i) => (
            <motion.div key={proj.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="glass-card p-5 flex flex-col gap-3"
              style={{ borderLeft: `2px solid ${proj.entities?.primary_color || 'var(--border-subtle)'}` }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase px-2 py-1 rounded"
                  style={{ background: `${proj.entities?.primary_color || '#888'}15`, color: proj.entities?.primary_color || '#888' }}>
                  {proj.entities?.name}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Selesai
                </span>
              </div>
              <div>
                <h2 className="font-black" style={{ color: 'var(--text-primary)' }}>{proj.name}</h2>
                {proj.clients?.company_name && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>👤 {proj.clients.company_name}</p>
                )}
                {proj.description && <p className="text-xs mt-1 leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>{proj.description}</p>}
              </div>
              <div className="flex items-center gap-2 mt-auto">
                <Star className="w-3 h-3" style={{ color: 'var(--gold)' }} />
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {proj.end_date ? new Date(proj.end_date).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) : 'Selesai'}
                </span>
              </div>
            </motion.div>
          ))}
          {portfolio.length === 0 && (
            <div className="col-span-3 text-center py-16 glass-card">
              <Briefcase className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-muted)' }}>Belum ada proyek selesai.</p>
            </div>
          )}
        </div>
      )}

      {/* Add Service Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-lg p-6 rounded-xl space-y-4 max-h-[90vh] overflow-y-auto"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-black" style={{ color: 'var(--text-primary)' }}>Tambah Layanan</h2>
              <button onClick={() => setShowForm(false)} style={{ color: 'var(--text-muted)' }}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={saveService} className="space-y-3">
              <input className={inp} placeholder="Nama Layanan *" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              <textarea rows={2} className={inp + ' resize-none'} placeholder="Deskripsi singkat" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              <input type="number" className={inp} placeholder="Harga dasar (IDR) *" required value={form.base_price} onChange={e => setForm(p => ({ ...p, base_price: e.target.value }))} />
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                <input type="checkbox" checked={form.is_recurring} onChange={e => setForm(p => ({ ...p, is_recurring: e.target.checked }))} className="accent-[var(--gold)]" />
                Layanan Recurring (berulang tiap bulan)
              </label>
              {form.is_recurring && (
                <input type="number" className={inp} placeholder="Durasi default (bulan)" value={form.default_duration_months} onChange={e => setForm(p => ({ ...p, default_duration_months: Number(e.target.value) }))} />
              )}
              <div><label className="section-label block mb-1.5">Akun Revenue (COA)</label>
                <select className="select-field w-full" value={form.revenue_account_id} onChange={e => setForm(p => ({ ...p, revenue_account_id: e.target.value }))}>
                  <option value="">— Pilih Akun Revenue —</option>
                  {revenueAccs.map(a => <option key={a.id} value={a.id}>{a.account_code} - {a.account_name}</option>)}
                </select>
              </div>
              {form.is_recurring && (
                <div><label className="section-label block mb-1.5">Akun Deferred Revenue (Recurring)</label>
                  <select className="select-field w-full" value={form.deferred_account_id} onChange={e => setForm(p => ({ ...p, deferred_account_id: e.target.value }))}>
                    <option value="">— Pilih Akun Liability —</option>
                    {deferredAccs.map(a => <option key={a.id} value={a.id}>{a.account_code} - {a.account_name}</option>)}
                  </select>
                </div>
              )}
              <button type="submit" className="w-full py-2.5 rounded-lg font-bold text-sm" style={{ background: 'var(--gold)', color: '#050505' }}>Simpan Layanan</button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
