'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface UserContextType {
  profile: Profile | null
  loading: boolean
  refresh: () => void
}

const UserContext = createContext<UserContextType>({
  profile: null,
  loading: true,
  refresh: () => {},
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
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

    const loadedProfile = data as Profile
    setProfile(loadedProfile)
    setLoading(false)

    // Redirect logic
    if (loadedProfile?.role === 'PENDING' && pathname !== '/pending') {
      router.push('/pending')
    } else if (loadedProfile?.role !== 'PENDING' && pathname === '/pending') {
      router.push('/dashboard')
    }

  }, [supabase, pathname, router])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  return (
    <UserContext.Provider value={{ profile, loading, refresh: fetchProfile }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
