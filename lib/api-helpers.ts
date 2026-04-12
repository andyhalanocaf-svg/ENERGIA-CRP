import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { UserRole, ApiError } from '@/types'

// ======================================================
// API Helpers — Autenticación y respuestas estándar
// ======================================================

type RouteHandlerFn = (
  req: NextRequest,
  context: { params: Promise<Record<string, string>>; userId: string; userRole: UserRole }
) => Promise<Response>

/**
 * HOF: Protege un Route Handler verificando la sesión de Supabase.
 * Inyecta userId y userRole en el contexto.
 */
export function withAuth(handler: RouteHandlerFn, allowedRoles?: UserRole[]) {
  return async (req: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    const response = NextResponse.next()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return apiError('No autenticado', 401)
    }

    // Obtener rol del perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (!profile?.is_active) {
      return apiError('Cuenta desactivada', 403)
    }

    const userRole = (profile?.role ?? 'viewer') as UserRole

    // Verificar rol si se especificó
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(userRole)) {
        return apiError('Permisos insuficientes', 403)
      }
    }

    return handler(req, { params: context.params, userId: user.id, userRole })
  }
}

// ─── Respuestas Estándar ─────────────────────────────────

export function apiSuccess<T>(data: T, status = 200, meta?: Record<string, number>) {
  return NextResponse.json({ success: true, data, ...(meta && { meta }) }, { status })
}

export function apiError(error: string, status = 500, code?: string): NextResponse<ApiError> {
  return NextResponse.json({ success: false, error, ...(code && { code }) }, { status })
}

export function apiNotFound(resource = 'Recurso') {
  return apiError(`${resource} no encontrado`, 404)
}

export function apiUnauthorized() {
  return apiError('No autenticado', 401)
}

export function apiForbidden() {
  return apiError('Permisos insuficientes', 403)
}

export function apiValidationError(details: unknown) {
  return NextResponse.json({ success: false, error: 'Datos inválidos', details }, { status: 422 })
}
