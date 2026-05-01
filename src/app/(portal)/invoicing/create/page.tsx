'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { motion } from 'framer-motion'
import { FileText, Building2, Calendar, Plus, Trash2, CheckCircle2, ChevronRight, FileSignature, X } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'

export default function DocumentBuilderPage() {
  const { profile, effectiveEntity } = useUser()
  const supabase = createClient()
  const router = useRouter()

  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // 1. STATE METADATA DOKUMEN
  const [clientId, setClientId] = useState('')
  const [docType, setDocType] = useState('INVOICE')
  const [title, setTitle] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')

  // 2. STATE MESIN KONTEN (JSONB BLOCKS)
  const [blocks, setBlocks] = useState<{ id: number, content: string }[]>([
    { id: Date.now(), content: '' }
  ])

  // 3. STATE MESIN FINANSIAL (LINE ITEMS)
  const [lineItems, setLineItems] = useState<{ id: number, description: string, qty: number, unit_price: number, total_price: number }[]>([
    { id: Date.now(), description: '', qty: 1, unit_price: 0, total_price: 0 }
  ])
  const [taxRate, setTaxRate] = useState(0) // 0 atau 11 (PPN)

  useEffect(() => {
    async function fetchClients() {
      const { data } = await supabase.from('clients').select('id, company_name, pic_name').order('company_name')
      if (data) setClients(data)
      setLoading(false)
    }
    fetchClients()
  }, [supabase])

  // --- LOGIKA KALKULASI FINANSIAL ---
  const updateLineItem = (id: number, field: string, value: string | number) => {
    setLineItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        updated.total_price = Number(updated.qty) * Number(updated.unit_price)
        return updated
      }
      return item
    }))
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.total_price, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const grandTotal = subtotal + taxAmount

  // --- EKSEKUSI PENYIMPANAN ---
  const handleSaveDraft = async () => {
    if (!clientId || !title) return alert("Klien dan Judul Dokumen wajib diisi.")
    setSubmitting(true)

    try {
      // Generate Nomor Dokumen Sementara (Draft)
      const docCode = docType === 'OFFERING_LETTER' ? 'OFF' : docType === 'SPK' ? 'SPK' : 'INV'
      const divCode = effectiveEntity?.name.substring(0, 3).toUpperCase() || 'AV'
      const docNumber = `${docCode}/${divCode}/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`

      // 1. Simpan Header Dokumen
      const { data: doc, error: docError } = await supabase.from('commercial_documents').insert({
        entity_id: effectiveEntity?.id,
        client_id: clientId,
        doc_type: docType,
        doc_number: docNumber,
        title: title,
        content_blocks: blocks, // Otomatis menjadi JSONB
        subtotal: subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        grand_total: grandTotal,
        status: 'DRAFT',
        issue_date: issueDate,
        due_date: dueDate || null,
        created_by: profile?.id
      }).select().single()

      if (docError) throw docError

      // 2. Simpan Line Items (Jika ada nilai finansialnya)
      if (subtotal > 0 && doc) {
        const itemsToInsert = lineItems.filter(item => item.description.trim() !== '').map((item, index) => ({
          document_id: doc.id,
          description: item.description,
          quantity: item.qty,
          unit_price: item.unit_price,
          total_price: item.total_price,
          sort_order: index
        }))

        if (itemsToInsert.length > 0) {
          const { error: lineError } = await supabase.from('document_line_items').insert(itemsToInsert)
          if (lineError) throw lineError
        }
      }

      alert("Dokumen berhasil disimpan sebagai DRAFT.")
      router.push('/invoicing') // Arahkan kembali ke daftar dokumen
    } catch (err: any) {
      alert(`Gagal menyimpan dokumen: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-8 text-[--color-text-primary] font-mono text-xs uppercase tracking-widest">Memuat Generator Dokumen...</div>

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-[slide-up_0.4s_ease]">
      
      {/* HEADER */}
      <div className="border-b border-white/5 pb-6">
        <div className="flex items-center gap-2 text-gray-500 text-[10px] uppercase tracking-widest font-bold mb-2">
          <span>Commercial Hub</span> <ChevronRight size={12}/> <span className="text-[#C5A028]">Document Builder</span>
        </div>
        <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tighter">Pembuatan Dokumen Komersial</h1>
        <p className="text-gray-500 text-sm mt-1">Divisi: <span className="text-[--color-text-primary] font-bold">{effectiveEntity?.name || 'Holding'}</span></p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* KOLOM KIRI: SETUP METADATA & KLIEN */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6 border-t-2 border-t-[#C5A028]">
            <h2 className="text-xs font-bold text-[--color-text-primary] uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
              <Building2 size={14} className="text-[#C5A028]"/> Relasi Klien
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Pilih Klien (CRM) *</label>
                <select className="input-prestige" value={clientId} onChange={e => setClientId(e.target.value)}>
                  <option value="" disabled>-- Pilih dari Database --</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.company_name} (PIC: {c.pic_name})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Tipe Dokumen *</label>
                <select className="input-prestige font-bold text-[#C5A028]" value={docType} onChange={e => setDocType(e.target.value)}>
                  <option value="OFFERING_LETTER">Offering Letter (Penawaran)</option>
                  <option value="SPK">Surat Perintah Kerja (SPK)</option>
                  <option value="BAST">Berita Acara Serah Terima (BAST)</option>
                  <option value="PROFORMA_INVOICE">Proforma Invoice (DP)</option>
                  <option value="INVOICE">Invoice (Tagihan Resmi)</option>
                  <option value="MANAGEMENT_FEE">Management Fee (Internal)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Judul Proyek / Dokumen *</label>
                <input type="text" className="input-prestige" value={title} onChange={e => setTitle(e.target.value)} placeholder="Contoh: Event Launching Q3..." />
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-xs font-bold text-[--color-text-primary] uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
              <Calendar size={14} className="text-[#C5A028]"/> Terminologi Waktu
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Tanggal Terbit</label>
                <input type="date" className="input-prestige font-mono" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest">Jatuh Tempo (Due Date)</label>
                <input type="date" className="input-prestige font-mono" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN: BUILDER KONTEN & FINANSIAL */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* MESIN KONTEN (JSONB) */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
              <h2 className="text-xs font-bold text-[--color-text-primary] uppercase tracking-widest flex items-center gap-2">
                <FileSignature size={14} className="text-[#C5A028]"/> Teks Paragraf Dokumen
              </h2>
              <button onClick={() => setBlocks([...blocks, { id: Date.now(), content: '' }])} className="text-[10px] text-[#C5A028] font-bold uppercase tracking-widest flex items-center gap-1 hover:text-[--color-text-primary] transition-colors">
                <Plus size={12}/> Tambah Blok Teks
              </button>
            </div>
            
            <div className="space-y-4">
              {blocks.map((block, index) => (
                <div key={block.id} className="relative group">
                  <div className="absolute -left-3 top-2 bottom-2 w-1 bg-[#C5A028]/20 rounded-full group-hover:bg-[#C5A028] transition-colors" />
                  <textarea 
                    rows={3} 
                    className="w-full bg-[--color-bg-elevated] border border-white/5 rounded-sm p-3 text-sm text-gray-300 focus:border-[#C5A028] focus:outline-none resize-y leading-relaxed"
                    placeholder="Ketik isi paragraf, syarat & ketentuan, atau salam pembuka di sini..."
                    value={block.content}
                    onChange={e => setBlocks(blocks.map(b => b.id === block.id ? { ...b, content: e.target.value } : b))}
                  />
                  {blocks.length > 1 && (
                    <button onClick={() => setBlocks(blocks.filter(b => b.id !== block.id))} className="absolute right-2 top-2 p-1.5 bg-red-500/10 text-red-500 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={12}/>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[9px] text-gray-500 font-mono mt-3 uppercase tracking-widest">Gunakan blok terpisah untuk memisahkan paragraf agar render PDF presisi.</p>
          </div>

          {/* MESIN FINANSIAL (TABEL HARGA) */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
              <h2 className="text-xs font-bold text-[--color-text-primary] uppercase tracking-widest flex items-center gap-2">
                <FileText size={14} className="text-[#C5A028]"/> Rincian Kalkulasi (Line Items)
              </h2>
              <button onClick={() => setLineItems([...lineItems, { id: Date.now(), description: '', qty: 1, unit_price: 0, total_price: 0 }])} className="text-[10px] text-[#C5A028] font-bold uppercase tracking-widest flex items-center gap-1 hover:text-[--color-text-primary] transition-colors">
                <Plus size={12}/> Tambah Item
              </button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div key={item.id} className="flex items-start gap-3 bg-[--color-bg-elevated] p-3 border border-white/5 rounded-sm">
                  <div className="flex-1">
                    <input type="text" className="w-full bg-transparent border-b border-white/10 p-1 text-sm text-[--color-text-primary] focus:border-[#C5A028] focus:outline-none mb-2" placeholder="Deskripsi Jasa / Barang..." value={item.description} onChange={e => updateLineItem(item.id, 'description', e.target.value)} />
                    <div className="flex gap-4">
                      <div className="w-20">
                        <label className="text-[9px] text-gray-500 uppercase tracking-widest">Qty</label>
                        <input type="number" className="w-full bg-transparent text-sm text-[--color-text-primary] font-mono" value={item.qty} onChange={e => updateLineItem(item.id, 'qty', Number(e.target.value))} />
                      </div>
                      <div className="flex-1">
                        <label className="text-[9px] text-gray-500 uppercase tracking-widest">Harga Satuan (Rp)</label>
                        <input type="number" className="w-full bg-transparent text-sm text-[--color-text-primary] font-mono" value={item.unit_price} onChange={e => updateLineItem(item.id, 'unit_price', Number(e.target.value))} />
                      </div>
                      <div className="flex-1 text-right">
                        <label className="text-[9px] text-gray-500 uppercase tracking-widest">Total Baris</label>
                        <p className="text-sm font-bold text-[--color-text-primary] font-mono mt-1">{formatRupiah(item.total_price)}</p>
                      </div>
                    </div>
                  </div>
                  {lineItems.length > 1 && (
                    <button onClick={() => setLineItems(lineItems.filter(l => l.id !== item.id))} className="mt-2 text-gray-600 hover:text-red-500 transition-colors">
                      <X size={16}/>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* TOTALS RECAP */}
            <div className="mt-6 border-t border-white/10 pt-4 w-64 ml-auto space-y-2">
              <div className="flex justify-between text-xs text-gray-400 font-mono">
                <span>Subtotal:</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 font-mono items-center">
                <select className="bg-transparent border border-white/10 rounded-sm text-[10px] p-0.5 focus:outline-none" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))}>
                  <option value={0}>Non-PPN (0%)</option>
                  <option value={11}>PPN (11%)</option>
                </select>
                <span>{formatRupiah(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#C5A028] font-mono border-t border-white/10 pt-2">
                <span>GRAND TOTAL:</span>
                <span>{formatRupiah(grandTotal)}</span>
              </div>
            </div>

          </div>

          {/* ACTIONS */}
          <div className="flex justify-end pt-4">
            <button onClick={handleSaveDraft} disabled={submitting} className="btn-primary flex items-center gap-2 py-3 px-8 text-sm">
              {submitting ? 'MENYIMPAN DOKUMEN...' : <><CheckCircle2 size={18}/> SIMPAN DRAFT DOKUMEN</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}