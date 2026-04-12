import { apiSuccess, apiError, apiForbidden } from "@/lib/api-helpers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireRole } from "@/lib/auth/role-check"
import type { NextRequest } from "next/server"

// GET /api/admin/users
export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError("No autenticado", 401)

  const role = await requireRole(user.id, ["super_admin", "admin"])
  if (!role) return apiForbidden()

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from("profiles")
    .select("id, email, full_name, role, is_active, avatar_url, created_at, updated_at")
    .order("created_at", { ascending: false })

  if (error) return apiError(error.message, 500)
  return apiSuccess(data, 200, { total: data?.length ?? 0 })
}
