import 'server-only'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createAdminClient } from '@/lib/supabase/admin'

// ======================================================
// PresupAI — Embeddings Service (Gemini gemini-embedding-001)
// Dimensiones de salida: 768 (nativo del modelo)
// ======================================================

const GEMINI_API_KEY    = process.env.GEMINI_API_KEY ?? ''
const EMBEDDING_MODEL   = process.env.GEMINI_EMBEDDING_MODEL ?? 'gemini-embedding-001'
export const EMBEDDING_DIMENSIONS = 768

let _genAI: GoogleGenerativeAI | null = null

function getGenAI(): GoogleGenerativeAI {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY no está configurada en .env.local')
  }
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
  }
  return _genAI
}

/**
 * Genera un embedding vectorial de 768 dimensiones con Gemini
 * @param text — texto a vectorizar (se trunca a 9000 chars)
 * @param taskType — tipo de tarea para optimizar el embedding
 */
export async function generateEmbedding(
  text: string,
  taskType:
    | 'RETRIEVAL_DOCUMENT'
    | 'RETRIEVAL_QUERY'
    | 'SEMANTIC_SIMILARITY'
    | 'CLASSIFICATION'
    | 'CLUSTERING' = 'RETRIEVAL_DOCUMENT'
): Promise<number[]> {
  const genAI = getGenAI()
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL })

  const result = await model.embedContent({
    content: {
      role: 'user',
      parts: [{ text: text.slice(0, 9000) }],
    },
    taskType,
  })

  const values = result.embedding?.values
  if (!values || values.length === 0) {
    throw new Error(`[Gemini Embeddings] Respuesta vacía para el modelo ${EMBEDDING_MODEL}`)
  }

  return values
}

/**
 * Busca documentos relevantes en la Knowledge Base usando pgvector
 * Vectoriza el query con RETRIEVAL_QUERY para mayor precisión semántica
 */
export async function searchKnowledgeBase(
  query: string,
  topK: number = 5,
  threshold: number = 0.65
): Promise<Array<{ title: string; content: string; similarity: number }>> {
  let embedding: number[]

  try {
    embedding = await generateEmbedding(query, 'RETRIEVAL_QUERY')
  } catch (e) {
    console.error('[Embeddings] Error generando embedding con Gemini:', e)
    return []
  }

  const adminClient = createAdminClient()

  // RPC de búsqueda semántica con pgvector
  const { data, error } = await adminClient.rpc('search_kb_documents', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: topK,
  })

  if (error) {
    console.error('[KB Search] Error en pgvector search:', error.message)
    return []
  }

  return (data ?? []).map((doc: Record<string, unknown>) => ({
    title:      doc.title      as string,
    content:    doc.content    as string,
    similarity: doc.similarity as number,
  }))
}

/**
 * Construye el contexto RAG para inyectar al system prompt del chatbot
 */
export function buildRagContext(
  docs: Array<{ title: string; content: string; similarity: number }>
): string {
  if (docs.length === 0) return ''

  const lines = docs.map(
    (doc, i) => `### Documento ${i + 1}: ${doc.title}\n${doc.content}`
  )

  return `

## Contexto de la Base de Conocimiento PresupAI

${lines.join('\n\n---\n\n')}

---
Usa el contexto anterior para responder con precisión. Si la respuesta no está en el contexto, indícalo claramente.
`
}
