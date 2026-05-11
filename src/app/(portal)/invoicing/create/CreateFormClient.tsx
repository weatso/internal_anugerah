'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatRupiah } from '@/lib/utils'
import { Plus, Trash2, ChevronRight, X, RefreshCw, Save, Loader2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { getDocumentTemplate } from '@/lib/document-templates'

// 1. UPDATE INTERFACE
interface Props {
  entityId: string
  entityName: string
  userId: string
  activeRole: string
  allEntities: { id: string; name: string }[]
  initialData?: any // DITAMBAHKAN UNTUK MODE EDIT
}

interface LineItem {
  id: number
  description: string
  qty: number | ''
  original_price: number | ''
  discount_amount: number | ''
  unit_price: number | ''
  total_price: number
  is_recurring: boolean
  duration_months: number | ''
  revenue_account_id: string
  discount_type: 'nominal' | 'percentage'
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

// 2. MASUKKAN PROPS
export default function DocumentBuilderPage({ entityId, entityName, userId, activeRole, allEntities, initialData }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const isEditing = !!initialData

  const [clients, setClients] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [revenueAccounts, setRevenueAccounts] = useState<{ id: string; account_name: string }[]>([])
  const [deferredAccountId, setDeferredAccountId] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [catalogItems, setCatalogItems] = useState<any[]>([])
  const [showCatalog, setShowCatalog] = useState(false)

  // STATE BYPASS CEO & DASAR FORM
  const [selectedEntityId, setSelectedEntityId] = useState(initialData?.entity_id || entityId)
  const [selectedEntityName, setSelectedEntityName] = useState(
    initialData ? (allEntities.find(x => x.id === initialData.entity_id)?.name || entityName) : entityName
  )

  const [clientId, setClientId] = useState(initialData?.client_id || '')
  const [docType, setDocType] = useState(initialData?.doc_type || 'QUOTATION')
  const [title, setTitle] = useState(initialData?.title || '')
  const [issueDate, setIssueDate] = useState(initialData?.issue_date || new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState(initialData?.due_date || '')
  const [taxRate, setTaxRate] = useState(initialData?.tax_rate || 0)

  // MENGGUNAKAN SMART TEMPLATE ATAU DATA LAMA
  const [blocks, setBlocks] = useState<any[]>(
    initialData?.content_blocks || []
  )

  // ENGINE TEMPLATE OTOMATIS: Berubah saat divisi atau tipe dokumen diganti (hanya jika mode Buat Baru)
  useEffect(() => {
    if (!isEditing) {
      setBlocks(getDocumentTemplate(selectedEntityName, docType))
    }
  }, [docType, selectedEntityName, isEditing])

  // MENGAMBIL ITEM DARI DATABASE JIKA EDIT, ATAU DEFAULT KOSONG
  const [lineItems, setLineItems] = useState<LineItem[]>(
    initialData?.items?.map((item: any) => ({
      id: item.id || Date.now() + Math.random(),
      description: item.description,
      qty: item.quantity,
      original_price: item.original_price,
      discount_amount: item.discount_amount,
      discount_type: item.discount_type || 'nominal',
      unit_price: item.unit_price,
      total_price: item.total_price,
      is_recurring: item.is_recurring || false,
      duration_months: item.duration_months || 1,
      revenue_account_id: item.revenue_account_id || ''
    })) || [{
      id: Date.now(), description: '', qty: '', original_price: '', discount_amount: '', unit_price: '', total_price: 0, is_recurring: false, duration_months: 1, revenue_account_id: '', discount_type: 'nominal'
    }]
  )

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

      // Fetch Catalog
      const { data: cat } = await supabase.from('service_catalog').select('*').eq('is_active', true).order('name')
      if (cat) setCatalogItems(cat)

      // Fetch Commissions Jika Mode Edit
      if (isEditing && initialData?.id) {
         const { data: comms } = await supabase.from('commissions').select('*').eq('invoice_id', initialData.id)
         if (comms && comms.length > 0) {
            setCommissions(comms.map((cm: any) => ({
               id: cm.id,
               recipient_type: cm.recipient_profile_id ? 'internal' : 'external',
               recipient_profile_id: cm.recipient_profile_id || '',
               recipient_name: cm.recipient_name || '',
               is_percentage: cm.commission_percentage > 0,
               commission_percentage: cm.commission_percentage,
               commission_amount: cm.commission_amount
            })))
         }
      }

      setLoading(false)
    }
    init()
  }, [])

  function updateLine(id: number, field: string, value: any) {
    setLineItems(prev => prev.map(item => {
      if (item.id !== id) return item
      
      const u = { ...item, [field]: value } as LineItem
      
      const currentQty = u.qty === '' ? 0 : Number(u.qty)
      const currentOriPrice = u.original_price === '' ? 0 : Number(u.original_price)
      let currentDiscount = u.discount_amount === '' ? 0 : Number(u.discount_amount)

      if (field === 'discount_type') {
         u.discount_amount = ''
         currentDiscount = 0
      }

      let actualDiscountNominal = 0
      if (u.discount_type === 'percentage') {
         if (currentDiscount > 100) currentDiscount = 100
         actualDiscountNominal = currentOriPrice * (currentDiscount / 100)
      } else {
         actualDiscountNominal = currentDiscount
      }

      u.unit_price = Math.max(0, currentOriPrice - actualDiscountNominal)
      u.total_price = currentQty * (Number(u.unit_price) || 0)

      return u
    }))
  }

  function addLine() {
    setLineItems(p => [...p, {
      id: Date.now(), description: '', qty: '', original_price: '', discount_amount: '', unit_price: '', total_price: 0, is_recurring: false, duration_months: 1, revenue_account_id: revenueAccounts[0]?.id || '', discount_type: 'nominal'
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

  const subtotal = lineItems.reduce((s, i) => s + (i.total_price || 0), 0)
  const taxAmount = subtotal * (taxRate / 100)
  const grandTotal = subtotal + taxAmount

  useEffect(() => {
    setCommissions(prev => prev.map(c =>
      c.is_percentage ? { ...c, commission_amount: Math.round(grandTotal * (c.commission_percentage / 100)) } : c
    ))
  }, [grandTotal])

  async function handleSave() {
    if (!clientId || !title) { toast.error('Klien dan Judul wajib diisi'); return }
    const validLines = lineItems.filter(i => i.description.trim())
    if (validLines.length === 0) { toast.error('Minimal 1 item layanan wajib diisi'); return }

    setSubmitting(true)
    try {
      if (isEditing) {
        // MODE EDIT / UPDATE DOKUMEN
        const { error: docErr } = await supabase.from('commercial_documents').update({
          client_id: clientId,
          title,
          content_blocks: blocks,
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          grand_total: grandTotal,
          issue_date: issueDate,
          due_date: dueDate || null,
          updated_at: new Date().toISOString()
        }).eq('id', initialData.id)
        if (docErr) throw docErr

        // Update Line Items (Hapus yang lama, insert yang baru untuk aman)
        await supabase.from('document_line_items').delete().eq('document_id', initialData.id)
        await supabase.from('document_line_items').insert(validLines.map((item, idx) => ({
          document_id: initialData.id,
          description: item.description,
          quantity: Number(item.qty || 0),
          original_price: Number(item.original_price || item.unit_price || 0),
          discount_amount: Number(item.discount_amount || 0),
          unit_price: Number(item.unit_price || item.original_price || 0),
          total_price: item.total_price,
          sort_order: idx,
          is_recurring: item.is_recurring,
          duration_months: item.is_recurring ? Number(item.duration_months) : null,
          revenue_account_id: item.revenue_account_id || null,
          deferred_account_id: item.is_recurring ? deferredAccountId : null,
        })))

        // Update Komisi
        await supabase.from('commissions').delete().eq('invoice_id', initialData.id)
        const validComm = commissions.filter(c => c.commission_amount > 0)
        if (validComm.length > 0) {
          await supabase.from('commissions').insert(validComm.map(c => ({
            invoice_id: initialData.id, recipient_profile_id: c.recipient_type === 'internal' ? c.recipient_profile_id : null, recipient_name: c.recipient_type === 'internal' ? profiles.find(p => p.id === c.recipient_profile_id)?.full_name : c.recipient_name, commission_percentage: c.is_percentage ? c.commission_percentage : 0, commission_amount: c.commission_amount, status: 'DRAFT',
          })))
        }

        toast.success('Revisi dokumen berhasil disimpan!')

      } else {
        // MODE CREATE DOKUMEN BARU
        const divCode = selectedEntityName.substring(0, 3).toUpperCase() || 'AV'
        const prefixMap: Record<string, string> = { QUOTATION: 'QUO', SPK: 'SPK', INVOICE: 'INV', RECEIPT: 'REC' }
        const prefix = prefixMap[docType] || 'DOC'
        const docNumber = `${prefix}/${divCode}/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`

        const { data: doc, error: docErr } = await supabase.from('commercial_documents').insert({
          entity_id: selectedEntityId, client_id: clientId, doc_type: docType, doc_number: docNumber, title, content_blocks: blocks, subtotal, tax_rate: taxRate, tax_amount: taxAmount, grand_total: grandTotal, status: 'DRAFT', issue_date: issueDate, due_date: dueDate || null, created_by: userId,
        }).select().single()
        
        if (docErr) throw docErr

        if (doc) {
          await supabase.from('document_line_items').insert(validLines.map((item, idx) => ({
            document_id: doc.id,
            description: item.description,
            quantity: Number(item.qty || 0),
            original_price: Number(item.original_price || item.unit_price || 0),
            discount_amount: Number(item.discount_amount || 0),
            unit_price: Number(item.unit_price || item.original_price || 0),
            total_price: item.total_price,
            sort_order: idx,
            is_recurring: item.is_recurring,
            duration_months: item.is_recurring ? Number(item.duration_months) : null,
            revenue_account_id: item.revenue_account_id || null,
            deferred_account_id: item.is_recurring ? deferredAccountId : null,
          })))

          const validComm = commissions.filter(c => c.commission_amount > 0)
          if (validComm.length > 0) {
            await supabase.from('commissions').insert(validComm.map(c => ({
              invoice_id: doc.id, recipient_profile_id: c.recipient_type === 'internal' ? c.recipient_profile_id : null, recipient_name: c.recipient_type === 'internal' ? profiles.find(p => p.id === c.recipient_profile_id)?.full_name : c.recipient_name, commission_percentage: c.is_percentage ? c.commission_percentage : 0, commission_amount: c.commission_amount, status: 'DRAFT',
            })))
          }
        }
        toast.success('Dokumen baru berhasil dibuat!')
      }

      router.push('/invoicing')
      router.refresh()
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
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-[slide-up_0.4s_ease]">
      {/* Header */}
      <div className="border-b pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold mb-2" style={{ color: 'var(--text-muted)' }}>
            <span>Commercial Hub</span><ChevronRight className="w-3 h-3" /><span style={{ color: 'var(--gold)' }}>Document Builder</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {isEditing ? `Revisi Dokumen: ${initialData.doc_number}` : 'Pembuatan Dokumen Komersial'}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Divisi Penerbit: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{selectedEntityName || 'Memuat...'}</span></p>
        </div>
        <button onClick={handleSave} disabled={submitting}
          className="btn-primary flex items-center justify-center gap-2 py-2.5 px-6 text-sm font-bold disabled:opacity-50">
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isEditing ? 'Simpan Revisi' : 'Terbitkan Draft'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT: Meta */}
        <div className="lg:col-span-1 space-y-5">
          <div className="glass-card p-5 space-y-4" style={{ borderTopColor: 'var(--gold)', borderTopWidth: 2 }}>
            <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>Identitas Dokumen</h2>
            
            {/* OVERRIDE DROPDOWN KHUSUS CEO */}
            {activeRole === 'CEO' && (
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-md mb-2">
                <label className="text-[10px] text-red-400 font-bold uppercase tracking-widest block mb-1">CEO Override (Ubah Entitas)</label>
                <select className={`${fieldCls} !bg-black/50 border-red-500/50`} value={selectedEntityId} disabled={isEditing}
                  onChange={e => {
                    setSelectedEntityId(e.target.value)
                    setSelectedEntityName(allEntities.find(x => x.id === e.target.value)?.name || '')
                  }}>
                  {allEntities.map(en => <option key={en.id} value={en.id} className="bg-black">{en.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="section-label block mb-1.5">Tipe Dokumen *</label>
              <select className={`${fieldCls} font-bold`} style={{ color: 'var(--gold)' }} value={docType} disabled={isEditing} onChange={e => setDocType(e.target.value)}>
                <option value="QUOTATION">Quotation / Offering</option>
                <option value="SPK">SPK</option>
                <option value="INVOICE">Invoice</option>
                <option value="RECEIPT">Receipt</option>
              </select>
            </div>
            <div>
              <label className="section-label block mb-1.5">Klien *</label>
              <select className={fieldCls} value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="" disabled>-- Pilih Klien --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
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
              <label className="section-label block mb-1.5">Jatuh Tempo (Opsional)</label>
              <input type="date" className={fieldCls} value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
        </div>

        {/* RIGHT: Content + Line Items + Commissions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Paragraphs / Content Blocks */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--gold)' }}>Struktur Konten (Copywriting)</h2>
              <button onClick={() => setBlocks(p => [...p, { id: Date.now(), title: '', content: '' }])} type="button"
                className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1" style={{ color: 'var(--gold)' }}>
                <Plus className="w-3 h-3" /> Tambah Paragraf
              </button>
            </div>
            <div className="space-y-4">
              {blocks.map((b, i) => (
                <div key={b.id} className="relative group p-4 border rounded-md transition-colors" style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-elevated)' }}>
                  <input type="text" placeholder={`Judul Bagian ${i + 1} (Opsional)`} value={b.title || ''} 
                    onChange={e => setBlocks(p => p.map(x => x.id === b.id ? { ...x, title: e.target.value } : x))}
                    className="w-full bg-transparent text-sm font-bold mb-2 outline-none" style={{ color: 'var(--text-primary)' }} />
                  <textarea rows={3} className="w-full text-xs resize-y outline-none bg-transparent" style={{ color: 'var(--text-muted)' }}
                    placeholder="Isi paragraf detail..." value={b.content}
                    onChange={e => setBlocks(p => p.map(x => x.id === b.id ? { ...x, content: e.target.value } : x))} />
                  
                  {blocks.length > 1 && (
                    <button type="button" onClick={() => setBlocks(p => p.filter(x => x.id !== b.id))}
                      className="absolute right-2 top-2 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                      <Trash2 className="w-3 h-3" />
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
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShowCatalog(true)}
                  className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 px-2 py-1 rounded"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  <BookOpen className="w-3 h-3" /> Import Katalog
                </button>
                <button type="button" onClick={addLine} className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1" style={{ color: 'var(--gold)' }}>
                  <Plus className="w-3 h-3" /> Tambah Item
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {lineItems.map((item, idx) => (
                <div key={item.id} className="rounded-lg p-4 space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <input className={`${inputCls} flex-1`} style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                      placeholder="Deskripsi jasa / barang..." value={item.description}
                      onChange={e => updateLine(item.id, 'description', e.target.value)} />
                    {lineItems.length > 1 && (
                      <button type="button" onClick={() => setLineItems(p => p.filter(i => i.id !== item.id))}
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
                        value={item.qty} 
                        onChange={e => updateLine(item.id, 'qty', e.target.value === '' ? '' : Number(e.target.value))} 
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Harga Asli (Rp)</label>
                      <input type="number" min={0} className={`${inputCls} font-mono`} style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                        value={item.original_price} 
                        onChange={e => updateLine(item.id, 'original_price', e.target.value === '' ? '' : Number(e.target.value))} 
                        placeholder="0"
                      />
                    </div>
                    
                    {/* AREA DISKON SWITCH */}
                    <div className="relative">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#f97316' }}>Diskon</label>
                        <select 
                          className="text-[9px] bg-transparent outline-none font-bold uppercase cursor-pointer" 
                          style={{ color: '#f97316' }}
                          value={item.discount_type}
                          onChange={e => updateLine(item.id, 'discount_type', e.target.value)}
                        >
                          <option value="nominal" className="bg-black text-white">Rp</option>
                          <option value="percentage" className="bg-black text-white">%</option>
                        </select>
                      </div>
                      
                      <div className="relative">
                        <input type="number" min={0} max={item.discount_type === 'percentage' ? 100 : undefined} 
                          className={`${inputCls} font-mono pr-6`} 
                          style={{ borderColor: '#f97316', color: '#f97316' }}
                          value={item.discount_amount} 
                          onChange={e => updateLine(item.id, 'discount_amount', e.target.value === '' ? '' : Number(e.target.value))} 
                          placeholder="0"
                        />
                        <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs font-mono" style={{ color: '#f97316' }}>
                           {item.discount_type === 'percentage' ? '%' : ''}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Total Baris</label>
                      <p className="mt-1 font-black font-mono text-sm" style={{ color: 'var(--gold)' }}>{formatRupiah(item.total_price)}</p>
                    </div>
                  </div>

                  {/* Revenue account + Recurring */}
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t mt-2" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-widest block mb-1" style={{ color: 'var(--text-muted)' }}>Akun Revenue (COA)</label>
                      <select className="select-field w-full text-xs" value={item.revenue_account_id}
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
                            ≈ {formatRupiah(Number(item.original_price || 0) / (Number(item.duration_months) || 1))} / bln
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
                  <option value={12}>PPN (12%)</option>
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
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Otomatis dicairkan saat invoice lunas.</p>
              </div>
              <button type="button" onClick={() => setCommissions(p => [...p, {
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
                        <option value="">-- Pilih Tim --</option>
                        {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                      </select>
                    ) : (
                      <input className="input-field w-full px-2 py-1.5 text-xs mt-1 rounded" placeholder="Nama..."
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
                    <button type="button" onClick={() => setCommissions(p => p.filter(x => x.id !== c.id))}
                      className="p-2 rounded hover:text-red-400 transition-colors" style={{ color: 'var(--text-muted)' }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── MODAL IMPORT KATALOG ─────────────────────────────────────── */}
      {showCatalog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-xl p-6 space-y-4 max-h-[85vh] overflow-y-auto"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-black" style={{ color: 'var(--text-primary)' }}>Import dari Katalog</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Klik item untuk langsung menambahkan ke dokumen.</p>
              </div>
              <button onClick={() => setShowCatalog(false)} style={{ color: 'var(--text-muted)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {catalogItems.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>Belum ada item di katalog. Tambahkan di menu Katalog & Portofolio.</p>
              )}
              {catalogItems.map(svc => (
                <button key={svc.id} type="button"
                  onClick={() => {
                    setLineItems(p => [...p, {
                      id: Date.now(),
                      description: svc.name,
                      qty: 1,
                      original_price: svc.base_price,
                      discount_amount: '',
                      discount_type: 'nominal' as const,
                      unit_price: svc.base_price,
                      total_price: svc.base_price,
                      is_recurring: svc.is_recurring || false,
                      duration_months: svc.default_duration_months || 1,
                      revenue_account_id: svc.revenue_account_id || '',
                    }])
                    setShowCatalog(false)
                    toast.success(`"${svc.name}" ditambahkan ke dokumen`)
                  }}
                  className="w-full text-left p-4 rounded-lg transition-all hover:bg-white/5 border"
                  style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-secondary)' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{svc.name}</p>
                      {svc.description && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--text-muted)' }}>{svc.description}</p>}
                      {svc.is_recurring && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block"
                          style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>
                          Recurring · {svc.default_duration_months} bln
                        </span>
                      )}
                    </div>
                    <p className="font-black font-mono text-sm shrink-0 ml-3" style={{ color: 'var(--gold)' }}>
                      Rp {Number(svc.base_price).toLocaleString('id-ID')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}