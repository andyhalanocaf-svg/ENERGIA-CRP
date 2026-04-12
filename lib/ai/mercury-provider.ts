import 'server-only'

// ======================================================
// PresupAI — Mercury-2 Provider Custom
// Adaptador para la API de InceptionLabs (compatible SSE)
// ======================================================

const INCEPTION_BASE_URL = process.env.INCEPTION_API_BASE_URL ?? 'https://api.inceptionlabs.ai/v1'
const INCEPTION_API_KEY = process.env.INCEPTION_API_KEY ?? ''
const MODEL_ID = process.env.MERCURY_MODEL_ID ?? 'mercury-coder-small'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/**
 * Llama a Mercury-2 con streaming.
 * Devuelve un ReadableStream con los chunks de texto.
 */
export async function streamMercury(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<ReadableStream<Uint8Array>> {
  const allMessages: ChatMessage[] = []

  if (systemPrompt) {
    allMessages.push({ role: 'system', content: systemPrompt })
  }
  allMessages.push(...messages)

  const response = await fetch(`${INCEPTION_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${INCEPTION_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL_ID,
      messages: allMessages,
      stream: true,
      temperature: 0.3,
      max_tokens: 2048,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Mercury-2 API error ${response.status}: ${errText}`)
  }

  if (!response.body) {
    throw new Error('No response body from Mercury-2')
  }

  // Transformar SSE → texto plano stream
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      const text = decoder.decode(chunk, { stream: true })
      const lines = text.split('\n')

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') return

        try {
          const json = JSON.parse(data)
          const content = json.choices?.[0]?.delta?.content ?? ''
          if (content) {
            controller.enqueue(encoder.encode(content))
          }
        } catch {
          // Ignorar líneas no-JSON
        }
      }
    },
  })

  response.body.pipeThrough(transform)
  return transform.readable
}

/**
 * Llamada NO streaming — para operaciones internas como resúmenes
 */
export async function completeMercury(
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<string> {
  const allMessages: ChatMessage[] = []
  if (systemPrompt) allMessages.push({ role: 'system', content: systemPrompt })
  allMessages.push(...messages)

  const response = await fetch(`${INCEPTION_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${INCEPTION_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL_ID,
      messages: allMessages,
      stream: false,
      temperature: 0.3,
      max_tokens: 1024,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Mercury-2 error: ${err}`)
  }

  const json = await response.json()
  return json.choices?.[0]?.message?.content ?? ''
}
