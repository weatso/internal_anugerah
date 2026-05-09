import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DocumentBuilderPage from './CreateFormClient'

export default async function CreateDocumentPage() {
  const cookieStore = await cookies()
  const activeEntityId = cookieStore.get('active_entity_id')?.value
  const activeRole = cookieStore.get('active_role')?.value?.toUpperCase() || 'STAFF'

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

  // HAK ISTIMEWA CEO: Tarik semua entitas agar bisa bypass kapasitas
  let allEntities: { id: string; name: string }[] = []
  if (activeRole === 'CEO') {
    const { data: eData } = await supabase.from('entities').select('id, name').order('name')
    if (eData) allEntities = eData
  }

  return (
    <DocumentBuilderPage 
      entityId={activeEntityId} 
      entityName={entity?.name || 'Holding'} 
      userId={user.id} 
      activeRole={activeRole}
      allEntities={allEntities}
    />
  )
}