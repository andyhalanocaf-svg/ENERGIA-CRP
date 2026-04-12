import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { ChatPanel } from "@/components/chat/chat-panel"
import type { UserRole } from "@/types"

// ======================================================
// Dashboard Layout — protegido server-side
// Auth check: createClient (SSR con cookies)
// Profile/role check: createAdminClient (bypasea RLS)
// ======================================================
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // 1. Verificar sesión con SSR client (lee cookies)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // 2. Obtener perfil con cliente normal auth (tiene permisos RLS para su propio perfil)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, avatar_url, is_active")
    .eq("id", user.id)
    .single()

  console.log("=== DEBUG PROFILE FETCH ===")
  console.log("User Email:", user.email)
  console.log("Profile from DB:", profile)
  console.log("Error from DB:", profileError)
  console.log("===========================")

  // 3. Si perfil no existe (delay de trigger en primer registro), usar fallback viewer
  const safeProfile = profile ?? {
    id: user.id,
    email: user.email ?? "",
    full_name: null,
    avatar_url: null,
    role: "viewer" as UserRole,
    is_active: true,
  }

  // 4. Si perfil existe pero está explícitamente desactivado, mostrar error inline
  if (profile !== null && profile.is_active === false) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="text-center space-y-2">
          <p className="text-2xl font-bold text-foreground">Cuenta desactivada</p>
          <p className="text-sm text-muted-foreground">
            Tu cuenta no tiene acceso activo. Contacta al administrador.
          </p>
        </div>
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar userRole={safeProfile.role as UserRole} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header profile={safeProfile as any} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <ChatPanel />
    </div>
  )
}
