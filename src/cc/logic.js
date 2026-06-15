/**
 * Lógica de negocio de Cuentas Claras — funciones puras portadas del prototipo.
 * Todas reciben `state` como primer argumento (no mutan nada).
 */
import { MONTH_ORDER, MONTH_SHORT } from './initialState'

// Totales mensuales pasados (mock). BACKEND: traer de la DB.
export const HISTORY_PAST = {
  personal: {
    '2026-01': { total: 9800, methods: { efectivo: 3000, mp: 2800, visa_macro: 4000 } },
    '2026-02': { total: 14200, methods: { efectivo: 5200, mp: 4000, visa_macro: 5000 } },
    '2026-03': { total: 25100, methods: { visa_santander: 12000, efectivo: 6100, mp: 7000 } },
    '2026-04': { total: 18600, methods: { visa_macro: 10000, efectivo: 3600, mp: 5000 } },
    '2026-05': { total: 22400, methods: { visa_macro: 12000, efectivo: 4400, mp: 6000 } },
  },
  pareja: { '2026-01': { total: 28000 }, '2026-02': { total: 33000 }, '2026-03': { total: 51000 }, '2026-04': { total: 38500 }, '2026-05': { total: 42000 } },
  mamucha: { '2026-01': { total: 7000 }, '2026-02': { total: 8200 }, '2026-03': { total: 11000 }, '2026-04': { total: 9500 }, '2026-05': { total: 9000 } },
  asado: { '2026-01': { total: 0 }, '2026-02': { total: 0 }, '2026-03': { total: 15000 }, '2026-04': { total: 21000 }, '2026-05': { total: 18000 } },
}

// Gastos futuros (cuotas + fijos) por grupo (mock).
export function scheduled(gid) {
  return {
    pareja: [
      { icon: '🛏️', title: 'Sommier', kind: 'cuota', cuotas: 6, startIdx: 0, perMonth: 24000, payerId: 'juan' },
      { icon: '🏠', title: 'Expensas', kind: 'rec', perMonth: 38000, payerId: 'dani' },
      { icon: '🎬', title: 'Netflix', kind: 'rec', perMonth: 4000, payerId: 'dani' },
    ],
    mamucha: [
      { icon: '🛋️', title: 'Living nuevo', kind: 'cuota', cuotas: 3, startIdx: 0, perMonth: 30000, payerId: 'dani' },
      { icon: '💊', title: 'Remedios', kind: 'rec', perMonth: 9000, payerId: 'paula' },
    ],
  }[gid] || []
}

const POOLS = {
  personal: ['cafe', 'comida', 'super', 'transporte'],
  pareja: ['super', 'nafta', 'comida', 'hogar'],
  mamucha: ['farmacia', 'mandados', 'transporte', 'comida'],
  asado: ['comida', 'super', 'cafe', 'transporte'],
}

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

// Serie mensual de un grupo (últimos 6); el mes actual usa el ledger real.
export function buildHistory(state, gid) {
  return MONTH_ORDER.map((key) => {
    let total, methods
    if (key === '2026-06') {
      const led = state.ledgers[gid] || []
      total = led.reduce((a, e) => a + e.amount, 0)
      methods = {}
      led.forEach((e) => {
        const k = e.methodId || 'sin'
        methods[k] = (methods[k] || 0) + e.amount
      })
    } else {
      const d = (HISTORY_PAST[gid] || {})[key]
      total = d ? d.total : 0
      methods = d ? d.methods || {} : {}
    }
    return { key, label: MONTH_SHORT[key], total, methods, current: key === '2026-06' }
  })
}

// Movimientos de un mes; meses pasados se sintetizan a partir del total.
export function monthMovements(state, gid, key) {
  const g = state.groups[gid]
  if (key === '2026-06') {
    return (state.ledgers[gid] || [])
      .slice()
      .reverse()
      .map((e) => {
        const cat = catById(state, e.categoryId)
        const payer = memberById(state, gid, e.payerId)
        const meth = state.methods.find((x) => x.id === e.methodId)
        return {
          catIcon: cat.icon, title: cat.name,
          sub: g.personal ? (meth ? meth.name : 'Sin medio') + ' · ' + e.dateFull : 'Pagó ' + payer.short + ' · ' + e.dateFull,
          amountText: fmt(e.amount), avatarColor: g.personal ? '#7C3AED' : payer.color, avatarInitial: g.personal ? 'D' : payer.initial,
          methodId: e.methodId || 'sin', _amt: e.amount,
        }
      })
  }
  const d = (HISTORY_PAST[gid] || {})[key]
  const total = d ? d.total : 0
  if (!total) return []
  const pool = POOLS[gid] || state.categories.slice(0, 4).map((c) => c.id)
  const weights = [0.4, 0.3, 0.2, 0.1]
  const days = [27, 20, 13, 5]
  const members = g.members
  const methodKeys = d.methods ? Object.keys(d.methods).filter((k) => d.methods[k] > 0) : []
  let acc = 0
  return pool.map((cid, i) => {
    const amt = i === pool.length - 1 ? total - acc : Math.round((total * weights[i]) / 100) * 100
    acc += amt
    const cat = catById(state, cid)
    const payer = members[i % members.length]
    const mk = methodKeys.length ? methodKeys[i % methodKeys.length] : null
    const meth = mk && mk !== 'sin' ? state.methods.find((x) => x.id === mk) : null
    const dateFull = days[i] + '/' + MONTH_SHORT[key].toLowerCase() + '/26'
    return {
      catIcon: cat.icon, title: cat.name,
      sub: g.personal ? (meth ? meth.name : 'Efectivo') + ' · ' + dateFull : 'Pagó ' + payer.short + ' · ' + dateFull,
      amountText: fmt(amt), avatarColor: g.personal ? '#7C3AED' : payer.color, avatarInitial: g.personal ? 'D' : payer.initial,
      methodId: meth ? meth.id : mk === 'sin' ? 'sin' : 'efectivo', _amt: amt,
    }
  })
}

// Ajusta el % de un miembro (pasos de 5) y rebalancea al resto para sumar 100.
export function adjustSplit(cur, id, delta) {
  const ids = Object.keys(cur)
  const v = Math.max(0, Math.min(100, Math.round((cur[id] + delta) / 5) * 5))
  const others = ids.filter((x) => x !== id)
  const remain = 100 - v
  const othSum = others.reduce((a, x) => a + cur[x], 0)
  const next = { ...cur, [id]: v }
  if (others.length) {
    if (othSum <= 0) {
      const each = Math.round(remain / others.length / 5) * 5
      let acc = 0
      others.forEach((x, i) => { next[x] = i === others.length - 1 ? remain - acc : each; acc += each })
    } else {
      let acc = 0
      others.forEach((x, i) => {
        if (i === others.length - 1) next[x] = remain - acc
        else { const val = Math.round((remain * cur[x]) / othSum); next[x] = val; acc += val }
      })
    }
  }
  return next
}

export function setEqualSplit(cur) {
  const ids = Object.keys(cur)
  const base = Math.floor(100 / ids.length)
  const next = {}
  let acc = 0
  ids.forEach((x, i) => { next[x] = i === ids.length - 1 ? 100 - acc : base; acc += base })
  return next
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
