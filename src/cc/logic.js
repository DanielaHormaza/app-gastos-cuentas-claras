/**
 * Lógica de negocio de Cuentas Claras — funciones puras portadas del prototipo.
 * Todas reciben `state` como primer argumento (no mutan nada).
 */
import { fmtDateFull, monthKeyOf, todayISO, parseSpanishDate, NOMBRES_MES } from './dates'

// Orden de monedas para mostrar (sin conversión, cada una por separado).
export const CURRENCIES = ['ARS', 'USD', 'CLP']

// Colores de "estado de balance" (el monto va en neutro; el color es solo del indicador).
// pos = te deben (verde suave) · neg = debés (gris azulado, NO rojo: transmite calma) · even = a mano/neutro.
export const TONE = { pos: '#0E9F86', neg: '#7B8CB8', even: '#94A3B8' }
const CUR_PREFIX = { ARS: '$', USD: 'US$', CLP: 'CLP$' }

// "Ocultar saldos": flag global de display. Cuando está activo, fmt enmascara los
// montos ("$ ••••"). NO afecta cálculos ni el CSV (buildCsv lo desactiva al exportar).
let _hideAmounts = false
export function setAmountsHidden(v) { _hideAmounts = !!v }

// Formato de monto por moneda: "$4.500" / "US$188,60" / "CLP$20.429".
export function fmt(n, cur = 'ARS') {
  const pre = CUR_PREFIX[cur] || '$'
  if (_hideAmounts) return pre + ' ••••'
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

// Paleta curada de iconos para elegir al crear una categoría.
export const CATEGORY_ICONS = [
  '🍽️', '🛒', '☕', '🍺', '🍕', '💡', '🏠', '🔥', '💧', '📶',
  '🚕', '⛽', '🚗', '✈️', '🚌', '🎬', '🎮', '🎵', '🎉', '📚',
  '🎁', '👕', '💇', '🧴', '💊', '🏥', '🏋️', '⚽', '🐾', '📱',
  '💻', '🔧', '🧾', '💰', '🎓', '👶', '🧺', '🏷️',
]

// Adivina un emoji para una categoría nueva a partir de su nombre.
export function guessIcon(name) {
  const n = (name || '').toLowerCase()
  const map = [
    ['regal', '🎁'], ['pelu', '💇'], ['farmac', '💊'], ['salud', '💊'], ['remed', '💊'],
    ['medic', '🏥'], ['dent', '🦷'], ['nafta', '⛽'], ['combust', '⛽'], ['super', '🛒'],
    ['merca', '🛒'], ['almac', '🛒'], ['comid', '🍽️'], ['resto', '🍽️'], ['delivery', '🍽️'],
    ['cena', '🍽️'], ['almuerz', '🍽️'], ['pizza', '🍕'], ['birra', '🍺'], ['cervez', '🍺'],
    ['bar', '🍺'], ['trago', '🍺'], ['cine', '🎬'], ['peli', '🎬'], ['netflix', '🎬'],
    ['spotify', '🎵'], ['music', '🎵'], ['juego', '🎮'], ['fiesta', '🎉'], ['regalo', '🎁'],
    ['cafe', '☕'], ['café', '☕'], ['taxi', '🚕'], ['transp', '🚕'], ['uber', '🚕'],
    ['cabify', '🚕'], ['didi', '🚕'], ['colectivo', '🚌'], ['sube', '🚌'], ['bondi', '🚌'],
    ['auto', '🚗'], ['cochera', '🚗'], ['peaje', '🚗'], ['casa', '🏠'], ['hogar', '🏠'],
    ['expens', '🏠'], ['alquil', '🏠'], ['luz', '💡'], ['elect', '💡'], ['gas', '🔥'],
    ['agua', '💧'], ['internet', '📶'], ['wifi', '📶'], ['celu', '📱'], ['telefon', '📱'],
    ['ropa', '👕'], ['indument', '👕'], ['calzado', '👕'], ['viaje', '✈️'], ['vuelo', '✈️'],
    ['hotel', '✈️'], ['gym', '🏋️'], ['gimnas', '🏋️'], ['deport', '⚽'], ['masco', '🐾'],
    ['perr', '🐾'], ['gat', '🐾'], ['vet', '🐾'], ['mando', '🧺'], ['limpie', '🧺'],
    ['libro', '📚'], ['estud', '🎓'], ['curso', '🎓'], ['educ', '🎓'], ['beba', '👶'],
    ['bebe', '👶'], ['nene', '👶'], ['cosmet', '🧴'], ['belleza', '🧴'], ['compu', '💻'],
    ['tecn', '💻'], ['herram', '🔧'], ['repar', '🔧'], ['impuesto', '🧾'], ['ahorr', '💰'],
    ['invers', '💰'],
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

// Reparto (%) vigente en una fecha. splitLog[gid] guarda regímenes pasados { until, shares }:
// aplican a gastos con fecha < until. Sin historial → siempre el % actual de splits[gid].
export function splitAt(state, gid, date) {
  const log = state.splitLog && state.splitLog[gid]
  if (log && log.length && date) {
    for (const r of log) if (date < r.until) return r.shares // log ordenado por `until` ascendente
  }
  return state.splits[gid] || {}
}
// Mi % (del usuario logueado) vigente en una fecha.
export function daniPctAt(state, gid, date) {
  return (splitAt(state, gid, date) || {})[state.me || 'dani'] || 0
}

// Fracción de consumo de un miembro en un gasto. null = saldado.
// 'mine'/'theirs' se anclan al primer miembro del grupo (creador histórico de los datos).
// Modo group: usa el % de la fecha, RENORMALIZADO entre los participantes (e.excluded fuera).
export function shareFor(state, gid, e, memberId) {
  if (e.mode === 'settled') return null
  const members = state.groups[gid].members
  const anchor = (members[0] || {}).id
  if (e.mode === 'full_mine') return memberId === anchor ? 1 : 0
  if (e.mode === 'full_theirs') return memberId === anchor ? 0 : 1
  const excluded = e.excluded || []
  if (excluded.includes(memberId)) return 0
  const shares = splitAt(state, gid, e.date)
  const incl = members.filter((m) => !excluded.includes(m.id))
  const total = incl.reduce((a, m) => a + (shares[m.id] || 0), 0)
  if (total <= 0) return incl.some((m) => m.id === memberId) ? 1 / incl.length : 0
  return (shares[memberId] || 0) / total
}

// Fracción del gasto que me toca a MÍ (usuario logueado). null = saldado.
export function myShare(state, gid, e) {
  return shareFor(state, gid, e, state.me || 'dani')
}

// Neto del grupo POR MONEDA (sin conversión). nets[cur] > 0 = te deben.
// Excluye gastos futuros (cuotas por venir): no afectan el saldo hasta su mes.
export function compute(state, gid) {
  const me = state.me || 'dani'
  const sp = state.splits[gid] || {}
  const daniPct = sp[me] || 0 // "mi" % actual (el campo se llama daniPct por compatibilidad)
  const members = state.groups[gid].members
  const others = members.filter((m) => m.id !== me)
  const ledger = state.ledgers[gid] || []
  const nets = {}
  const add = (cur, v) => { nets[cur] = (nets[cur] || 0) + v }
  ledger.forEach((e) => {
    if (e.future) return
    const cur = e.currency || 'ARS'
    if (e.kind === 'transfer') {
      // pago/transferencia: salda deuda, no es consumo
      if (e.to === me) add(cur, -e.amount)
      if (e.from === me) add(cur, e.amount)
      return
    }
    const share = myShare(state, gid, e)
    if (share === null) return
    if (e.payerId === me) add(cur, e.amount * (1 - share))
    else add(cur, -e.amount * share)
  })
  ;(state.payments[gid] || []).forEach((p) => {
    const cur = p.currency || 'ARS'
    if (p.to === me) add(cur, -p.amount)
    if (p.from === me) add(cur, p.amount)
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
        ? { pre: c.other.short + ' te debe ', amount: fmt(net, cur), post: '', color: TONE.pos }
        : { pre: 'Le debés ', amount: fmt(-net, cur), post: ' a ' + c.other.short, color: TONE.neg }
    }
    return net > 0
      ? { pre: 'A favor: ', amount: fmt(net, cur), post: '', color: TONE.pos }
      : { pre: 'En contra: ', amount: fmt(-net, cur), post: '', color: TONE.neg }
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
  const share = myShare(state, gid, ex)
  if (share === null) return 'Pagaron ambos · saldado'
  const payer = memberById(state, gid, ex.payerId)
  if (ex.payerId === (state.me || 'dani')) {
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
  // monedas y fechas (no son categorías)
  'usd', 'u$s', 'dolar', 'dólar', 'dolares', 'dólares', 'clp', 'pesos', 'chilenos', 'dia', 'día',
  'anteayer', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'setiembre', 'octubre', 'noviembre', 'diciembre',
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
export function buildHistory(state, gid, catFilter = [], q = '', curFilter = 'all', payerFilter = 'all') {
  const showTransfer = catFilter && catFilter.length > 0 && catFilter.includes('transfer')
  const led = (state.ledgers[gid] || []).filter((e) => !e.future && catMatch(catFilter, e) && curMatch(curFilter, e) && payerMatch(payerFilter, e) && textMatch(state, gid, e, q) && (e.kind !== 'transfer' || showTransfer))
  // moneda totalizada en el gráfico: la del filtro, o ARS por defecto (no se mezclan monedas)
  const chartCur = curFilter && curFilter !== 'all' ? curFilter : 'ARS'
  const cur = monthKeyOf(todayISO())
  const [y, m] = cur.split('-').map(Number)
  const keys = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1)
    keys.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'))
  }
  return keys.map((key) => {
    const inMonth = led.filter((e) => monthKeyOf(e.date) === key)
    const total = inMonth.filter((e) => (e.currency || 'ARS') === chartCur).reduce((a, e) => a + e.amount, 0)
    const methods = {}
    inMonth.forEach((e) => { const k = e.methodId || 'sin'; methods[k] = (methods[k] || 0) + e.amount })
    return { key, label: monthShortLabel(key), total, methods, current: key === cur }
  })
}

// Clave de orden de creación: el sufijo numérico del id (Date.now() en runtime,
// correlativo 'cc001'… en el seed). Es estable aunque la nube devuelva los
// movimientos en otro orden (a diferencia del índice del array).
export function createdKey(e) {
  const m = String((e && e.id) || '').match(/\d+/)
  return m ? Number(m[0]) : 0
}

// Comparador de movimientos: 1) fecha descendente; 2) a igual fecha, el creado
// más tarde primero (el último gasto cargado aparece arriba).
export function byRecency(a, b) {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  return createdKey(b) - createdKey(a)
}

// Movimientos reales de un mes (cualquier moneda), más nuevos primero.
export function monthMovements(state, gid, key) {
  const g = state.groups[gid]
  return (state.ledgers[gid] || [])
    .filter((e) => !e.future && monthKeyOf(e.date) === key)
    .slice()
    .sort(byRecency)
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
  if (e.mode === 'settled') return { text: 'tu parte ' + fmt(e.amount * (daniPct / 100), cur) + ' · saldado', color: '#94A3B8' }
  const share = myShare(state, gid, e)
  if (e.payerId === (state.me || 'dani')) {
    const owed = e.amount * (1 - share)
    if (owed <= 0) return { text: 'sin deuda', color: '#94A3B8' }
    return { text: (share === 0 ? 'prestaste ' : 'te deben ') + fmt(owed, cur), color: '#0E9F86' }
  }
  const owe = e.amount * share
  if (owe <= 0) return { text: 'no participaste', color: '#94A3B8' }
  return { text: 'tu parte ' + fmt(owe, cur), color: TONE.neg }
}

// Categorías presentes en el ledger del grupo (para el filtro de históricos).
export function groupCategories(state, gid) {
  const set = new Set((state.ledgers[gid] || []).filter((e) => !e.future).map((e) => e.categoryId))
  return state.categories.filter((c) => set.has(c.id))
}

// ¿La entrada pasa el filtro de categorías? catFilter = array de ids ([] = todas).
export function catMatch(catFilter, e) {
  return !catFilter || catFilter.length === 0 || catFilter.includes(e.categoryId)
}

// ¿La entrada pasa el filtro de moneda? cur = 'all' | 'ARS' | 'USD' | 'CLP'.
export function curMatch(cur, e) {
  return !cur || cur === 'all' || (e.currency || 'ARS') === cur
}

// Monedas presentes en el ledger del grupo (para el filtro de moneda), en orden fijo.
export function groupCurrencies(state, gid) {
  const set = new Set((state.ledgers[gid] || []).filter((e) => !e.future).map((e) => e.currency || 'ARS'))
  return CURRENCIES.filter((c) => set.has(c))
}

// ¿La entrada pasa el filtro de pagador? payerFilter = 'all' | id de miembro.
// Al filtrar por un pagador concreto, las transferencias (sin pagador) quedan fuera.
export function payerMatch(payerFilter, e) {
  if (!payerFilter || payerFilter === 'all') return true
  if (e.kind === 'transfer') return false
  return e.payerId === payerFilter
}

// Miembros que figuran como pagadores en el ledger del grupo (para el filtro de pagador).
// En grupos personales no aplica (siempre pagás vos).
export function groupPayers(state, gid) {
  const g = state.groups[gid]
  if (!g || g.personal) return []
  const set = new Set((state.ledgers[gid] || []).filter((e) => !e.future && e.kind !== 'transfer' && e.payerId).map((e) => e.payerId))
  return g.members.filter((m) => set.has(m.id))
}

// Texto buscable de un movimiento (descripción + categoría, o nombres en transferencias).
export function entryName(state, gid, e) {
  if (e.kind === 'transfer') return 'transferencia pago ' + memberById(state, gid, e.from).short + ' ' + memberById(state, gid, e.to).short
  return (e.desc || '') + ' ' + catById(state, e.categoryId).name
}
export function textMatch(state, gid, e, q) {
  if (!q) return true
  return entryName(state, gid, e).toLowerCase().includes(q.toLowerCase())
}

// Fila de movimiento para mostrar (gasto o transferencia). withDate: usar fecha en el subtítulo.
export function rowFor(state, gid, e, opts = {}) {
  const g = state.groups[gid]
  const cur = e.currency || 'ARS'
  if (e.kind === 'transfer') {
    const me = state.me || 'dani'
    const from = memberById(state, gid, e.from)
    const to = memberById(state, gid, e.to)
    return {
      id: e.id, entry: e, isTransfer: true, catIcon: '🔁',
      title: e.to === me ? from.short + ' te pagó' : 'Le pagaste a ' + to.short,
      sub: 'Transferencia · ' + fmtDateFull(e.date),
      avatarColor: e.from === me ? '#7C3AED' : from.color, avatarInitial: e.from === me ? 'D' : from.initial,
      amountText: fmt(e.amount, cur), impText: 'saldó', impColor: '#0E9F86',
    }
  }
  const daniPct = daniPctAt(state, gid, e.date)
  const cat = catById(state, e.categoryId)
  const payer = memberById(state, gid, e.payerId)
  const meth = state.methods.find((x) => x.id === e.methodId)
  const imp = impactOf(state, gid, e, daniPct)
  const tail = opts.withDate ? fmtDateFull(e.date) : e.time || fmtDateFull(e.date)
  return {
    id: e.id, entry: e, catIcon: cat.icon, title: e.desc || cat.name,
    sub: g.personal ? (meth ? meth.name : 'Sin medio') + ' · ' + tail : 'Pagó ' + payer.short + ' · ' + tail,
    avatarColor: g.personal ? '#7C3AED' : payer.color, avatarInitial: g.personal ? 'D' : payer.initial,
    amountText: fmt(e.amount, cur), impText: imp.text, impColor: imp.color, daniPct,
  }
}

// Detalle de un mes: gastado y "tu parte" por moneda + transferencias + items.
// catFilter = array de ids ([] = todas). Las transferencias no suman al gasto.
export function monthData(state, gid, key, catFilter = [], q = '', curFilter = 'all', payerFilter = 'all') {
  const rows = (state.ledgers[gid] || [])
    .filter((e) => !e.future && monthKeyOf(e.date) === key && catMatch(catFilter, e) && curMatch(curFilter, e) && payerMatch(payerFilter, e) && textMatch(state, gid, e, q))
    .slice()
    .sort(byRecency)
  const totals = {}
  const tuParte = {}
  const transfers = {}
  const items = rows.map((e) => {
    const cur = e.currency || 'ARS'
    if (e.kind === 'transfer') {
      transfers[cur] = (transfers[cur] || 0) + e.amount
    } else {
      totals[cur] = (totals[cur] || 0) + e.amount
      const sh = myShare(state, gid, e)
      const consumo = sh === null ? daniPctAt(state, gid, e.date) / 100 : sh
      tuParte[cur] = (tuParte[cur] || 0) + e.amount * consumo
    }
    return rowFor(state, gid, e, { withDate: true })
  })
  return { totals, tuParte, transfers, items }
}

// Meses con movimientos, del más nuevo al más viejo.
// includeFuture=true suma también los meses de gastos futuros (para el rango del export CSV).
export function ledgerMonths(state, gid, includeFuture = false) {
  const set = new Set()
  ;(state.ledgers[gid] || []).forEach((e) => { if (includeFuture || !e.future) set.add(monthKeyOf(e.date)) })
  return [...set].sort().reverse()
}

// CSV de movimientos en un rango de meses (para abrir en Sheets/Excel).
// catFilter ([] = todas) y q (texto) permiten exportar justo lo que se está viendo filtrado.
export function buildCsv(state, gid, fromKey, toKey, catFilter = [], q = '', curFilter = 'all', payerFilter = 'all') {
  // El CSV siempre lleva números reales aunque "ocultar saldos" esté activo.
  const wasHidden = _hideAmounts
  _hideAmounts = false
  try {
  const mems = state.groups[gid].members
  const anchor = mems[0] || { id: 'dani', short: 'Dani' } // 'mine' histórico
  const otherM = mems[1] || { short: 'Otro' }
  const rows = (state.ledgers[gid] || [])
    .filter((e) => { const k = monthKeyOf(e.date); return (!fromKey || k >= fromKey) && (!toKey || k <= toKey) })
    .filter((e) => catMatch(catFilter, e) && curMatch(curFilter, e) && payerMatch(payerFilter, e) && textMatch(state, gid, e, q))
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  const head = ['Fecha', 'Mes', 'Tipo', 'Descripción', 'Categoría', 'Monto', 'Moneda', 'Pagó', 'División', 'Tu parte', 'Impacto']
  const esc = (s) => { s = String(s); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
  const lines = [head.join(',')]
  rows.forEach((e) => {
    const fecha = fmtDateFull(e.date)
    const mes = monthKeyOf(e.date)
    const cur = e.currency || 'ARS'
    if (e.kind === 'transfer') {
      const from = memberById(state, gid, e.from)
      const to = memberById(state, gid, e.to)
      lines.push([fecha, mes, 'Transferencia', from.short + ' → ' + to.short, 'Pagos y transferencias', e.amount, cur, from.short, '—', 0, from.short + ' le pagó a ' + to.short].map(esc).join(','))
      return
    }
    const cat = catById(state, e.categoryId)
    const payer = memberById(state, gid, e.payerId)
    const daniPct = daniPctAt(state, gid, e.date)
    const sh = myShare(state, gid, e)
    const consumo = sh === null ? daniPct / 100 : sh
    const tuParte = Math.round(e.amount * consumo * 100) / 100
    const excluded = e.excluded || []
    const grpLabel = mems.filter((m) => !excluded.includes(m.id)).map((m) => m.short + ' ' + Math.round(shareFor(state, gid, e, m.id) * 100) + '%').join(' / ')
    const divLabel = e.mode === 'settled' ? 'Pagaron ambos' : e.mode === 'full_mine' ? 'Todo ' + anchor.short : e.mode === 'full_theirs' ? 'Todo ' + otherM.short : grpLabel
    const imp = impactOf(state, gid, e, daniPct)
    lines.push([fecha, mes, e.future ? 'Gasto futuro' : 'Gasto', e.desc || cat.name, cat.name, e.amount, cur, payer.short, divLabel, tuParte, imp.text].map(esc).join(','))
  })
  return '﻿' + lines.join('\n') // BOM para que Excel respete acentos
  } finally {
    _hideAmounts = wasHidden
  }
}

// Revisión de datos: detecta posibles errores de carga en el ledger de un grupo.
// Devuelve una bandera por gasto con problemas: { id, entry, issues: [textos] }.
// Se irán sumando chequeos (faltantes, duplicados, montos raros, moneda rara…).
const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b)
  const n = s.length
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2
}

export function dataFlags(state, gid) {
  const g = state.groups[gid]
  const led = (state.ledgers[gid] || []).filter((e) => e.kind !== 'transfer')
  // posibles duplicados: misma fecha + monto + moneda + categoría + pagador (gastos distintos meses NO cuentan)
  const dupKey = (e) => [e.date, e.amount, e.currency || 'ARS', e.categoryId, e.payerId].join('|')
  const dupCount = {}
  led.forEach((e) => { if (e.amount > 0) dupCount[dupKey(e)] = (dupCount[dupKey(e)] || 0) + 1 })
  // mediana por categoría+moneda (solo con ≥4 muestras): base para detectar montos ~10x fuera (un cero de más/menos)
  const amtKey = (e) => e.categoryId + '|' + (e.currency || 'ARS')
  const byCat = {}
  led.forEach((e) => { if (e.amount > 0 && e.categoryId) (byCat[amtKey(e)] = byCat[amtKey(e)] || []).push(e.amount) })
  const meds = {}
  for (const k in byCat) if (byCat[k].length >= 4) meds[k] = median(byCat[k])
  // monedas poco usuales: usadas en ≤2 gastos sobre un historial amplio (posible moneda mal elegida).
  // Una moneda con varios gastos (ej. un viaje) NO se marca: ahí es uso real, no error.
  const curCount = {}
  led.forEach((e) => { if (e.amount > 0) curCount[e.currency || 'ARS'] = (curCount[e.currency || 'ARS'] || 0) + 1 })
  const rareCur = led.length >= 10 ? Object.keys(curCount).filter((cu) => curCount[cu] <= 2) : []
  const flags = []
  led.forEach((e) => {
    const issues = []
    // 1) datos faltantes
    if (!e.categoryId || !state.categories.some((c) => c.id === e.categoryId)) issues.push('Sin categoría')
    if (!e.amount || e.amount <= 0) issues.push('Monto en cero')
    if (!g.personal && !e.payerId) issues.push('Sin quién pagó')
    // 2) duplicados
    if (e.amount > 0 && dupCount[dupKey(e)] > 1) issues.push('Posible duplicado')
    // 3) monto inusual: ~10x por encima de lo típico de la categoría (posible cero de más; alto impacto).
    // Solo el lado alto: un monto chico no se marca porque suele ser un gasto barato legítimo, no un error.
    const med = meds[amtKey(e)]
    if (med && e.amount >= med * 10) issues.push('Monto inusual (típico ~' + fmt(med, e.currency) + ')')
    // 4) moneda poco usual
    if (rareCur.includes(e.currency || 'ARS')) issues.push('Moneda poco usual (' + (e.currency || 'ARS') + ')')
    if (issues.length) flags.push({ id: e.id, entry: e, issues })
  })
  return flags
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
  const me = state.me || 'dani'
  const anchor = (members[0] || {}).id // 'mine' histórico (para mapear full_mine/full_theirs)
  const t = ' ' + text.toLowerCase() + ' '
  if (/borr[aá]|elimin[aá]/.test(t) && /[uú]ltimo/.test(t)) return { kind: 'correction', cor: { type: 'del' } }
  // moneda (default ARS, sin conversión) — se detecta primero porque define el umbral del monto
  let currency = 'ARS'
  if (/\b(usd|u\$s|d[oó]lar|d[oó]lares)\b/.test(t)) currency = 'USD'
  else if (/\b(clp|peso chileno|pesos chilenos)\b/.test(t)) currency = 'CLP'
  // fecha en lenguaje natural ("31 de mayo", "ayer", "hoy"); null = hoy al confirmar
  const date = parseSpanishDate(text)
  const sm = t.match(/(\d{1,2})\s*[/]\s*(\d{1,2})/)
  const cm = t.match(/(\d+)\s*cuota/)
  const cuotas = cm ? parseInt(cm[1], 10) : null
  // monto: limpio del texto los números que NO son monto (fecha, cuotas, split)
  let work = t.replace(new RegExp('\\d{1,2}\\s+de\\s+(' + NOMBRES_MES + ')(\\s+de\\s+\\d{4})?', 'g'), ' ').replace(/\bd[ií]a\s+\d{1,2}/g, ' ')
  if (cm) work = work.replace(cm[0], ' ')
  if (sm) work = work.replace(sm[0], ' ')
  // umbral: ARS ignora < 100 (evita ruido); USD/CLP aceptan montos chicos (ej. 20 USD)
  const minAmt = currency === 'ARS' ? 100 : 1
  const nums = (work.match(/\d[\d.]*/g) || []).map((x) => parseInt(x.replace(/\./g, ''), 10)).filter((n) => n >= minAmt)
  const amount = nums.length ? nums[0] : null
  // modo de división por gasto
  let forcedMode = null
  let forcedPayer = null
  if (!g.personal) {
    if (/\b(ambos|los dos|entre los dos)\b/.test(t)) {
      forcedMode = 'settled'
      forcedPayer = me
    } else if (/(le\s+)?deb[oó]\s+(el\s+)?total|debo\s+todo|lo\s+debo\s+todo/.test(t)) {
      // "lo debo todo yo": yo consumo todo → mapeo según el ancla; lo pagó el otro
      forcedMode = me === anchor ? 'full_mine' : 'full_theirs'
      forcedPayer = (members.find((m) => m.id !== me) || {}).id
      for (const m of members) if (m.id !== me && t.includes(' ' + m.short.toLowerCase())) forcedPayer = m.id
    } else if (/me\s+deben?\s+(el\s+)?total|deben\s+todo/.test(t)) {
      forcedMode = me === anchor ? 'full_theirs' : 'full_mine'
      forcedPayer = me
    }
  }
  // pago entre personas
  if ((/\b(me|nos)\s+(pag|transfir|pas)/.test(t) || /\btransfir/.test(t)) && !g.personal) {
    let from = (members.find((m) => m.id !== me) || {}).id
    for (const m of members) if (m.id !== me && t.includes(' ' + m.short.toLowerCase())) from = m.id
    return { kind: 'payment', exp: { amount: amount || 0, from, to: me } }
  }
  // pagador: cualquier nombre de miembro mencionado = pagador (no hace falta decir "pagó").
  let payerId = g.personal ? me : null
  if (/pagu[eé]|lo pagu|la pagu|\byo\b/.test(t)) payerId = me
  for (const m of members) {
    const n = m.short.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (new RegExp('\\b' + n + '\\b').test(t)) payerId = m.id
  }
  // correcciones sobre el último
  if (/(eran|era|son|ser[ií]an|perd[oó]n)/.test(t) && amount) return { kind: 'correction', cor: { field: 'amount', amount } }
  if (/(lo|la)\s+pag[oó]\b/.test(t) && payerId && payerId !== me && !amount) return { kind: 'correction', cor: { field: 'payer', payerId } }
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
  // si no se detectó pagador, asumo que pagué yo (no preguntamos: se anota y se puede editar)
  const finalPayer = (forcedMode ? forcedPayer : payerId) || me
  const exp = { amount, categoryId: cat.id, catName: cat.name, catIcon: cat.icon, payerId: finalPayer, cuotas, split, mode, currency, date }
  return { kind: 'interpret', exp }
}
