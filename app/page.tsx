import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

// ======================================================
// Página raíz — Redirect a /dashboard o /login
// ======================================================
export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
  } else {
    redirect("/login")
  }
}
