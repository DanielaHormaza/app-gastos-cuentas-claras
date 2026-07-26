// Vercel Serverless Function → POST /api/ai/expense
// Convierte texto libre ("2 cafés y una medialuna, 4500, pagó Juan") en un gasto estructurado
// usando la API de OpenAI. La API key vive SOLO acá en el server (variable de entorno
// OPENAI_API_KEY en Vercel), NUNCA en el celular ni en el bundle del cliente.
//
// Setup: ver docs/openai-setup.md. Sin OPENAI_API_KEY responde { ok:false, notConfigured:true }
// y la app sigue funcionando con el parser de reglas (degrada elegante).

const j = (res, obj) => res.status(200).json(obj)

function systemPrompt(ctx = {}) {
  const members = (ctx.members || []).map((m) => `${m.id} = ${m.short}`).join(', ') || '(ninguno)'
  const cats = (ctx.categories || []).map((c) => `${c.id} = ${c.name}`).join(', ') || '(ninguna)'
  return [
    'Sos un asistente que extrae UN gasto de un mensaje corto en español rioplatense.',
    'Respondé SOLO un objeto JSON con estas claves:',
    '- amount: número entero (sin separadores de miles). "2 lucas"=2000, "1.5k"=1500. Obligatorio; si no hay monto, amount=null.',
    '- desc: string. Nombre corto del gasto (ej. "Café", "Pasaje MZA-BA"). Sin el monto ni el nombre de quién pagó ni la nota.',
    '- note: string opcional. Aclaración o contexto del gasto que NO sea el nombre ni el monto (ej. si el mensaje dice "este gasto es una prueba", note="Cargado como prueba"). Resumila corta. Si no hay contexto extra, note=null.',
    '- categoryId: uno de los IDs de la lista de categorías si aplica claramente; si no, null.',
    '- payerId: el ID del miembro que pagó si se menciona; si no, null.',
    `- currency: código ISO ("ARS","USD","EUR","CLP","BRL","UYU","MXN","COP","PEN","GBP"). Default "${ctx.currency || 'ARS'}".`,
    '- cuotas: entero si se mencionan cuotas ("3 cuotas"=3); si no, null. El amount es POR CUOTA.',
    '- startMonth: nombre del mes (minúscula: "enero".."diciembre") de la fecha del gasto o de la PRIMERA cuota si se menciona ("en agosto", "fecha de julio", "el mes que viene"); si no, null.',
    '- startDay: día del mes (entero 1-31) si se menciona ("el 5 de agosto"=5); si no, null.',
    '- schedule: SOLO si se detalla cada cuota con su propio mes (ej. "1ra en agosto, 2da en septiembre, 3ra en noviembre") o con montos distintos por cuota. Array de objetos { month, day, amount }: month = nombre del mes en minúscula, day = día o null, amount = monto de ESA cuota. Sirve para meses NO consecutivos o montos distintos. Si las cuotas son consecutivas y del mismo monto, dejá schedule=null y usá cuotas + startMonth.',
    `Hoy es ${ctx.today || '(desconocida)'} (formato YYYY-MM-DD); usalo para resolver meses relativos ("el mes que viene").`,
    `Miembros (id = nombre): ${members}. "yo"/"pagué yo" = el usuario actual (id "${ctx.me || 'dani'}").`,
    `Categorías disponibles (id = nombre): ${cats}.`,
    'No inventes categorías fuera de la lista. Si dudás, categoryId=null.',
    'IMPORTANTE: si el mensaje NO describe un gasto (un saludo, una pregunta, charla, ej. "hola como estas?"), devolvé amount=null y el resto null.',
  ].join('\n')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method' })
  const key = process.env.OPENAI_API_KEY
  if (!key) return j(res, { ok: false, notConfigured: true })
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    const { text, context } = body
    if (!text || !String(text).trim()) return j(res, { ok: false, error: 'empty' })
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt(context) },
          { role: 'user', content: String(text) },
        ],
      }),
    })
    if (!r.ok) {
      const detail = (await r.text()).slice(0, 300)
      return j(res, { ok: false, error: 'openai', detail })
    }
    const data = await r.json()
    const content = data.choices?.[0]?.message?.content || '{}'
    let exp
    try { exp = JSON.parse(content) } catch { return j(res, { ok: false, error: 'json' }) }
    return j(res, { ok: true, exp })
  } catch (e) {
    return j(res, { ok: false, error: 'server', detail: String(e).slice(0, 300) })
  }
}
