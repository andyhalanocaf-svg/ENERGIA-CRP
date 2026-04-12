"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Upload,
  Settings,
  MessageCircle,
  ChevronLeft,
  BarChart3,
  Users,
  Mail,
  BookOpen,
  Shield,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { APP_NAME, COST_CENTER_CODE } from "@/lib/constants"
import type { UserRole } from "@/types"

// ─── Definición de nav items ──────────────────────────────
interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: UserRole[]
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/upload",
    label: "Subir Excel",
    icon: Upload,
    roles: ["super_admin", "admin"],
  },
]

const ADMIN_ITEMS: NavItem[] = [
  {
    href: "/admin/users",
    label: "Usuarios",
    icon: Users,
    roles: ["super_admin"],
  },
  {
    href: "/admin/allowed-emails",
    label: "Emails Permitidos",
    icon: Mail,
    roles: ["super_admin"],
  },
  {
    href: "/admin/knowledge-base",
    label: "Base de Conocimiento",
    icon: BookOpen,
    roles: ["super_admin", "admin"],
  },
]

// ─── Sidebar Component ────────────────────────────────────
export function Sidebar({ userRole }: { userRole: UserRole }) {
  const pathname = usePathname()

  const canSeeAdmin = ["super_admin", "admin"].includes(userRole)

  return (
    <aside className="flex w-60 flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 border border-primary/30">
          <BarChart3 className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-sidebar-foreground leading-none">
            {APP_NAME}
          </p>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
            {COST_CENTER_CODE}
          </p>
        </div>
      </div>

      {/* Nav principal */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          General
        </p>

        {NAV_ITEMS.filter(
          item => !item.roles || item.roles.includes(userRole)
        ).map(item => (
          <SidebarNavItem key={item.href} item={item} pathname={pathname} />
        ))}

        {/* Sección Admin */}
        {canSeeAdmin && (
          <>
            <div className="my-3 border-t border-sidebar-border" />
            <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Shield className="h-3 w-3" />
              Administración
            </p>
            {ADMIN_ITEMS.filter(
              item => !item.roles || item.roles.includes(userRole)
            ).map(item => (
              <SidebarNavItem key={item.href} item={item} pathname={pathname} />
            ))}
          </>
        )}
      </nav>

      {/* Chatbot flotante hint */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-primary/5 border border-primary/20">
          <MessageCircle className="h-4 w-4 text-primary flex-shrink-0" />
          <div>
            <p className="text-xs font-medium text-sidebar-foreground">
              PresupAI Chat
            </p>
            <p className="text-[10px] text-muted-foreground">
              Mercury-2 · Activo
            </p>
          </div>
          <div className="ml-auto h-2 w-2 rounded-full bg-primary animate-pulse" />
        </div>
      </div>
    </aside>
  )
}

// ─── NavItem individual ───────────────────────────────────
function SidebarNavItem({
  item,
  pathname,
}: {
  item: NavItem
  pathname: string
}) {
  const isActive =
    item.href === "/dashboard"
      ? pathname === "/dashboard" || pathname.startsWith("/dashboard/")
      : pathname.startsWith(item.href)

  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150",
        isActive
          ? "bg-primary/15 text-primary border border-primary/25 shadow-brutal-sm"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className={cn("h-4 w-4 flex-shrink-0", isActive && "text-primary")} />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-mono text-primary">
          {item.badge}
        </span>
      )}
    </Link>
  )
}
