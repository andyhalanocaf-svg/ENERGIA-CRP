import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { formatDate } from "@/lib/formatters"
import { KB_CATEGORY_LABELS } from "@/lib/constants"
import { BookOpen, Plus, Search, Tag, FileText, CheckCircle2, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { KbDocumentForm } from "./kb-form"
import type { KbDocument } from "@/types"

export const metadata = { title: "Base de Conocimiento" }

export default async function KnowledgeBasePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!["super_admin", "admin"].includes(me?.role ?? "")) redirect("/admin")

  const adminClient = createAdminClient()
  const { data: docs } = await adminClient
    .from("kb_documents")
    .select("id, title, category, tags, is_active, version, created_at, updated_at")
    .order("updated_at", { ascending: false })

  const activeCount = docs?.filter(d => d.is_active).length ?? 0
  const categories = [...new Set(docs?.map(d => d.category) ?? [])]

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Base de <span className="text-gradient-brand">Conocimiento</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {docs?.length ?? 0} documentos · {activeCount} activos — alimentan el chatbot PresupAI
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Form — 2 cols */}
        <div className="lg:col-span-2">
          <KbDocumentForm />
        </div>

        {/* Lista — 3 cols */}
        <div className="lg:col-span-3 space-y-3">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-card p-3 text-center">
              <p className="text-xl font-bold font-mono text-foreground">{docs?.length ?? 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Total</p>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-center">
              <p className="text-xl font-bold font-mono text-emerald-400">{activeCount}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Activos</p>
            </div>
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-center">
              <p className="text-xl font-bold font-mono text-blue-400">{categories.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Categorías</p>
            </div>
          </div>

          {/* Document list */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Documentos</h3>
            </div>

            {docs && docs.length > 0 ? (
              <div className="divide-y divide-border">
                {docs.map((doc: any) => (
                  <div key={doc.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                        {doc.is_active ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          <Tag className="h-2.5 w-2.5" />
                          {KB_CATEGORY_LABELS[doc.category] ?? doc.category}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">
                          v{doc.version} · {formatDate(doc.updated_at)}
                        </span>
                      </div>
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {doc.tags.slice(0, 4).map((tag: string) => (
                            <span key={tag} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                              {tag}
                            </span>
                          ))}
                          {doc.tags.length > 4 && (
                            <span className="text-[10px] text-muted-foreground">+{doc.tags.length - 4}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Sin documentos en la KB</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Agrega documentos para mejorar las respuestas del chatbot
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
