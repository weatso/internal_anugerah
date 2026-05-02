import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import CommissionsClient from './CommissionsClient'

export default async function CommissionsPage() {
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

  const [{ data: commissions }, { data: bankAccounts }, { data: userProfile }] = await Promise.all([
    db.from('commissions')
      .select('*, commercial_documents:invoice_id(doc_number, title, entity_id, entities(name))')
      .in('status', ['PENDING', 'PAID'])
      .order('created_at', { ascending: false }),
    db.from('chart_of_accounts').select('id, account_name').eq('is_bank', true).eq('is_active', true),
    db.from('profiles').select('roles, user_roles(role)').eq('id', session.user.id).single(),
  ])

  const isCEO = userProfile?.roles?.includes('CEO') || (userProfile as any)?.user_roles?.some((r: any) => r.role === 'CEO')

  return (
    <CommissionsClient
      commissions={commissions || []}
      bankAccounts={bankAccounts || []}
      isCEO={isCEO}
    />
  )
}
