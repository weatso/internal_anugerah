'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { setActiveDivision } from '@/app/actions/workspace'

type UserDivision = {
  entity_id: string
  role: string
  entities: { name: string }
}

export default function DivisionSwitcher({ currentEntityId }: { currentEntityId?: string }) {
  const [divisions, setDivisions] = useState<UserDivision[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchUserDivisions() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          entity_id,
          role,
          entities ( name )
        `)
        .eq('user_id', user.id)

      if (data && data.length > 0) {
        setDivisions(data as any)
        
        if (!currentEntityId) {
          await setActiveDivision(data[0].entity_id, data[0].role)
          // PAKSA HARD RELOAD AGAR SERVER MEMBACA COOKIE BARU
          window.location.reload() 
        }
      } else {
        // PENTING: Jika user tidak punya divisi sama sekali, jangan biarkan loading terus
        setLoading(false)
      }
    }

    fetchUserDivisions()
  }, [currentEntityId, supabase]) // Hapus router dari dependency jika tidak dipakai

  const handleSwitch = async (entityId: string, role: string) => {
    setLoading(true)
    await setActiveDivision(entityId, role)
    // PAKSA HARD RELOAD SAAT GANTI DIVISI
    window.location.reload() 
  }

  if (loading || divisions.length === 0) return <div className="animate-pulse bg-white/10 h-8 w-40 rounded"></div>

  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-widest text-neutral-500 mb-1">Beroperasi Sebagai</span>
      <select 
        className="bg-neutral-900 border border-neutral-700 text-white text-sm rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-[#D4AF37]"
        value={currentEntityId || ''}
        onChange={(e) => {
          const selected = divisions.find(d => d.entity_id === e.target.value)
          if (selected) handleSwitch(selected.entity_id, selected.role)
        }}
      >
        {divisions.map((div) => (
          <option key={div.entity_id} value={div.entity_id}>
            {div.entities.name} — ({div.role})
          </option>
        ))}
      </select>
    </div>
  )
}