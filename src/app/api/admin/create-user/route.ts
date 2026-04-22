import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // PERBAIKAN KEAMANAN: Gunakan getUser(), bukan getSession()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: requester } = await supabase
      .from('profiles')
      .select('role, entity_id')
      .eq('id', user.id)
      .single()

    if (!requester || (requester.role !== 'CEO' && requester.role !== 'HEAD')) {
      return NextResponse.json({ error: 'Anda tidak memiliki hak membuat akun' }, { status: 403 })
    }

    const body = await request.json()
    // PERBAIKAN FATAL: Tarik full_name dari payload frontend
    const { email, password, full_name, role, entity_id } = body

    if (!email || !password || !full_name || !role || !entity_id) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    if (requester.role === 'HEAD') {
      if (role !== 'STAFF') {
        return NextResponse.json({ error: 'HEAD hanya diizinkan membuat akun STAFF' }, { status: 403 })
      }
      if (entity_id !== requester.entity_id) {
        return NextResponse.json({ error: 'HEAD tidak bisa menyusupkan staf ke divisi lain' }, { status: 403 })
      }
    }

    const adminAuthClient = createServiceClient()
    
    const { data: newAuthUser, error: createUserError } = await adminAuthClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name } // Rekam juga di metadata Supabase Auth
    })

    if (createUserError) throw createUserError

    // PERBAIKAN FATAL: Masukkan full_name saat insert
    const { error: profileError } = await adminAuthClient
      .from('profiles')
      .insert({
        id: newAuthUser.user.id,
        full_name: full_name, 
        role: role,
        entity_id: entity_id,
      })

    if (profileError) {
      await adminAuthClient.auth.admin.deleteUser(newAuthUser.user.id)
      throw profileError
    }

    return NextResponse.json({ success: true, message: 'Akun berhasil dibuat' })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}