import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const cookieStore = await cookies()

  // 1. Klien Reguler — verifikasi sesi user
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  // 2. Ambil profil user yang sedang login
  const { data: currentUser } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  // 3. Verifikasi CEO — cek profiles.roles (legacy) ATAU user_roles table (baru)
  let isCEO = currentUser?.roles?.includes('CEO') ?? false

  if (!isCEO) {
    const { data: ceoRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('role', 'CEO')
      .maybeSingle()
    isCEO = !!ceoRole
  }

  if (!isCEO) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center space-y-4 p-8">
          <p className="font-black uppercase tracking-widest text-xl" style={{ color: '#ef4444' }}>
            Akses Ditolak
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Hanya CEO yang memiliki otoritas ke sistem ini.
          </p>
        </div>
      </div>
    )
  }

  // 4. Klien Service Role — bypass RLS untuk Admin Panel
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 5. Tarik semua data dengan service role (bypass RLS)
  const [{ data: profiles }, { data: entities }, { data: userRoles }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('*, entity:entities(*)')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('entities')
      .select('*')
      .order('type')
      .order('name'),
    supabaseAdmin
      .from('user_roles')
      .select('*, entity:entities(*)'),
  ])

  return (
    <AdminClient
      initialProfiles={profiles || []}
      initialEntities={entities || []}
      initialUserRoles={userRoles || []}
      currentUser={currentUser!}
    />
  )
}
