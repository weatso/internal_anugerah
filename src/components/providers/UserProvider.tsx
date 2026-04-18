'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Entity } from '@/types'

interface UserContextType {
  profile: Profile | null
  loading: boolean
  refresh: () => void
  // Impersonation (CEO only)
  impersonatedEntity: Entity | null
  effectiveEntityId: string | null   // impersonated?impersonated.id : profile.entity_id
  effectiveEntity: Entity | null     // resolved entity object
  isImpersonating: boolean
  impersonate: (entity: Entity) => void
  stopImpersonating: () => void
}

const UserContext = createContext<UserContextType>({
  profile: null,
  loading: true,
  refresh: () => {},
  impersonatedEntity: null,
  effectiveEntityId: null,
  effectiveEntity: null,
  isImpersonating: false,
  impersonate: () => {},
  stopImpersonating: () => {},
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [impersonatedEntity, setImpersonatedEntity] = useState<Entity | null>(null)

  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setProfile(null); setLoading(false); return }

    const { data } = await supabase
      .from('profiles')
      .select('*, entity:entities(*)')
      .eq('id', user.id)
      .single()

    const loaded = data as Profile
    setProfile(loaded)
    setLoading(false)

    if (loaded?.role === 'PENDING' && pathname !== '/pending') {
      router.push('/pending')
    } else if (loaded?.role !== 'PENDING' && pathname === '/pending') {
      router.push('/dashboard')
    }
  }, [supabase, pathname, router])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  const impersonate = useCallback((entity: Entity) => {
    setImpersonatedEntity(entity)
  }, [])

  const stopImpersonating = useCallback(() => {
    setImpersonatedEntity(null)
  }, [])

  const isCeo = profile?.role === 'CEO'
  const effectiveEntity = isCeo && impersonatedEntity ? impersonatedEntity : (profile?.entity ?? null)
  const effectiveEntityId = effectiveEntity?.id ?? null

  return (
    <UserContext.Provider value={{
      profile,
      loading,
      refresh: fetchProfile,
      impersonatedEntity,
      effectiveEntityId,
      effectiveEntity,
      isImpersonating: isCeo && !!impersonatedEntity,
      impersonate,
      stopImpersonating,
    }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
