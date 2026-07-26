// Cliente de la IA de carga. Llama a la función serverless /api/ai/expense (que a su vez llama a
// OpenAI con la key del server). Nunca maneja la API key. Si algo falla o la IA no está
// configurada, devuelve null y la app sigue con el parser de reglas.
//
// Se activa con la variable de entorno VITE_AI_ENABLED=1 (ver docs/openai-setup.md). Sin eso,
// AI_ENABLED es false y nunca se hace la llamada de red.
export const AI_ENABLED = import.meta.env.VITE_AI_ENABLED === '1'

export async function aiParseExpense(text, context) {
  try {
    const r = await fetch('/api/ai/expense', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, context }),
    })
    const data = await r.json()
    if (!data || !data.ok || !data.exp) return null
    return data.exp
  } catch {
    return null
  }
}
