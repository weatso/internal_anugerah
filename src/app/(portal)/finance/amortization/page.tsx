import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AmortizationClient from './AmortizationClient'

export default async function AmortizationPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Bulan sekarang
  const now = new Date()
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Ambil SEMUA recognitions belum dieksekusi sampai bulan ini
  const { data: recognitions } = await db
    .from('revenue_recognitions')
    .select(`
      *,
      document_line_items(description, deferred_account_id, revenue_account_id),
      commercial_documents:invoice_id(doc_number, title, entity_id, entities(name))
    `)
    .eq('is_recognized', false)
    .lte('month_period', currentPeriod)
    .order('month_period')

  // Ambil profil user untuk filter entitas
  const { data: userProfile } = await db.from('profiles').select('*, user_roles(entity_id, role)').eq('id', session.user.id).single()
  const isCEO = userProfile?.roles?.includes('CEO') || userProfile?.user_roles?.some((r: any) => r.role === 'CEO')

  return (
    <AmortizationClient
      recognitions={recognitions || []}
      isCEO={isCEO}
      currentPeriod={currentPeriod}
    />
  )
}
