"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { APP_NAME } from "@/lib/constants"
import { Suspense } from "react"

// ─── Login Page — PresupAI Neobrutalist Finance ──────────
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Errores del servidor (inactive, etc.)
  const urlError = searchParams.get("error")
  const serverError =
    urlError === "inactive"
      ? "Tu cuenta está inactiva. Contacta al administrador."
      : urlError === "auth_callback_failed"
      ? "Error de autenticación. Intenta de nuevo."
      : null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const supabase = createClient()

    if (isSignUp) {
      // 1. Llamar al registro nativo de Supabase (sin usar Admin API rota)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      // Si fue exitoso, ya están logueados por Supabase.
      window.location.href = "/dashboard"
      return
    }

    // 2. Iniciar sesión usando cliente
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(
        authError.message === "Invalid login credentials"
          ? "Credenciales incorrectas. Verifica tu email y contraseña."
          : authError.message
      )
      setLoading(false)
      return
    }

    // window.location.href en vez de router.replace para asegurar cookies
    window.location.href = "/dashboard"
  }

  const displayError = error || serverError

  return (
    <div className="min-h-screen bg-background bg-grid flex items-center justify-center p-4">
      {/* Glow de fondo */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-up">
        {/* Logo / Marca */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 border border-primary/30 shadow-brutal mb-4">
            <span className="text-2xl font-bold text-primary">P</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {APP_NAME}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Control Presupuestal · CRP Radios
          </p>
        </div>

        {/* Card de login */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-brutal">
          <h2 className="mb-5 text-base font-semibold text-foreground">
            {isSignUp ? "Crear cuenta" : "Iniciar sesión"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="usuario@crpradios.com"
                className="w-full input-brutal text-sm"
              />
            </div>

            {/* Contraseña */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                placeholder="••••••••"
                className="w-full input-brutal text-sm"
              />
              {isSignUp && (
                <p className="text-[10px] text-muted-foreground/80 lowercase mt-1">Mínimo 6 caracteres.</p>
              )}
            </div>

            {/* Error */}
            {displayError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive animate-fade-in">
                {displayError}
              </div>
            )}

            {/* Submit */}
            <button
              id="btn-login"
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold
                         transition-all duration-150 hover:opacity-90 hover:[box-shadow:3px_3px_0px_oklch(0.62_0.18_155_/_0.5)]
                         disabled:opacity-60 disabled:cursor-not-allowed
                         active:translate-y-px"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                  {isSignUp ? "Creando..." : "Ingresando..."}
                </span>
              ) : (
                isSignUp ? "Crear cuenta" : "Ingresar"
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button 
              type="button" 
              onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
              className="text-xs text-primary hover:underline hover:text-primary/80 transition-colors"
            >
              {isSignUp 
                ? "¿Ya tienes cuenta? Iniciar sesión" 
                : "¿No tienes cuenta? Crear una nueva"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground/50">
          {APP_NAME} v1.0 · Solo acceso autorizado
        </p>
      </div>
    </div>
  )
}
