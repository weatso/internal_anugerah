import type { Entity } from '@/types'

export type WorkspaceType = 'GENERAL' | 'WEATSO' | 'LOKAL' | 'EVORY' | 'COLABZ' | 'LADDIFY'

export interface DivisionConfig {
  workspaceType: WorkspaceType
  fallbackColor: string
  displayName: string
  description: string
  emoji: string
}

/** Fallback colors — overridden by entity.primary_color from DB */
const DIVISION_MAP: Record<string, DivisionConfig> = {
  GENERAL: {
    workspaceType: 'GENERAL',
    fallbackColor: '#6366f1',
    displayName: 'General',
    description: 'Task & Log management',
    emoji: '📋',
  },
  WEATSO: {
    workspaceType: 'WEATSO',
    fallbackColor: '#06b6d4',
    displayName: 'Weatso',
    description: 'Tech & Development',
    emoji: '💻',
  },
  LOKAL: {
    workspaceType: 'LOKAL',
    fallbackColor: '#f97316',
    displayName: 'Lokal',
    description: 'Sales & Retail',
    emoji: '🛒',
  },
  EVORY: {
    workspaceType: 'EVORY',
    fallbackColor: '#a855f7',
    displayName: 'Evory',
    description: 'Event Management',
    emoji: '🎪',
  },
  COLABZ: {
    workspaceType: 'COLABZ',
    fallbackColor: '#ec4899',
    displayName: 'Colabz',
    description: 'Content & Creative',
    emoji: '🎬',
  },
  LADDIFY: {
    workspaceType: 'LADDIFY',
    fallbackColor: '#22c55e',
    displayName: 'Laddify',
    description: 'Marketing & Partners',
    emoji: '🚀',
  },
}

export function getDivisionConfig(entityName?: string | null): DivisionConfig {
  if (!entityName) return DIVISION_MAP['GENERAL']
  const key = entityName.toUpperCase()
  return DIVISION_MAP[key] ?? DIVISION_MAP['GENERAL']
}

/** Resolves accent color: DB primary_color → fallback from config → gold */
export function getEntityAccentColor(entity?: Entity | null): string {
  if (entity?.primary_color) return entity.primary_color
  return getDivisionConfig(entity?.name)?.fallbackColor ?? '#D4AF37'
}

export function getEntityWorkspaceType(entity?: Entity | null): WorkspaceType {
  return getDivisionConfig(entity?.name)?.workspaceType ?? 'GENERAL'
}
