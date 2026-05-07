'use server'

import { cookies } from 'next/headers'

export async function setActiveDivision(entityId: string, role: string) {
  const cookieStore = await cookies()
  
  cookieStore.set('active_entity_id', entityId, { maxAge: 60 * 60 * 24 * 7, path: '/' })
  cookieStore.set('active_role', role, { maxAge: 60 * 60 * 24 * 7, path: '/' })
}