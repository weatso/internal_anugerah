import { NextResponse } from 'next/server'
import { uploadToR2, buildStorageKey } from '@/lib/r2/client'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const folder = (formData.get('folder') as string) ?? 'uploads'
  const entityId = (formData.get('entity_id') as string) ?? 'general'

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const key = buildStorageKey(folder, entityId, file.name)
  await uploadToR2(key, buffer, file.type)

  return NextResponse.json({ key })
}
