'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2 } from 'lucide-react'

export default function DivisionSwitcher({ entityId }: { entityId?: string }) {
  const [entityName, setEntityName] = useState('Memuat Divisi...')
  
  useEffect(() => {
    if (!entityId) return
    const supabase = createClient()
    supabase.from('entities').select('name').eq('id', entityId).single().then(({ data }) => {
      if (data) setEntityName(data.name)
    })
  }, [entityId])

  if (!entityId) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded border border-white/10 text-xs text-neutral-400">
        <Building2 className="w-4 h-4" />
        <span>Pilih Divisi...</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[var(--gold)]/10 rounded border border-[var(--gold)]/30 group cursor-default">
      <Building2 className="w-4 h-4 text-[var(--gold)]" />
      <span className="text-xs font-bold tracking-widest uppercase text-[var(--gold)]">
        {entityName}
      </span>
    </div>
  )
}