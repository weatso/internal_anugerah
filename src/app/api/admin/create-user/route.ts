import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Ambil data si Peminta (Siapa yang klik tombol "Buat Akun"?)
    const { data: requester } = await supabase
      .from('profiles')
      .select('role, entity_id')
      .eq('id', session.user.id)
      .single()

    if (!requester || (requester.role !== 'CEO' && requester.role !== 'HEAD')) {
      return NextResponse.json({ error: 'Anda tidak memiliki hak membuat akun' }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, role, entity_id } = body

    // 2. LOGIKA KEAMANAN: Batasan Wewenang HEAD
    if (requester.role === 'HEAD') {
      if (role !== 'STAFF') {
        return NextResponse.json({ error: 'HEAD hanya diizinkan membuat akun STAFF' }, { status: 403 })
      }
      if (entity_id !== requester.entity_id) {
        return NextResponse.json({ error: 'HEAD tidak bisa menyusupkan staf ke divisi lain' }, { status: 403 })
      }
    }

    // 3. Eksekusi Pembuatan Akun (Hanya sampai sini jika lolos cek di atas)
    const adminAuthClient = createServiceClient()
    
    const { data: newAuthUser, error: authError } = await adminAuthClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Otomatis terkonfirmasi untuk internal
    })

    if (authError) throw authError

    // 4. Inject ke tabel profiles
    const { error: profileError } = await adminAuthClient
      .from('profiles')
      .insert({
        id: newAuthUser.user.id,
        role: role,
        entity_id: entity_id,
      })

    if (profileError) {
      // Rollback jika gagal insert profile
      await adminAuthClient.auth.admin.deleteUser(newAuthUser.user.id)
      throw profileError
    }

    return NextResponse.json({ success: true, message: 'Akun berhasil dibuat' })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}