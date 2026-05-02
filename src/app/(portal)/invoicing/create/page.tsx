'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { formatRupiah } from '@/lib/utils'
import { Plus, Trash2, ChevronRight, X, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface LineItem {
  id: number
  description: string
  qty: number
  original_price: number
  discount_amount: number
  unit_price: number
  total_price: number
  is_recurring: boolean
  duration_months: number
  revenue_account_id: string
}

interface Commission {
  id: number
  recipient_type: 'internal' | 'external'
  recipient_profile_id: string
  recipient_name: string
  is_percentage: boolean
  commission_percentage: number
  commission_amount: number
}

export default function DocumentBuilderPage() {
  const { profile, effectiveEntity } = useUser()
  const supabase = createClient()
  const router = useRouter()

  const [clients, setClients] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [revenueAccounts, setRevenueAccounts] = useState<{ id: string; account_name: string }[]>([])
  const [deferredAccountId, setDeferredAccountId] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [clientId, setClientId] = useState('')
  const [docType, setDocType] = useState('INVOICE')
  const [title, setTitle] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [blocks, setBlocks] = useState([{ id: Date.now(), content: '' }])
  const [taxRate, setTaxRate] = useState(0)

  const [lineItems, setLineItems] = useState<LineItem[]>([{
    id: Date.now(), description: '', qty: 1,
    original_price: 0, discount_amount: 0, unit_price: 0, total_price: 0,
    is_recurring: false, duration_months: 1, revenue_account_id: '',
  }])

  const [commissions, setCommissions] = useState<Commission[]>([])

  useEffect(() => {
    async function init() {
      const [{ data: c }, { data: p }, { data: coa }] = await Promise.all([
        supabase.from('clients').select('id, company_name, pic_name').order('company_name'),
        supabase.from('profiles').select('id, full_name'),
        supabase.from('chart_of_accounts').select('id, account_code, account_name, account_class').eq('is_active', true),
      ])
      if (c) setClients(c)
      if (p) setProfiles(p)
      if (coa) {
        setRevenueAccounts(coa.filter((a: any) => a.account_class === 'REVENUE'))
        const deferred = coa.find((a: any) => a.account_code === '2-1000')
        if (deferred) setDeferredAccountId(deferred.id)
      }
      setLoading(false)
    }
    init()
  }, [])

  function updateLine(id: number, field: string, value: any) {
    setLineItems(prev => prev.map(item => {
      if (item.id !== id) return item
      const u = { ...item, [field]: value }
      if (field === 'original_price' || field === 'discount_amount') {
        u.unit_price = Math.max(0, Number(u.original_price) - Number(u.discount_amount))
      }
      if (field === 'unit_price') u.original_price = Number(value)
      u.total_price = Number(u.qty) * Number(u.unit_price || u.original_price)
      return u
    }))
  }

  function addLine() {
    setLineItems(p => [...p, {
      id: Date.now(), description: '', qty: 1,
      original_price: 0, discount_amount: 0, unit_price: 0, total_price: 0,
      is_recurring: false, duration_months: 1,
      revenue_account_id: revenueAccounts[0]?.id || '',
    }])
  }

  function updateCommission(id: number, field: string, value: any) {
    setCommissions(prev => prev.map(c => {
      if (c.id !== id) return c
      const u = { ...c, [field]: value }
      if (field === 'is_percentage' || field === 'commission_percentage') {
        u.commission_amount = u.is_percentage
          ? Math.round(grandTotal * (Number(u.commission_percentage) / 100))
          : u.commission_amount
      }
      return u
    }))
  }

  const subtotal = lineItems.reduce((s, i) => s + i.total_price, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const grandTotal = subtotal + taxAmount

  // Recalculate %-based commissions when grandTotal changes
  useEffect(() => {
    setCommissions(prev => prev.map(c =>
      c.is_percentage ? { ...c, commission_amount: Math.round(grandTotal * (c.commission_percentage / 100)) } : c
    ))
  }, [grandTotal])

  async function handleSave() {
    if (!clientId || !title) { toast.error('Klien dan Judul wajib diisi'); return }
    setSubmitting(true)
    try {
      const docCode = { OFFERING_LETTER: 'OFF', SPK: 'SPK', BAST: 'BAST', PROFORMA_INVOICE: 'PRO', INVOICE: 'INV', MANAGEMENT_FEE: 'MF' }[docType] || 'DOC'
      const divCode = effectiveEntity?.name.substring(0, 3).toUpperCase() || 'AV'
      const docNumber = `${docCode}/${divCode}/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`

      const { data: doc, error: docErr } = await supabase.from('commercial_documents').insert({
        entity_id: effectiveEntity?.id,
        client_id: clientId,
        doc_type: docType,
        doc_number: docNumber,
        title,
        content_blocks: blocks,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        grand_total: grandTotal,
        status: 'DRAFT',
        issue_date: issueDate,
        due_date: dueDate || null,
        created_by: profile?.id,
      }).select().single()
      if (docErr) throw docErr

      if (doc && subtotal > 0) {
        const validLines = lineItems.filter(i => i.description.trim())
        if (validLines.length > 0) {
          await supabase.from('document_line_items').insert(validLines.map((item, idx) => ({
            document_id: doc.id,
            description: item.description,
            quantity: item.qty,
            original_price: item.original_price || item.unit_price,
            discount_amount: item.discount_amount || 0,
            unit_price: item.unit_price || item.original_price,
            total_price: item.total_price,
            sort_order: idx,
            is_recurring: item.is_recurring,
            duration_months: item.is_recurring ? item.duration_months : null,
            revenue_account_id: item.revenue_account_id || null,
            deferred_account_id: item.is_recurring ? deferredAccountId : null,
          })))
        }

        const validComm = commissions.filter(c => c.commission_amount > 0)
        if (validComm.length > 0) {
          await supabase.from('commissions').insert(validComm.map(c => ({
            invoice_id: doc.id,
            recipient_profile_id: c.recipient_type === 'internal' ? c.recipient_profile_id : null,
            recipient_name: c.recipient_type === 'internal'
              ? profiles.find(p => p.id === c.recipient_profile_id)?.full_name
              : c.recipient_name,
            commission_percentage: c.is_percentage ? c.commission_percentage : 0,
            commission_amount: c.commission_amount,
            status: 'DRAFT',
          })))
        }
      }

      toast.success('Dokumen berhasil disimpan sebagai DRAFT.')
      router.push('/invoicing')
    } catch (err: any) {
      toast.error(`Gagal: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'w-full bg-transparent border-b py-1 text-sm focus:outline-none transition-colors'
  const fieldCls = 'w-full rounded-md px-3 py-2.5 text-sm outline-none input-field'

  if (loading) return <div className="p-8 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>Memuat Generator Dokumen...</div>

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b pb-6" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: 'var(--text-muted)' }}>
          <span>Commercial Hub</span><ChevronRight className="w-3 h-3" /><span style={{ color: 'var(--gold)' }}>Document Builder</span>
        </div>
        <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Pembuatan Dokumen Komersial</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Divisi: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{effectiveEntity?.name || 'Holding'}</span></p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT: Meta */}
        <div className="lg:col-span-1 space-y-5">
          <div className="glass-card p-5 space-y-4" style={{ borderTopColor: 'var(--gold)', borderTopWidth: 2 }}>
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>Relasi Klien</h2>
            <div>
              <label className="section-label block mb-1.5">Klien *</label>
              <select className={fieldCls} value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="" disabled>-- Pilih Klien --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="section-label block mb-1.5">Tipe Dokumen *</label>
              <select className={`${fieldCls} font-bold`} style={{ color: 'var(--gold)' }} value={docType} onChange={e => setDocType(e.target.value)}>
                <option value="OFFERING_LETTER">Offering Letter</option>
                <option value="SPK">SPK</option>
                <option value="BAST">BAST</option>
                <option value="PROFORMA_INVOICE">Proforma Invoice</option>
                <option value="INVOICE">Invoice</option>
                <option value="MANAGEMENT_FEE">Management Fee</option>
              </select>
            </div>
            <div>
              <label className="section-label block mb-1.5">Judul Proyek *</label>
              <input className={fieldCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="Contoh: Event Launching Q3..." />
            </div>
          </div>

          <div className="glass-card p-5 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>Waktu</h2>
            <div>
              <label className="section-label block mb-1.5">Tanggal Terbit</label>
              <input type="date" className={fieldCls} value={issueDate} onChange={e => setIssueDate(e.target.value)} />
            </div>
            <div>
              <label className="section-label block mb-1.5">Jatuh Tempo</label>
              <input type="date" className={fieldCls} value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>

        {/* RIGHT: Content + Line Items + Commissions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Paragraphs */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>Teks Paragraf</h2>
              <button onClick={() => setBlocks(p => [...p, { id: Date.now(), content: '' }])}
                className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1" style={{ color: 'var(--gold)' }}>
                <Plus className="w-3 h-3" /> Tambah Blok
              </button>
            </div>
            <div className="space-y-3">
              {blocks.map((b, i) => (
                <div key={b.id} className="relative group">
                  <div className="absolute -left-3 top-2 bottom-2 w-1 rounded-full transition-colors"
                    style={{ background: 'var(--gold)', opacity: 0.2 }} />
                  <textarea rows={3} className="w-full rounded-md p-3 text-sm resize-y outline-none input-field"
                    placeholder="Isi paragraf..." value={b.content}
                    onChange={e => setBlocks(p => p.map(x => x.id === b.id ? { ...x, content: e.target.value } : x))} />
                  {blocks.length > 1 && (
                    <button onClick={() => setBlocks(p => p.filter(x => x.id !== b.id))}
                      className="absolute right-2 top-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Line Items */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>Rincian Harga (Line Items)</h2>
              <button onClick={addLine} className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1" style={{ color: 'var(--gold)' }}>
                <Plus className="w-3 h-3" /> Tambah Item
              </button>
            </div>

            <div className="space-y-4">
              {lineItems.map((item, idx) => (
                <div key={item.id} className="rounded-lg p-4 space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <input className={`${inputCls} flex-1`} style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                      placeholder="Deskripsi jasa / barang..." value={item.description}
                      onChange={e => updateLine(item.id, 'description', e.target.value)} />
                    {lineItems.length > 1 && (
                      <button onClick={() => setLineItems(p => p.filter(i => i.id !== item.id))}
                        className="mt-1 p-1 rounded hover:text-red-400 transition-colors" style={{ color: 'var(--text-muted)' }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Numeric fields */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Qty</label>
                      <input type="number" min={1} className={`${inputCls} font-mono`} style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                        value={item.qty} onChange={e => updateLine(item.id, 'qty', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Harga Asli (Rp)</label>
                      <input type="number" min={0} className={`${inputCls} font-mono`} style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                        value={item.original_price} onChange={e => updateLine(item.id, 'original_price', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#f97316' }}>Diskon (Rp)</label>
                      <input type="number" min={0} className={`${inputCls} font-mono`} style={{ borderColor: '#f97316', color: '#f97316' }}
                        value={item.discount_amount} onChange={e => updateLine(item.id, 'discount_amount', Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Total Baris</label>
                      <p className="mt-1 font-black font-mono text-sm" style={{ color: 'var(--gold)' }}>{formatRupiah(item.total_price)}</p>
                    </div>
                  </div>

                  {/* Revenue account + Recurring */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Akun Revenue</label>
                      <select className="select-field w-full text-xs mt-1" value={item.revenue_account_id}
                        onChange={e => updateLine(item.id, 'revenue_account_id', e.target.value)}>
                        <option value="">-- Pilih Akun --</option>
                        {revenueAccounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        <input type="checkbox" checked={item.is_recurring}
                          onChange={e => updateLine(item.id, 'is_recurring', e.target.checked)}
                          className="accent-[var(--gold)]" />
                        <RefreshCw className="w-3 h-3" /> Recurring / Amortisasi
                      </label>
                      {item.is_recurring && (
                        <div className="mt-2">
                          <label className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>Durasi (Bulan)</label>
                          <input type="number" min={1} max={60} className={`${inputCls} font-mono`}
                            style={{ borderColor: 'var(--gold)', color: 'var(--gold)' }}
                            value={item.duration_months}
                            onChange={e => updateLine(item.id, 'duration_months', Number(e.target.value))} />
                          <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                            ≈ {formatRupiah(item.original_price / item.duration_months)} / bln
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-5 border-t pt-4 w-64 ml-auto space-y-2" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>Subtotal:</span><span className="font-mono">{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs items-center" style={{ color: 'var(--text-muted)' }}>
                <select className="bg-transparent border rounded text-[10px] p-0.5 focus:outline-none" style={{ borderColor: 'var(--border-subtle)' }}
                  value={taxRate} onChange={e => setTaxRate(Number(e.target.value))}>
                  <option value={0}>Non-PPN (0%)</option>
                  <option value={11}>PPN (11%)</option>
                </select>
                <span className="font-mono">{formatRupiah(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t pt-2" style={{ borderColor: 'var(--border-subtle)', color: 'var(--gold)' }}>
                <span>GRAND TOTAL:</span><span className="font-mono">{formatRupiah(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Commission Section */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>Komisi (Opsional)</h2>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Akan aktif otomatis saat invoice PAID</p>
              </div>
              <button onClick={() => setCommissions(p => [...p, {
                id: Date.now(), recipient_type: 'external', recipient_profile_id: '',
                recipient_name: '', is_percentage: true, commission_percentage: 0, commission_amount: 0,
              }])} className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1" style={{ color: 'var(--gold)' }}>
                <Plus className="w-3 h-3" /> Tambah
              </button>
            </div>

            {commissions.length === 0 && (
              <p className="text-center py-4 text-sm" style={{ color: 'var(--text-muted)' }}>Tidak ada komisi untuk dokumen ini.</p>
            )}

            <div className="space-y-3">
              {commissions.map(c => (
                <div key={c.id} className="rounded-lg p-3 grid grid-cols-2 md:grid-cols-4 gap-3 items-end"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Tipe Penerima</label>
                    <select className="select-field w-full text-xs mt-1" value={c.recipient_type}
                      onChange={e => updateCommission(c.id, 'recipient_type', e.target.value)}>
                      <option value="external">Pihak Luar</option>
                      <option value="internal">Tim Internal</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Penerima</label>
                    {c.recipient_type === 'internal' ? (
                      <select className="select-field w-full text-xs mt-1" value={c.recipient_profile_id}
                        onChange={e => updateCommission(c.id, 'recipient_profile_id', e.target.value)}>
                        <option value="">-- Pilih --</option>
                        {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                      </select>
                    ) : (
                      <input className="input-field w-full px-2 py-1.5 text-xs mt-1 rounded" placeholder="Nama penerima"
                        value={c.recipient_name} onChange={e => updateCommission(c.id, 'recipient_name', e.target.value)} />
                    )}
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                      <input type="checkbox" checked={c.is_percentage}
                        onChange={e => updateCommission(c.id, 'is_percentage', e.target.checked)}
                        className="accent-[var(--gold)]" />
                      Pakai %
                    </label>
                    {c.is_percentage ? (
                      <div className="flex items-center gap-1 mt-1">
                        <input type="number" min={0} max={100} className="input-field w-16 px-2 py-1.5 text-xs rounded text-center font-mono"
                          value={c.commission_percentage}
                          onChange={e => updateCommission(c.id, 'commission_percentage', Number(e.target.value))} />
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>% = {formatRupiah(c.commission_amount)}</span>
                      </div>
                    ) : (
                      <input type="number" min={0} className="input-field w-full px-2 py-1.5 text-xs mt-1 rounded font-mono"
                        placeholder="Nominal (Rp)" value={c.commission_amount}
                        onChange={e => updateCommission(c.id, 'commission_amount', Number(e.target.value))} />
                    )}
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => setCommissions(p => p.filter(x => x.id !== c.id))}
                      className="p-2 rounded hover:text-red-400 transition-colors" style={{ color: 'var(--text-muted)' }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <button onClick={handleSave} disabled={submitting}
              className="btn-primary flex items-center gap-2 py-3 px-8 text-sm">
              {submitting ? 'Menyimpan...' : '✓ Simpan Draft Dokumen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}