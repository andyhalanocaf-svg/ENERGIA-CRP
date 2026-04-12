import 'server-only'
import { createAdminClient } from "@/lib/supabase/admin"
import type { UserRole } from "@/types"

/**
 * Obtiene el rol de un usuario dado su ID usando el admin client.
 * Usa el service role key para bypasear RLS — seguro en Server-only.
 * Retorna 'viewer' si el perfil no existe.
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  const adminClient = createAdminClient()
  const { data } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single()
  return (data?.role ?? "viewer") as UserRole
}

/**
 * Verifica si el usuario tiene el rol especificado o superior.
 * Retorna el rol actual o null si no está en la lista permitida.
 */
export async function requireRole(
  userId: string,
  allowedRoles: UserRole[]
): Promise<UserRole | null> {
  const role = await getUserRole(userId)
  return allowedRoles.includes(role) ? role : null
}
