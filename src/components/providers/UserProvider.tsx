'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Sesuaikan tipe data dengan struktur database Anda
type Profile = {
  id: string;
  role: 'CEO' | 'HEAD' | 'FINANCE' | 'STAFF';
  entity_id: string;
};

type UserContextType = {
  profile: Profile | null;
  loading: boolean;
};

const UserContext = createContext<UserContextType>({ profile: null, loading: true });

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // 1. Cek sesi aktif di browser
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error('Tidak ada sesi');
        }

        // 2. Ambil profil secara absolut dari tabel profiles, BUKAN menebak-nebak
        const { data: userProfile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error || !userProfile) {
          throw new Error('Profil tidak ditemukan di database');
        }

        // 3. Set profil sesuai data asli
        setProfile(userProfile);
      } catch (error) {
        // FAIL CLOSED: Jika ada error apa pun, kosongkan profil
        setProfile(null);
        // Jika user mencoba mengakses area dalam (portal/dashboard), tendang ke login
        if (pathname !== '/login' && pathname !== '/welcome') {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    // Listener jika user melakukan sign out
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

  return (
    <UserContext.Provider value={{ profile, loading }}>
      {!loading && children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);