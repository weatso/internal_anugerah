import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import CEOCommandCenter from './components/CEOCommandCenter'
import DivisionCommandCenter from './components/DivisionCommandCenter'
import { StaffWorkspace } from './components/StaffWorkspace'

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const activeRole = cookieStore.get('active_role')?.value || 'STAFF'
  const activeEntityId = cookieStore.get('active_entity_id')?.value
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Dashboard berubah berdasarkan role yang ada di COOKIE
  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto">
      {activeRole === 'CEO' && <CEOCommandCenter />}
      
      {(activeRole === 'HEAD' || activeRole === 'FINANCE') && (
        <DivisionCommandCenter entityId={activeEntityId} />
      )}
      
      {activeRole === 'STAFF' && (
        <StaffWorkspace />
      )}
    </div>
  )
}