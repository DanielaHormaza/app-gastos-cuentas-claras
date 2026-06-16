/**
 * Lógica de negocio de Cuentas Claras — funciones puras portadas del prototipo.
 * Todas reciben `state` como primer argumento (no mutan nada).
 */
import { fmtDateFull, monthKeyOf, todayISO } from './dates'

// Orden de monedas para mostrar (sin conversión, cada una por separado).
export const CURRENCIES = ['ARS', 'USD', 'CLP']
const CUR_PREFIX = { ARS: '$', USD: 'US$', CLP: 'CLP$' }

// Formato de monto por moneda: "$4.500" / "US$188,60" / "CLP$20.429".
export function fmt(n, cur = 'ARS') {
  const pre = CUR_PREFIX[cur] || '$'
  const neg = n < 0 ? '-' : ''
  // USD conserva hasta 2 decimales; ARS/CLP redondean a entero.
  const r = cur === 'USD' ? Math.round(Math.abs(n) * 100) / 100 : Math.round(Math.abs(n))
  const [ip, dp] = r.toString().split('.')
  const milesEntero = ip.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const decimales = dp ? ',' + dp.padEnd(2, '0') : ''
  return neg + pre + milesEntero + decimales
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

// Neto del grupo POR MONEDA (sin conversión). nets[cur] > 0 = te deben.
// Excluye gastos futuros (cuotas por venir): no afectan el saldo hasta su mes.
export function compute(state, gid) {
  const sp = state.splits[gid] || {}
  const daniPct = sp.dani || 0
  const members = state.groups[gid].members
  const others = members.filter((m) => m.id !== 'dani')
  const ledger = state.ledgers[gid] || []
  const nets = {}
  const add = (cur, v) => { nets[cur] = (nets[cur] || 0) + v }
  ledger.forEach((e) => {
    if (e.future) return
    const cur = e.currency || 'ARS'
    const share = expShare(e, daniPct)
    if (share === null) return
    if (e.payerId === 'dani') add(cur, e.amount * (1 - share))
    else add(cur, -e.amount * share)
  })
  ;(state.payments[gid] || []).forEach((p) => {
    const cur = p.currency || 'ARS'
    if (p.to === 'dani') add(cur, -p.amount)
    if (p.from === 'dani') add(cur, p.amount)
  })
  return { nets, daniPct, members, others, other: others[0], twoPerson: members.length === 2 }
}

// Monedas con saldo relevante, en orden fijo.
function curList(obj) {
  return CURRENCIES.filter((c) => obj[c] !== undefined && Math.abs(obj[c]) >= 1).map((c) => [c, obj[c]])
}

// Líneas de saldo del grupo (una por moneda). Para el banner / inicio.
export function balanceLines(state, gid) {
  const g = state.groups[gid]
  if (g.personal) {
    const t = {}
    ;(state.ledgers[gid] || []).forEach((e) => { if (e.future) return; const cur = e.currency || 'ARS'; t[cur] = (t[cur] || 0) + e.amount })
    const ls = curList(t).map(([cur, v]) => ({ pre: '', amount: fmt(v, cur), post: '', color: '#0B1220' }))
    return ls.length ? ls : [{ pre: '', amount: fmt(0), post: '', color: '#0B1220' }]
  }
  const c = compute(state, gid)
  const lines = curList(c.nets).map(([cur, net]) => {
    if (c.twoPerson) {
      return net > 0
        ? { pre: c.other.short + ' te debe ', amount: fmt(net, cur), post: '', color: '#0E9F86' }
        : { pre: 'Le debés ', amount: fmt(-net, cur), post: ' a ' + c.other.short, color: '#E11D5B' }
    }
    return net > 0
      ? { pre: 'A favor: ', amount: fmt(net, cur), post: '', color: '#0E9F86' }
      : { pre: 'En contra: ', amount: fmt(-net, cur), post: '', color: '#E11D5B' }
  })
  return lines.length ? lines : [{ pre: 'Están a mano', amount: '', post: '', color: '#0E9F86' }]
}

// Totales por moneda sumando varios grupos (para la cifra hero del inicio).
export function totalsByCurrency(state, ids) {
  const t = {}
  ids.forEach((id) => { const c = compute(state, id); for (const cur in c.nets) t[cur] = (t[cur] || 0) + c.nets[cur] })
  return curList(t)
}

// Línea contable de un gasto, con el monto que corresponde según el modo.
export function descFor(state, gid, ex, daniPct) {
  const g = state.groups[gid]
  const cur = ex.currency || 'ARS'
  if (g.personal) return 'Lo pagaste vos'
  const share = expShare(ex, daniPct)
  if (share === null) return 'Pagaron ambos · saldado'
  const payer = memberById(state, gid, ex.payerId)
  if (ex.payerId === 'dani') {
    const o = ex.amount * (1 - share)
    return o > 0 ? 'Pagaste vos · te deben ' + fmt(o, cur) : 'Pagaste vos'
  }
  const o = ex.amount * share
  return o > 0 ? 'Pagó ' + payer.short + ' · debés ' + fmt(o, cur) : 'Pagó ' + payer.short + ' · no participaste'
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

const MES_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const MES_LONG = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
export function monthShortLabel(key) { return MES_SHORT[Number(key.slice(5, 7)) - 1] }
export function monthLongLabel(key) { return MES_LONG[Number(key.slice(5, 7)) - 1] + ' ' + key.slice(0, 4) }

// Serie mensual real (últimos 6 meses terminando en el mes actual).
// El gráfico totaliza ARS (no se mezclan monedas). methods = desglose por medio.
export function buildHistory(state, gid) {
  const led = (state.ledgers[gid] || []).filter((e) => !e.future)
  const cur = monthKeyOf(todayISO())
  const [y, m] = cur.split('-').map(Number)
  const keys = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1)
    keys.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'))
  }
  return keys.map((key) => {
    const inMonth = led.filter((e) => monthKeyOf(e.date) === key)
    const total = inMonth.filter((e) => (e.currency || 'ARS') === 'ARS').reduce((a, e) => a + e.amount, 0)
    const methods = {}
    inMonth.forEach((e) => { const k = e.methodId || 'sin'; methods[k] = (methods[k] || 0) + e.amount })
    return { key, label: monthShortLabel(key), total, methods, current: key === cur }
  })
}

// Movimientos reales de un mes (cualquier moneda), más nuevos primero.
export function monthMovements(state, gid, key) {
  const g = state.groups[gid]
  return (state.ledgers[gid] || [])
    .filter((e) => !e.future && monthKeyOf(e.date) === key)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .map((e) => {
      const cat = catById(state, e.categoryId)
      const payer = memberById(state, gid, e.payerId)
      const meth = state.methods.find((x) => x.id === e.methodId)
      const df = fmtDateFull(e.date)
      const cur = e.currency || 'ARS'
      return {
        catIcon: cat.icon, title: e.desc || cat.name,
        sub: g.personal ? (meth ? meth.name : 'Sin medio') + ' · ' + df : 'Pagó ' + payer.short + ' · ' + df,
        amountText: fmt(e.amount, cur), avatarColor: g.personal ? '#7C3AED' : payer.color, avatarInitial: g.personal ? 'D' : payer.initial,
        methodId: e.methodId || 'sin', _amt: e.amount, _cur: cur,
      }
    })
}

// Impacto de un gasto en tu saldo, en palabras + color.
//  - pagaste vos y te deben      → "te deben $X" (verde)
//  - pagaste vos el total ajeno  → "prestaste $X" (verde)
//  - pagó el otro, te toca parte → "tu parte $X" (rojo)
//  - saldado / sin deuda         → gris
export function impactOf(state, gid, e, daniPct) {
  const g = state.groups[gid]
  const cur = e.currency || 'ARS'
  if (g.personal) return { text: '', color: '#94A3B8' }
  if (e.mode === 'settled') return { text: 'saldado', color: '#94A3B8' }
  const share = expShare(e, daniPct)
  if (e.payerId === 'dani') {
    const owed = e.amount * (1 - share)
    if (owed <= 0) return { text: 'sin deuda', color: '#94A3B8' }
    return { text: (e.mode === 'full_theirs' ? 'prestaste ' : 'te deben ') + fmt(owed, cur), color: '#0E9F86' }
  }
  const owe = e.amount * share
  if (owe <= 0) return { text: 'no participaste', color: '#94A3B8' }
  return { text: 'tu parte ' + fmt(owe, cur), color: '#E11D5B' }
}

// Detalle de un mes para el desplegable de históricos: totales y "tu parte"
// por moneda + items (último agregado primero).
export function monthData(state, gid, key) {
  const daniPct = (state.splits[gid] || {}).dani || 0
  const g = state.groups[gid]
  const rows = (state.ledgers[gid] || [])
    .map((e, idx) => ({ e, idx }))
    .filter((x) => !x.e.future && monthKeyOf(x.e.date) === key)
    .sort((a, b) => (a.e.date < b.e.date ? 1 : a.e.date > b.e.date ? -1 : b.idx - a.idx))
  const totals = {}
  const tuParte = {}
  const items = rows.map(({ e }) => {
    const cur = e.currency || 'ARS'
    totals[cur] = (totals[cur] || 0) + e.amount
    const consumo = e.mode === 'full_mine' ? 1 : e.mode === 'full_theirs' ? 0 : daniPct / 100
    tuParte[cur] = (tuParte[cur] || 0) + e.amount * consumo
    const cat = catById(state, e.categoryId)
    const payer = memberById(state, gid, e.payerId)
    const meth = state.methods.find((x) => x.id === e.methodId)
    const imp = impactOf(state, gid, e, daniPct)
    return {
      id: e.id, entry: e, catIcon: cat.icon, title: e.desc || cat.name,
      sub: g.personal ? (meth ? meth.name : 'Sin medio') + ' · ' + fmtDateFull(e.date) : 'Pagó ' + payer.short + ' · ' + fmtDateFull(e.date),
      avatarColor: g.personal ? '#7C3AED' : payer.color, avatarInitial: g.personal ? 'D' : payer.initial,
      amountText: fmt(e.amount, cur), impText: imp.text, impColor: imp.color,
    }
  })
  return { totals, tuParte, items }
}

// Meses con movimientos (sin futuros), del más nuevo al más viejo.
export function ledgerMonths(state, gid) {
  const set = new Set()
  ;(state.ledgers[gid] || []).forEach((e) => { if (!e.future) set.add(monthKeyOf(e.date)) })
  return [...set].sort().reverse()
}

// CSV de movimientos en un rango de meses (para abrir en Sheets/Excel).
export function buildCsv(state, gid, fromKey, toKey) {
  const daniPct = (state.splits[gid] || {}).dani || 0
  const other = state.groups[gid].members.find((m) => m.id !== 'dani') || { short: 'Otro' }
  const rows = (state.ledgers[gid] || [])
    .filter((e) => !e.future)
    .filter((e) => { const k = monthKeyOf(e.date); return (!fromKey || k >= fromKey) && (!toKey || k <= toKey) })
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  const head = ['Fecha', 'Mes', 'Descripción', 'Categoría', 'Monto', 'Moneda', 'Pagó', 'División', 'Tu parte', 'Impacto']
  const esc = (s) => { s = String(s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
  const lines = [head.join(',')]
  rows.forEach((e) => {
    const cat = catById(state, e.categoryId)
    const payer = memberById(state, gid, e.payerId)
    const consumo = e.mode === 'full_mine' ? 1 : e.mode === 'full_theirs' ? 0 : daniPct / 100
    const tuParte = Math.round(e.amount * consumo * 100) / 100
    const divLabel = e.mode === 'settled' ? 'Pagaron ambos' : e.mode === 'full_mine' ? 'Todo Dani' : e.mode === 'full_theirs' ? 'Todo ' + other.short : 'Dani ' + daniPct + '% / ' + other.short + ' ' + (100 - daniPct) + '%'
    const imp = impactOf(state, gid, e, daniPct)
    lines.push([fmtDateFull(e.date), monthKeyOf(e.date), e.desc || cat.name, cat.name, e.amount, e.currency || 'ARS', payer.short, divLabel, tuParte, imp.text].map(esc).join(','))
  })
  return '﻿' + lines.join('\n') // BOM para que Excel respete acentos
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
  // moneda (default ARS; sin conversión)
  let currency = 'ARS'
  if (/\b(usd|u\$s|d[oó]lar|d[oó]lares)\b/.test(t)) currency = 'USD'
  else if (/\b(clp|peso chileno|pesos chilenos)\b/.test(t)) currency = 'CLP'
  const exp = { amount, categoryId: cat.id, catName: cat.name, catIcon: cat.icon, payerId: finalPayer, cuotas, split, mode, currency }
  if (!finalPayer) {
    delete exp.payerId
    return { kind: 'ambiguous', exp }
  }
  return { kind: 'interpret', exp }
}
