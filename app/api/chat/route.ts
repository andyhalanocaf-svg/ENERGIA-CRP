import { createClient } from "@/lib/supabase/server"
import { apiError } from "@/lib/api-helpers"
import { streamMercury } from "@/lib/ai/mercury-provider"
import { searchKnowledgeBase, buildRagContext } from "@/lib/ai/embeddings"
import type { NextRequest } from "next/server"

// ─── System Prompt de PresupAI ────────────────────────────
const SYSTEM_PROMPT = `Eres PresupAI, el asistente inteligente de control presupuestal de CRP Radios (Centro de Costo CC231).

Tu función es ayudar a los usuarios a:
- Entender el estado del presupuesto anual y mensual
- Interpretar los KPIs de ejecución, proyección y variación
- Explicar los procesos de reprogramación presupuestal
- Responder preguntas sobre partidas, responsables y categorías A/B
- Orientar sobre el uso del sistema PresupAI

Reglas de respuesta:
- Responde siempre en español
- Usa formato Markdown cuando sea útil (listas, tablas, negrita)
- Sé conciso y preciso. El usuario trabaja con datos financieros
- Si no sabes algo, dilo claramente en lugar de inventar datos
- Para valores monetarios, usa el formato S/ (Soles Peruanos)
- No inventes cifras; solo las que aparezcan en el contexto provisto
`

// POST /api/chat
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError("No autenticado", 401)

  let body: { messages: Array<{ role: string; content: string }> }
  try {
    body = await request.json()
  } catch {
    return apiError("JSON inválido", 400)
  }

  const { messages } = body
  if (!messages || messages.length === 0) {
    return apiError("No se recibieron mensajes", 400)
  }

  const lastUserMessage = messages.filter(m => m.role === "user").at(-1)?.content ?? ""

  // RAG: buscar contexto relevante
  let ragContext = ""
  try {
    const relatedDocs = await searchKnowledgeBase(lastUserMessage, 4)
    ragContext = buildRagContext(relatedDocs)
  } catch (e) {
    // RAG falla gracefully — continúa sin contexto
    console.warn("[Chat] RAG no disponible:", e)
  }

  const systemWithContext = SYSTEM_PROMPT + ragContext

  // Stream con Mercury-2
  try {
    const stream = await streamMercury(
      messages as Array<{ role: "user" | "assistant" | "system"; content: string }>,
      systemWithContext
    )

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache",
      },
    })
  } catch (e) {
    console.error("[Chat] Error de streaming:", e)
    return apiError(
      "El servicio de IA no está disponible en este momento. Intenta de nuevo más tarde.",
      503
    )
  }
}
