import { cookies } from 'next/headers'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // BACA OTORITAS LANGSUNG DARI SERVER
  const cookieStore = await cookies()
  const activeRole = cookieStore.get('active_role')?.value || 'STAFF'
  const activeEntityId = cookieStore.get('active_entity_id')?.value || ''

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* SUAPKAN DATA KE SIDEBAR */}
      <Sidebar activeRole={activeRole} activeEntityId={activeEntityId} />
      
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}