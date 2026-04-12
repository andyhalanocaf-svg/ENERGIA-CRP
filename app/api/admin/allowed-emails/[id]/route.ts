import { apiSuccess, apiError, apiNotFound } from "@/lib/api-helpers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireRole } from "@/lib/auth/role-check"
import type { NextRequest } from "next/server"

// DELETE /api/admin/allowed-emails/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError("No autenticado", 401)

  const role = await requireRole(user.id, ["super_admin"])
  if (!role) return apiError("Permisos insuficientes", 403)

  const { id } = await params
  const adminClient = createAdminClient()

  const { data: existing } = await adminClient
    .from("allowed_emails").select("id").eq("id", id).single()
  if (!existing) return apiNotFound("Email")

  const { error } = await adminClient
    .from("allowed_emails").delete().eq("id", id)

  if (error) return apiError(error.message, 500)
  return apiSuccess({ deleted: id })
}
