import { createClient as adminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DividendsClient from './DividendsClient'

export default async function DividendsPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() } } }
  )
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [
    { data: stakeholders },
    { data: entities },
    { data: bankAccounts },
    { data: history },
    { data: coas },
  ] = await Promise.all([
    db.from('stakeholders').select('*').eq('is_active', true).order('name'),
    db.from('entities').select('id, name').order('name'),
    db.from('chart_of_accounts').select('id, account_name').eq('is_bank', true).eq('is_active', true),
    db.from('dividend_distributions')
      .select('*, stakeholder:stakeholders(name), journal:journal_entries(reference_number)')
      .order('created_at', { ascending: false })
      .limit(50),
    db.from('chart_of_accounts').select('id, account_code, account_name').eq('is_active', true),
  ])

  return (
    <DividendsClient
      stakeholders={stakeholders || []}
      entities={entities || []}
      bankAccounts={bankAccounts || []}
      history={history || []}
      coas={coas || []}
    />
  )
}
