import Link from "next/link"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/constants"
import { formatDate } from "@/lib/formatters"
import { UserPlus, Users, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export const metadata = { title: "Usuarios" }

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const adminClient = createAdminClient()
  const { data: me } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (me?.role !== "super_admin") redirect("/admin")
  const { data: profiles } = await adminClient
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })

  const active = profiles?.filter(p => p.is_active).length ?? 0
  const inactive = (profiles?.length ?? 0) - active

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Gestión de <span className="text-gradient-brand">Usuarios</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {profiles?.length ?? 0} usuarios registrados · {active} activos · {inactive} inactivos
          </p>
        </div>
        <Link href="/admin/allowed-emails">
          <button
            id="btn-invite-user"
            className="flex items-center gap-2 h-9 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 hover:[box-shadow:3px_3px_0px_oklch(0.62_0.18_155_/_0.5)] transition-all"
          >
            <UserPlus className="h-4 w-4" />
            Invitar Usuario
          </button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</p>
          <p className="mt-1.5 text-2xl font-bold font-mono text-foreground">{profiles?.length ?? 0}</p>
        </div>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/80">Activos</p>
          <p className="mt-1.5 text-2xl font-bold font-mono text-emerald-400">{active}</p>
        </div>
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-400/80">Inactivos</p>
          <p className="mt-1.5 text-2xl font-bold font-mono text-red-400">{inactive}</p>
        </div>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Listado de Usuarios</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Usuario</th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rol</th>
                <th className="px-5 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Creado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {profiles?.map(profile => {
                const initials = (profile.full_name || profile.email)
                  .split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()

                return (
                  <tr key={profile.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 border border-primary/25 text-xs font-bold text-primary">
                          {initials}
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">
                            {profile.full_name || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">{profile.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn("role-badge", ROLE_COLORS[profile.role])}>
                        {ROLE_LABELS[profile.role]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {profile.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-400">
                          <XCircle className="h-3.5 w-3.5" />
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {formatDate(profile.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
