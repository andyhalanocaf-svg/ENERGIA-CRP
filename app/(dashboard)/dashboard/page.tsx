import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MONTHS_SHORT_ES, AVAILABLE_YEARS } from "@/lib/constants"
import { formatCurrency, formatPercentInt } from "@/lib/formatters"
import Link from "next/link"
import { TrendingUp, TrendingDown, Minus, Calendar, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Metadata ────────────────────────────────────────────
export const metadata = {
  title: "Dashboard Anual",
}

// ─── Server-side Data Fetching ────────────────────────────
async function getAnnualData(year: number) {
  const supabase = await createClient()

  const { data: budgetLines, error } = await supabase
    .from("budget_lines")
    .select(`
      partida, category, total_annual,
      budget_jan, budget_feb, budget_mar, budget_apr,
      budget_may, budget_jun, budget_jul, budget_aug,
      budget_sep, budget_oct, budget_nov, budget_dec
    `)
    .eq("year", year)

  if (error || !budgetLines) return null

  const monthFields = [
    "budget_jan","budget_feb","budget_mar","budget_apr",
    "budget_may","budget_jun","budget_jul","budget_aug",
    "budget_sep","budget_oct","budget_nov","budget_dec",
  ] as const

  const totalAnnual = budgetLines.reduce((s, l) => s + (l.total_annual ?? 0), 0)
  const categoryA = budgetLines
    .filter(l => l.category === "A")
    .reduce((s, l) => s + (l.total_annual ?? 0), 0)
  const categoryB = budgetLines
    .filter(l => l.category === "B")
    .reduce((s, l) => s + (l.total_annual ?? 0), 0)

  const months = monthFields.map((field, idx) => ({
    month: idx + 1,
    label: MONTHS_SHORT_ES[idx],
    budget: budgetLines.reduce((s, l) => s + (l[field] ?? 0), 0),
  }))

  return { totalAnnual, categoryA, categoryB, months, linesCount: budgetLines.length }
}

// ─── Dashboard Page ───────────────────────────────────────
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const { year: yearParam } = await searchParams
  const year = yearParam ? Number(yearParam) : new Date().getFullYear()

  const data = await getAnnualData(year)

  const maxMonthBudget = data
    ? Math.max(...data.months.map(m => m.budget), 1)
    : 1

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Presupuesto Anual{" "}
            <span className="text-gradient-brand font-mono">{year}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen de 12 meses · Centro de Costo CC231
          </p>
        </div>

        {/* Selector de año */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div className="flex rounded-lg border border-border overflow-hidden">
            {AVAILABLE_YEARS.map(y => (
              <Link
                key={y}
                href={`/dashboard?year=${y}`}
                className={cn(
                  "px-3 py-1.5 text-sm font-mono font-medium transition-colors",
                  y === year
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-accent/10"
                )}
              >
                {y}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      {data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard
              title="Presupuesto Total"
              value={formatCurrency(data.totalAnnual)}
              sub={`${data.linesCount} líneas presupuestales`}
              variant="default"
              stagger={1}
            />
            <KpiCard
              title="Categoría A"
              value={formatCurrency(data.categoryA)}
              sub={`${formatPercentInt((data.categoryA / data.totalAnnual) * 100)} del total`}
              variant="success"
              stagger={2}
            />
            <KpiCard
              title="Categoría B"
              value={formatCurrency(data.categoryB)}
              sub={`${formatPercentInt((data.categoryB / data.totalAnnual) * 100)} del total`}
              variant="warning"
              stagger={3}
            />
          </div>

          {/* ── Grid de meses ── */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Distribución mensual
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {data.months.map((m, i) => {
                const heightPct = Math.max(8, (m.budget / maxMonthBudget) * 100)
                return (
                  <Link
                    key={m.month}
                    href={`/dashboard/${year}/${m.month}`}
                    className={cn(
                      "group relative rounded-xl border border-border bg-card p-4",
                      "hover:border-primary/50 hover:[box-shadow:3px_3px_0px_oklch(0.62_0.18_155_/_0.5)] transition-all duration-200",
                      `animate-fade-up stagger-${Math.min(i + 1, 6)}`
                    )}
                  >
                    {/* Bar chart mini */}
                    <div className="mb-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary/70 rounded-full transition-all duration-500"
                        style={{ width: `${heightPct}%` }}
                      />
                    </div>

                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {m.label}
                        </p>
                        <p className="mt-1 text-sm font-mono font-bold text-foreground finance-number">
                          {formatCurrency(m.budget, true)}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-primary transition-all duration-150 translate-x-1 group-hover:translate-x-0" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </>
      ) : (
        <EmptyState year={year} />
      )}
    </div>
  )
}

// ─── KPI Card inline ──────────────────────────────────────
function KpiCard({
  title,
  value,
  sub,
  variant,
  stagger,
}: {
  title: string
  value: string
  sub?: string
  variant: "default" | "success" | "warning" | "danger"
  stagger?: number
}) {
  const variantClasses = {
    default: "text-foreground",
    success: "text-emerald-400",
    warning: "text-amber-400",
    danger: "text-red-400",
  }

  return (
    <div className={cn(
      "rounded-xl border border-border bg-card p-5 card-hover",
      `animate-fade-up stagger-${stagger ?? 1}`
    )}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <p className={cn("mt-2 text-2xl font-bold finance-number", variantClasses[variant])}>
        {value}
      </p>
      {sub && (
        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      )}
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────
function EmptyState({ year }: { year: number }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
        <Calendar className="h-6 w-6 text-primary" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">
        Sin datos para {year}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm">
        No hay líneas presupuestales registradas para este año.
        Sube el Archivo Maestro Excel para comenzar.
      </p>
      <Link
        href="/upload"
        className="mt-6 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
      >
        Subir Archivo Maestro
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
