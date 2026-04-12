import { apiSuccess, apiError } from "@/lib/api-helpers"
import { createAdminClient } from "@/lib/supabase/admin"
import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return apiError("Email y contraseña son requeridos", 400)
    }

    const adminClient = createAdminClient()

    // 1. Verificar si el email está en allowed_emails
    const { data: allowedEmail, error: findError } = await adminClient
      .from("allowed_emails")
      .select("id, assigned_role")
      .eq("email", email)
      .single()

    if (findError) {
      if (findError.message.includes("Invalid API key")) {
        return apiError("Tu SUPABASE_SERVICE_ROLE_KEY en el archivo .env.local es inválida o no lo has guardado.", 500)
      }
      return apiError(`Error interno: ${findError.message}`, 500)
    }

    if (!allowedEmail) {
      return apiError(
        "Tu cuenta no ha sido autorizada. El administrador debe invitar tu correo primero.",
        403
      )
    }

    // 2. Crear usuario usando API Admin (bypasea confirmación de email)
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        // En un futuro se puede pedir nombre completo en el form y mandarlo aquí
      }
    })

    if (authError) {
      // Si el usuario ya existe authError.message dirá: "User already registered"
      if (authError.message.includes("already registered")) {
         return apiError("Este usuario ya está registrado, intenta iniciar sesión.", 400)
      }
      return apiError(`Error registrando usuario: ${authError.message}`, 500)
    }

    // El trigger en BD 'handle_new_user' se encarga de crear el perfil automáticamente
    // basado en la tabla allowed_emails.

    return apiSuccess({ user: authData.user }, 201)
  } catch (err: any) {
    return apiError(err.message, 500)
  }
}
