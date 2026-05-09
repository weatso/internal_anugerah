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

  const isApiRoute = path.startsWith('/api')
  const isPublicAsset = path.startsWith('/_next') || path.includes('.')
  const isAuthRoute = path.startsWith('/login') || path.startsWith('/auth/callback')
  const isPublicPortal = path.startsWith('/p/')

  // ══════════════════════════════════════════════════════════════════════
  // 1. ASET STATIS (CSS, JS, gambar) — DIIZINKAN LEWAT TANPA CEK
  // ══════════════════════════════════════════════════════════════════════
  if (isPublicAsset) {
    return supabaseResponse
  }

  // ══════════════════════════════════════════════════════════════════════
  // 2. PORTAL PUBLIK KLIEN (/p/[token]) — DIIZINKAN TANPA SESI
  //    Keamanan ditangani oleh magic_link_token di page.tsx itu sendiri.
  // ══════════════════════════════════════════════════════════════════════
  if (isPublicPortal) {
    return supabaseResponse
  }

  // ══════════════════════════════════════════════════════════════════════
  // 3. PROTEKSI API (REST ENDPOINTS)
  //    API HARUS mengembalikan JSON 401, BUKAN redirect ke /login.
  //    Validasi ROLE (CEO/HEAD/STAFF) WAJIB dilakukan di dalam masing-
  //    masing file route.ts menggunakan database, bukan Middleware.
  // ══════════════════════════════════════════════════════════════════════
  if (isApiRoute) {
    if (!user) {
      return NextResponse.json(
        { error: 'Akses Ditolak: Sesi tidak valid atau telah berakhir.' },
        { status: 401 }
      )
    }
    // Jika ada sesi, biarkan lewat. Otorisasi granular ada di route handler.
    return supabaseResponse
  }

  // ══════════════════════════════════════════════════════════════════════
  // 4. PROTEKSI HALAMAN UI — PENGGUNA TANPA SESI DITENDANG KE LOGIN
  // ══════════════════════════════════════════════════════════════════════
  if (!user && !isAuthRoute) {
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ══════════════════════════════════════════════════════════════════════
  // 5. PENGGUNA BERSESI TAPI KE HALAMAN LOGIN → REDIRECT KE DASHBOARD
  // ══════════════════════════════════════════════════════════════════════
  if (user && (path === '/login' || path === '/')) {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // ══════════════════════════════════════════════════════════════════════
  // 6. NAVIGASI UI GUARD (UX CONVENIENCE — BUKAN BATAS KEAMANAN)
  //    Cookie bisa di-spoof, jadi ini HANYA untuk UX navigasi.
  //    Kebenaran mutlak ada di API route handlers via database check.
  // ══════════════════════════════════════════════════════════════════════
  const activeRole = request.cookies.get('active_role')?.value?.toUpperCase()

  // Anomali: user bersesi tapi tanpa cookie active_role → inisialisasi di dashboard
  if (user && !activeRole && !isAuthRoute && path !== '/dashboard') {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // UI Guard: Modul Admin (hanya CEO)
  if (path.startsWith('/admin') && activeRole !== 'CEO') {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // UI Guard: Finance sub-modul CEO-only (sebelum cek umum /finance)
  const ceoOnlyFinanceRoutes = ['/finance/dividends', '/finance/transfer-pricing', '/finance/master-data', '/finance/commissions']
  if (ceoOnlyFinanceRoutes.some(r => path.startsWith(r)) && activeRole !== 'CEO') {
    url.pathname = '/finance'
    return NextResponse.redirect(url)
  }

  // UI Guard: Finance umum (CEO, HEAD, FINANCE)
  if (path.startsWith('/finance') && !['CEO', 'HEAD', 'FINANCE'].includes(activeRole || '')) {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // UI Guard: Invoicing/Komersial (CEO, HEAD, FINANCE)
  if (path.startsWith('/invoicing') && !['CEO', 'HEAD', 'FINANCE'].includes(activeRole || '')) {
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}