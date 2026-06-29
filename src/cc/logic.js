/**
 * Lógica de negocio de Cuentas Claras — funciones puras portadas del prototipo.
 * Todas reciben `state` como primer argumento (no mutan nada).
 */
import { fmtDateFull, monthKeyOf, todayISO, parseSpanishDate, NOMBRES_MES } from './dates'

// Orden de monedas para mostrar (sin conversión, cada una por separado).
// Monedas soportadas (SIN conversión: cada una se computa y muestra por separado).
// prefix = símbolo en el formato · dec = decimales · name = etiqueta para los selectores.
export const CURRENCY_INFO = {
  ARS: { prefix: '$', dec: 0, name: 'Peso argentino' },
  USD: { prefix: 'US$', dec: 2, name: 'Dólar' },
  EUR: { prefix: '€', dec: 2, name: 'Euro' },
  CLP: { prefix: 'CLP$', dec: 0, name: 'Peso chileno' },
  BRL: { prefix: 'R$', dec: 2, name: 'Real brasileño' },
  UYU: { prefix: '$U', dec: 2, name: 'Peso uruguayo' },
  MXN: { prefix: 'MX$', dec: 2, name: 'Peso mexicano' },
  COP: { prefix: 'COP$', dec: 0, name: 'Peso colombiano' },
  PEN: { prefix: 'S/', dec: 2, name: 'Sol peruano' },
  GBP: { prefix: '£', dec: 2, name: 'Libra esterlina' },
}
export const CURRENCIES = Object.keys(CURRENCY_INFO)

// Colores de "estado de balance" (el monto va en neutro; el color es solo del indicador).
// pos = te deben (verde suave) · neg = debés (slate calmo gris azulado, NO rojo: transmite calma) · even = a mano/neutro.
export const TONE = { pos: '#0E9F86', neg: '#7B8CB8', even: '#94A3B8' }
// Fondos tenues para las pills de saldo (te debe / le debés / a mano).
export const TONE_BG = { pos: '#E6F6F1', neg: '#EEF1F7', even: '#F1F4F9' }

// Paleta estable para derivar un color de persona cuando el miembro no trae color propio.
const PERSON_PALETTE = ['#7C3AED', '#3B82F6', '#2ECCB1', '#F59E0B', '#EC4899', '#10B981', '#F43F5E', '#0EA5E9']

// "Ocultar saldos": flag global de display. Cuando está activo, fmt enmascara los
// montos ("$ ••••"). NO afecta cálculos ni el CSV (buildCsv lo desactiva al exportar).
let _hideAmounts = false
export function setAmountsHidden(v) { _hideAmounts = !!v }

// Formato de monto por moneda: "$4.500" / "US$188,60" / "CLP$20.429" / "€12,50".
export function fmt(n, cur = 'ARS') {
  const info = CURRENCY_INFO[cur] || { prefix: '$', dec: 0 }
  const pre = info.prefix
  if (_hideAmounts) return pre + ' ••••'
  const neg = n < 0 ? '-' : ''
  // Monedas con decimales (USD, EUR…) conservan 2; el resto redondean a entero.
  const r = info.dec === 2 ? Math.round(Math.abs(n) * 100) / 100 : Math.round(Math.abs(n))
  const [ip, dp] = r.toString().split('.')
  const milesEntero = ip.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const decimales = dp ? ',' + dp.padEnd(2, '0') : ''
  return neg + pre + milesEntero + decimales
}

export function catById(state, id) {
  return state.categories.find((c) => c.id === id) || { icon: '🏷️', name: 'Otros' }
}

// Alias por dispositivo (estilo WhatsApp): cómo VOS llamás a otra persona. No cambia su nombre real
// (que define cada uno para sí) ni el nombre del grupo. Nunca se aplica sobre vos mismo.
export function withAlias(state, m) {
  if (!m) return m
  const a = state.aliases && state.aliases[m.id]
  if (!a || m.id === (state.me || 'dani')) return m
  return { ...m, short: a, name: a, initial: (a.trim()[0] || m.initial || '?').toUpperCase() }
}

export function memberById(state, gid, id) {
  return withAlias(state, state.groups[gid].members.find((m) => m.id === id) || { short: '?', color: '#94A3B8', initial: '?', name: '?' })
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
export function curList(obj) {
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

// ===== Modelo centrado en personas (estilo Splitwise) =====

// Personas únicas con las que compartís gastos (en cualquier grupo no-personal ACTIVO), sin vos.
// Archivar oculta de la lista: si todos los espacios en común con alguien están archivados, no aparece.
// (Su saldo igual sigue contando en los totales: ver `computeFriend`/`totalsByCurrency`.)
export function friendIds(state) {
  const me = state.me || 'dani'
  const arch = state.archived || {}
  const seen = []
  for (const gid in state.groups) {
    const g = state.groups[gid]
    if (g.personal) continue
    if (arch[gid]) continue // espacio archivado: no suma a la lista de amigos
    for (const m of g.members) if (m.id !== me && !seen.includes(m.id)) seen.push(m.id)
  }
  return seen
}

// Busca el miembro de una persona en cualquier grupo (el primero que aparezca).
export function personById(state, pid) {
  for (const gid in state.groups) {
    const m = state.groups[gid].members.find((x) => x.id === pid)
    if (m) return withAlias(state, m)
  }
  return { id: pid, short: '?', name: '?', color: '#94A3B8', initial: '?' }
}

// Color estable de una persona: el de su miembro si existe; si no, derivado del id.
export function personColor(state, pid) {
  const m = personById(state, pid)
  if (m && m.color) return m.color
  const s = String(pid || '')
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return PERSON_PALETTE[h % PERSON_PALETTE.length]
}

// ¿La persona todavía no tiene cuenta? (invitación pendiente). Opt-in por miembro.
export function isPending(state, pid) {
  return !!personById(state, pid).pending
}

// Saldo agregado con UNA persona, por moneda, sumando todos los grupos compartidos
// (1:1 directos + grupales, incluidos archivados). Modelo pairwise me↔pid por gasto.
// Usa las primitivas reales: shareFor (splitLog/excluded/modos), saltea futuros, contempla transfers y payments.
export function computeFriend(state, pid) {
  const me = state.me || 'dani'
  const nets = {}
  const add = (cur, v) => { nets[cur] = (nets[cur] || 0) + v }
  const groups = []
  const expenses = []
  for (const gid in state.groups) {
    const g = state.groups[gid]
    if (g.personal) continue
    if (!g.members.some((m) => m.id === pid)) continue
    const oneToOne = !g.isGroup && (g.direct || g.members.length === 2) // espacio 1:1 con esta persona (no un grupo con nombre)
    const gnets = {}
    const gadd = (cur, v) => { gnets[cur] = (gnets[cur] || 0) + v; add(cur, v) }
    ;(state.ledgers[gid] || []).forEach((e) => {
      if (e.future) return
      const cur = e.currency || 'ARS'
      if (e.kind === 'transfer') {
        // pago entre vos y esta persona: salda deuda (no es consumo). Otros pares se ignoran.
        let delta = 0
        if (e.from === pid && e.to === me) delta = -e.amount      // te pagó → baja lo que te debe
        else if (e.from === me && e.to === pid) delta = e.amount  // le pagaste → baja lo que le debés
        else return
        gadd(cur, delta)
        expenses.push({ id: e.id, gid, gname: g.name, ggrad: g.gradient, ginitial: g.initial, direct: oneToOne, transfer: true, catIcon: '🔁', catName: e.from === me ? 'Le pagaste' : 'Te pagó', amount: e.amount, cur, date: e.date, payerId: e.from, delta })
        return
      }
      const meShare = shareFor(state, gid, e, me)
      if (meShare === null) return // saldado
      const pidShare = shareFor(state, gid, e, pid)
      let delta = 0
      if (e.payerId === me) delta = e.amount * pidShare        // pagaste vos → la persona te debe su parte
      else if (e.payerId === pid) delta = -e.amount * meShare  // pagó la persona → vos le debés tu parte
      else return // pagó un tercero: no genera arista directa me↔pid
      if (delta !== 0) gadd(cur, delta)
      const cat = catById(state, e.categoryId)
      const payer = memberById(state, gid, e.payerId)
      expenses.push({ id: e.id, gid, gname: g.name, ggrad: g.gradient, ginitial: g.initial, direct: oneToOne, catIcon: cat.icon, catName: e.desc || cat.name, amount: e.amount, cur, date: e.date, payerId: e.payerId, payerShort: payer.short, delta })
    })
    ;(state.payments[gid] || []).forEach((p) => {
      const cur = p.currency || 'ARS'
      if (p.from === pid && p.to === me) gadd(cur, -p.amount)
      if (p.from === me && p.to === pid) gadd(cur, p.amount)
    })
    groups.push({ gid, name: g.name, gradient: g.gradient, initial: g.initial, nets: gnets, direct: oneToOne, archived: !!state.archived[gid], members: g.members.length })
  }
  return { nets, groups, expenses }
}

// Totales por moneda sumando el saldo de varias personas (para la cifra hero del home).
export function friendsTotalByCurrency(state, pids) {
  const t = {}
  pids.forEach((pid) => { const c = computeFriend(state, pid); for (const cur in c.nets) t[cur] = (t[cur] || 0) + c.nets[cur] })
  return curList(t)
}

// "Mis gastos" REAL: lo personal + tu parte (consumo) de TODOS los grupos, por moneda.
// Porque tu parte de un gasto compartido también es plata que gastaste vos.
// monthKey opcional ('YYYY-MM'): si se pasa, limita a ese mes (la home muestra el mes en curso).
export function personalSpent(state, monthKey = null) {
  const t = {}
  const add = (cur, v) => { t[cur] = (t[cur] || 0) + v }
  const inMonth = (e) => !monthKey || monthKeyOf(e.date) === monthKey
  ;(state.ledgers.personal || []).forEach((e) => { if (e.future || e.kind === 'transfer' || !inMonth(e)) return; add(e.currency || 'ARS', e.amount) })
  for (const gid in state.groups) {
    const g = state.groups[gid]
    if (g.personal) continue
    ;(state.ledgers[gid] || []).forEach((e) => {
      if (e.future || e.kind === 'transfer' || !inMonth(e)) return
      const share = myShare(state, gid, e)
      if (share === null || share <= 0) return
      add(e.currency || 'ARS', e.amount * share)
    })
  }
  return curList(t)
}

// Gastos de grupos con TU parte (para mostrarlos también en "Mis gastos", etiquetados por grupo).
export function myShareExpenses(state) {
  const out = []
  for (const gid in state.groups) {
    const g = state.groups[gid]
    if (g.personal) continue
    // En un 1:1 el "origen" se etiqueta con el nombre de la persona, no con el del espacio.
    const gname = isOneToOne(state, gid) ? ((peerOf(state, gid) || {}).short || g.name) : g.name
    ;(state.ledgers[gid] || []).forEach((e) => {
      if (e.future || e.kind === 'transfer') return
      const share = myShare(state, gid, e)
      if (share === null) return
      const mine = e.amount * share
      if (mine < 1) return
      const cat = catById(state, e.categoryId)
      const payer = memberById(state, gid, e.payerId)
      out.push({ id: e.id, gid, gname, ggrad: g.gradient, ginitial: g.initial, direct: false, categoryId: e.categoryId, catIcon: cat.icon, catName: e.desc || cat.name, amount: e.amount, cur: e.currency || 'ARS', date: e.date, payerId: e.payerId, payerShort: payer.short, delta: -mine })
    })
  }
  return out
}

// Feed unificado de "Mis gastos": filas de gastos personales (monto completo) + tu parte de cada grupo
// (etiquetada por origen). future=false → pasados; future=true → futuros (cuotas/fijos por venir).
// spent = lo que gastaste vos (personal: total; grupo: tu parte). amount = monto total del gasto.
export function personalFeed(state, future = false) {
  const me = state.me || 'dani'
  const rows = []
  ;(state.ledgers.personal || []).forEach((e) => {
    if (!!e.future !== future || e.kind === 'transfer') return
    const cat = catById(state, e.categoryId)
    rows.push({ id: e.id, gid: 'personal', own: true, gname: 'Personal', categoryId: e.categoryId, cur: e.currency || 'ARS', spent: e.amount, amount: e.amount, date: e.date, catIcon: cat.icon, title: e.desc || cat.name, payerId: me, cuota: e.cuota || null })
  })
  for (const gid in state.groups) {
    const g = state.groups[gid]
    if (g.personal) continue
    const gname = isOneToOne(state, gid) ? ((peerOf(state, gid) || {}).short || g.name) : g.name
    ;(state.ledgers[gid] || []).forEach((e) => {
      if (!!e.future !== future || e.kind === 'transfer') return
      const share = myShare(state, gid, e)
      if (share === null) return
      const mine = e.amount * share
      if (mine < 1) return
      const cat = catById(state, e.categoryId)
      const payer = memberById(state, gid, e.payerId)
      rows.push({ id: e.id, gid, own: false, gname, categoryId: e.categoryId, cur: e.currency || 'ARS', spent: mine, amount: e.amount, date: e.date, catIcon: cat.icon, title: e.desc || cat.name, payerId: e.payerId, payerShort: payer.short, cuota: e.cuota || null })
    })
  }
  return rows
}

// ¿El grupo es un espacio "uno a uno"? Un 1:1 es el espacio directo con una persona:
// marcado `direct`, o un grupo de 2 que NO fue creado como grupo con nombre (g.isGroup).
// Los grupos con nombre (g.isGroup), aunque sean de 2 personas (ej: "Viaje a Chile"), son grupos.
export function isOneToOne(state, gid) {
  const g = state.groups[gid]
  return !!g && !g.personal && !g.isGroup && (g.direct || g.members.length === 2)
}

// El otro miembro de un espacio 1:1 (la persona dueña de ese chat).
export function peerOf(state, gid) {
  const me = state.me || 'dani'
  const g = state.groups[gid]
  return g ? withAlias(state, g.members.find((m) => m.id !== me)) : null
}

// gid del espacio 1:1 con una persona: primero uno marcado direct, si no cualquier grupo de 2 con [me, pid].
export function directGroupWith(state, pid) {
  const me = state.me || 'dani'
  const ids = Object.keys(state.groups)
  const direct = ids.find((id) => { const g = state.groups[id]; return !g.personal && g.direct && !g.isGroup && g.members.some((m) => m.id === pid) })
  if (direct) return direct
  return ids.find((id) => { const g = state.groups[id]; return !g.personal && !g.isGroup && g.members.length === 2 && g.members.some((m) => m.id === me) && g.members.some((m) => m.id === pid) })
}

// Saldo NETO de cada miembro dentro de un grupo, por moneda. net > 0 = le deben (acreedor).
// net = (lo que pagó) − (lo que consumió). Contempla transfers, payments, excluidos y futuros.
export function memberNets(state, gid) {
  const g = state.groups[gid]
  const nets = {}
  const add = (mid, cur, v) => { (nets[mid] = nets[mid] || {})[cur] = (nets[mid][cur] || 0) + v }
  ;(state.ledgers[gid] || []).forEach((e) => {
    if (e.future) return
    const cur = e.currency || 'ARS'
    if (e.kind === 'transfer') { add(e.from, cur, e.amount); add(e.to, cur, -e.amount); return }
    if (e.mode === 'settled') return // pagaron ambos, sin deuda
    g.members.forEach((m) => {
      const share = shareFor(state, gid, e, m.id)
      if (share === null) return
      add(m.id, cur, (e.payerId === m.id ? e.amount : 0) - e.amount * share)
    })
  })
  ;(state.payments[gid] || []).forEach((p) => {
    const cur = p.currency || 'ARS'
    add(p.from, cur, p.amount); add(p.to, cur, -p.amount)
  })
  return nets
}

// "Quién le debe a quién" en un grupo: liquidación con mínimas transferencias, por moneda.
// Empareja cada deudor con el acreedor más grande (greedy). Devuelve [{ from, to, amount, cur }].
export function groupSettlement(state, gid) {
  const nets = memberNets(state, gid)
  const result = []
  CURRENCIES.forEach((cur) => {
    const creditors = []
    const debtors = []
    for (const mid in nets) {
      const v = nets[mid][cur] || 0
      if (v >= 1) creditors.push({ id: mid, v })
      else if (v <= -1) debtors.push({ id: mid, v: -v })
    }
    creditors.sort((a, b) => b.v - a.v)
    debtors.sort((a, b) => b.v - a.v)
    let i = 0, j = 0
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(debtors[i].v, creditors[j].v)
      if (pay >= 1) result.push({ from: debtors[i].id, to: creditors[j].id, amount: pay, cur })
      debtors[i].v -= pay
      creditors[j].v -= pay
      if (debtors[i].v < 1) i++
      if (creditors[j].v < 1) j++
    }
  })
  return result
}

// Líneas del banner para un grupo (3+): "quién le debe a quién", priorizando las que te involucran.
export function groupBalanceLines(state, gid) {
  const me = state.me || 'dani'
  const settle = groupSettlement(state, gid)
  if (!settle.length) return [{ pre: 'Están a mano', amount: '', post: '', color: TONE.pos }]
  const involvesMe = (t) => (t.from === me || t.to === me ? 1 : 0)
  settle.sort((a, b) => involvesMe(b) - involvesMe(a))
  return settle.map(({ from, to, amount, cur }) => {
    const fromShort = memberById(state, gid, from).short
    const toShort = memberById(state, gid, to).short
    // color: si te deben a vos → verde; si debés vos → slate; entre terceros → neutro
    const color = to === me ? TONE.pos : from === me ? TONE.neg : '#64748B'
    return { pre: fromShort + ' debe a ' + toShort + ': ', amount: fmt(amount, cur), post: '', color }
  })
}

// Líneas de saldo AGREGADO con una persona (todos los espacios compartidos), por moneda.
// Mismo formato que balanceLines, para usar en el banner del chat 1:1 y su detalle.
export function friendBalanceLines(state, pid) {
  const c = computeFriend(state, pid)
  const person = personById(state, pid)
  const lines = curList(c.nets).map(([cur, net]) => (
    net > 0
      ? { pre: person.short + ' te debe ', amount: fmt(net, cur), post: '', color: TONE.pos }
      : { pre: 'Le debés ', amount: fmt(-net, cur), post: ' a ' + person.short, color: TONE.neg }
  ))
  return lines.length ? lines : [{ pre: 'Están a mano', amount: '', post: '', color: TONE.pos }]
}

// Movimientos compartidos con una persona, agrupados por día (más nuevos primero),
// cada uno etiquetado con su grupo de origen. Para el detalle del chat 1:1 (vista agregada).
export function friendMovementsByDay(state, pid) {
  const me = state.me || 'dani'
  const expenses = computeFriend(state, pid).expenses.slice().sort(byRecency)
  const order = []
  const byDay = {}
  expenses.forEach((e) => {
    const key = fmtDateFull(e.date)
    if (!byDay[key]) { byDay[key] = []; order.push(key) }
    let impText, impColor
    if (Math.abs(e.delta) < 1) { impText = '—'; impColor = '#94A3B8' }
    else if (e.delta > 0) { impText = '+' + fmt(e.delta, e.cur); impColor = TONE.pos }
    else { impText = '−' + fmt(-e.delta, e.cur); impColor = TONE.neg }
    byDay[key].push({
      id: e.id, gid: e.gid, gname: e.gname, direct: e.direct, showChip: !e.direct, catIcon: e.catIcon, title: e.catName,
      payerText: e.transfer ? 'Transferencia' : e.payerId === me ? 'Pagaste vos' : 'Pagó ' + (e.payerShort || ''),
      amountText: fmt(e.amount, e.cur), impText, impColor,
    })
  })
  return { order, byDay }
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
  'eur', 'euro', 'euros', 'brl', 'real', 'reales', 'reais', 'uyu', 'uruguayo', 'uruguayos', 'mxn',
  'mexicano', 'mexicanos', 'cop', 'colombiano', 'colombianos', 'pen', 'sol', 'soles', 'peruano',
  'gbp', 'libra', 'libras',
  'anteayer', 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
  'septiembre', 'setiembre', 'octubre', 'noviembre', 'diciembre',
])

function extractCat(state, gid, t) {
  const mem = (state.groups[gid] || { members: [] }).members.map((m) => m.short.toLowerCase())
  const words = t.replace(/[\d.\/-]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w) && !mem.includes(w))
  return words[0] || 'Gasto'
}

// Categoría "Sin categoría": bucket único para gastos no reconocidos. NO inventamos una
// categoría por cada palabra ("lomo", "stacy"…). El texto del gasto se guarda como `desc`
// (etiqueta del movimiento) y queda para categorizar después.
export const UNCAT_ID = 'sincat'
export function uncatCategory(state) {
  return (state.categories || []).find((c) => c.id === UNCAT_ID) || { id: UNCAT_ID, name: 'Sin categoría', icon: '🏷️' }
}

export function resolveCat(state, gid, t) {
  for (const c of state.categories) {
    if (c.id === UNCAT_ID) continue // no auto-asignar el bucket por su nombre
    if ((' ' + t + ' ').includes(c.name.toLowerCase())) return { id: c.id, name: c.name, icon: c.icon }
  }
  // Sin coincidencia → "Sin categoría", conservando el texto como descripción del movimiento.
  const label = extractCat(state, gid, t)
  const desc = label.charAt(0).toUpperCase() + label.slice(1)
  const uc = uncatCategory(state)
  return { id: uc.id, name: uc.name, icon: uc.icon, desc }
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
  // moneda (default = la del perfil, sin conversión) — se detecta primero porque define el umbral del monto
  let currency = (state.profile && state.profile.currency) || 'ARS'
  if (/\b(usd|u\$s|d[oó]lar|d[oó]lares)\b/.test(t)) currency = 'USD'
  else if (/\b(clp|peso chileno|pesos chilenos)\b/.test(t)) currency = 'CLP'
  else if (/\b(eur|euro|euros)\b/.test(t) || t.includes('€')) currency = 'EUR'
  else if (/\b(brl|real|reales|reais)\b/.test(t)) currency = 'BRL'
  else if (/\b(uyu|peso uruguayo|pesos uruguayos)\b/.test(t)) currency = 'UYU'
  else if (/\b(mxn|peso mexicano|pesos mexicanos)\b/.test(t)) currency = 'MXN'
  else if (/\b(cop|peso colombiano|pesos colombianos)\b/.test(t)) currency = 'COP'
  else if (/\b(pen|sol|soles)\b/.test(t)) currency = 'PEN'
  else if (/\b(gbp|libra|libras)\b/.test(t)) currency = 'GBP'
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
  const exp = { amount, categoryId: cat.id, catName: cat.name, catIcon: cat.icon, desc: cat.desc, payerId: finalPayer, cuotas, split, mode, currency, date }
  return { kind: 'interpret', exp }
}
