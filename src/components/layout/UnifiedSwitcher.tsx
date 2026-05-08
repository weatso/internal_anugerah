'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronDown, Briefcase, Check } from 'lucide-react'

interface Capacity {
  id: string
  role: string
  entity_id: string
  entity_name: string
}

const ROLE_LABEL: Record<string, string> = {
  CEO: 'CEO',
  HEAD: 'Head',
  FINANCE: 'Finance',
  STAFF: 'Staff',
}

const ROLE_COLOR: Record<string, string> = {
  CEO: '#D4AF37',
  HEAD: '#818cf8',
  FINANCE: '#34d399',
  STAFF: '#94a3b8',
}

export function UnifiedSwitcher({
  activeRole,
  activeEntityId,
}: {
  activeRole: string
  activeEntityId?: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [capacities, setCapacities] = useState<Capacity[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Label kapasitas yang sedang aktif
  const activeLabel =
    capacities.find(
      (c) => c.role === activeRole && c.entity_id === activeEntityId
    ) ??
    capacities.find((c) => c.role === activeRole) ??
    null

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('user_roles')
        .select('id, role, entity_id, entities(name)')
        .eq('user_id', user.id)

      if (data) {
        setCapacities(
          data.map((r: any) => ({
            id: r.id,
            role: r.role,
            entity_id: r.entity_id,
            entity_name: r.entities?.name ?? '—',
          }))
        )
      }
      setLoading(false)
    }
    load()
  }, [])

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function switchCapacity(cap: Capacity) {
    document.cookie = `active_role=${cap.role}; path=/; max-age=86400`
    document.cookie = `active_entity_id=${cap.entity_id}; path=/; max-age=86400`
    setOpen(false)
    router.refresh()
  }

  const accentColor = ROLE_COLOR[activeRole] ?? '#D4AF37'

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded border border-white/10 text-xs text-neutral-400 animate-pulse">
        <Briefcase className="w-3.5 h-3.5 shrink-0" />
        <span>Memuat kapasitas...</span>
      </div>
    )
  }

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded text-xs font-bold transition-all hover:opacity-90"
        style={{
          background: `${accentColor}18`,
          border: `1px solid ${accentColor}40`,
          color: accentColor,
        }}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Briefcase className="w-3.5 h-3.5 shrink-0" />
          <div className="text-left overflow-hidden">
            <p className="uppercase tracking-widest text-[9px] font-extrabold" style={{ color: accentColor, opacity: 0.7 }}>
              Kapasitas Aktif
            </p>
            <p className="truncate text-xs font-bold" style={{ color: accentColor }}>
              {activeLabel
                ? `${ROLE_LABEL[activeLabel.role] ?? activeLabel.role} — ${activeLabel.entity_name}`
                : `${ROLE_LABEL[activeRole] ?? activeRole}`}
            </p>
          </div>
        </div>
        <ChevronDown
          className="w-3.5 h-3.5 shrink-0 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 right-0 mt-1.5 rounded z-50 py-1 shadow-2xl overflow-hidden"
          style={{
            background: 'var(--bg-elevated, #111)',
            border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
          }}
        >
          <p className="px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-widest" style={{ color: 'var(--text-muted, #666)' }}>
            Pilih Kapasitas Kerja
          </p>
          {capacities.length === 0 && (
            <p className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted, #666)' }}>
              Tidak ada kapasitas ditemukan.
            </p>
          )}
          {capacities.map((cap) => {
            const isActive = cap.role === activeRole && cap.entity_id === activeEntityId
            const color = ROLE_COLOR[cap.role] ?? '#94a3b8'
            return (
              <button
                key={cap.id}
                onClick={() => switchCapacity(cap)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left transition-all hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <span
                    className="shrink-0 text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded"
                    style={{ background: `${color}20`, color }}
                  >
                    {ROLE_LABEL[cap.role] ?? cap.role}
                  </span>
                  <span
                    className="truncate text-xs font-medium"
                    style={{ color: isActive ? color : 'var(--text-primary, #e5e5e5)' }}
                  >
                    {cap.entity_name}
                  </span>
                </div>
                {isActive && <Check className="w-3.5 h-3.5 shrink-0" style={{ color }} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
