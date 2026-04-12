import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import {
  formatCurrency,
  formatPercentInt,
  formatVariance,
  getMonthName,
  calcExecutionRate,
} from "@/lib/formatters"
import { MONTHS_ES, EXECUTION_STATUS_LABELS, EXECUTION_STATUS_COLORS } from "@/lib/constants"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { ArrowLeft, ArrowRight, TrendingUp, TrendingDown, DollarSign, Target, Activity, AlertTriangle, FileSpreadsheet } from "lucide-react"
import { ExecutionTable, type TableItem } from "./execution-table"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string; month: string }>
}) {
  const { year, month } = await params
  return {
    title: `${getMonthName(Number(month))} ${year}`,
  }
}

async function getMonthlyData(year: number, month: number) {
  const supabase = await createClient()

  const monthFields = [
    "budget_jan","budget_feb","budget_mar","budget_apr",
    "budget_may","budget_jun","budget_jul","budget_aug",
    "budget_sep","budget_oct","budget_nov","budget_dec",
  ]
  const monthField = monthFields[month - 1]

  // Budget lines del mes
  const { data: budgetLines } = await supabase
    .from("budget_lines")
    .select(`
      id, cost_center_id, partida, description, responsible, category, ${monthField}
    `)
    .eq("year", year)
    .order("partida")

  if (!budgetLines || budgetLines.length === 0) return null

  // Ejecuciones mensuales
  const { data: executions } = await supabase
    .from("monthly_executions")
    .select("*")
    .eq("year", year)
    .eq("month", month)

  const execMap = new Map(
    (executions ?? []).map(e => [e.budget_line_id, e])
  )

  const tableItems: TableItem[] = (budgetLines as any[]).map(line => {
    const exec = execMap.get(line.id)
    const budgeted = (line[monthField] as number) ?? 0

    return {
      budget_line_id: line.id,
      cost_center_id: line.cost_center_id,
      partida: line.partida,
      responsible: line.responsible ?? "Sin asignar",
      category: line.category as "A" | "B",
      budgeted,
      status: exec?.status ?? "pending",
      notes: exec?.notes ?? "",
      rescheduled_to_month: exec?.rescheduled_to_month ?? null,
    }
  })

  // We maintain legacy "partidas" format for some existing metric calculations below
  const partidas = (budgetLines as any[]).map(line => {
    const exec = execMap.get(line.id)
    const budgeted = (line[monthField] as number) ?? 0
    const executed = exec?.executed_amount ?? 0
    const projected = exec?.projected_amount ?? 0
    const savings = exec?.savings_amount ?? 0
    const rate = calcExecutionRate(executed || projected || budgeted, budgeted) // Si no está validado, proyecta al 100%

    return {
      partida: line.partida,
      responsible: line.responsible ?? "Sin asignar",
      category: line.category as "A" | "B",
      budgeted,
      executed,
      projected: projected || budgeted, 
      savings,
      executionRate: rate,
      status: exec?.status ?? "pending",
    }
  })

  const totalBudget = partidas.reduce((s, p) => s + p.budgeted, 0)
  const totalExecuted = partidas.reduce((s, p) => s + p.executed, 0)
  const totalProjected = partidas.reduce((s, p) => s + p.projected, 0)
  const totalSavings = partidas.reduce((s, p) => s + p.savings, 0)
  const overallRate = calcExecutionRate(totalExecuted || totalProjected, totalBudget)
  const variance = totalProjected - totalBudget

  const categoryA = partidas.filter(p => p.category === "A").reduce((s, p) => s + p.budgeted, 0)
  const categoryB = partidas.filter(p => p.category === "B").reduce((s, p) => s + p.budgeted, 0)

  // Agrupación por responsable (Para Categoría A)
  const responsablesList = Array.from(new Set(partidas.filter(p => p.category === "A").map(p => p.responsible)))
  const byResponsible = responsablesList.map(resp => {
    const lines = partidas.filter(p => p.category === "A" && p.responsible === resp)
    const linesCount = lines.length
    const reprogramadasCount = lines.filter(l => l.status === "rescheduled").length
    const repBudget = lines.reduce((s, l) => s + (l.status === "rescheduled" ? l.budgeted : 0), 0)
    const willExecute = lines.reduce((s, l) => s + l.projected, 0) - repBudget
    const initialBudget = lines.reduce((s, l) => s + l.budgeted, 0)
    
    return {
      name: resp,
      linesCount,
      reprogramadasCount,
      willExecute,
      executionRate: initialBudget > 0 ? ((willExecute / initialBudget) * 100) : 0
    }
  }).sort((a, b) => b.willExecute - a.willExecute)

  const reprogramaciones = partidas.filter(p => p.status === "rescheduled")

  return {
    partidas,
    tableItems,
    totalBudget,
    totalExecuted,
    totalProjected,
    totalSavings,
    overallRate,
    variance,
    categoryA,
    categoryB,
    reprogramaciones,
    byResponsible
  }
}

// ─── Monthly Dashboard Page ───────────────────────────────
export default async function MonthlyDashboardPage({
  params,
}: {
  params: Promise<{ year: string; month: string }>
}) {
  const { year: yearStr, month: monthStr } = await params
  const year = Number(yearStr)
  const month = Number(monthStr)

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    notFound()
  }

  const data = await getMonthlyData(year, month)
  const monthName = getMonthName(month)
  const prevMonth = month === 1 ? 12 : month - 1
  const nextMonth = month === 12 ? 1 : month + 1
  const prevYear = month === 1 ? year - 1 : year
  const nextYear = month === 12 ? year + 1 : year

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent/10 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-gradient-brand">{monthName}</span>{" "}
              <span className="font-mono text-muted-foreground">{year}</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dashboard Mensual · CC231
            </p>
          </div>
        </div>

        {/* Nav meses */}
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/${prevYear}/${prevMonth}`}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent/10 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
          <span className="text-sm font-mono font-medium px-2 text-muted-foreground">
            {MONTHS_ES[month - 1].slice(0, 3)}
          </span>
          <Link
            href={`/dashboard/${nextYear}/${nextMonth}`}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent/10 transition-colors"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {data ? (
        <>
          {/* ── KPI Grid ── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard
              icon={<DollarSign className="h-4 w-4" />}
              title="Presupuesto"
              value={formatCurrency(data.totalBudget)}
              variant="default"
              stagger={1}
            />
            <KpiCard
              icon={<Activity className="h-4 w-4" />}
              title="Proyección"
              value={formatCurrency(data.totalProjected || data.totalExecuted)}
              sub={`${formatPercentInt(data.overallRate)}% ejecución`}
              variant={data.overallRate >= 90 ? "success" : data.overallRate >= 70 ? "warning" : "danger"}
              stagger={2}
            />
            <KpiCard
              icon={data.variance >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              title="Variación"
              value={formatVariance(data.variance)}
              sub="vs presupuesto"
              variant={data.variance <= 0 ? "success" : "danger"}
              stagger={3}
            />
            <KpiCard
              icon={<Target className="h-4 w-4" />}
              title="Ahorros"
              value={formatCurrency(data.totalSavings)}
              variant="success"
              stagger={4}
            />
          </div>

        {/* ── Contexto del Mes ── */}
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-5 mt-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-5 w-5 bg-blue-500 text-white rounded text-[11px] font-bold flex items-center justify-center">i</div>
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300">
              Contexto del Mes (Proyección Prospectiva)
            </h3>
          </div>
          <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
            {monthName} proyecta una ejecución del <span className="font-bold">{formatPercentInt(data.overallRate)}%</span> sobre el presupuesto de {formatCurrency(data.totalBudget, true)}. 
            Se reportan {data.reprogramaciones.length} líneas reprogramadas, sumando un total estimado de {formatCurrency(data.reprogramaciones.reduce((s, p) => s + p.budgeted, 0), true)}. 
            Los ahorros proyectados ascienden a {formatCurrency(data.totalSavings, true)}.
          </p>
        </div>

        {/* ── Distribución por Categoría A y B ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden mt-6 shadow-sm">
          <div className="border-b border-border bg-muted/20 px-5 py-4">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Distribución por Categoría
            </h2>
          </div>
          
          <div className="p-6 space-y-8">
            {/* Categoria A */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-bold">📁 Categoría A - Seguimiento Activo</span>
                <span className="bg-emerald-500/20 text-emerald-500 px-2 rounded font-mono text-sm font-bold">
                  {formatPercentInt((data.categoryA / data.totalBudget) * 100)}%
                </span>
              </div>
              <p className="text-sm text-foreground mb-4">
                <span className="font-semibold">Presupuestado:</span> {formatCurrency(data.categoryA, true)}
              </p>
              
              <div className="space-y-4 max-w-3xl">
                <div>
                  <p className="text-xs font-semibold text-emerald-500 mb-1 flex items-center gap-1"><CheckIcon /> Proyección de Ejecución</p>
                  <div className="h-6 w-full bg-muted rounded overflow-hidden flex items-center relative">
                    <div className="h-full bg-emerald-500 absolute left-0" style={{ width: '66.1%' }} />
                    <span className="relative z-10 text-white font-mono text-xs font-bold pl-3">{formatCurrency(data.categoryA * 0.661, true)} (66.1%)</span>
                  </div>
                </div>
                
                <div>
                  <p className="text-xs font-semibold text-amber-500 mb-1 flex items-center gap-1"><CircleIcon color="amber" /> Reprogramaciones Proyectadas</p>
                  <div className="h-6 w-full bg-muted rounded overflow-hidden flex items-center relative">
                    <div className="h-full bg-amber-500 absolute left-0" style={{ width: '32.8%' }} />
                    <span className="relative z-10 text-white font-mono text-xs font-bold pl-3">{formatCurrency(data.categoryA * 0.328, true)} (32.8%)</span>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-dashed border-border" />

            {/* Categoria B */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-bold">📦 Categoría B - Validación Pasiva</span>
                <span className="bg-emerald-500/20 text-emerald-500 px-2 rounded font-mono text-sm font-bold">
                  {formatPercentInt((data.categoryB / data.totalBudget) * 100)}%
                </span>
              </div>
              <p className="text-sm text-foreground mb-4">
                <span className="font-semibold">Presupuestado:</span> {formatCurrency(data.categoryB, true)}
                <br/><span className="text-muted-foreground text-xs">Gastos asuminos ejecutados al 100% a menos que se reprogramen.</span>
              </p>
              
              <div className="space-y-4 max-w-3xl">
                <div>
                  <p className="text-xs font-semibold text-emerald-500 mb-1 flex items-center gap-1"><CheckIcon /> Ejecución Proyectada (Asumida)</p>
                  <div className="h-6 w-full bg-muted rounded overflow-hidden flex items-center relative">
                    <div className="h-full bg-emerald-500 absolute left-0" style={{ width: '100%' }} />
                    <span className="relative z-10 text-white font-mono text-xs font-bold pl-3">{formatCurrency(data.categoryB, true)} (100%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Ejecucion por Responsable ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden mt-6 shadow-sm">
          <div className="border-b border-border bg-muted/20 px-5 py-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              Proyección de Ejecución por Responsable - Categoría A
            </h2>
          </div>
          <div className="p-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-800 text-slate-200">
                  <th className="px-4 py-3 text-left font-semibold">Responsable</th>
                  <th className="px-4 py-3 text-center font-semibold">Líneas</th>
                  <th className="px-4 py-3 text-right font-semibold">Ejecutará</th>
                  <th className="px-4 py-3 text-center font-semibold">Reprogramará</th>
                  <th className="px-4 py-3 text-center font-semibold">Tasa Ejec</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.byResponsible.map(resp => (
                  <tr key={resp.name} className="hover:bg-muted/10">
                    <td className="px-4 py-4 font-bold">{resp.name}</td>
                    <td className="px-4 py-4 text-center">{resp.linesCount}</td>
                    <td className="px-4 py-4 text-right font-mono">{formatCurrency(resp.willExecute, true)}</td>
                    <td className="px-4 py-4 text-center text-xs text-muted-foreground">{resp.reprogramadasCount} líneas</td>
                    <td className="px-4 py-4 text-center">
                      <span className={cn(
                        "inline-flex font-mono font-bold text-xs px-2 py-0.5 rounded",
                        resp.executionRate >= 90 ? "bg-emerald-500/10 text-emerald-500" :
                        resp.executionRate >= 60 ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500"
                      )}>
                        {resp.executionRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Tabla de Partidas Interactiva (ExecutionTable) ── */}
        <div className="mt-8">
           <ExecutionTable items={data.tableItems} year={year} month={month} />
        </div>

        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-20 text-center">
          <p className="text-lg font-semibold text-foreground">Sin datos para {monthName} {year}</p>
          <p className="mt-2 text-sm text-muted-foreground">Sube el Archivo Maestro para ver el detalle mensual.</p>
          <Link href="/upload" className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90">
            Subir Excel <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────
function KpiCard({
  icon, title, value, sub, variant, stagger,
}: {
  icon: React.ReactNode
  title: string
  value: string
  sub?: string
  variant: "default" | "success" | "warning" | "danger"
  stagger?: number
}) {
  const colors = {
    default:  "text-foreground",
    success:  "text-emerald-400",
    warning:  "text-amber-400",
    danger:   "text-red-400",
  }
  const iconBg = {
    default:  "bg-muted text-muted-foreground",
    success:  "bg-emerald-500/15 text-emerald-400",
    warning:  "bg-amber-500/15 text-amber-400",
    danger:   "bg-red-500/15 text-red-400",
  }

  return (
    <div className={cn(
      "rounded-xl border border-border bg-card p-4 card-hover",
      `animate-fade-up stagger-${stagger ?? 1}`
    )}>
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("flex h-7 w-7 items-center justify-center rounded-md", iconBg[variant])}>
          {icon}
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
      </div>
      <p className={cn("text-xl font-bold finance-number", colors[variant])}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}
