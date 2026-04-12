"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ROLE_LABELS, ROLE_COLORS, APP_NAME } from "@/lib/constants"
import { LogOut, User, ChevronDown, Bell } from "lucide-react"
import type { Profile } from "@/types"
import { cn } from "@/lib/utils"
import { useState } from "react"

// ─── Header Component ─────────────────────────────────────
export function Header({ profile }: { profile: Profile }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  const displayName = profile.full_name || profile.email.split("@")[0]
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="relative z-50 flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/50 px-6 backdrop-blur-sm">
      {/* Left — Breadcrumb / Título */}
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground/80">
          {APP_NAME}
        </h2>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-xs font-mono text-muted-foreground">CC231</span>
      </div>

      {/* Right — Actions + User Menu */}
      <div className="flex items-center gap-3">
        {/* Notificaciones (placeholder) */}
        <button
          id="btn-notifications"
          className="relative flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background hover:bg-accent/10 transition-colors"
          aria-label="Notificaciones"
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            id="btn-user-menu"
            onClick={() => setMenuOpen(v => !v)}
            className="flex items-center gap-2.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent/10 transition-colors"
          >
            {/* Avatar */}
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 border border-primary/30 text-[10px] font-bold text-primary">
              {initials}
            </div>
            <span className="font-medium text-foreground max-w-[120px] truncate">
              {displayName}
            </span>
            {/* Role badge */}
            <span className={cn("role-badge text-[10px]", ROLE_COLORS[profile.role])}>
              {ROLE_LABELS[profile.role]}
            </span>
            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", menuOpen && "rotate-180")} />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-1.5 w-52 rounded-lg border border-border bg-card shadow-brutal animate-scale-in">
                <div className="border-b border-border px-3 py-2.5">
                  <p className="text-xs font-medium text-foreground truncate">
                    {profile.email}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {ROLE_LABELS[profile.role]}
                  </p>
                </div>
                <div className="p-1">
                  <button
                    id="btn-profile"
                    onClick={() => { setMenuOpen(false) }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent/10 transition-colors"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    Mi Perfil
                  </button>
                  <button
                    id="btn-signout"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
