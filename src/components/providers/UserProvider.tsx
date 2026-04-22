'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Profile, Entity } from '@/types'; // Mengambil tipe dari src/types/index.ts

type UserContextType = {
  profile: Profile | null;
  loading: boolean;
  impersonate: (entityId: string | null) => void;
  isImpersonating: boolean;
  effectiveEntityId: string | null;
  effectiveEntity: Entity | null;
};

const UserContext = createContext<UserContextType>({
  profile: null,
  loading: true,
  impersonate: () => {},
  isImpersonating: false,
  effectiveEntityId: null,
  effectiveEntity: null,
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonatedEntityId, setImpersonatedEntityId] = useState<string | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]); // Untuk menyimpan data divisi saat impersonate

  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Tidak ada sesi');

        // Ambil profil sekaligus data entitasnya (Join table)
        const { data: userProfile, error } = await supabase
          .from('profiles')
          .select('*, entity:entities(*)')
          .eq('id', session.user.id)
          .single();

        if (error || !userProfile) throw new Error('Profil tidak ditemukan');
        setProfile(userProfile);

        // Jika dia CEO, tarik semua entitas agar dia bisa menyamar
        if (userProfile.role === 'CEO') {
          const { data: allEntities } = await supabase.from('entities').select('*');
          if (allEntities) setEntities(allEntities);
        } else {
          // Jika bukan CEO, entitasnya hanya miliknya sendiri
          if (userProfile.entity) setEntities([userProfile.entity]);
        }

      } catch (error) {
        setProfile(null);
        if (pathname !== '/login' && pathname !== '/welcome') {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setProfile(null);
          router.push('/login');
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router, supabase]);

  // Fungsi untuk CEO berpindah divisi
  const impersonate = (entityId: string | null) => {
    if (profile?.role === 'CEO') {
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
      profile, 
      loading, 
      impersonate, 
      isImpersonating, 
      effectiveEntityId, 
      effectiveEntity 
    }}>
      {!loading && children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);