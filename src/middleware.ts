import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

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
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const url = request.nextUrl.clone()
  const path = url.pathname

  const isPublicAsset = path.startsWith('/_next') || path.includes('.') || path.startsWith('/api')
  const isAuthRoute = path.startsWith('/login') || path.startsWith('/auth/callback')

  if (isPublicAsset) {
    return supabaseResponse
  }

  // ATURAN 1: TIDAK ADA SESI (WAJIB LOGIN)
  if (!user && !isAuthRoute) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ATURAN 2: SUDAH LOGIN TAPI KE HALAMAN LOGIN
  if (user && (path === '/login' || path === '/')) {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // ==========================================
  // ATURAN BESI 3: OTORISASI RUTE (RBAC)
  // ==========================================
  
  // Tarik role aktif dari Cookie yang sudah kita set di UnifiedSwitcher
  const activeRole = request.cookies.get('active_role')?.value?.toUpperCase()

  // Jika user punya sesi tapi tidak punya cookie active_role (anomali login), lempar ke dashboard untuk inisialisasi
  if (user && !activeRole && !isAuthRoute && path !== '/dashboard') {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // PROTEKSI MODUL ADMIN (HANYA CEO)
  if (path.startsWith('/admin') && activeRole !== 'CEO') {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // PROTEKSI MODUL FINANCE (HANYA CEO, HEAD, FINANCE)
  if (path.startsWith('/finance') && !['CEO', 'HEAD', 'FINANCE'].includes(activeRole || '')) {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // PROTEKSI MODUL INVOICING/KOMERSIAL (HANYA CEO, HEAD, FINANCE)
  if (path.startsWith('/invoicing') && !['CEO', 'HEAD', 'FINANCE'].includes(activeRole || '')) {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // PROTEKSI SPESIFIK: DIVIDEN & TRANSFER PRICING (HANYA CEO SECARA MUTLAK)
  if ((path.startsWith('/finance/dividends') || path.startsWith('/finance/transfer-pricing')) && activeRole !== 'CEO') {
    url.pathname = '/finance' // Lempar kembali ke induk finance
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}