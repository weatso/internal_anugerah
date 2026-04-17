'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { formatRupiah, generateInvoiceNumber, cn } from '@/lib/utils'
import { Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-react'
import type { InvoiceItem } from '@/types'
import Link from 'next/link'

export default function CreateInvoicePage() {
  const { profile } = useUser()
  const supabase = createClient()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const [clientName, setClientName] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<InvoiceItem[]>([{ name: '', qty: 1, unit_price: 0 }])

  function updateItem(i: number, field: keyof InvoiceItem, value: string | number) {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }
  function addItem() { setItems(prev => [...prev, { name: '', qty: 1, unit_price: 0 }]) }
  function removeItem(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)) }

  const total = items.reduce((s, item) => s + item.qty * item.unit_price, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSubmitting(true)

    // Generate invoice number
    const { count } = await supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('entity_id', profile.entity_id)
    const invoiceNumber = generateInvoiceNumber(profile.entity?.name ?? 'AV', (count ?? 0) + 1)

    await supabase.from('invoices').insert({
      entity_id: profile.entity_id,
      created_by: profile.id,
      client_name: clientName,
      client_address: clientAddress || null,
      client_phone: clientPhone || null,
      items,
      notes: notes || null,
      total_amount: total,
      status: 'PENDING_APPROVAL',
      invoice_number: invoiceNumber,
    })

    router.push('/invoicing')
  }

  return (
    <div className="p-6 md:p-8 space-y-6 animate-[slide-up_0.4s_ease] max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/invoicing" className="text-[--color-text-muted] hover:text-[--color-text-primary] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <p className="text-[#D4AF37] text-xs uppercase tracking-[0.3em] font-bold mb-1">Invoicing</p>
          <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight">Buat Invoice</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Info */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-[--color-text-primary] font-bold text-sm uppercase tracking-widest">Informasi Klien</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">Nama Klien *</label>
              <input required value={clientName} onChange={e => setClientName(e.target.value)}
                placeholder="PT. Contoh Klien"
                className="w-full bg-white/[0.04] border border-[--color-border] rounded-md px-4 py-2.5 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50" />
            </div>
            <div>
              <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">No. HP / WA</label>
              <input value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full bg-white/[0.04] border border-[--color-border] rounded-md px-4 py-2.5 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50" />
            </div>
          </div>
          <div>
            <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">Alamat (opsional)</label>
            <input value={clientAddress} onChange={e => setClientAddress(e.target.value)}
              placeholder="Jl. Contoh No. 1, Jakarta"
              className="w-full bg-white/[0.04] border border-[--color-border] rounded-md px-4 py-2.5 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50" />
          </div>
        </div>

        {/* Line Items */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[--color-text-primary] font-bold text-sm uppercase tracking-widest">Item / Layanan</h2>
            <button type="button" onClick={addItem}
              className="flex items-center gap-1 text-[#D4AF37] text-xs font-bold hover:text-[#F5D678] transition-colors">
              <Plus className="w-3.5 h-3.5" /> Tambah Baris
            </button>
          </div>
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-[1fr_80px_130px_40px] gap-3 text-[--color-text-muted] text-xs uppercase tracking-wider">
              <span>Nama Item</span><span>Qty</span><span>Harga Satuan</span><span></span>
            </div>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_130px_40px] gap-3 items-center">
                <input value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} required
                  placeholder="Nama layanan..."
                  className="bg-white/[0.04] border border-[--color-border] rounded-md px-3 py-2 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50" />
                <input type="number" min={1} value={item.qty} onChange={e => updateItem(i, 'qty', Number(e.target.value))}
                  className="bg-white/[0.04] border border-[--color-border] rounded-md px-3 py-2 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50" />
                <input type="number" min={0} value={item.unit_price} onChange={e => updateItem(i, 'unit_price', Number(e.target.value))}
                  placeholder="0"
                  className="bg-white/[0.04] border border-[--color-border] rounded-md px-3 py-2 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50" />
                <button type="button" onClick={() => removeItem(i)} disabled={items.length === 1}
                  className="text-[--color-text-muted] hover:text-red-400 transition-colors disabled:opacity-20">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          {/* Total */}
          <div className="flex justify-end border-t border-[--color-border] pt-4">
            <div className="text-right">
              <p className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1">Total</p>
              <p className="text-[#D4AF37] text-2xl font-black">{formatRupiah(total)}</p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="glass-card p-6">
          <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-2 block">Catatan (opsional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
            placeholder="Pembayaran melalui transfer bank BCA..."
            className="w-full bg-white/[0.04] border border-[--color-border] rounded-md px-4 py-3 text-[--color-text-primary] text-sm focus:outline-none focus:border-[#D4AF37]/50 resize-none" />
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/invoicing" className="px-5 py-2.5 border border-[--color-border] rounded-md text-sm text-[--color-text-secondary] hover:text-[--color-text-primary] transition-colors">
            Batal
          </Link>
          <button type="submit" disabled={submitting}
            className="flex items-center gap-2 bg-[#D4AF37] text-[#050505] font-bold px-6 py-2.5 rounded-md text-sm hover:bg-[#F5D678] transition-colors disabled:opacity-50">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</> : 'Submit Invoice'}
          </button>
        </div>
      </form>
    </div>
  )
}
