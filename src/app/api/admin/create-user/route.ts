import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify CEO role
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'CEO') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, password, full_name, role, entity_id } = await request.json()
  if (!email || !password || !full_name || !role || !entity_id) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const serviceSupabase = createServiceClient()
  
  // Buat auth user
  const { data: newUser, error: authError } = await serviceSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !newUser.user) {
    return NextResponse.json({ error: authError?.message ?? 'Failed to create user' }, { status: 500 })
  }

  // Insert profile
  const { error: profileError } = await serviceSupabase.from('profiles').insert({
    id: newUser.user.id,
    full_name,
    role,
    entity_id,
  })

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, user_id: newUser.user.id })
}
