import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// ======================================================
// Supabase Admin Client — Service Role (operaciones privilegiadas)
// SOLO usar en Route Handlers seguros, NUNCA en el browser
// ======================================================
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
