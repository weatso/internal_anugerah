import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DocumentBuilderPage from './CreateFormClient'

export default async function CreateDocumentPage() {
  const cookieStore = await cookies()
  const activeEntityId = cookieStore.get('active_entity_id')?.value

  if (!activeEntityId) {
    redirect('/dashboard')
  }

  // Gunakan createClient() sesuai isi file server.ts Anda
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: entity } = await supabase
    .from('entities')
    .select('name')
    .eq('id', activeEntityId)
    .single()

  return (
    <DocumentBuilderPage 
      entityId={activeEntityId} 
      entityName={entity?.name || 'Holding'} 
      userId={user.id} 
    />
  )
}