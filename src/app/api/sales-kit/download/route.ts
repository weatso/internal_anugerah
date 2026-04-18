import { NextResponse } from 'next/server'
import { getDownloadUrl } from '@/lib/r2/client'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')
  
  if (!key) return new Response('Key required', { status: 400 })

  try {
    const url = await getDownloadUrl(key, 3600) // 1 Hour Presigned URL
    return NextResponse.redirect(url)
  } catch (error) {
    return new Response('File not found', { status: 404 })
  }
}
