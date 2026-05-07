'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Upload, CheckCircle2, Loader2, FileSignature } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ClientBASTActions({ project, accentColor }: { project: any, accentColor: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const handleSign = async () => {
    if (!file) {
      toast.error('Silakan pilih file dokumen BAST yang sudah Anda tandatangani.')
      return
    }
    
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'bast')
      formData.append('entity_id', project.entity_id)
      
      const res = await fetch('/api/storage/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Gagal mengunggah dokumen BAST.')
      const data = await res.json()

      const { error } = await supabase.from('projects').update({
        bast_url: data.key,
        bast_signed_at: new Date().toISOString(),
        is_ready_for_final_billing: true
      }).eq('id', project.id)

      if (error) throw error

      toast.success('BAST berhasil diunggah! Penagihan termin pelunasan akan segera diproses.')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  if (project.bast_signed_at) {
    return (
      <div className="p-4 rounded-xl flex items-center gap-4 border" style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' }}>
        <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
        <div>
          <p className="text-sm font-bold text-emerald-500">Berita Acara Serah Terima (BAST) Selesai</p>
          <p className="text-[11px] mt-1 text-emerald-500/80">Ditandatangani pada {new Date(project.bast_signed_at).toLocaleString('id-ID')}</p>
        </div>
        {project.bast_url && (
          <a href={`/api/storage/file?key=${encodeURIComponent(project.bast_url)}`} target="_blank"
             className="ml-auto px-4 py-2 rounded-lg text-xs font-bold bg-emerald-500 text-black hover:opacity-90 transition-opacity">
            Lihat BAST
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="p-5 rounded-xl border space-y-4" style={{ background: `${accentColor}08`, borderColor: `${accentColor}25` }}>
      <div className="flex items-start gap-3">
        <FileSignature className="w-6 h-6 mt-1" style={{ color: accentColor }} />
        <div>
          <h2 className="text-sm font-bold text-white mb-1">Berita Acara Serah Terima (BAST)</h2>
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            Pekerjaan telah diselesaikan. Silakan unduh dokumen BAST dari email Anda, tandatangani, dan unggah kembali di sini untuk menyelesaikan administrasi proyek.
          </p>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <input 
          type="file" 
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={e => setFile(e.target.files?.[0] || null)}
          className="flex-1 text-xs file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20 text-neutral-400 cursor-pointer"
        />
        <button 
          onClick={handleSign}
          disabled={!file || uploading}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold shrink-0 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: accentColor, color: '#050505' }}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Memproses...' : 'Unggah & Tanda Tangan'}
        </button>
      </div>
    </div>
  )
}
