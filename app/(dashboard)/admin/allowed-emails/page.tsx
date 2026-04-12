import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ROLE_LABELS } from "@/lib/constants"
import { formatDate } from "@/lib/formatters"
import { Mail, Plus, Trash2, Clock, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { AddEmailForm } from "./add-email-form"

export const metadata = { title: "Emails Permitidos" }

export default async function AllowedEmailsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const adminClient = createAdminClient()
  const { data: me } = await adminClient.from("profiles").select("role").eq("id", user.id).single()
  if (me?.role !== "super_admin") redirect("/admin")
  const { data: emails } = await adminClient
    .from("allowed_emails")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Lista Blanca de <span className="text-gradient-brand">Emails</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Solo los correos registrados aquí pueden acceder al sistema
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Form — 2 cols */}
        <div className="lg:col-span-2">
          <AddEmailForm />
        </div>

        {/* Tabla — 3 cols */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-5 py-3 flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Correos autorizados ({emails?.length ?? 0})</h3>
            </div>
            {emails && emails.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rol</th>
                    <th className="px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Agregado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {emails.map(email => (
                    <tr key={email.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-xs text-foreground font-mono">{email.email}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {ROLE_LABELS[email.assigned_role] ?? email.assigned_role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {email.accepted_at ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Aceptado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-400">
                            <Clock className="h-3 w-3" /> Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(email.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center py-12 text-center">
                <div>
                  <Mail className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Sin emails registrados</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
