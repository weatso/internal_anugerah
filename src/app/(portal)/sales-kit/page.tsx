'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, Download, Search, Briefcase, ExternalLink, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/providers/UserProvider'
import { formatDate } from '@/lib/utils'
import { getEntityAccentColor } from '@/lib/division-config'
import type { SalesKitItem, Entity } from '@/types'

const CATEGORIES = [
  { key: 'all',                 label: 'Semua' },
  { key: 'portfolio',           label: 'Portfolio' },
  { key: 'pricelist_public',    label: 'Pricelist Publik' },
  { key: 'pricelist_internal',  label: 'Pricelist Internal' },
  { key: 'brand_asset',         label: 'Brand Asset' },
]

const CATEGORY_ICON: Record<string, string> = {
  portfolio:          '📁',
  pricelist_public:   '💰',
  pricelist_internal: '🔒',
  brand_asset:        '🎨',
}

const FILE_SIZE_LABEL = (bytes?: number | null) => {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function SalesKitPage() {
  const { profile, effectiveEntityId, effectiveEntity } = useUser()
  const supabase = createClient()

  const [items, setItems]         = useState<SalesKitItem[]>([])
  const [entities, setEntities]   = useState<Entity[]>([])
  const [loading, setLoading]     = useState(true)
  const [category, setCategory]   = useState('all')
  const [search, setSearch]       = useState('')

  const isCeo = profile?.role === 'CEO'
  const accentColor = getEntityAccentColor(effectiveEntity)

  useEffect(() => {
    fetchData()
  }, [effectiveEntityId])

  async function fetchData() {
    setLoading(true)
    let query = supabase
      .from('sales_kit_items')
      .select('*, entity:entities(*), creator:profiles(id,full_name)')
      .order('created_at', { ascending: false })

    if (!isCeo) {
      query = query.or(`entity_id.eq.${effectiveEntityId},entity_id.is.null`)
    }

    const [{ data: kitData }, { data: entData }] = await Promise.all([
      query,
      supabase.from('entities').select('*').order('name'),
    ])
    setItems((kitData ?? []) as SalesKitItem[])
    setEntities((entData ?? []) as Entity[])
    setLoading(false)
  }

  const filtered = items.filter(item => {
    const matchCat = category === 'all' || item.category === category
    const matchSearch = !search || item.title.toLowerCase().includes(search.toLowerCase()) ||
      (item.description?.toLowerCase().includes(search.toLowerCase()))
    return matchCat && matchSearch
  })

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold mb-1" style={{ color: accentColor }}>
            Sales Kit & Portfolio
          </p>
          <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight flex items-center gap-3">
            <Briefcase className="w-6 h-6" style={{ color: accentColor }} />
            Asset Library
          </h1>
          <p className="text-[--color-text-muted] text-sm mt-1">
            Portfolio, pricelist, dan brand asset Anugerah Ventures.
          </p>
        </div>
        {(isCeo || profile?.role === 'HEAD') && (
          <Link href="/sales-kit/upload"
            className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-md transition-all hover:opacity-80 shrink-0"
            style={{ background: accentColor, color: '#050505' }}>
            <Upload className="w-4 h-4" /> Upload Asset
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--color-text-muted]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari asset..."
            className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-[--color-border] rounded-md text-[--color-text-primary] text-sm placeholder:text-[--color-text-muted] focus:outline-none focus:border-opacity-60 transition-colors"
            style={{ '--tw-ring-color': accentColor } as any}
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5 bg-white/[0.04] rounded-md p-1 overflow-x-auto shrink-0">
          {CATEGORIES.map(cat => (
            <button key={cat.key} onClick={() => setCategory(cat.key)}
              className="px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-all"
              style={{
                background: category === cat.key ? accentColor : 'transparent',
                color: category === cat.key ? '#050505' : 'var(--color-text-muted)',
              }}>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: accentColor }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[--color-text-muted] text-sm">Belum ada asset.</p>
          {(isCeo || profile?.role === 'HEAD') && (
            <Link href="/sales-kit/upload" className="text-xs font-semibold mt-2 inline-block hover:underline" style={{ color: accentColor }}>
              Upload yang pertama →
            </Link>
          )}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {filtered.map((item) => {
            const entityColor = getEntityAccentColor(item.entity)
            return (
              <motion.div key={item.id} layout
                className="glass-card p-4 flex flex-col group"
                style={{ borderColor: `${entityColor}20` }}
                whileHover={{ scale: 1.01, y: -2 }}
              >
                {/* Category badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xl">{CATEGORY_ICON[item.category] ?? '📄'}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border uppercase"
                    style={{ color: entityColor, borderColor: `${entityColor}30`, background: `${entityColor}10` }}>
                    {item.entity?.name ?? 'Global'}
                  </span>
                </div>

                <h3 className="text-[--color-text-primary] font-bold text-sm mb-1 line-clamp-2">{item.title}</h3>
                {item.description && (
                  <p className="text-[--color-text-muted] text-xs mb-3 line-clamp-2">{item.description}</p>
                )}

                <div className="mt-auto pt-3 border-t border-[--color-border] flex items-center justify-between">
                  <div>
                    <p className="text-[--color-text-muted] text-[10px]">{FILE_SIZE_LABEL(item.file_size)}</p>
                    <p className="text-[--color-text-muted] text-[10px]">{formatDate(item.created_at)}</p>
                  </div>
                  <a
                    href={`/api/sales-kit/download?key=${encodeURIComponent(item.file_key)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded transition-all hover:opacity-80"
                    style={{ background: `${entityColor}15`, color: entityColor }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh
                  </a>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}
