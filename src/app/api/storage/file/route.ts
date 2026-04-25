import { NextResponse } from 'next/server'
import { getPresignedUrl } from '@/lib/r2/client'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')
  
  if (!key) {
    return NextResponse.json({ error: 'Key required' }, { status: 400 })
  }

  try {
    const url = await getPresignedUrl(key, 3600)
    return NextResponse.redirect(url)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate URL' }, { status: 500 })
  }
}
