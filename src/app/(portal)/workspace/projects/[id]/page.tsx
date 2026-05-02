import { createClient as adminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import ProjectWarRoom from './ProjectWarRoom'

export default async function ProjectWarRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  const { data: project } = await db
    .from('projects')
    .select('*, clients(*), entities(name, primary_color)')
    .eq('id', id)
    .single()

  if (!project) redirect('/workspace')

  const [{ data: logs }, { data: documents }] = await Promise.all([
    db.from('workspace_logs')
      .select('*, creator:profiles!workspace_logs_created_by_fkey(full_name)')
      .eq('project_id', id)
      .order('created_at', { ascending: false }),
    project.invoice_id
      ? db.from('commercial_documents')
          .select('id, doc_number, doc_type, title, status, grand_total')
          .eq('id', project.invoice_id)
      : Promise.resolve({ data: [] }),
  ])

  return (
    <ProjectWarRoom
      project={project}
      logs={logs || []}
      documents={documents || []}
      currentUserId={session.user.id}
    />
  )
}
