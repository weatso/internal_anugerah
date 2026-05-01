'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Profile, Entity, UserRole, UserRoleAssignment,
  getHighestRole, getRolesFromAssignments
} from '@/types';

type UserContextType = {
  profile: Profile | null;
  highestRole: UserRole | null;
  userRoles: UserRoleAssignment[];        // NEW: semua assignment role per entity
  loading: boolean;

  // Impersonate
  impersonate: (entityId: string | null) => void;
  isImpersonating: boolean;
  effectiveEntityId: string | null;
  effectiveEntity: Entity | null;

  // Entities
  entities: Entity[];                     // Semua entity yang user punya akses
};

const UserContext = createContext<UserContextType>({
  profile: null,
  highestRole: null,
  userRoles: [],
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
  const [userRoles, setUserRoles] = useState<UserRoleAssignment[]>([]);
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
          if (pathname !== '/login' && !pathname.startsWith('/auth/callback')) {
            router.replace('/login');
          }
          return;
        }

        // ── 1. Fetch profile ──────────────────────────────────────────────
        const { data: userProfile, error } = await supabase
          .from('profiles')
          .select('*, entity:entities(*)')
          .eq('id', session.user.id)
          .single();

        if (error || !userProfile) throw error;
        setProfile(userProfile);

        // ── 2. Fetch user_roles (NEW multi-role system) ───────────────────
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('*, entity:entities(*)')
          .eq('user_id', session.user.id);

        const assignments = (roleData ?? []) as UserRoleAssignment[];
        setUserRoles(assignments);

        // ── 3. Compute highestRole ────────────────────────────────────────
        // Prioritas: user_roles baru > profiles.roles lama (backward compat)
        let allRoles: UserRole[] = getRolesFromAssignments(assignments);
        if (allRoles.length === 0) {
          // Fallback ke roles lama di profiles
          allRoles = userProfile.roles ?? [];
        }
        const highest = getHighestRole(allRoles);
        setHighestRole(highest);

        // ── 4. Fetch entities yang bisa diakses ───────────────────────────
        const isCEO = highest === 'CEO' ||
                      userProfile.roles?.includes('CEO') ||
                      userProfile.entity?.type === 'HOLDING';

        if (isCEO) {
          // CEO dapat melihat semua entity
          const { data: allEntities } = await supabase.from('entities').select('*').order('type').order('name');
          if (allEntities) setEntities(allEntities);
        } else {
          // Non-CEO: hanya entity yang ada di user_roles mereka
          const assignedEntities = assignments
            .map(a => a.entity)
            .filter((e): e is Entity => e !== undefined && e !== null);

          // Deduplicate
          const uniqueEntities = Array.from(
            new Map(assignedEntities.map(e => [e.id, e])).values()
          );

          if (uniqueEntities.length > 0) {
            setEntities(uniqueEntities);
          } else if (userProfile.entity) {
            // Fallback ke entity_id lama
            setEntities([userProfile.entity]);
          }
        }

      } catch (error) {
        console.error('[UserProvider] Error:', error);
        setProfile(null);
        setHighestRole(null);
        if (pathname !== '/login') router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setProfile(null);
          setHighestRole(null);
          setUserRoles([]);
          setImpersonatedEntityId(null);
          setLoading(false);
          router.replace('/login');
        }
      }
    );

    return () => { authListener.subscription.unsubscribe(); };
  }, [pathname, router]);

  // ── Impersonate: hanya CEO yang bisa ──────────────────────────────────────
  const impersonate = (entityId: string | null) => {
    const isCEO = highestRole === 'CEO' ||
                  profile?.roles?.includes('CEO') ||
                  profile?.entity?.type === 'HOLDING';
    if (isCEO) {
      setImpersonatedEntityId(entityId);
    }
  };

  const isImpersonating = impersonatedEntityId !== null;
  const effectiveEntityId = isImpersonating
    ? impersonatedEntityId
    : (profile?.entity_id || null);
  const effectiveEntity = isImpersonating
    ? entities.find(e => e.id === impersonatedEntityId) || null
    : (profile?.entity || null);

  return (
    <UserContext.Provider value={{
      profile, highestRole, userRoles, loading,
      impersonate, isImpersonating, effectiveEntityId, effectiveEntity,
      entities
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);