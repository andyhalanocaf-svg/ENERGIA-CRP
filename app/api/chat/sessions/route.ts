import { apiSuccess, apiError } from "@/lib/api-helpers"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { NextRequest } from "next/server"

// GET /api/chat/sessions
export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError("No autenticado", 401)

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from("chat_sessions")
    .select("id, title, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(20)

  if (error) return apiError(error.message, 500)
  return apiSuccess(data)
}

// POST /api/chat/sessions — crear nueva sesión
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError("No autenticado", 401)

  let body: { title?: string } = {}
  try { body = await request.json() } catch { /* title opcional */ }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from("chat_sessions")
    .insert({
      user_id: user.id,
      title: body.title ?? "Nueva conversación",
    })
    .select("id, title, created_at")
    .single()

  if (error) return apiError(error.message, 500)
  return apiSuccess(data, 201)
}
