import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import DocumentBuilderPage from '../../create/CreateFormClient'

export default async function EditDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const cookieStore = await cookies()
  const activeEntityId = cookieStore.get('active_entity_id')?.value
  const activeRole = cookieStore.get('active_role')?.value?.toUpperCase() || 'STAFF'

  if (!activeEntityId) redirect('/dashboard')

  // Hanya CEO dan HEAD yang boleh mengedit
  if (!['CEO', 'HEAD'].includes(activeRole)) {
    redirect('/invoicing')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Fetch dokumen beserta line items
  const { data: doc } = await db
    .from('commercial_documents')
    .select('*, items:document_line_items(*)')
    .eq('id', id)
    .single()

  if (!doc) redirect('/invoicing')

  // Guard: dokumen PAID dan UNPAID tidak boleh diedit
  if (doc.status === 'PAID' || doc.status === 'UNPAID') {
    redirect('/invoicing')
  }

  const { data: entity } = await db.from('entities').select('name').eq('id', activeEntityId).single()

  let allEntities: { id: string; name: string }[] = []
  if (activeRole === 'CEO') {
    const { data: eData } = await db.from('entities').select('id, name').order('name')
    if (eData) allEntities = eData
  }

  return (
    <DocumentBuilderPage
      entityId={activeEntityId}
      entityName={entity?.name || 'Holding'}
      userId={user.id}
      activeRole={activeRole}
      allEntities={allEntities}
      initialData={doc}
    />
  )
}
