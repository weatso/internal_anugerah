import { SupabaseClient } from '@supabase/supabase-js'

export async function verifyDivisionAccess(
  supabase: SupabaseClient,
  userId: string,
  entityId: string,
  requiredRoles: string[]
) {
  // 1. Cek apakah user punya akses ke entitas (divisi) ini dengan role yang sesuai
  const { data: roleData, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('entity_id', entityId)
    .single()

  if (error || !roleData) {
    return { isAuthorized: false, error: 'Akses ditolak: Anda tidak terdaftar di divisi ini.' }
  }

  // 2. Cek apakah role user saat ini ada di dalam daftar role yang diizinkan (requiredRoles)
  // CEO otomatis bebas mengakses apa saja.
  if (roleData.role === 'CEO' || requiredRoles.includes(roleData.role)) {
    return { isAuthorized: true, role: roleData.role }
  }

  return { isAuthorized: false, error: 'Akses ditolak: Pangkat Anda tidak mencukupi untuk tindakan ini.' }
}