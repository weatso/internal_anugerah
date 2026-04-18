'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Upload, Loader2, File, X } from 'lucide-react'
import { useUser } from '@/components/providers/UserProvider'
import { getEntityAccentColor } from '@/lib/division-config'
import type { SalesKitCategory } from '@/types'

const CATEGORIES: { key: SalesKitCategory; label: string; desc: string }[] = [
  { key: 'portfolio',           label: 'Portfolio',           desc: 'Showcase proyek & case study' },
  { key: 'pricelist_public',    label: 'Pricelist Publik',    desc: 'Harga yang bisa dibagikan ke klien' },
  { key: 'pricelist_internal',  label: 'Pricelist Internal',  desc: 'Harga HPP & internal margin' },
  { key: 'brand_asset',         label: 'Brand Asset',         desc: 'Logo, guidelines, template' },
]

export default function SalesKitUploadPage() {
  const router = useRouter()
  const { profile, effectiveEntityId, effectiveEntity } = useUser()
  const accentColor = getEntityAccentColor(effectiveEntity)

  const [title, setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<SalesKitCategory>('portfolio')
  const [isPublic, setIsPublic] = useState(false)
  const [file, setFile]         = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !effectiveEntityId) return

    setUploading(true)
    setError(null)

    try {
      // 1. Get presigned upload URL from R2
      const presignRes = await fetch('/api/storage/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: `sales-kit/${effectiveEntityId}/${Date.now()}-${file.name}`,
          contentType: file.type,
        }),
      })
      if (!presignRes.ok) throw new Error('Gagal mendapatkan upload URL')
      const { url, key } = await presignRes.json()

      // 2. Upload to R2
      const uploadRes = await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      if (!uploadRes.ok) throw new Error('Upload gagal')

      // 3. Save to database
      const saveRes = await fetch('/api/sales-kit/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          category,
          file_key: key,
          file_size: file.size,
          file_type: file.type,
          is_public: isPublic,
          entity_id: effectiveEntityId,
        }),
      })
      if (!saveRes.ok) throw new Error('Gagal menyimpan data')

      router.push('/sales-kit')
    } catch (err: any) {
      setError(err.message ?? 'Upload gagal')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold mb-1" style={{ color: accentColor }}>
            Sales Kit
          </p>
          <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight">Upload Asset</h1>
          <p className="text-[--color-text-muted] text-sm mt-1">
            Tambahkan portfolio, pricelist, atau brand asset ke library.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">Judul *</label>
            <input required value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Contoh: Portfolio Weatso Q2 2025"
              className="w-full bg-white/[0.04] border border-[--color-border] rounded-md px-4 py-2.5 text-[--color-text-primary] text-sm focus:outline-none transition-colors"
              style={{ '--tw-ring-color': accentColor } as any}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">Deskripsi</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="Deskripsi singkat isi file..."
              className="w-full bg-white/[0.04] border border-[--color-border] rounded-md px-4 py-2.5 text-[--color-text-primary] text-sm focus:outline-none resize-none transition-colors"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-2 block">Kategori *</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat.key} type="button" onClick={() => setCategory(cat.key)}
                  className="p-3 rounded-md border text-left transition-all"
                  style={{
                    borderColor: category === cat.key ? accentColor : 'var(--color-border)',
                    background: category === cat.key ? `${accentColor}10` : 'transparent',
                  }}>
                  <p className="text-[--color-text-primary] font-semibold text-xs">{cat.label}</p>
                  <p className="text-[--color-text-muted] text-[10px] mt-0.5">{cat.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div className="flex items-center justify-between glass-card px-4 py-3">
            <div>
              <p className="text-[--color-text-primary] text-sm font-semibold">Akses Publik</p>
              <p className="text-[--color-text-muted] text-xs">Bisa dibagikan ke luar organisasi</p>
            </div>
            <button type="button" onClick={() => setIsPublic(!isPublic)}
              className="relative w-10 h-5.5 rounded-full transition-all duration-200"
              style={{ background: isPublic ? accentColor : 'rgba(255,255,255,0.1)' }}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPublic ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* File Drop */}
          <div>
            <label className="text-[--color-text-muted] text-xs uppercase tracking-widest mb-1.5 block">File *</label>
            {file ? (
              <div className="glass-card px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <File className="w-5 h-5" style={{ color: accentColor }} />
                  <div>
                    <p className="text-[--color-text-primary] text-sm font-medium">{file.name}</p>
                    <p className="text-[--color-text-muted] text-xs">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                </div>
                <button type="button" onClick={() => setFile(null)} className="text-[--color-text-muted] hover:text-red-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="block border-2 border-dashed rounded-md p-8 text-center cursor-pointer transition-all hover:opacity-80"
                style={{ borderColor: `${accentColor}40` }}>
                <Upload className="w-8 h-8 mx-auto mb-3 opacity-50" style={{ color: accentColor }} />
                <p className="text-[--color-text-muted] text-sm">Klik atau drag & drop file di sini</p>
                <p className="text-[--color-text-muted] text-xs mt-1">PDF, PNG, JPG, ZIP · Maks 50 MB</p>
                <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.zip,.ai,.eps,.svg"
                  onChange={e => setFile(e.target.files?.[0] ?? null)} />
              </label>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-md px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => router.back()}
              className="flex-1 border border-[--color-border] text-[--color-text-muted] font-bold py-3 rounded-md text-sm hover:text-[--color-text-primary] transition-colors">
              Batal
            </button>
            <button type="submit" disabled={uploading || !file}
              className="flex-1 flex items-center justify-center gap-2 font-bold py-3 rounded-md text-sm transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: accentColor, color: '#050505' }}>
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengupload...</> : 'Upload Asset'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
