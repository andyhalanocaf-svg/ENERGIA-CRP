import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ======================================================
// PresupAI — proxy.ts (Auth Guard)
// SOLO verifica si el usuario tiene sesión válida.
// Los checks de ROL se hacen en: layout.tsx y Route Handlers
// (donde el admin client bypasea RLS correctamente).
// ======================================================

const PROTECTED_PREFIXES = ['/dashboard', '/upload', '/admin']
const AUTH_PREFIXES      = ['/login', '/callback']

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Cliente SSR — necesario para refrescar tokens de sesión automáticamente
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Paso 1: mutamos el request para que el token nuevo esté disponible
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Paso 2: creamos la response con el request actualizado
          supabaseResponse = NextResponse.next({ request })
          // Paso 3: escribimos las cookies en la response
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: getUser() debe ser la primera call — no insertar código antes
  // Ver: https://supabase.com/docs/guides/auth/server-side/nextjs
  const { data: { user } } = await supabase.auth.getUser()

  const path           = request.nextUrl.pathname
  const isProtected    = PROTECTED_PREFIXES.some(p => path.startsWith(p))
  const isAuthPage     = AUTH_PREFIXES.some(p => path.startsWith(p))
  const hasErrorParam  = request.nextUrl.searchParams.has('error')

  // Usuario autenticado en /login (sin parámetro de error) → dashboard
  if (user && isAuthPage && !hasErrorParam) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Ruta protegida sin sesión → login
  if (isProtected && !user) {
    const url = new URL('/login', request.url)
    url.searchParams.set('redirectTo', path)
    return NextResponse.redirect(url)
  }

  // Inyectar user ID en header para Server Components (si está autenticado)
  if (user) {
    supabaseResponse.headers.set('x-user-id', user.id)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
