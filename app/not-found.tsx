import Link from "next/link"
import { ArrowLeft, AlertCircle } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background bg-grid flex items-center justify-center p-4">
      <div className="text-center space-y-6 animate-fade-up">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 border border-primary/30 shadow-brutal mx-auto">
          <AlertCircle className="h-10 w-10 text-primary" />
        </div>
        <div>
          <p className="text-sm font-mono font-bold text-muted-foreground mb-2">ERROR 404</p>
          <h1 className="text-4xl font-black tracking-tight text-foreground">
            Página no encontrada
          </h1>
          <p className="mt-3 text-base text-muted-foreground max-w-sm mx-auto">
            La ruta que buscas no existe o no tienes permisos para acceder a ella.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 h-10 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 hover:[box-shadow:3px_3px_0px_oklch(0.62_0.18_155_/_0.5)] transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al Dashboard
        </Link>
      </div>
    </div>
  )
}
