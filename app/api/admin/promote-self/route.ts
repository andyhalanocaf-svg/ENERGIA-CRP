import { apiSuccess, apiError } from "@/lib/api-helpers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { NextRequest } from "next/server"

// POST /api/admin/promote-self
// Promueve al usuario autenticado a super_admin.
// Requiere header: X-Admin-Token = SUPABASE_SERVICE_ROLE_KEY
export async function POST(request: NextRequest) {
  // Validar token secreto (solo el dueño del proyecto lo conoce)
  const token = request.headers.get("x-admin-token")
  if (!token || token !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return apiError("Token inválido", 403)
  }

  // Verificar sesión
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError("No autenticado", 401)

  // Actualizar rol con admin client (bypasea RLS)
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from("profiles")
    .update({ role: "super_admin", updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select("id, email, role")
    .single()

  if (error) return apiError(`Error actualizando rol: ${error.message}`, 500)

  return apiSuccess(data, 200)
}
