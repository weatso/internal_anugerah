import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Inisialisasi Response
  let supabaseResponse = NextResponse.next({
    request,
  })

  // 2. Bangun Klien Supabase Server-Side dengan Typing Ketat
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          
          supabaseResponse = NextResponse.next({
            request,
          })
          
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 3. Tarik Sesi Pengguna secara Real-Time dari Server
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const path = url.pathname

  // Pengecualian Rute Publik
  const isPublicAsset = path.startsWith('/_next') || path.includes('.') || path.startsWith('/api')
  const isAuthRoute = path.startsWith('/login') || path.startsWith('/auth/callback')

  if (isPublicAsset) {
    return supabaseResponse
  }

  // ==========================================
  // ATURAN BESI ANUGERAH OS (ROUTING LOGIC)
  // ==========================================

  // ATURAN 1: TIDAK ADA SESI
  if (!user && !isAuthRoute) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ATURAN 2: PUNYA SESI TAPI MENGAKSES ROOT ATAU LOGIN
  if (user && (path === '/login' || path === '/')) {
    url.pathname = '/welcome'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}