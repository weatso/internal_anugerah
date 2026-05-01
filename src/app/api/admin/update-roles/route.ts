import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies()

    // 1. Verifikasi sesi user yang memanggil API ini
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() } } }
    )
    const { data: { session } } = await supabaseAuth.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Pastikan yang memanggil adalah CEO (cek profiles.roles atau user_roles)
    const { data: caller } = await supabaseAuth
      .from('profiles').select('roles').eq('id', session.user.id).single()

    const isCEOFromProfile = caller?.roles?.includes('CEO') ?? false

    if (!isCEOFromProfile) {
      // Fallback: cek user_roles table
      const { data: ceoRole } = await supabaseAuth
        .from('user_roles').select('id').eq('user_id', session.user.id).eq('role', 'CEO').maybeSingle()
      if (!ceoRole) {
        return NextResponse.json({ error: 'Forbidden: CEO only' }, { status: 403 })
      }
    }

    // 3. Jalankan operasi dengan Service Role (bypass RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const body = await req.json()
    const { user_id, assignments } = body as {
      user_id: string
      assignments: { entity_id: string; role: string }[]
    }

    if (!user_id) {
      return NextResponse.json({ error: 'user_id diperlukan' }, { status: 400 })
    }

    // 4. Hapus semua role lama untuk user ini
    const { error: deleteError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', user_id)

    if (deleteError) throw deleteError

    // 5. Insert role baru
    const valid = (assignments ?? []).filter((r: any) => r.entity_id && r.role)
    if (valid.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('user_roles')
        .insert(valid.map((r: any) => ({ user_id, entity_id: r.entity_id, role: r.role })))
      if (insertError) throw insertError
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[API /admin/update-roles]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
