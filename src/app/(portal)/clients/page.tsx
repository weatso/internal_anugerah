'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { motion } from 'framer-motion'
import { Plus, Building2, User, Phone, Mail, X, ShieldAlert, CheckCircle2, Search } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'

// Standarisasi Industri (Data Hygiene)
const INDUSTRY_OPTIONS = [
  "Technology & Software",
  "Events & Entertainment",
  "Creative & Digital Media",
  "Retail & Consumer Goods",
  "Finance & Banking",
  "Real Estate & Construction",
  "Government & Public Sector",
  "Education & Non-Profit",
  "Healthcare & Wellness",
  "Other"
]

export default function CRMMasterPage() {
  const { profile, effectiveEntity, highestRole } = useUser()
  const supabase = createClient()

  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Form State
  const [form, setForm] = useState({
    company_name: '', industry_type: '', npwp: '', billing_address: '',
    pic_name: '', pic_phone: '', pic_email: '', pic_position: ''
  })

  useEffect(() => {
    fetchClients()
  }, [])

  async function fetchClients() {
    setLoading(true)
    const { data, error } = await supabase
      .from('clients')
      .select('*, entities:acquired_by_entity(name, primary_color)')
      .order('company_name', { ascending: true })

    if (data) setClients(data)
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { error } = await supabase.from('clients').insert([{
        ...form,
        acquired_by_entity: effectiveEntity?.id
      }])

      if (error) throw error

      setShowForm(false)
      // Reset Form
      setForm({ company_name: '', industry_type: '', npwp: '', billing_address: '', pic_name: '', pic_phone: '', pic_email: '', pic_position: '' })
      fetchClients()
    } catch (error: any) {
      alert(`Gagal menyimpan klien: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleBlacklist(clientId: string, currentStatus: boolean) {
    if (highestRole !== 'CEO') return alert('Hanya CEO yang dapat mengubah status Blacklist.')

    await supabase.from('clients').update({ is_blacklisted: !currentStatus }).eq('id', clientId)
    fetchClients()
  }

  const filteredClients = clients.filter(c =>
    c.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.pic_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading && clients.length === 0) return <div className="p-8 text-[--color-text-primary] font-mono text-xs uppercase tracking-widest">Memuat Database Klien...</div>

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-[slide-up_0.4s_ease]">

      {/* HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <p className="text-[#C5A028] text-xs uppercase tracking-[0.3em] font-bold mb-1">Commercial Hub</p>
          <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tighter">Client Relationship Management</h1>
          <p className="text-gray-500 text-sm mt-1">Master Data Perusahaan & Klien Holding</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Cari Klien..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-[--color-bg-elevated] border border-white/10 rounded-sm text-sm text-[--color-text-primary] focus:border-[#C5A028] focus:outline-none w-64 transition-all"
            />
          </div>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-[#C5A028] text-black font-bold px-4 py-2 rounded-sm text-xs uppercase tracking-widest hover:bg-[#D4AF37] transition-colors">
            <Plus className="w-4 h-4" /> Klien Baru
          </button>
        </div>
      </div>

      {/* TABLE DATA KLIEN */}
      <div className="glass-card overflow-hidden border border-white/5">
        {filteredClients.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-50" />
            <p className="text-gray-400 font-medium">Tidak ada data klien ditemukan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[--color-bg-elevated] border-b border-white/5 text-[10px] uppercase tracking-widest font-bold text-gray-400">
                <tr>
                  <th className="px-6 py-4">Perusahaan</th>
                  <th className="px-6 py-4">Informasi PIC</th>
                  <th className="px-6 py-4">Akuisisi (Divisi)</th>
                  <th className="px-6 py-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredClients.map(client => (
                  <tr key={client.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-[--color-text-primary] mb-0.5">{client.company_name}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{client.industry_type || 'Unknown Industry'}</p>
                      {client.npwp && <p className="text-[9px] font-mono text-gray-600 mt-1">NPWP: {client.npwp}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-200">{client.pic_name}</p>
                      <p className="text-[10px] text-gray-500 mb-1">{client.pic_position || 'PIC'}</p>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-mono text-[#C5A028] flex items-center gap-1"><Phone size={10} /> {client.pic_phone || '-'}</span>
                        <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1"><Mail size={10} /> {client.pic_email || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] px-2 py-1 bg-white/5 rounded-sm uppercase tracking-widest border border-white/10" style={{ color: client.entities?.primary_color || '#888' }}>
                        {client.entities?.name || 'Holding'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {client.is_blacklisted ? (
                        <button onClick={() => toggleBlacklist(client.id, true)} className="text-[9px] px-2 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-sm uppercase tracking-widest font-bold">Blacklisted</button>
                      ) : (
                        <button onClick={() => toggleBlacklist(client.id, false)} className="text-[9px] px-2 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-sm uppercase tracking-widest font-bold cursor-default hover:bg-red-500/10 hover:text-red-500 transition-colors group">
                          <span className="group-hover:hidden">Active</span>
                          <span className="hidden group-hover:inline">Block?</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL TAMBAH KLIEN */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card w-full max-w-2xl overflow-hidden border border-white/10">
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[--color-bg-elevated]">
              <div>
                <h2 className="text-[--color-text-primary] font-bold text-lg">Registrasi Klien Baru</h2>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Database Holding Anugerah Ventures</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-[--color-text-primary] transition-colors p-1"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              {/* Seksi Perusahaan */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-[#C5A028] uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2"><Building2 size={14} /> Entitas Perusahaan</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Nama Perusahaan / Klien *</label>
                    <input type="text" required className="input-prestige" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} placeholder="PT Indo Kreatif Digital" />
                  </div>
                  {/* EKSEKUSI DROPDOWN INDUSTRI */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Sektor Industri *</label>
                    <select
                      required
                      className="input-prestige appearance-none cursor-pointer"
                      value={form.industry_type}
                      onChange={e => setForm({ ...form, industry_type: e.target.value })}
                    >
                      <option value="" disabled>Pilih Sektor...</option>
                      {INDUSTRY_OPTIONS.map((option) => (
                        <option key={option} value={option} className="bg-[--color-bg-elevated] text-[--color-text-primary]">
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest">NPWP (Opsional)</label>
                    <input type="text" className="input-prestige font-mono" value={form.npwp} onChange={e => setForm({ ...form, npwp: e.target.value })} placeholder="00.000.000.0-000.000" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Alamat Penagihan (Billing Address)</label>
                    <textarea rows={2} className="input-prestige resize-none" value={form.billing_address} onChange={e => setForm({ ...form, billing_address: e.target.value })} placeholder="Alamat lengkap untuk dicetak di Invoice..." />
                  </div>
                </div>
              </div>

              {/* Seksi PIC */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-[#C5A028] uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2"><User size={14} /> Person in Charge (PIC)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Nama Lengkap PIC *</label>
                    <input type="text" required className="input-prestige" value={form.pic_name} onChange={e => setForm({ ...form, pic_name: e.target.value })} placeholder="Budi Santoso" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Jabatan</label>
                    <input type="text" className="input-prestige" value={form.pic_position} onChange={e => setForm({ ...form, pic_position: e.target.value })} placeholder="Marketing Manager" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Nomor Telepon / WA</label>
                    <input type="text" className="input-prestige font-mono" value={form.pic_phone} onChange={e => setForm({ ...form, pic_phone: e.target.value })} placeholder="+62 812..." />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Alamat Email</label>
                    <input type="email" className="input-prestige font-mono" value={form.pic_email} onChange={e => setForm({ ...form, pic_email: e.target.value })} placeholder="budi@perusahaan.com" />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-[--color-text-primary] uppercase tracking-widest transition-colors">Batal</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-[#C5A028] hover:bg-[#B8962E] text-black font-black py-3 px-6 rounded-sm flex items-center gap-2 uppercase tracking-widest transition-colors disabled:opacity-50"
                >
                  {submitting ? 'MENYIMPAN...' : <><CheckCircle2 size={16} /> SIMPAN DATA KLIEN</>}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}