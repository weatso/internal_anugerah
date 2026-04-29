'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile, Entity, UserRole, getHighestRole } from '@/types'; 

type UserContextType = {
  profile: Profile | null;
  highestRole: UserRole | null;
  loading: boolean;
  impersonate: (entityId: string | null) => void;
  isImpersonating: boolean;
  effectiveEntityId: string | null;
  effectiveEntity: Entity | null;
  entities: Entity[];
};

const UserContext = createContext<UserContextType>({
  profile: null,
  highestRole: null,
  loading: true,
  impersonate: () => {},
  isImpersonating: false,
  effectiveEntityId: null,
  effectiveEntity: null,
  entities: [],
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [highestRole, setHighestRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonatedEntityId, setImpersonatedEntityId] = useState<string | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]); 

  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setLoading(false);
          // Jika tidak ada sesi dan bukan di halaman login, langsung lempar ke login
          if (pathname !== '/login' && !pathname.startsWith('/auth/callback')) {
            router.replace('/login');
          }
          return;
        }

        const { data: userProfile, error } = await supabase
          .from('profiles')
          .select('*, entity:entities(*)')
          .eq('id', session.user.id)
          .single();

        if (error || !userProfile) throw error;
        
        setProfile(userProfile);
        setHighestRole(getHighestRole(userProfile.roles));

        if (userProfile.entity?.type === 'HOLDING' || userProfile.roles.includes('CEO')) {
          const { data: allEntities } = await supabase.from('entities').select('*');
          if (allEntities) setEntities(allEntities);
        } else {
          if (userProfile.entity) setEntities([userProfile.entity]);
        }

      } catch (error) {
        setProfile(null);
        setHighestRole(null);
        if (pathname !== '/login') router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    // Listener ini yang menangani Logout dari Sidebar agar tidak lari ke Dashboard kosong
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setProfile(null);
          setHighestRole(null);
          setLoading(false);
          router.replace('/login');
        }
      }
    );

    return () => { authListener.subscription.unsubscribe(); };
  }, [pathname, router, supabase]);

  const impersonate = (entityId: string | null) => {
    if (profile?.entity?.type === 'HOLDING' || profile?.roles.includes('CEO')) {
      setImpersonatedEntityId(entityId);
    }
  };

  const isImpersonating = impersonatedEntityId !== null;
  const effectiveEntityId = isImpersonating ? impersonatedEntityId : (profile?.entity_id || null);
  const effectiveEntity = isImpersonating
    ? entities.find(e => e.id === impersonatedEntityId) || null
    : (profile?.entity || null);

  return (
    <UserContext.Provider value={{ 
      profile, highestRole, loading, impersonate, isImpersonating, effectiveEntityId, effectiveEntity, entities
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);