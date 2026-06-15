/**
 * Lógica de negocio de Cuentas Claras — funciones puras portadas del prototipo.
 * Todas reciben `state` como primer argumento (no mutan nada).
 */

// Formato de monto: "$4.500" / "-$1.200".
export function fmt(n) {
  n = Math.round(n)
  const neg = n < 0 ? '-' : ''
  const s = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return neg + '$' + s
}

export function catById(state, id) {
  return state.categories.find((c) => c.id === id) || { icon: '🏷️', name: 'Otros' }
}

export function memberById(state, gid, id) {
  return state.groups[gid].members.find((m) => m.id === id) || { short: '?', color: '#94A3B8', initial: '?', name: '?' }
}

// Adivina un emoji para una categoría nueva a partir de su nombre.
export function guessIcon(name) {
  const n = (name || '').toLowerCase()
  const map = [
    ['regal', '🎁'], ['pelu', '💇'], ['farmac', '💊'], ['salud', '💊'], ['remed', '💊'],
    ['nafta', '⛽'], ['super', '🛒'], ['merca', '🛒'], ['comid', '🍽️'], ['resto', '🍽️'],
    ['cena', '🍽️'], ['cine', '🎬'], ['cafe', '☕'], ['taxi', '🚕'], ['transp', '🚕'],
    ['uber', '🚕'], ['casa', '🏠'], ['hogar', '🏠'], ['expens', '🏠'], ['luz', '💡'],
    ['gas', '🔥'], ['agua', '💧'], ['ropa', '👕'], ['viaje', '✈️'], ['gym', '🏋️'],
    ['masco', '🐾'], ['mando', '🧺'],
  ]
  for (const [k, e] of map) if (n.includes(k)) return e
  return '🏷️'
}

// Fracción del gasto que le toca a Dani (vos). null = saldado (sin deuda).
export function expShare(e, daniPct) {
  if (e.mode === 'settled') return null
  if (e.mode === 'full_mine') return 1
  if (e.mode === 'full_theirs') return 0
  return daniPct / 100
}

// Neto del grupo y metadatos. net > 0 = te deben; net < 0 = debés.
export function compute(state, gid) {
  const sp = state.splits[gid] || {}
  const daniPct = sp.dani || 0
  const members = state.groups[gid].members
  const others = members.filter((m) => m.id !== 'dani')
  const ledger = state.ledgers[gid] || []
  let net = 0
  ledger.forEach((e) => {
    const share = expShare(e, daniPct)
    if (share === null) return
    if (e.payerId === 'dani') net += e.amount * (1 - share)
    else net -= e.amount * share
  })
  ;(state.payments[gid] || []).forEach((p) => {
    if (p.to === 'dani') net -= p.amount
    if (p.from === 'dani') net += p.amount
  })
  return { net, daniPct, members, others, other: others[0], twoPerson: members.length === 2 }
}

// Línea contable de un gasto, con el monto que corresponde según el modo.
export function descFor(state, gid, ex, daniPct) {
  const g = state.groups[gid]
  if (g.personal) return 'Lo pagaste vos'
  const share = expShare(ex, daniPct)
  if (share === null) return 'Pagaron ambos · saldado'
  const payer = memberById(state, gid, ex.payerId)
  if (ex.payerId === 'dani') {
    const o = ex.amount * (1 - share)
    return o > 0 ? 'Pagaste vos · te deben ' + fmt(o) : 'Pagaste vos'
  }
  const o = ex.amount * share
  return o > 0 ? 'Pagó ' + payer.short + ' · debés ' + fmt(o) : 'Pagó ' + payer.short + ' · no participaste'
}

// Frase de saldo del banner.
export function balancePhrase(state, gid) {
  const c = compute(state, gid)
  if (Math.abs(c.net) < 1) return { pre: 'Están a mano', amount: '', post: '', color: '#0E9F86' }
  if (c.twoPerson) {
    if (c.net > 0) return { pre: c.other.short + ' te debe ', amount: fmt(c.net), post: '', color: '#0E9F86' }
    return { pre: 'Le debés ', amount: fmt(-c.net), post: ' a ' + c.other.short, color: '#E11D5B' }
  }
  if (c.net > 0) return { pre: 'A favor: ', amount: fmt(c.net), post: '', color: '#0E9F86' }
  return { pre: 'En contra: ', amount: fmt(-c.net), post: '', color: '#E11D5B' }
}

export function nowTime() {
  const d = new Date()
  return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2)
}

// ===== Parser de lenguaje natural =====
const STOP = new Set([
  'pago', 'pagó', 'pague', 'pagué', 'yo', 'lo', 'la', 'los', 'las', 'me', 'nos', 'transfirio',
  'transfirió', 'transfiri', 'en', 'cuotas', 'cuota', 'el', 'ultimo', 'último', 'y', 'de', 'con',
  'por', 'ayer', 'hoy', 'que', 'un', 'una', 'mi', 'su', 'le', 'solo', 'entre', 'entreambos', 'a',
  'entró', 'perdon', 'perdón', 'eran', 'era', 'debo', 'debe', 'deben', 'debés', 'debes', 'total',
  'todo', 'toda', 'mama', 'mamá', 'papa', 'papá', 'ambos',
])

function extractCat(state, gid, t) {
  const mem = (state.groups[gid] || { members: [] }).members.map((m) => m.short.toLowerCase())
  const words = t.replace(/[\d.\/-]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w) && !mem.includes(w))
  return words[0] || 'Gasto'
}

export function resolveCat(state, gid, t) {
  for (const c of state.categories) {
    if ((' ' + t + ' ').includes(c.name.toLowerCase())) return { id: c.id, name: c.name, icon: c.icon }
  }
  const label = extractCat(state, gid, t)
  const name = label.charAt(0).toUpperCase() + label.slice(1)
  return { id: null, name, icon: guessIcon(label) }
}

export function parseChat(state, gid, text) {
  const g = state.groups[gid]
  const members = g.members
  const t = ' ' + text.toLowerCase() + ' '
  if (/borr[aá]|elimin[aá]/.test(t) && /[uú]ltimo/.test(t)) return { kind: 'correction', cor: { type: 'del' } }
  const nums = (t.match(/\d[\d.]*/g) || []).map((x) => parseInt(x.replace(/\./g, ''), 10)).filter((n) => n >= 100)
  const amount = nums.length ? nums[0] : null
  const sm = t.match(/(\d{1,2})\s*[/]\s*(\d{1,2})/)
  const cm = t.match(/(\d+)\s*cuota/)
  const cuotas = cm ? parseInt(cm[1], 10) : null
  // modo de división por gasto
  let forcedMode = null
  let forcedPayer = null
  if (!g.personal) {
    if (/\b(ambos|los dos|entre los dos)\b/.test(t)) {
      forcedMode = 'settled'
      forcedPayer = 'dani'
    } else if (/(le\s+)?deb[oó]\s+(el\s+)?total|debo\s+todo|lo\s+debo\s+todo/.test(t)) {
      forcedMode = 'full_mine'
      forcedPayer = (members.find((m) => m.id !== 'dani') || {}).id
      for (const m of members) if (m.id !== 'dani' && t.includes(' ' + m.short.toLowerCase())) forcedPayer = m.id
    } else if (/me\s+deben?\s+(el\s+)?total|deben\s+todo/.test(t)) {
      forcedMode = 'full_theirs'
      forcedPayer = 'dani'
    }
  }
  // pago entre personas
  if ((/\b(me|nos)\s+(pag|transfir|pas)/.test(t) || /\btransfir/.test(t)) && !g.personal) {
    let from = (members.find((m) => m.id !== 'dani') || {}).id
    for (const m of members) if (m.id !== 'dani' && t.includes(' ' + m.short.toLowerCase())) from = m.id
    return { kind: 'payment', exp: { amount: amount || 0, from, to: 'dani' } }
  }
  // pagador
  let payerId = g.personal ? 'dani' : null
  if (/pagu[eé]|lo pagu|la pagu|\byo\b/.test(t)) payerId = 'dani'
  for (const m of members) {
    if (m.id !== 'dani') {
      const n = m.short.toLowerCase()
      if (new RegExp('pag[oó]\\s+' + n).test(t) || new RegExp(n + '\\s+(lo |la )?pag').test(t)) payerId = m.id
    }
  }
  // correcciones sobre el último
  if (/(eran|era|son|ser[ií]an|perd[oó]n)/.test(t) && amount) return { kind: 'correction', cor: { field: 'amount', amount } }
  if (/(lo|la)\s+pag[oó]\b/.test(t) && payerId && payerId !== 'dani' && !amount) return { kind: 'correction', cor: { field: 'payer', payerId } }
  if (/(cambialo|cambiala|cambiar|pasalo|pasala)\s+a\s+/.test(t)) {
    const after = text.toLowerCase().split(/\s+a\s+/).pop().trim()
    const cat = resolveCat(state, gid, after)
    return { kind: 'correction', cor: { field: 'category', categoryId: cat.id, catName: cat.name, catIcon: cat.icon } }
  }
  if (/divid/.test(t) && sm) return { kind: 'correction', cor: { field: 'split', a: parseInt(sm[1], 10), b: parseInt(sm[2], 10) } }
  if (!amount) return { kind: 'unknown' }
  const cat = resolveCat(state, gid, t)
  const split = sm ? { a: parseInt(sm[1], 10), b: parseInt(sm[2], 10) } : null
  const mode = forcedMode || 'group'
  const finalPayer = forcedMode ? forcedPayer : payerId
  const exp = { amount, categoryId: cat.id, catName: cat.name, catIcon: cat.icon, payerId: finalPayer, cuotas, split, mode }
  if (!finalPayer) {
    delete exp.payerId
    return { kind: 'ambiguous', exp }
  }
  return { kind: 'interpret', exp }
}
