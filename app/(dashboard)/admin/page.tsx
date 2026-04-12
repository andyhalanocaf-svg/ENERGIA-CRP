import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { ROLE_LABELS, ROLE_COLORS } from "@/lib/constants"
import { formatDate } from "@/lib/formatters"
import { Users, Mail, BookOpen, Shield, TrendingUp } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export const metadata = { title: "Administración" }

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Verificar rol con admin client (bypasea RLS)
  const adminClient = createAdminClient()
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!["super_admin", "admin"].includes(profile?.role ?? "")) {
    redirect("/dashboard")
  }

  // Stats
  const [{ count: usersCount }, { count: kbCount }, { count: uploadsCount }] = await Promise.all([
    adminClient.from("profiles").select("*", { count: "exact", head: true }),
    adminClient.from("kb_documents").select("*", { count: "exact", head: true }).eq("is_active", true),
    adminClient.from("file_uploads").select("*", { count: "exact", head: true }).eq("status", "completed"),
  ])

  const cards = [
    {
      href: "/admin/users",
      icon: Users,
      title: "Usuarios",
      value: usersCount ?? 0,
      sub: "cuentas activas",
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
      roles: ["super_admin"],
    },
    {
      href: "/admin/allowed-emails",
      icon: Mail,
      title: "Emails Permitidos",
      value: "—",
      sub: "lista blanca de acceso",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
      roles: ["super_admin"],
    },
    {
      href: "/admin/knowledge-base",
      icon: BookOpen,
      title: "Knowledge Base",
      value: kbCount ?? 0,
      sub: "documentos activos",
      color: "text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/20",
      roles: ["super_admin", "admin"],
    },
    {
      href: "/upload",
      icon: TrendingUp,
      title: "Archivos Procesados",
      value: uploadsCount ?? 0,
      sub: "cargas completadas",
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
      roles: ["super_admin", "admin"],
    },
  ]

  const visibleCards = cards.filter(c => c.roles.includes(profile?.role ?? ""))

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 border border-primary/30">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel de Administración</h1>
          <p className="text-sm text-muted-foreground">Gestiona usuarios, accesos y la base de conocimiento del chatbot</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visibleCards.map((card, i) => {
          const Icon = card.icon
          return (
            <Link
              key={card.href}
              href={card.href}
              className={cn(
                "group rounded-xl border p-5 card-hover",
                card.bg,
                `animate-fade-up stagger-${i + 1}`
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/50">
                  <Icon className={cn("h-5 w-5", card.color)} />
                </div>
              </div>
              <p className={cn("text-2xl font-bold font-mono finance-number", card.color)}>
                {card.value}
              </p>
              <p className="text-sm font-semibold text-foreground mt-1">{card.title}</p>
              <p className="text-xs text-muted-foreground">{card.sub}</p>
            </Link>
          )
        })}
      </div>

      {/* Accesos rápidos */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Acciones Rápidas
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleCards.map(card => {
            const Icon = card.icon
            return (
              <Link
                key={card.href}
                href={card.href}
                className="flex items-center gap-3 rounded-lg border border-border bg-background/50 px-4 py-3 hover:bg-accent/10 hover:border-primary/30 transition-all duration-150"
              >
                <Icon className={cn("h-4 w-4 shrink-0", card.color)} />
                <div>
                  <p className="text-sm font-medium text-foreground">{card.title}</p>
                  <p className="text-xs text-muted-foreground">{card.sub}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
