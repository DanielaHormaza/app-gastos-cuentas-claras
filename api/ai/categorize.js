// Vercel Serverless Function → POST /api/ai/categorize
// Categorización inteligente LIVIANA: dada la descripción de un gasto y la lista de categorías
// existentes, devuelve el id de la que mejor corresponde (o null). Prompt mínimo = pocos tokens.
// Solo se llama cuando el parser no encontró categoría y la descripción es nueva (no está en la
// memoria del usuario). La key vive solo en el server (OPENAI_API_KEY).

const j = (res, obj) => res.status(200).json(obj)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' })
  const key = process.env.OPENAI_API_KEY
  if (!key) return j(res, { ok: false, notConfigured: true })
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    const { desc, categories } = body
    if (!desc || !Array.isArray(categories) || !categories.length) return j(res, { ok: false, error: 'empty' })
    const list = categories.map((c) => `${c.id} = ${c.name}`).join(', ')
    const sys = [
      'Elegí la categoría que mejor corresponde a la descripción de un gasto en español rioplatense.',
      `Categorías (id = nombre): ${list}.`,
      'Respondé SOLO un JSON {"categoryId": "<id>"} con el id EXACTO de la lista, o {"categoryId": null} si ninguna aplica claramente.',
      'Ej: "uber"/"taxi"/"sube"/"nafta" → transporte; "carrefour"/"verdulería" → super; "farmacia" → salud.',
    ].join('\n')
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0,
        max_tokens: 30,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: String(desc) },
        ],
      }),
    })
    if (!r.ok) return j(res, { ok: false, error: 'openai', detail: (await r.text()).slice(0, 200) })
    const data = await r.json()
    let parsed
    try { parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}') } catch { return j(res, { ok: false, error: 'json' }) }
    return j(res, { ok: true, categoryId: parsed.categoryId || null })
  } catch (e) {
    return j(res, { ok: false, error: 'server', detail: String(e).slice(0, 200) })
  }
}
