import { NextResponse } from 'next/server'
import { getPresignedUrl } from '@/lib/r2/client'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { key } = await request.json()
  if (!key) return NextResponse.json({ error: 'Key required' }, { status: 400 })

  const url = await getPresignedUrl(key, 900)
  return NextResponse.json({ url })
}
