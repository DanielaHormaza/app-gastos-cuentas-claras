import { useState, useEffect, useRef } from 'react'
import { makeInitialState, PALETTE, GRADIENTS, isSystemCategory } from './cc/initialState'
import { makeDemoState } from './cc/seedDemo'
import Welcome from './cc/Welcome'
import { parseChat, guessIcon, adjustSplit, setEqualSplit, fmt, memberById, personById, personColor, friendIds, directGroupWith, normDesc } from './cc/logic'
import { todayISO, nowTime, fmtDateFull, monthKeyOf } from './cc/dates'
import Inicio from './cc/Inicio'
import Chat from './cc/Chat'
import EditSheet from './cc/EditSheet'
import Profile from './cc/Profile'
import Archived from './cc/Archived'
import NewGroup from './cc/NewGroup'
import Uncategorized from './cc/Uncategorized'
import Categories from './cc/Categories'
import Friend, { AddFriend } from './cc/Friend'
import { MethodDetail, MonthDetail } from './cc/Detail'
import { Logo } from './cc/icons'
import Login from './Login'
import { supabase } from './supabase'
import { loadCloudState, cloudUpsertExpense, cloudDeleteExpense, cloudUpsertCategory, cloudDeleteCategory, cloudSaveSplit, cloudUpsertMessage, cloudDeleteMessage, cloudCreateGroup, cloudUpsertGroup, cloudUpsertMember, cloudSaveAliases, cloudSaveCurrency, cloudSetArchived, cloudDeleteGroup, cloudSaveCatMemory } from './cloud'
import { setAmountsHidden, CURRENCIES } from './cc/logic'
import { aiParseExpense, aiCategorize, AI_ENABLED } from './ai'

// Huella de un gasto (para detectar cambios y sincronizar solo lo que cambió).
const expFingerprint = (e) => [e.amount, e.categoryId, e.payerId, e.mode, e.currency, e.desc, e.note, e.date, e.time, e.methodId, e.future, e.from, e.to, e.editedBy, e.editedAt, JSON.stringify(e.cuota || null), JSON.stringify(e.excluded || [])].join('|')
// Snapshot id→{e,gid,fp} de todos los movimientos (para el espejo de sincronización).
const ledSnapshot = (ledgers) => {
  const map = {}
  for (const gid in ledgers) for (const e of ledgers[gid]) map[e.id] = { e, gid, fp: expFingerprint(e) }
  return map
}

// ----- Grupos y miembros -----
// Espejo de sincronización: huella del grupo + huella de cada miembro (para detectar altas/cambios).
const grpFp = (g) => [g.name, g.initial, g.gradient, g.description, g.eventDate, g.isGroup, g.direct, g.personal].join('|')
const memFp = (m) => [m.id, m.name, m.short, m.color, m.initial, m.email].join('|')
const groupSnapshot = (groups) => {
  const map = {}
  for (const gid in groups) {
    const g = groups[gid]
    const members = {}
    for (const m of g.members) members[m.id] = memFp(m)
    map[gid] = { g, gfp: grpFp(g), members }
  }
  return map
}

// ----- Chat compartido -----
// Solo se sincronizan los mensajes de historial (lo que se tipea + gastos confirmados).
// Las tarjetas transitorias (interpret/ambiguous/payment/correction/duplicate) quedan per-device.
const MSG_SYNC_KINDS = new Set(['user', 'saved', 'deleted'])
const isIntro = (m) => typeof m.id === 'string' && m.id.startsWith('w')
const msgKey = (m) => { if (isIntro(m)) return -1; const x = String(m.id || '').match(/\d+/); return x ? Number(x[0]) : 0 }
const msgFp = (m) => [m.kind, m.text, m.expId, m.by, m.time, m.date].join('|')
// Snapshot id→{m,gid,fp} de los mensajes sincronizables (espejo). 'personal' es de un solo usuario: no se sincroniza.
const msgSnapshot = (threads) => {
  const map = {}
  for (const gid in threads) {
    if (gid === 'personal') continue
    for (const m of threads[gid]) if (MSG_SYNC_KINDS.has(m.kind) && !m._hist) map[m.id] = { m, gid, fp: msgFp(m) }
  }
  return map
}
// Mezcla el hilo de la nube (intro + user/saved) con las tarjetas transitorias locales, ordenado por creación.
const mergeThreads = (prevThreads, cloudThreads) => {
  const out = {}
  const gids = new Set([...Object.keys(cloudThreads || {}), ...Object.keys(prevThreads || {})])
  for (const g of gids) {
    // Las tarjetas de texto de la app (intros viejas, "No te entendí", "Registré el pago"…) son
    // efímeras: NO se conservan entre cargas. Así se limpia el intro viejo que quedó en localStorage.
    if (g === 'personal') { out[g] = ((prevThreads || {})[g] || (cloudThreads || {})[g] || []).filter((m) => m.kind !== 'text'); continue }
    const byId = {}
    for (const m of (cloudThreads || {})[g] || []) byId[m.id] = m
    // Conservamos las tarjetas locales que la nube todavía no tiene (optimista: user/saved/deleted/
    // interpret… pendientes de sync no deben desaparecer). Solo excluimos lo efímero: intros y textos.
    for (const m of (prevThreads || {})[g] || []) if (!isIntro(m) && m.kind !== 'text' && !byId[m.id]) byId[m.id] = m
    // a igual momento, el mensaje tipeado (user) va antes que la tarjeta de la app
    const rank = (m) => (m.kind === 'user' ? 0 : 1)
    out[g] = Object.values(byId).sort((a, b) => msgKey(a) - msgKey(b) || rank(a) - rank(b))
  }
  return out
}

// Guardado automático de la hoja de edición: aplica `patch` al borrador y lo escribe
// al instante en el gasto del ledger (sin botón Confirmar). Devuelve { draft, ledgers }.
const applyEdit = (prev, patch) => {
  const g = prev.groupId
  const draft = { ...prev.draft, ...patch, editedBy: prev.profile.name, editedAt: todayISO() }
  const l = (prev.ledgers[g] || []).map((it) =>
    it.id === prev.editId
      ? { ...it, categoryId: draft.categoryId, amount: draft.amount, payerId: draft.payerId, desc: draft.desc !== undefined ? (draft.desc || undefined) : it.desc, note: draft.note !== undefined ? (draft.note || undefined) : it.note, date: draft.date || it.date, methodId: draft.methodId !== undefined ? draft.methodId : it.methodId || null, mode: draft.mode || 'group', currency: draft.currency || 'ARS', excluded: draft.excluded || [], editedBy: draft.editedBy, editedAt: draft.editedAt }
      : it,
  )
  return { draft, ledgers: { ...prev.ledgers, [g]: l } }
}

// Suma `n` meses a una fecha ISO conservando el día (con desborde natural del Date).
const addMonthsISO = (iso, n) => {
  const [y, m, d] = (iso || todayISO()).split('-').map(Number)
  const dt = new Date(y, (m - 1) + n, d)
  const pad = (x) => ('0' + x).slice(-2)
  return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate())
}

// Construye las entradas de un gasto interpretado: una sola, o N cuotas (una por mes) si exp.cuotas>1.
// Convención: el monto es POR CUOTA ("3 cuotas de $180.000" = 180.000 cada una). La cuota cuyo mes
// ya llegó NO se marca `future` (cuenta desde ya); las de meses siguientes sí (isUpcoming las corre solo).
const buildExpenseEntries = (exp, baseId, day, tm, createdBy) => {
  const date0 = exp.date || day
  const curMonth = monthKeyOf(day)
  const common = {
    categoryId: exp.categoryId, payerId: exp.payerId, note: exp.note || undefined,
    mode: exp.mode || 'group', currency: exp.currency || 'ARS', createdBy,
  }
  const n = exp.cuotas && exp.cuotas > 1 ? exp.cuotas : 1
  if (n === 1) return [{ id: 'e' + baseId, date: date0, amount: exp.amount, time: tm, desc: exp.desc || undefined, ...common }]
  // El nombre queda limpio (sin "cuota i/N"): el número de cuota se muestra como etiqueta aparte (cuota:{n,total}).
  const base = exp.desc || exp.catName || 'Gasto'
  const out = []
  for (let i = 0; i < n; i++) {
    const d = addMonthsISO(date0, i)
    out.push({
      id: 'e' + baseId + '_' + (i + 1), date: d, amount: exp.amount, time: tm,
      desc: base, cuota: { n: i + 1, total: n },
      future: monthKeyOf(d) > curMonth, ...common,
    })
  }
  return out
}

// Miembro "yo" para armar grupos nuevos: el que ya existe en algún grupo, o uno derivado del perfil.
const meMemberOf = (prev) => {
  const me = prev.me || 'dani'
  for (const gid in prev.groups) {
    const m = prev.groups[gid].members.find((x) => x.id === me)
    if (m) return m
  }
  const nm = prev.profile.name || 'Vos'
  return { id: me, name: nm + ' (vos)', short: nm, color: '#7C3AED', initial: (nm.trim()[0] || 'D').toUpperCase() }
}

// Crea (en el store local) un grupo 1:1 "directo" con una persona y devuelve el patch que lo abre.
// BACKEND (pendiente con OK): faltaría cloudUpsertGroup + create_group (security definer) por RLS.
const buildDirect = (prev, pid, person, pending, email) => {
  const me = prev.me || 'dani'
  const meM = meMemberOf(prev)
  const id = 'd_' + pid
  const color = person.color || personColor(prev, pid)
  const friend = { id: pid, name: person.name || person.short, short: person.short, color, initial: person.initial }
  if (pending) friend.pending = true
  if (email) friend.email = email
  const group = { id, name: friend.short, initial: friend.initial, gradient: 'linear-gradient(135deg,' + color + ',#3B82F6)', description: 'Espacio uno a uno.', createdAt: fmtDateFull(todayISO()), direct: true, members: [meM, friend] }
  return {
    groups: { ...prev.groups, [id]: group },
    splits: { ...prev.splits, [id]: { [me]: 50, [pid]: 50 } },
    splitLog: { ...prev.splitLog, [id]: [] },
    splitMeta: { ...prev.splitMeta, [id]: { from: '2000-01-01', at: null, by: null } },
    ledgers: { ...prev.ledgers, [id]: [] },
    threads: { ...prev.threads, [id]: [] },
    payments: { ...prev.payments, [id]: [] },
    screen: 'chat', groupId: id, view: 'chat', menuOpen: false, configOpen: false,
  }
}

// Filtros que se resetean al entrar a otro espacio (para que no "leakeen" entre grupos/personal).
const FILTER_RESET = { catFilter: [], curFilter: 'all', payerFilter: 'all', moveQuery: '', personalSrc: 'all' }

// Layout de dos paneles a partir de ~900px de ancho.
function useDesktop() {
  const [d, setD] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 900px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)')
    const h = (e) => setD(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  return d
}

// Persistencia local. SUPABASE (V2): reemplazar por API/DB.
const KEY = 'cuentas-claras:v4'
const DEMO_KEY = 'cuentas-claras:demo-v1' // datos ficticios del modo demo (aparte de los reales)
const DEMO_FLAG = 'cc-demo' // '1' = el visitante entró por "Explorar demo"
const WELCOME_KEY = 'cc-welcomed:v1' // '1' = ya vio el onboarding de bienvenida (por dispositivo)
const HIDE_KEY = 'cuentas-claras:hideAmounts' // preferencia por dispositivo (no se sincroniza)
const DATA_KEYS = ['groups', 'splits', 'splitLog', 'splitMeta', 'ledgers', 'payments', 'threads', 'categories', 'methods', 'profile', 'archived', 'pinned', 'aliases', 'histSel', 'catMemory']

// ¿Estamos en modo demo? Se activa con el botón "Explorar demo" del login o con ?demo=1 en la URL
// (link directo para compartir). El param deja la bandera puesta para que sobreviva a las recargas.
export function isDemo() {
  try {
    if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('demo') === '1') {
      localStorage.setItem(DEMO_FLAG, '1')
    }
    return typeof localStorage !== 'undefined' && localStorage.getItem(DEMO_FLAG) === '1'
  } catch { return false }
}

function load() {
  const hideAmounts = localStorage.getItem(HIDE_KEY) === '1'
  // MODO DEMO: datos 100% ficticios en su propia clave; nunca toca Supabase ni los datos reales.
  // Si todavía no hay estado demo guardado, arranca del seed ficticio (makeDemoState).
  if (isDemo()) {
    let st
    try {
      const raw = localStorage.getItem(DEMO_KEY)
      st = raw ? migrate({ ...makeDemoState(), ...JSON.parse(raw), hideAmounts }) : { ...makeDemoState(), hideAmounts }
    } catch {
      st = { ...makeDemoState(), hideAmounts }
    }
    return st
  }
  // DEV: ?fresh=1 ignora (y borra) los datos guardados y arranca del seed de demo (Asado, Pato, etc.).
  const fresh = import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).get('fresh') === '1'
  if (fresh) { try { localStorage.removeItem(KEY) } catch { /* sin storage */ } }
  let st
  try {
    const raw = fresh ? null : localStorage.getItem(KEY)
    st = raw ? migrate({ ...makeInitialState(), ...JSON.parse(raw), hideAmounts }) : { ...makeInitialState(), hideAmounts }
  } catch {
    st = { ...makeInitialState(), hideAmounts } /* dato corrupto: se ignora */
  }
  // DEV: ver la perspectiva de otro miembro con ?me=juan (solo local, junto a ?dev=1)
  if (import.meta.env.DEV && typeof location !== 'undefined') {
    const meParam = new URLSearchParams(location.search).get('me')
    if (meParam) {
      const m = (st.groups?.pareja?.members || []).find((x) => x.id === meParam)
      st = { ...st, me: meParam, profile: { ...st.profile, name: m ? m.short : st.profile.name, email: meParam + '@cuentasclaras.app', founderNumber: meParam === 'juan' ? 2 : meParam === 'dani' ? 1 : st.profile.founderNumber, memberSince: st.profile.memberSince || '2026-06-01' } }
    }
  }
  return st
}

// Asegura que el historial de reparto exista para cada grupo (estado guardado previo a esta feature).
function migrate(s) {
  s.splitLog = s.splitLog || {}
  s.splitMeta = s.splitMeta || {}
  // "Sin categoría": bucket único para gastos no reconocidos. Debe existir siempre, incluso
  // sobre estados viejos en localStorage que se guardaron antes de incorporarlo.
  if (Array.isArray(s.categories) && !s.categories.some((c) => c.id === 'sincat')) {
    s.categories = [...s.categories, { id: 'sincat', icon: '🏷️', name: 'Sin categoría' }]
  }
  // pinned: de formato viejo (array de gids) al nuevo ({ kind, id })
  s.pinned = (s.pinned || []).map((p) => (typeof p === 'string' ? { kind: 'group', id: p } : p)).filter((p) => p && p.id)
  Object.keys(s.splits || {}).forEach((gid) => {
    if (!s.splitLog[gid]) s.splitLog[gid] = []
    if (!s.splitMeta[gid]) s.splitMeta[gid] = { from: '2000-01-01', at: null, by: null }
  })
  return s
}

export default function App() {
  const [s, setS] = useState(load)
  // "Ocultar saldos": sincroniza el flag de display de fmt con la preferencia actual.
  // Se setea en render (antes que los hijos) para que los montos se enmascaren sin parpadeo.
  setAmountsHidden(s.hideAmounts)
  const desktop = useDesktop()
  // session: undefined = cargando, null = sin sesión (mostrar login), objeto = logueado
  const [session, setSession] = useState(undefined)
  const [dataReady, setDataReady] = useState(false)
  const [dataErr, setDataErr] = useState(null)
  const ledSyncRef = useRef(null) // snapshot de movimientos ya sincronizados
  const grpSyncRef = useRef(null) // snapshot de grupos/miembros ya sincronizados
  const archSyncRef = useRef(null) // snapshot del mapa de archivados ya sincronizado
  const catSyncRef = useRef(null) // ids de categorías ya sincronizadas
  const msgSyncRef = useRef(null) // snapshot de mensajes ya sincronizados
  const aliasSyncRef = useRef(false) // ya se tomó el snapshot inicial de aliases
  const curSyncRef = useRef(false) // ya se tomó el snapshot inicial de la moneda por defecto
  const catMemSyncRef = useRef(false) // ya se tomó el snapshot inicial de la memoria de categorías
  const typingChanRef = useRef(null) // canal de "escribiendo…" (broadcast) del grupo activo
  const typingTimerRef = useRef(null) // limpia el cartel de "escribiendo…" tras unos segundos
  const lastTypingSentRef = useRef(0) // throttle de envío de "escribiendo…"
  const [typingName, setTypingName] = useState(null) // quién está escribiendo en el grupo activo (otro usuario)
  const [showWelcome, setShowWelcome] = useState(false) // onboarding de bienvenida (primer ingreso de cuenta nueva)

  useEffect(() => {
    const apply = (sess) => {
      setSession(sess)
      setS((prev) => ({ ...prev, authEmail: sess?.user?.email || null }))
      // En modo demo NO tocamos Supabase aunque exista una sesión real (datos 100% locales/ficticios).
      if (sess?.user && !isDemo()) {
        // crear/actualizar perfil (no bloqueante; el claim va en el efecto de carga, secuenciado)
        supabase.from('profiles').upsert({ id: sess.user.id, name: (sess.user.email || '').split('@')[0] }).then(({ error }) => error && console.error('[profile]', error.message))
      }
    }
    supabase.auth.getSession().then(({ data }) => apply(data.session)).catch(() => apply(null))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => apply(sess))
    return () => sub.subscription.unsubscribe()
  }, [])

  // cargar los datos desde la nube cuando hay sesión (primero claim → recién ahí soy miembro y RLS me deja leer)
  // En modo demo se saltea SIEMPRE (aunque haya sesión real): la demo usa datos locales y dataReady queda false,
  // así ningún espejo escribe en Supabase ni se pisan los datos ficticios con los reales.
  useEffect(() => {
    if (isDemo()) { setDataReady(false); return }
    if (!session?.user) { setDataReady(false); return }
    let cancelled = false
    setDataErr(null)
    setDataReady(false)
    ;(async () => {
      try {
        const { error: claimErr } = await supabase.rpc('claim_my_slots')
        if (claimErr) console.error('[claim_my_slots]', claimErr.message)
        // asigna el número de "Usuario Fundador" si todavía no lo tiene (idempotente)
        const { error: fnErr } = await supabase.rpc('ensure_founder_number')
        if (fnErr) console.error('[ensure_founder_number]', fnErr.message)
        const cloud = await loadCloudState(session.user.id)
        // conservar el historial de chat ya guardado (por dispositivo); intro solo si no hay
        if (!cancelled) {
          setS((prev) => ({ ...cloud, threads: mergeThreads(prev.threads, cloud.threads), hideAmounts: prev.hideAmounts, pinned: prev.pinned, authEmail: prev.authEmail })) // chat/aliases desde la nube; hideAmounts/pinned/authEmail son del cliente
          setDataReady(true)
        }
      } catch (e) {
        if (!cancelled) { console.error('[loadCloudState]', e.message); setDataErr(e.message) }
      }
    })()
    return () => { cancelled = true }
  }, [session?.user?.id])

  // espejo de movimientos → Supabase: detecta altas/ediciones/bajas y las sincroniza.
  // El personal usa la clave cliente 'personal' pero en la nube tiene un id propio por-usuario
  // (cloudId): traducimos al escribir. Si todavía no se creó (cloudId null), se saltea hasta que exista.
  useEffect(() => {
    if (!dataReady) { ledSyncRef.current = null; return }
    const personalCloudId = s.groups.personal && s.groups.personal.cloudId
    const realGid = (gid) => (gid === 'personal' ? personalCloudId : gid)
    const cur = ledSnapshot(s.ledgers)
    const prev = ledSyncRef.current
    if (prev === null) { ledSyncRef.current = cur; return } // primera vez tras cargar: solo snapshot
    for (const id in cur) if (!prev[id] || prev[id].fp !== cur[id].fp) { const rg = realGid(cur[id].gid); if (rg) cloudUpsertExpense(cur[id].e, rg) }
    for (const id in prev) if (!cur[id]) cloudDeleteExpense(id)
    ledSyncRef.current = cur
  }, [s.ledgers, dataReady, s.groups.personal && s.groups.personal.cloudId])

  // Asegura el grupo personal del usuario en la nube: si la carga no encontró uno propio
  // (1er login → cloudId null), lo crea con id único 'personal_<uid>' vía create_group y guarda
  // el cloudId, así los gastos personales empiezan a persistir/sincronizar.
  useEffect(() => {
    if (!dataReady || !session?.user) return
    const p = s.groups.personal
    if (!p || p.cloudId) return
    const cid = 'personal_' + session.user.id
    const mem = p.members[0] || { id: s.me, name: s.profile.name, short: s.profile.name, color: '#7C3AED', initial: (s.profile.name.trim()[0] || '?').toUpperCase() }
    cloudCreateGroup({ id: cid, name: 'Mis gastos', initial: '🧾', gradient: 'linear-gradient(135deg,#7C3AED,#3B82F6)', personal: true }, [mem], mem.id)
    setS((prev) => ({ ...prev, groups: { ...prev.groups, personal: { ...prev.groups.personal, cloudId: cid } } }))
  }, [dataReady, session?.user?.id, s.groups.personal && s.groups.personal.cloudId])

  // espejo de grupos/miembros → Supabase: crea grupos nuevos (create_group), actualiza datos y suma miembros.
  // 'personal' no se sincroniza acá (ya existe en la nube y es del usuario).
  useEffect(() => {
    if (!dataReady) { grpSyncRef.current = null; return }
    const cur = groupSnapshot(s.groups)
    const prev = grpSyncRef.current
    if (prev === null) { grpSyncRef.current = cur; return } // primera vez tras cargar: solo snapshot
    for (const gid in cur) {
      if (gid === 'personal') continue
      if (!prev[gid]) {
        cloudCreateGroup(cur[gid].g, cur[gid].g.members, s.me) // grupo/1:1 nuevo
        const meta = (s.splitMeta && s.splitMeta[gid]) || {}
        if (s.splits[gid]) cloudSaveSplit(gid, meta.from || '2000-01-01', s.splits[gid], meta.by, meta.at) // siembra el reparto inicial
        continue
      }
      if (prev[gid].gfp !== cur[gid].gfp) cloudUpsertGroup(cur[gid].g) // cambió nombre/foto/fecha…
      for (const mid in cur[gid].members) {
        if (prev[gid].members[mid] !== cur[gid].members[mid]) {
          const mem = cur[gid].g.members.find((x) => x.id === mid)
          if (mem) cloudUpsertMember(mem, gid) // miembro nuevo o editado
        }
      }
    }
    grpSyncRef.current = cur
  }, [s.groups, dataReady])

  // Onboarding de bienvenida: se muestra una vez (por dispositivo) en el primer ingreso de una cuenta
  // nueva/vacía. A cuentas con datos se les marca "visto" en silencio. ?welcome=1 lo fuerza (para previsualizar).
  useEffect(() => {
    if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('welcome') === '1') { setShowWelcome(true); return }
    if (!dataReady || isDemo()) return
    let welcomed = false
    try { welcomed = localStorage.getItem(WELCOME_KEY) === '1' } catch { /* sin storage */ }
    if (welcomed) return
    const nonPersonal = Object.keys(s.groups).filter((id) => id !== 'personal' && !s.groups[id].personal)
    const empty = nonPersonal.length === 0 && (s.ledgers.personal || []).length === 0
    if (empty) setShowWelcome(true)
    else { try { localStorage.setItem(WELCOME_KEY, '1') } catch { /* sin storage */ } }
  }, [dataReady]) // eslint-disable-line react-hooks/exhaustive-deps
  const dismissWelcome = () => { try { localStorage.setItem(WELCOME_KEY, '1') } catch { /* sin storage */ } setShowWelcome(false) }

  // espejo de archivados → Supabase (columna groups.archived). Gated por dataReady → la demo no escribe.
  // Detecta cambios de archivar/desarchivar y los persiste; así sobrevive a recargas y sincroniza dispositivos.
  useEffect(() => {
    if (!dataReady) { archSyncRef.current = null; return }
    const cur = s.archived || {}
    const prev = archSyncRef.current
    if (prev === null) { archSyncRef.current = cur; return } // primera vez tras cargar: solo snapshot
    const ids = new Set([...Object.keys(prev), ...Object.keys(cur)])
    for (const id of ids) {
      if (id === 'personal') continue
      if (!!prev[id] !== !!cur[id]) cloudSetArchived(id, !!cur[id])
    }
    archSyncRef.current = cur
  }, [s.archived, dataReady])

  // espejo de categorías nuevas → Supabase
  useEffect(() => {
    if (!dataReady) { catSyncRef.current = null; return }
    const prev = catSyncRef.current
    // Map id → "icono|nombre": sube solo las nuevas o las que cambiaron (renombre/ícono), y borra las quitadas.
    const cur = new Map(s.categories.map((c) => [c.id, c.icon + '|' + c.name]))
    if (prev === null) { catSyncRef.current = cur; return }
    for (const c of s.categories) if (prev.get(c.id) !== cur.get(c.id)) cloudUpsertCategory(c)
    for (const id of prev.keys()) if (!cur.has(id) && !isSystemCategory(id)) cloudDeleteCategory(id)
    catSyncRef.current = cur
  }, [s.categories, dataReady])

  // espejo del chat → Supabase: sincroniza altas/ediciones/bajas de mensajes de historial (user/saved)
  useEffect(() => {
    if (!dataReady) { msgSyncRef.current = null; return }
    const cur = msgSnapshot(s.threads)
    const prev = msgSyncRef.current
    if (prev === null) { msgSyncRef.current = cur; return } // primera vez tras cargar: solo snapshot
    for (const id in cur) if (!prev[id] || prev[id].fp !== cur[id].fp) cloudUpsertMessage(cur[id].m, cur[id].gid)
    for (const id in prev) if (!cur[id]) cloudDeleteMessage(id)
    msgSyncRef.current = cur
  }, [s.threads, dataReady])

  // espejo de alias (cómo llamás a cada persona) → perfil en Supabase, para que te sigan en todos tus dispositivos.
  useEffect(() => {
    if (!dataReady || !session?.user) { aliasSyncRef.current = false; return }
    if (!aliasSyncRef.current) { aliasSyncRef.current = true; return } // primera vez tras cargar: solo snapshot
    cloudSaveAliases(session.user.id, s.aliases)
  }, [s.aliases, dataReady])

  // espejo de la moneda por defecto → perfil en Supabase (te sigue entre dispositivos).
  useEffect(() => {
    if (!dataReady || !session?.user) { curSyncRef.current = false; return }
    if (!curSyncRef.current) { curSyncRef.current = true; return } // primera vez tras cargar: solo snapshot
    cloudSaveCurrency(session.user.id, s.profile.currency)
  }, [s.profile.currency, dataReady])

  // espejo de la memoria de categorías → perfil en Supabase (te sigue entre dispositivos).
  useEffect(() => {
    if (!dataReady || !session?.user) { catMemSyncRef.current = false; return }
    if (!catMemSyncRef.current) { catMemSyncRef.current = true; return } // primera vez tras cargar: solo snapshot
    cloudSaveCatMemory(session.user.id, s.catMemory)
  }, [s.catMemory, dataReady])

  // Moneda elegida al crear la cuenta (Login la deja en localStorage porque al hacer signup
  // todavía no hay datos cargados): se aplica una vez al perfil y el espejo de arriba la persiste.
  useEffect(() => {
    if (!dataReady || !session?.user) return
    const pending = typeof localStorage !== 'undefined' && localStorage.getItem('cc-signup-currency')
    if (pending && CURRENCIES.includes(pending)) {
      localStorage.removeItem('cc-signup-currency')
      if (pending !== s.profile.currency) setS((prev) => ({ ...prev, profile: { ...prev.profile, currency: pending } }))
    }
  }, [dataReady, session?.user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // TIEMPO REAL: si otro dispositivo/usuario cambia algo, recargamos los datos (sin perder navegación ni chat).
  useEffect(() => {
    if (!session?.user || !dataReady) return
    // Realtime usa MI token para que RLS me deje recibir los cambios de mis grupos.
    if (session.access_token) supabase.realtime.setAuth(session.access_token)
    let timer = null
    const reload = (payload) => {
      console.log('[realtime] cambio detectado:', payload?.table, payload?.eventType)
      clearTimeout(timer)
      timer = setTimeout(async () => {
        try {
          const cloud = await loadCloudState(session.user.id)
          ledSyncRef.current = ledSnapshot(cloud.ledgers)
          grpSyncRef.current = groupSnapshot(cloud.groups)
          archSyncRef.current = cloud.archived
          catSyncRef.current = new Map(cloud.categories.map((c) => [c.id, c.icon + '|' + c.name]))
          msgSyncRef.current = msgSnapshot(cloud.threads)
          setS((prev) => ({ ...prev, me: cloud.me, groups: cloud.groups, splits: cloud.splits, splitLog: cloud.splitLog, splitMeta: cloud.splitMeta, ledgers: cloud.ledgers, archived: cloud.archived, categories: cloud.categories, threads: mergeThreads(prev.threads, cloud.threads) }))
        } catch (e) {
          console.error('[realtime] error al recargar:', e.message)
        }
      }, 350)
    }
    const ch = supabase
      .channel('cc-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'split_history' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, reload)
      .subscribe((status) => console.log('[realtime] estado del canal:', status))
    return () => { clearTimeout(timer); supabase.removeChannel(ch) }
  }, [session?.user?.id, dataReady])

  // "Escribiendo…" (estilo WhatsApp): canal de broadcast efímero por grupo activo.
  // No usa DB; solo avisa en vivo a los miembros del grupo. Solo en grupos compartidos.
  useEffect(() => {
    setTypingName(null)
    clearTimeout(typingTimerRef.current)
    const gid = s.groupId
    const g = s.groups[gid]
    if (!session?.user || !dataReady || !gid || gid === 'personal' || !g || g.personal) { typingChanRef.current = null; return }
    if (session.access_token) supabase.realtime.setAuth(session.access_token)
    const ch = supabase.channel('cc-typing-' + gid, { config: { broadcast: { self: false } } })
    ch.on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (!payload || !payload.user) return
      setTypingName(payload.user)
      clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => setTypingName(null), 3500)
    }).subscribe()
    typingChanRef.current = ch
    return () => { clearTimeout(typingTimerRef.current); supabase.removeChannel(ch); typingChanRef.current = null }
  }, [session?.user?.id, dataReady, s.groupId])

  // Dev bypass por URL: ?dev=1 lo guarda (persiste en recargas), ?dev=0 lo limpia.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const p = new URLSearchParams(location.search).get('dev')
    if (p === '1') localStorage.setItem('cc-dev', '1')
    if (p === '0') localStorage.removeItem('cc-dev')
  }, [])

  // Altura realmente visible (descuenta el teclado en iOS-PWA) → la app se ajusta a eso.
  // Además fijamos el TOP del viewport visible (offsetTop) y forzamos scroll a 0: así, cuando
  // iOS abre el teclado y "scrollea" la página por detrás, no queda el espacio vacío raro;
  // la app sigue pegada a lo que se ve y el input queda justo arriba del teclado.
  useEffect(() => {
    const vv = window.visualViewport
    const setH = () => {
      const de = document.documentElement
      de.style.setProperty('--app-h', (vv ? vv.height : window.innerHeight) + 'px')
      de.style.setProperty('--app-top', (vv ? vv.offsetTop : 0) + 'px')
      // la página (layout viewport) no debe quedar scrolleada detrás de la app fija
      if (window.scrollY !== 0) window.scrollTo(0, 0)
    }
    setH()
    vv && vv.addEventListener('resize', setH)
    vv && vv.addEventListener('scroll', setH)
    window.addEventListener('resize', setH)
    window.addEventListener('scroll', setH, { passive: true })
    return () => { vv && vv.removeEventListener('resize', setH); vv && vv.removeEventListener('scroll', setH); window.removeEventListener('resize', setH); window.removeEventListener('scroll', setH) }
  }, [])

  // Persiste solo los datos (no el estado de navegación transitorio).
  // En modo demo se guarda en una clave aparte (DEMO_KEY) para no pisar los datos reales.
  useEffect(() => {
    const data = {}
    DATA_KEYS.forEach((k) => (data[k] = s[k]))
    localStorage.setItem(isDemo() ? DEMO_KEY : KEY, JSON.stringify(data))
  }, DATA_KEYS.map((k) => s[k])) // eslint-disable-line react-hooks/exhaustive-deps

  // Merge parcial (como el setState del prototipo).
  const set = (patch) => setS((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))

  const gid = s.groupId

  // Abre la hoja de edición para un gasto del ledger.
  const openEdit = (e) =>
    set({ editId: e.id, draft: { categoryId: e.categoryId, amount: e.amount, payerId: e.payerId, desc: e.desc || '', note: e.note || '', date: e.date || todayISO(), methodId: e.methodId || null, mode: e.mode || 'group', currency: e.currency || 'ARS', excluded: e.excluded || [], createdBy: e.createdBy, editedBy: e.editedBy, editedAt: e.editedAt }, editPanel: null, catQuery: '', payerQuery: '', methodQuery: '' })

  // Aplica un nuevo reparto registrando el régimen anterior "hasta hoy": el nuevo % rige desde hoy.
  // Editar varias veces el mismo día NO crea regímenes extra (sólo el primero del día archiva el anterior).
  const commitSplit = (newShares) => {
    const today = todayISO()
    set((prev) => {
      const meta = (prev.splitMeta && prev.splitMeta[gid]) || { from: '2000-01-01', at: null, by: null }
      const log = (prev.splitLog && prev.splitLog[gid]) || []
      const newLog = meta.from !== today
        ? [...log, { until: today, shares: prev.splits[gid] || {} }].sort((a, b) => (a.until < b.until ? -1 : 1))
        : log
      return {
        splits: { ...prev.splits, [gid]: newShares },
        splitLog: { ...prev.splitLog, [gid]: newLog },
        splitMeta: { ...prev.splitMeta, [gid]: { from: today, at: today, by: prev.profile.name } },
      }
    })
    cloudSaveSplit(gid, today, newShares, s.profile.name, new Date().toISOString())
  }

  // Reparto manual: fijás el % de uno y el resto se reparte entre los demás (proporcional, o equitativo si están en 0).
  const sharesFrom = (id, value) => {
    const members = s.groups[gid].members
    const cur = s.splits[gid] || {}
    const v = Math.max(0, Math.min(100, value))
    const others = members.filter((m) => m.id !== id)
    const rest = 100 - v
    const shares = { [id]: v }
    if (others.length === 1) shares[others[0].id] = rest
    else {
      const sum = others.reduce((a, m) => a + (cur[m.id] || 0), 0)
      let acc = 0
      others.forEach((m, i) => {
        const val = i === others.length - 1 ? rest - acc : sum > 0 ? Math.round((rest * (cur[m.id] || 0)) / sum) : Math.floor(rest / others.length)
        shares[m.id] = val
        acc += val
      })
    }
    return shares
  }

  const actions = {
    // ---- navegación ----
    signOut: () => supabase.auth.signOut(),
    openProfile: () => set({ screen: 'profile', menuOpen: false }),
    // ---- gestión de categorías ----
    openCategories: () => set({ screen: 'categories', catEditId: null }),
    closeCategories: () => set({ screen: 'profile', catEditId: null }),
    toggleCatEdit: (id) => set((prev) => ({ catEditId: prev.catEditId === id ? null : id })),
    renameCategory: (id, name) => set((prev) => ({ categories: (prev.categories || []).map((c) => (c.id === id ? { ...c, name: name || c.name } : c)) })),
    setCatIconById: (id, icon) => set((prev) => ({ categories: (prev.categories || []).map((c) => (c.id === id ? { ...c, icon } : c)) })),
    // Fusiona `fromId` en `toId`: reasigna todos los gastos y la memoria, y elimina la categoría origen.
    mergeCategory: (fromId, toId) =>
      set((prev) => {
        if (fromId === toId) return { catEditId: null }
        const ledgers = {}
        for (const g in prev.ledgers) ledgers[g] = (prev.ledgers[g] || []).map((e) => (e.categoryId === fromId ? { ...e, categoryId: toId } : e))
        const mem = {}
        for (const k in prev.catMemory || {}) mem[k] = prev.catMemory[k] === fromId ? toId : prev.catMemory[k]
        const categories = (prev.categories || []).filter((c) => c.id !== fromId)
        return { ledgers, catMemory: mem, categories, catEditId: null }
      }),
    // Elimina una categoría custom SIN gastos (los gastos habría que fusionarlos antes).
    deleteCategory: (id) =>
      set((prev) => {
        if (isSystemCategory(id)) return {}
        const used = Object.values(prev.ledgers || {}).some((l) => (l || []).some((e) => e.categoryId === id))
        if (used) return {} // tiene gastos: usar fusionar
        return { categories: (prev.categories || []).filter((c) => c.id !== id), catEditId: null }
      }),
    openPersonal: () => set({ ...FILTER_RESET, screen: 'chat', groupId: 'personal', view: 'chat', menuOpen: false, configOpen: false }),
    openGroup: (id) => set({ ...FILTER_RESET, screen: 'chat', groupId: id, view: 'chat', menuOpen: false, configOpen: false }),
    openNewGroup: () => set({ screen: 'newgroup', newGroup: { name: '', desc: '', date: '', members: [], memberName: '', invited: false } }),
    openArchived: () => set({ screen: 'archived', groupQuery: '' }),
    backToList: () => set({ screen: 'list' }),

    // ---- modelo centrado en personas ----
    setHomeTab: (tab) => set({ homeTab: tab }),
    openFriend: (pid) => set({ screen: 'friend', friendId: pid, menuOpen: false, configOpen: false }),
    // Alias local: cómo VOS llamás a una persona (vacío = su nombre real).
    setAlias: (pid, name) =>
      set((prev) => {
        const a = { ...prev.aliases }
        const v = (name || '').trim()
        if (v) a[pid] = v
        else delete a[pid]
        return { aliases: a }
      }),
    backFromFriend: () => set({ screen: 'list' }),
    // Abre el espacio 1:1 con una persona (su grupo de 2; si no existe, lo crea al vuelo, local).
    openFriendChat: (pid) =>
      set((prev) => {
        const existing = directGroupWith(prev, pid)
        if (existing) return { ...FILTER_RESET, screen: 'chat', groupId: existing, view: 'chat', menuOpen: false, configOpen: false }
        const p = personById(prev, pid)
        return { ...FILTER_RESET, ...buildDirect(prev, pid, p, !!p.pending, p.email) }
      }),
    // Abre los movimientos de un grupo (para saltar al origen de un gasto desde la vista agregada).
    openLedgerOf: (id) => set({ ...FILTER_RESET, screen: 'chat', groupId: id, view: 'ledger', menuOpen: false, configOpen: false }),

    // ---- fijados en el inicio (personas y grupos, máx. 2) ----
    // Fijar/desfijar: si ya está → pide confirmación para desfijar; si no y hay lugar → fija.
    togglePin: (kind, id) =>
      set((prev) => {
        if (prev.pinned.some((p) => p.kind === kind && p.id === id)) return { confirmUnpin: { kind, id } }
        if (prev.pinned.length >= 2) return {} // máx. 2 (silencioso)
        return { pinned: [...prev.pinned, { kind, id }], menuOpen: false }
      }),
    requestUnpin: (kind, id) => set({ confirmUnpin: { kind, id } }),
    cancelUnpin: () => set({ confirmUnpin: null }),
    confirmUnpinYes: () => set((prev) => ({ pinned: prev.pinned.filter((p) => !(p.kind === prev.confirmUnpin.kind && p.id === prev.confirmUnpin.id)), confirmUnpin: null })),
    // Saldar desde el perfil: abre el espacio 1:1 (creándolo si hace falta) con la hoja de saldar.
    openFriendSettle: (pid) =>
      set((prev) => {
        const existing = directGroupWith(prev, pid)
        if (existing) return { screen: 'chat', groupId: existing, view: 'chat', settleOpen: true, menuOpen: false, configOpen: false }
        const p = personById(prev, pid)
        return { ...buildDirect(prev, pid, p, !!p.pending, p.email), settleOpen: true }
      }),
    // Copia el enlace de invitación de una persona pendiente (feedback transitorio).
    copyInvite: (pid) => {
      const link = 'https://cuentasclaras.app/i/' + String(pid).slice(-6).toUpperCase()
      try { navigator.clipboard && navigator.clipboard.writeText(link) } catch { /* sin permiso de portapapeles */ }
      set({ inviteCopied: pid })
      setTimeout(() => set((prev) => (prev.inviteCopied === pid ? { inviteCopied: null } : {})), 2500)
    },
    openNewFriend: () => set({ addFriend: { name: '', email: '' } }),
    closeNewFriend: () => set({ addFriend: null }),
    onAddFriendField: (field, v) => set((prev) => ({ addFriend: { ...(prev.addFriend || {}), [field]: v } })),
    createFriend: () =>
      set((prev) => {
        const name = ((prev.addFriend && prev.addFriend.name) || '').trim()
        if (!name) return {}
        const email = ((prev.addFriend && prev.addFriend.email) || '').trim()
        const pid = 'p' + Date.now()
        // color estable evitando el violeta del usuario (índice 0 de PALETTE)
        const color = PALETTE[1 + (friendIds(prev).length % (PALETTE.length - 1))]
        const person = { name, short: name.split(' ')[0], initial: (name.trim()[0] || '?').toUpperCase(), color }
        return { ...buildDirect(prev, pid, person, true, email), addFriend: null }
      }),
    back: () =>
      set((prev) => {
        // Desde una sub-vista (movimientos, históricos, etc.) volvés al chat; desde el chat, a la lista.
        if (prev.view !== 'chat') return { view: 'chat', menuOpen: false, configOpen: false, editId: null, draft: null }
        return { screen: prev.archived[prev.groupId] ? 'archived' : 'list', menuOpen: false, configOpen: false, view: 'chat', editId: null, draft: null }
      }),
    toggleMenu: () => set((prev) => ({ menuOpen: !prev.menuOpen })),
    closeMenu: () => set({ menuOpen: false }),
    goView: (view) => set({ view, menuOpen: false }),
    // Ir al chat y saltar/resaltar el mensaje de un gasto (para ver qué se escribió al cargarlo).
    viewInChat: (expId) => set({ view: 'chat', menuOpen: false, chatJump: expId }),
    clearChatJump: () => set({ chatJump: null }),
    openConfig: () => set((prev) => (prev.groupId === 'personal' ? { screen: 'profile', menuOpen: false } : { configOpen: true, menuOpen: false })),
    closeConfig: () => set({ configOpen: false }),

    // ---- saldar (registrar pagos entre personas) ----
    openSettle: () => set({ settleOpen: true }),
    closeSettle: () => set({ settleOpen: false }),
    settle: (list) =>
      set((prev) => {
        const g = prev.groupId
        const valid = list.filter((p) => p.amount > 0)
        if (!valid.length) return { settleOpen: false }
        const tm = nowTime()
        const base = Date.now()
        const entries = valid.map((p, i) => ({ id: 'tr' + (base + i), date: todayISO(), time: tm, kind: 'transfer', categoryId: 'transfer', from: p.from, to: p.to, amount: p.amount, currency: p.currency || 'ARS', createdBy: prev.profile.name }))
        const msgs = valid.map((p, i) => {
          const cur = p.currency || 'ARS'
          const txt = p.to === (prev.me || 'dani')
            ? memberById(prev, g, p.from).short + ' te pagó ' + fmt(p.amount, cur) + '.'
            : 'Le pagaste ' + fmt(p.amount, cur) + ' a ' + memberById(prev, g, p.to).short + '.'
          return { id: 'paym' + (base + i), role: 'app', kind: 'text', text: '✅ Registré el pago: ' + txt, time: tm }
        })
        return { ledgers: { ...prev.ledgers, [g]: [...(prev.ledgers[g] || []), ...entries] }, threads: { ...prev.threads, [g]: [...(prev.threads[g] || []), ...msgs] }, settleOpen: false }
      }),

    // ---- chat ----
    onChatInput: (v) => { set({ chatInput: v }); if (v) actions.notifyTyping() },
    // avisa "escribiendo…" a los demás del grupo (throttle 1.5s) vía broadcast
    notifyTyping: () => {
      const ch = typingChanRef.current
      if (!ch) return
      const now = Date.now()
      if (now - lastTypingSentRef.current < 1500) return
      lastTypingSentRef.current = now
      ch.send({ type: 'broadcast', event: 'typing', payload: { user: s.profile.name } })
    },
    sendChat: () => {
      if (s.archived[gid]) return
      // varias líneas = varios gastos (uno por línea)
      const lines = (s.chatInput || '').split('\n').map((l) => l.trim()).filter(Boolean)
      if (!lines.length) return
      const tm = nowTime()
      const base = Date.now()
      const day = todayISO()
      // Líneas que el parser de reglas NO entiende (sin monto) → candidatas a la IA (si está activa).
      // El id de la tarjeta es determinístico ('a' + id) para poder reemplazarla al volver la IA.
      const aiJobs = AI_ENABLED ? lines.map((line, i) => ({ id: 'a' + (base + i), line })).filter((_, i) => parseChat(s, gid, lines[i]).kind === 'unknown') : []
      // Categorización inteligente: gastos que quedaron "Sin categoría" con una descripción NUEVA
      // (no aprendida) → una llamada chica a la IA para categorizar (y aprender para la próxima).
      const catJobs = AI_ENABLED ? lines.map((line, i) => {
        const r = parseChat(s, gid, line)
        if (r.kind !== 'interpret' || r.exp.categoryId !== 'sincat' || !r.exp.desc) return null
        if ((s.catMemory || {})[normDesc(r.exp.desc)]) return null
        const n = r.exp.cuotas && r.exp.cuotas > 1 ? r.exp.cuotas : 1
        return { expId: n > 1 ? 'e' + (base + i) + '_1' : 'e' + (base + i), desc: r.exp.desc }
      }).filter(Boolean) : []
      set((prev) => {
        const g = prev.groupId
        let cats = prev.categories
        let ledger = prev.ledgers[g] || []
        let splits = prev.splits
        const msgs = []
        lines.forEach((line, i) => {
          const id = base + i
          msgs.push({ id: 'u' + id, role: 'user', kind: 'user', text: line, time: tm, date: day, by: prev.profile.name })
          // parseChat ve las categorías ya creadas en este mismo envío (evita duplicarlas)
          const res = parseChat({ ...prev, categories: cats }, g, line)
          let app
          if (res.kind === 'interpret') {
            // Auto-guardado: se anota el gasto directo (sin preguntar ni confirmar); la tarjeta queda con "Editar".
            const exp = res.exp
            const dup = ledger.find((e) => e.kind !== 'transfer' && e.amount === exp.amount && e.payerId === exp.payerId && e.categoryId === exp.categoryId && (e.desc || '') === (exp.desc || ''))
            if (dup) {
              app = { id: 'a' + id, role: 'app', kind: 'duplicate', exp }
            } else {
              let catId = exp.categoryId
              if (!catId) { catId = 'c' + id; cats = [...cats, { id: catId, icon: exp.catIcon || '🏷️', name: exp.catName || 'Gasto' }] }
              if (exp.split) {
                const sids = Object.keys(prev.splits[g] || {})
                if (sids.length >= 2) splits = { ...splits, [g]: { [sids[0]]: exp.split.a, [sids[1]]: exp.split.b } }
              }
              // 1 gasto, o N cuotas (una por mes) si se dijo "X cuotas". La tarjeta apunta a la 1ra.
              const entries = buildExpenseEntries({ ...exp, categoryId: catId }, id, day, tm, prev.profile.name)
              ledger = [...ledger, ...entries]
              app = { id: 'a' + id, role: 'app', kind: 'saved', expId: entries[0].id, exp: { ...exp, categoryId: catId } }
            }
          } else if (res.kind === 'payment') app = { id: 'a' + id, role: 'app', kind: 'payment', exp: res.exp }
          else if (res.kind === 'correction') app = { id: 'a' + id, role: 'app', kind: 'correction', cor: res.cor }
          else app = { id: 'a' + id, role: 'app', kind: 'text', text: 'No te entendí del todo 🤔. Probá algo como “8000 nafta pagó Juan”.' }
          app.time = tm
          app.date = day
          msgs.push(app)
        })
        return { categories: cats, splits, ledgers: { ...prev.ledgers, [g]: ledger }, threads: { ...prev.threads, [g]: [...(prev.threads[g] || []), ...msgs] }, chatInput: '' }
      })
      // Fallback con IA: para lo que el parser no entendió, lo interpretamos con OpenAI (async, no bloquea).
      aiJobs.forEach((jb) => actions.aiResolve(jb.id, jb.line))
      // Categorización inteligente de los gastos que quedaron "Sin categoría" (async, no bloquea).
      catJobs.forEach((jb) => actions.aiCategorizeExp(jb.expId, jb.desc))
    },
    // Categoriza un gasto "Sin categoría" con la IA (una vez por descripción) y lo aprende en la memoria.
    // Si ninguna categoría existente encaja, la IA sugiere una nueva y se pide confirmación en el chat.
    aiCategorizeExp: async (expId, desc) => {
      const g = s.groupId
      const cats = (s.categories || []).filter((c) => !['sincat', 'transfer', 'inicial'].includes(c.id)).map((c) => ({ id: c.id, name: c.name }))
      if (!cats.length) return
      const res = await aiCategorize(desc, cats)
      if (!res) return
      if (res.categoryId) {
        set((prev) => {
          if (!(prev.categories || []).some((c) => c.id === res.categoryId)) return {}
          const led = (prev.ledgers[g] || []).map((e) => (e.id === expId && (!e.categoryId || e.categoryId === 'sincat') ? { ...e, categoryId: res.categoryId } : e))
          const mem = { ...(prev.catMemory || {}), [normDesc(desc)]: res.categoryId } // aprende: la próxima vez, sin IA
          return { ledgers: { ...prev.ledgers, [g]: led }, catMemory: mem }
        })
      } else if (res.suggest && res.suggest.name) {
        // Tarjeta de confirmación (transitoria, per-device): crear la categoría sugerida o no.
        const cardId = 'cs' + Date.now()
        set((prev) => ({ threads: { ...prev.threads, [g]: [...(prev.threads[g] || []), { id: cardId, role: 'app', kind: 'catSuggest', expId, desc, suggest: res.suggest, date: todayISO(), time: nowTime() }] } }))
      }
    },
    // "Crear" la categoría sugerida por la IA: la crea, la asigna al gasto y la aprende.
    createSuggestedCat: (msgId) =>
      set((prev) => {
        const g = prev.groupId
        const msg = (prev.threads[g] || []).find((m) => m.id === msgId)
        if (!msg || !msg.suggest) return {}
        const name = msg.suggest.name.trim()
        // Si ya existe una categoría con ese nombre (case-insensitive), la reusamos.
        const existing = (prev.categories || []).find((c) => c.name.toLowerCase() === name.toLowerCase())
        const catId = existing ? existing.id : 'cat' + Date.now()
        const categories = existing ? prev.categories : [...prev.categories, { id: catId, icon: msg.suggest.emoji || '🏷️', name }]
        const led = (prev.ledgers[g] || []).map((e) => (e.id === msg.expId && (!e.categoryId || e.categoryId === 'sincat') ? { ...e, categoryId: catId } : e))
        const mem = { ...(prev.catMemory || {}), [normDesc(msg.desc)]: catId }
        const thread = (prev.threads[g] || []).map((m) => (m.id === msgId ? { id: msgId, role: 'app', kind: 'text', text: '✓ Categoría «' + name + '» creada y asignada.', date: m.date, time: m.time } : m))
        return { categories, ledgers: { ...prev.ledgers, [g]: led }, catMemory: mem, threads: { ...prev.threads, [g]: thread } }
      }),
    dismissSuggest: (msgId) => set((prev) => ({ threads: { ...prev.threads, [prev.groupId]: (prev.threads[prev.groupId] || []).filter((m) => m.id !== msgId) } })),
    // Reintenta interpretar una línea con la IA y, si sale, guarda el gasto reemplazando la tarjeta.
    aiResolve: async (msgId, line) => {
      const g = s.groupId
      const setCard = (patch) => set((prev) => ({ threads: { ...prev.threads, [g]: (prev.threads[g] || []).map((m) => (m.id === msgId ? { ...m, ...patch } : m)) } }))
      setCard({ kind: 'text', text: '✨ Pensando…' })
      const ctx = {
        me: s.me || 'dani',
        currency: (s.profile && s.profile.currency) || 'ARS',
        members: ((s.groups[g] || {}).members || []).map((m) => ({ id: m.id, short: m.short })),
        categories: (s.categories || []).filter((c) => c.id !== 'sincat').map((c) => ({ id: c.id, name: c.name })),
      }
      const raw = await aiParseExpense(line, ctx)
      if (!raw || !raw.amount) {
        setCard({ kind: 'text', text: 'No te entendí del todo 🤔. Probá con monto y detalle, ej: “8000 nafta pagó Juan”.' })
        return
      }
      set((prev) => {
        const validCat = (prev.categories || []).some((c) => c.id === raw.categoryId)
        const members = (prev.groups[g] || {}).members || []
        const me = prev.me || 'dani'
        const validPayer = members.some((m) => m.id === raw.payerId)
        // El MODO (se divide / saldado) NO lo decide la IA (se confunde): lo determinamos con reglas
        // fijas del texto, igual que el parser. Solo es "saldado" si se dice ambos/saldado/a mano.
        const low = ' ' + line.toLowerCase() + ' '
        const mode = (!(prev.groups[g] && prev.groups[g].personal) && /\b(ambos|los dos|entre los dos|saldad[oa]s?|a mano|pagamos)\b/.test(low)) ? 'settled' : 'group'
        const exp = {
          amount: Math.round(Number(raw.amount)) || 0,
          categoryId: validCat ? raw.categoryId : 'sincat',
          desc: raw.desc || undefined,
          note: raw.note ? String(raw.note).slice(0, 300) : undefined,
          payerId: prev.groups[g] && prev.groups[g].personal ? me : validPayer ? raw.payerId : me,
          currency: CURRENCIES.includes(raw.currency) ? raw.currency : (prev.profile && prev.profile.currency) || 'ARS',
          cuotas: raw.cuotas && raw.cuotas > 1 ? Math.round(raw.cuotas) : null,
          mode,
        }
        if (!exp.amount) return { threads: { ...prev.threads, [g]: (prev.threads[g] || []).map((m) => (m.id === msgId ? { ...m, kind: 'text', text: 'No te entendí del todo 🤔.' } : m)) } }
        const entries = buildExpenseEntries(exp, Date.now(), todayISO(), nowTime(), prev.profile.name)
        // Aprende la categoría que eligió la IA (para no volver a llamarla con la misma descripción).
        const mem = validCat && exp.desc ? { ...(prev.catMemory || {}), [normDesc(exp.desc)]: exp.categoryId } : prev.catMemory
        return {
          catMemory: mem,
          ledgers: { ...prev.ledgers, [g]: [...(prev.ledgers[g] || []), ...entries] },
          threads: { ...prev.threads, [g]: (prev.threads[g] || []).map((m) => (m.id === msgId ? { ...m, role: 'app', kind: 'saved', expId: entries[0].id, exp: { ...exp, categoryId: entries[0].categoryId } } : m)) },
        }
      })
    },

    confirmExp: (id) =>
      set((prev) => {
        const g = prev.groupId
        const thread = prev.threads[g] || []
        const msg = thread.find((m) => m.id === id)
        if (!msg) return {}
        const exp = msg.exp
        const ledger = prev.ledgers[g] || []
        const dup = ledger.find((e) => e.amount === exp.amount && e.payerId === exp.payerId && e.categoryId === exp.categoryId && (e.desc || '') === (exp.desc || ''))
        if (dup && !msg._forced) return { threads: { ...prev.threads, [g]: thread.map((m) => (m.id === id ? { ...m, kind: 'duplicate' } : m)) } }
        let cats = prev.categories
        let catId = exp.categoryId
        if (!catId) {
          catId = 'c' + Date.now()
          cats = [...cats, { id: catId, icon: exp.catIcon || '🏷️', name: exp.catName || 'Gasto' }]
        }
        const entries = buildExpenseEntries({ ...exp, categoryId: catId }, Date.now(), todayISO(), nowTime(), prev.profile.name)
        let splits = prev.splits
        if (exp.split) {
          const ids = Object.keys(prev.splits[g] || {})
          if (ids.length >= 2) splits = { ...splits, [g]: { [ids[0]]: exp.split.a, [ids[1]]: exp.split.b } }
        }
        return {
          categories: cats,
          ledgers: { ...prev.ledgers, [g]: [...ledger, ...entries] },
          splits,
          threads: { ...prev.threads, [g]: thread.map((m) => (m.id === id ? { ...m, kind: 'saved', expId: entries[0].id, exp: { ...exp, categoryId: catId } } : m)) },
        }
      }),
    forceExp: (id) => {
      set((prev) => ({ threads: { ...prev.threads, [prev.groupId]: (prev.threads[prev.groupId] || []).map((m) => (m.id === id ? { ...m, kind: 'interpret', _forced: true } : m)) } }))
      actions.confirmExp(id)
    },
    cancelMsg: (id) => set((prev) => ({ threads: { ...prev.threads, [prev.groupId]: (prev.threads[prev.groupId] || []).filter((m) => m.id !== id) } })),
    pickPayer: (id, pid) => set((prev) => ({ threads: { ...prev.threads, [prev.groupId]: (prev.threads[prev.groupId] || []).map((m) => (m.id === id ? { ...m, kind: 'interpret', exp: { ...m.exp, payerId: pid } } : m)) } })),
    editExp: (id) => {
      const msg = (s.threads[gid] || []).find((m) => m.id === id)
      const e = (s.ledgers[gid] || []).find((x) => x.id === (msg && msg.expId))
      if (e) openEdit(e)
    },
    // "Editar" en la tarjeta interpretada: guarda el gasto y abre la hoja de edición pre-cargada.
    editInterp: (id) =>
      set((prev) => {
        const g = prev.groupId
        const thread = prev.threads[g] || []
        const msg = thread.find((m) => m.id === id)
        if (!msg || !msg.exp) return {}
        const exp = msg.exp
        let cats = prev.categories
        let catId = exp.categoryId
        if (!catId) {
          catId = 'c' + Date.now()
          cats = [...cats, { id: catId, icon: exp.catIcon || '🏷️', name: exp.catName || 'Gasto' }]
        }
        const entries = buildExpenseEntries({ ...exp, categoryId: catId }, Date.now(), todayISO(), nowTime(), prev.profile.name)
        const entry = entries[0]
        let splits = prev.splits
        if (exp.split) {
          const ids = Object.keys(prev.splits[g] || {})
          if (ids.length >= 2) splits = { ...splits, [g]: { [ids[0]]: exp.split.a, [ids[1]]: exp.split.b } }
        }
        return {
          categories: cats,
          ledgers: { ...prev.ledgers, [g]: [...(prev.ledgers[g] || []), ...entries] },
          splits,
          threads: { ...prev.threads, [g]: thread.map((m) => (m.id === id ? { ...m, kind: 'saved', expId: entry.id, exp: { ...exp, categoryId: catId } } : m)) },
          editId: entry.id,
          draft: { categoryId: catId, amount: entry.amount, payerId: entry.payerId, desc: entry.desc || '', note: entry.note || '', date: entry.date, methodId: null, mode: entry.mode, currency: entry.currency, createdBy: entry.createdBy },
          editPanel: null, catQuery: '', payerQuery: '', methodQuery: '',
        }
      }),
    editDup: (id) => {
      const msg = (s.threads[gid] || []).find((m) => m.id === id)
      const ex = msg && msg.exp
      const e = (s.ledgers[gid] || []).find((x) => x.amount === ex.amount && x.payerId === ex.payerId && x.categoryId === ex.categoryId && (x.desc || '') === (ex.desc || ''))
      actions.cancelMsg(id)
      if (e) openEdit(e)
    },
    confirmPayment: (id) =>
      set((prev) => {
        const g = prev.groupId
        const msg = (prev.threads[g] || []).find((m) => m.id === id)
        const ex = msg.exp
        const entry = { id: 'tr' + Date.now(), date: todayISO(), time: nowTime(), kind: 'transfer', categoryId: 'transfer', from: ex.from, to: ex.to, amount: ex.amount, currency: ex.currency || 'ARS' }
        return { ledgers: { ...prev.ledgers, [g]: [...(prev.ledgers[g] || []), entry] }, threads: { ...prev.threads, [g]: (prev.threads[g] || []).map((m) => (m.id === id ? { ...m, kind: 'savedPayment' } : m)) } }
      }),
    corYes: (id) =>
      set((prev) => {
        const g = prev.groupId
        const thread = prev.threads[g] || []
        const msg = thread.find((m) => m.id === id)
        const cor = msg.cor
        let ledger = [...(prev.ledgers[g] || [])]
        let splits = prev.splits
        let cats = prev.categories
        const li = ledger.length - 1
        let txt = '¡Listo! Actualizado.'
        if (cor.type === 'del') {
          if (li >= 0) ledger = ledger.slice(0, li)
          txt = 'Listo, borré el último gasto.'
        } else if (li >= 0) {
          if (cor.field === 'amount') ledger[li] = { ...ledger[li], amount: cor.amount }
          else if (cor.field === 'payer') ledger[li] = { ...ledger[li], payerId: cor.payerId }
          else if (cor.field === 'category') {
            let cid = cor.categoryId
            if (!cid) {
              cid = 'c' + Date.now()
              cats = [...cats, { id: cid, icon: cor.catIcon || '🏷️', name: cor.catName || 'Gasto' }]
            }
            ledger[li] = { ...ledger[li], categoryId: cid }
          } else if (cor.field === 'split') {
            const ids = Object.keys(prev.splits[g] || {})
            if (ids.length >= 2) splits = { ...splits, [g]: { [ids[0]]: cor.a, [ids[1]]: cor.b } }
          }
        }
        return { ledgers: { ...prev.ledgers, [g]: ledger }, splits, categories: cats, threads: { ...prev.threads, [g]: thread.map((m) => (m.id === id ? { id: m.id, role: 'app', kind: 'text', text: txt } : m)) } }
      }),
    corNo: (id) => set((prev) => ({ threads: { ...prev.threads, [prev.groupId]: (prev.threads[prev.groupId] || []).map((m) => (m.id === id ? { id: m.id, role: 'app', kind: 'text', text: 'Ok, lo dejo como estaba.' } : m)) } })),

    // ---- hoja de edición ----
    openEdit,
    closeEdit: () => set({ editId: null, draft: null, editPanel: null }),
    openPanel: (p) => set({ editPanel: p, catQuery: '', newCatIcon: null, payerQuery: '', methodQuery: '' }),
    backToFields: () => set({ editPanel: null }),
    onAmount: (v) => {
      const n = parseInt((v || '').replace(/\D/g, '') || '0', 10)
      set((prev) => applyEdit(prev, { amount: n }))
    },
    onDesc: (v) => set((prev) => applyEdit(prev, { desc: v })),
    onNote: (v) => set((prev) => applyEdit(prev, { note: v })),
    onDate: (v) => set((prev) => applyEdit(prev, { date: v || todayISO() })),
    onCatQuery: (v) => set({ catQuery: v }),
    setNewCatIcon: (icon) => set({ newCatIcon: icon }),
    pickCat: (id) => set((prev) => {
      // Al categorizar a mano, lo aprendemos (descripción → categoría) para futuros gastos iguales.
      const desc = prev.draft && prev.draft.desc
      const mem = desc && id !== 'sincat' ? { ...(prev.catMemory || {}), [normDesc(desc)]: id } : prev.catMemory
      return { ...applyEdit(prev, { categoryId: id }), catMemory: mem, editPanel: null, catQuery: '', newCatIcon: null }
    }),
    onCreateCat: () =>
      set((prev) => {
        const name = prev.catQuery.trim()
        if (!name) return {}
        const id = 'c' + Date.now()
        const icon = prev.newCatIcon || guessIcon(name)
        return { categories: [...prev.categories, { id, icon, name }], ...applyEdit(prev, { categoryId: id }), editPanel: null, catQuery: '', newCatIcon: null }
      }),
    onPayerQuery: (v) => set({ payerQuery: v }),
    pickPayerEdit: (id) => set((prev) => ({ ...applyEdit(prev, { payerId: id }), editPanel: null, payerQuery: '' })),
    onMethodQuery: (v) => set({ methodQuery: v }),
    pickMethod: (id) => set((prev) => ({ ...applyEdit(prev, { methodId: id }), editPanel: null, methodQuery: '' })),
    pickMode: (k) => set((prev) => ({ ...applyEdit(prev, { mode: k }), editPanel: null })),
    toggleParticipant: (mid) =>
      set((prev) => {
        const cur = prev.draft.excluded || []
        const next = cur.includes(mid) ? cur.filter((x) => x !== mid) : [...cur, mid]
        // debe quedar al menos un participante: no permitir excluir al último
        if (next.length >= prev.groups[prev.groupId].members.length) return {}
        return applyEdit(prev, { excluded: next })
      }),
    pickCurrency: (cur) => set((prev) => applyEdit(prev, { currency: cur })),
    onDelete: () =>
      set((prev) => {
        const g = prev.groupId
        const e = (prev.ledgers[g] || []).find((it) => it.id === prev.editId)
        // Resumen de lo que se borra, para dejar el registro en el chat (tarjeta "Gasto eliminado").
        let summary = ''
        if (e) {
          const me = prev.me || 'dani'
          const gp = prev.groups[g] || {}
          const payerText = gp.personal ? '' : e.mode === 'settled' ? 'saldado' : e.payerId === me ? 'Pagaste vos' : 'Pagó ' + memberById(prev, g, e.payerId).short
          summary = (e.desc || 'Sin nombre') + ' · ' + fmt(e.amount, e.currency) + (payerText ? ' · ' + payerText : '')
        }
        const l = (prev.ledgers[g] || []).filter((it) => it.id !== prev.editId)
        // La(s) tarjeta(s) del chat que apuntaban a este gasto pasan a "Gasto eliminado" con el resumen.
        const thread = (prev.threads[g] || []).map((m) => (m.expId === prev.editId && (m.kind === 'saved' || m.kind === 'deleted') ? { ...m, kind: 'deleted', text: summary } : m))
        return { ledgers: { ...prev.ledgers, [g]: l }, threads: { ...prev.threads, [g]: thread }, editId: null, draft: null, editPanel: null }
      }),

    // ---- gastos futuros / históricos ----
    toggleMonth: (idx) => set((prev) => ({ expandedMonths: { ...prev.expandedMonths, [idx]: !prev.expandedMonths[idx] } })),
    setHistSel: (g, key) => set((prev) => ({ histSel: { ...prev.histSel, [g]: key } })),
    setCatFilter: (id) => set({ catFilter: id }),
    setCurFilter: (v) => set({ curFilter: v }),
    setPayerFilter: (v) => set({ payerFilter: v }),
    setMoveQuery: (v) => set({ moveQuery: v }),
    setPersonalSrc: (v) => set({ personalSrc: v }),
    toggleHideAmounts: () =>
      set((prev) => {
        const v = !prev.hideAmounts
        try { localStorage.setItem(HIDE_KEY, v ? '1' : '0') } catch { /* sin storage: solo en memoria */ }
        return { hideAmounts: v }
      }),
    openMethodDetail: (mid) => set({ screen: 'methodDetail', methodId: mid }),
    openMonthDetail: (key) => set({ screen: 'monthDetail', monthKey: key, monthFilter: null }),
    setMonthFilter: (id) => set({ monthFilter: id }),
    backToPersonalHist: () => set({ screen: 'chat' }),
    backToHist: () => set({ screen: 'chat' }),

    // ---- config de grupo ----
    onGroupName: (v) => set((prev) => ({ groups: { ...prev.groups, [gid]: { ...prev.groups[gid], name: v, initial: (v.trim()[0] || 'G').toUpperCase() } } })),
    onGroupDesc: (v) => set((prev) => ({ groups: { ...prev.groups, [gid]: { ...prev.groups[gid], description: v } } })),
    onGroupDate: (v) => set((prev) => ({ groups: { ...prev.groups, [gid]: { ...prev.groups[gid], eventDate: v || undefined } } })),
    onChangePhoto: () =>
      set((prev) => {
        const i = (GRADIENTS.indexOf(prev.groups[gid].gradient) + 1) % GRADIENTS.length
        return { groups: { ...prev.groups, [gid]: { ...prev.groups[gid], gradient: GRADIENTS[i] } } }
      }),
    onAddMember: () => set({ addingMember: true, newMemberName: '' }),
    onNewMemberName: (v) => set({ newMemberName: v }),
    onConfirmAddMember: () =>
      set((prev) => {
        const name = prev.newMemberName.trim()
        if (!name) return {}
        const g = prev.groups[gid]
        const id = 'mem' + Date.now()
        const color = PALETTE[g.members.length % PALETTE.length]
        const member = { id, name, short: name.split(' ')[0], color, initial: name.trim()[0].toUpperCase() }
        const splits = setEqualSplit({ ...prev.splits[gid], [id]: 0 })
        return { groups: { ...prev.groups, [gid]: { ...g, members: [...g.members, member] } }, splits: { ...prev.splits, [gid]: splits }, addingMember: false, newMemberName: '' }
      }),
    onEqual: () => commitSplit(setEqualSplit(s.splits[gid])),
    adjustSplit: (id, delta) => commitSplit(adjustSplit(s.splits[gid], id, delta)),
    setSplitPct: (id, raw) => commitSplit(sharesFrom(id, parseInt((raw || '').replace(/\D/g, '') || '0', 10))),
    onArchive: () => set((prev) => ({ archived: { ...prev.archived, [gid]: true }, configOpen: false, screen: 'list', groupId: null, menuOpen: false })),

    // ---- perfil ----
    onProfName: (v) => set((prev) => ({ profile: { ...prev.profile, name: v } })),
    setCurrency: (cur) => set((prev) => ({ profile: { ...prev.profile, currency: cur }, currencyOpen: false })),
    toggleCurrencyMenu: () => set((prev) => ({ currencyOpen: !prev.currencyOpen })),
    onChangeProfilePhoto: () =>
      set((prev) => {
        const i = (GRADIENTS.indexOf(prev.profile.gradient) + 1) % GRADIENTS.length
        return { profile: { ...prev.profile, gradient: GRADIENTS[i] } }
      }),
    openProfMethod: (id) => set((prev) => ({ profMethodEdit: id, profMethodName: (prev.methods.find((m) => m.id === id) || {}).name || '' })),
    closeProfMethod: () => set({ profMethodEdit: null }),
    onProfMethodName: (v) => set({ profMethodName: v }),
    saveProfMethod: () =>
      set((prev) => {
        const nm = (prev.profMethodName || '').trim()
        const id = prev.profMethodEdit
        if (!nm || !id) return { profMethodEdit: null }
        return { methods: prev.methods.map((m) => (m.id === id ? { ...m, name: nm } : m)), profMethodEdit: null }
      }),
    toggleArchiveProfMethod: () => set((prev) => ({ methods: prev.methods.map((m) => (m.id === prev.profMethodEdit ? { ...m, archived: !m.archived } : m)) })),
    deleteProfMethod: () =>
      set((prev) => {
        const id = prev.profMethodEdit
        const cnt = (prev.ledgers.personal || []).filter((e) => (e.methodId || null) === id).length
        if (cnt > 0) return {}
        return { methods: prev.methods.filter((m) => m.id !== id), profMethodEdit: null }
      }),
    deleteMethodExpenses: () => set((prev) => ({ ledgers: { ...prev.ledgers, personal: (prev.ledgers.personal || []).filter((e) => (e.methodId || null) !== prev.profMethodEdit) } })),
    onAddProfMethod: () => set({ addingProfMethod: true, newProfMethodName: '' }),
    onNewProfMethodName: (v) => set({ newProfMethodName: v }),
    onConfirmProfMethod: () =>
      set((prev) => {
        const nm = (prev.newProfMethodName || '').trim()
        if (!nm) return {}
        return { methods: [...prev.methods, { id: 'pm' + Date.now(), name: nm, icon: '💳' }], addingProfMethod: false, newProfMethodName: '' }
      }),

    // ---- sin categorizar (recategorización global en lote + memoria) ----
    openUncat: () => set({ screen: 'uncat', uncatSel: [], uncatPick: false, menuOpen: false, configOpen: false }),
    toggleUncatSel: (key) => set((prev) => { const sel = prev.uncatSel || []; return { uncatSel: sel.includes(key) ? sel.filter((k) => k !== key) : [...sel, key] } }),
    setUncatSel: (keys) => set({ uncatSel: keys }),
    clearUncatSel: () => set({ uncatSel: [] }),
    openUncatPick: () => set({ uncatPick: true }),
    closeUncatPick: () => set({ uncatPick: false }),
    // Asigna una categoría a los gastos seleccionados (en cualquier grupo/personal) y RECUERDA
    // el mapeo descripción→categoría para autocategorizar gastos futuros con la misma descripción.
    assignUncatCategory: (catId) =>
      set((prev) => {
        const sel = new Set(prev.uncatSel || [])
        if (!sel.size || !catId) return { uncatPick: false }
        const ledgers = { ...prev.ledgers }
        const mem = { ...(prev.catMemory || {}) }
        const touched = {}
        for (const key of sel) {
          const i = key.indexOf('|')
          const g = key.slice(0, i), id = key.slice(i + 1)
          const led = ledgers[g] || []
          const idx = led.findIndex((e) => e.id === id)
          if (idx < 0) continue
          if (!touched[g]) { ledgers[g] = [...led]; touched[g] = true }
          const e = led[idx]
          ledgers[g][idx] = { ...e, categoryId: catId, editedBy: prev.profile.name, editedAt: todayISO() }
          const k = normDesc(e.desc)
          if (k) mem[k] = catId
        }
        return { ledgers, catMemory: mem, uncatSel: [], uncatPick: false }
      }),

    // ---- archivados ----
    onGroupQuery: (v) => set({ groupQuery: v }),
    restoreGroup: (id) => set((prev) => { const a = { ...prev.archived }; delete a[id]; return { archived: a } }),

    // ---- eliminar grupo / 1:1 vacío (sin movimientos) ----
    // Pide confirmación; al confirmar borra el grupo de la nube (cascade) y lo saca del estado.
    // Los grupos CON movimientos no se eliminan (se archivan): el botón ni siquiera aparece.
    requestDeleteGroup: () => set({ confirmDeleteGroup: gid }),
    cancelDeleteGroup: () => set({ confirmDeleteGroup: null }),
    confirmDeleteGroupYes: () => {
      const delId = s.confirmDeleteGroup
      if (!delId || delId === 'personal') return set({ confirmDeleteGroup: null })
      if ((s.ledgers[delId] || []).length > 0) return set({ confirmDeleteGroup: null }) // seguridad: nunca borrar con movimientos
      if (dataReady) cloudDeleteGroup(delId)
      set((prev) => {
        const omit = (obj) => { const o = { ...obj }; delete o[delId]; return o }
        return {
          groups: omit(prev.groups), splits: omit(prev.splits), splitLog: omit(prev.splitLog), splitMeta: omit(prev.splitMeta),
          ledgers: omit(prev.ledgers), threads: omit(prev.threads), payments: omit(prev.payments), archived: omit(prev.archived),
          pinned: (prev.pinned || []).filter((p) => !(p.kind === 'group' && p.id === delId)),
          confirmDeleteGroup: null, configOpen: false, screen: 'list', groupId: null, menuOpen: false,
        }
      })
    },

    // ---- modo demo ----
    // Salir: limpia la bandera y los datos demo, y recarga (vuelve al login con datos reales).
    exitDemo: () => { try { localStorage.removeItem(DEMO_FLAG); localStorage.removeItem(DEMO_KEY) } catch { /* sin storage */ } window.location.reload() },
    // Restaurar: borra el estado demo modificado y recarga (vuelve a sembrar el seed ficticio limpio).
    restoreDemo: () => { try { localStorage.removeItem(DEMO_KEY) } catch { /* sin storage */ } window.location.reload() },
    // Crear cuenta desde la demo: genera credenciales ficticias, sale de la demo y abre el signup precargado.
    demoSignup: () => {
      const rnd = Math.random().toString(36).slice(2, 7)
      const prefill = { email: 'explorador' + rnd + '@cuentasclaras.app', pass: 'demo' + Math.random().toString(36).slice(2, 7) }
      try {
        localStorage.setItem('cc-signup-prefill', JSON.stringify(prefill))
        localStorage.removeItem(DEMO_FLAG); localStorage.removeItem(DEMO_KEY)
      } catch { /* sin storage */ }
      window.location.assign(window.location.pathname) // recarga al login sin ?demo en la URL
    },

    // ---- nuevo grupo ----
    onNewGroupField: (field, v) => set((prev) => ({ newGroup: { ...prev.newGroup, [field]: v } })),
    // Agrega un participante tipeado a mano (sin cuenta → invitado pendiente).
    addNewGroupMember: () =>
      set((prev) => {
        const nm = (prev.newGroup.memberName || '').trim()
        if (!nm) return {}
        return { newGroup: { ...prev.newGroup, members: [...prev.newGroup.members, { name: nm, pending: true }], memberName: '' } }
      }),
    // Agrega un amigo que YA tenés cargado (reusa su identidad para que el saldo se agregue bien).
    addExistingFriendToGroup: (pid) =>
      set((prev) => {
        if (prev.newGroup.members.some((m) => m.id === pid)) return { newGroup: { ...prev.newGroup, memberName: '' } }
        const p = personById(prev, pid)
        return { newGroup: { ...prev.newGroup, members: [...prev.newGroup.members, { id: pid, name: p.name, short: p.short, pending: !!p.pending, email: p.email }], memberName: '' } }
      }),
    removeNewGroupMember: (i) => set((prev) => ({ newGroup: { ...prev.newGroup, members: prev.newGroup.members.filter((_, j) => j !== i) } })),
    inviteLink: () => set((prev) => ({ newGroup: { ...prev.newGroup, invited: true } })),
    createGroup: () =>
      set((prev) => {
        const nm = (prev.newGroup.name || '').trim()
        if (!nm) return {}
        const id = 'g' + Date.now()
        const grad = GRADIENTS[Object.keys(prev.groups).length % GRADIENTS.length]
        const members = [meMemberOf(prev)]
        prev.newGroup.members.forEach((mm, i) => {
          if (mm.id) {
            // amigo existente: reusa su id/color/estado (no duplicar persona)
            const p = personById(prev, mm.id)
            const mem = { id: mm.id, name: p.name, short: p.short, color: p.color, initial: p.initial }
            if (p.pending) mem.pending = true
            if (p.email) mem.email = p.email
            members.push(mem)
          } else {
            const mem = { id: 'mem' + id + i, name: mm.name, short: mm.name.split(' ')[0], color: PALETTE[(i + 1) % PALETTE.length], initial: mm.name.trim()[0].toUpperCase() }
            if (mm.pending) mem.pending = true
            if (mm.email) mem.email = mm.email
            members.push(mem)
          }
        })
        const split = {}
        const base = Math.floor(100 / members.length)
        let acc = 0
        members.forEach((mm, i) => { split[mm.id] = i === members.length - 1 ? 100 - acc : base; acc += base })
        const group = { id, name: nm, initial: nm[0].toUpperCase(), gradient: grad, description: (prev.newGroup.desc || '').trim(), createdAt: fmtDateFull(todayISO()), isGroup: true, members }
        const evDate = (prev.newGroup.date || '').trim()
        if (evDate) group.eventDate = evDate
        return {
          groups: { ...prev.groups, [id]: group },
          splits: { ...prev.splits, [id]: split },
          splitLog: { ...prev.splitLog, [id]: [] },
          splitMeta: { ...prev.splitMeta, [id]: { from: '2000-01-01', at: null, by: null } },
          ledgers: { ...prev.ledgers, [id]: [] },
          threads: { ...prev.threads, [id]: [] },
          payments: { ...prev.payments, [id]: [] },
          screen: 'chat', groupId: id, view: 'chat',
          newGroup: { name: '', desc: '', date: '', members: [], memberName: '', invited: false },
        }
      }),
  }

  // Pantalla activa (todo lo que no es la lista) + overlay de edición.
  const screenEl = (
    <>
      {s.screen === 'chat' && <Chat s={s} actions={actions} typingName={typingName} />}
      {s.screen === 'friend' && <Friend s={s} actions={actions} />}
      {s.screen === 'profile' && <Profile s={s} actions={actions} />}
      {s.screen === 'categories' && <Categories s={s} actions={actions} />}
      {s.screen === 'archived' && <Archived s={s} actions={actions} />}
      {s.screen === 'uncat' && <Uncategorized s={s} actions={actions} />}
      {s.screen === 'newgroup' && <NewGroup s={s} actions={actions} />}
      {s.screen === 'methodDetail' && <MethodDetail s={s} actions={actions} />}
      {s.screen === 'monthDetail' && <MonthDetail s={s} actions={actions} />}
      {s.editId != null && <EditSheet s={s} actions={actions} />}
    </>
  )

  // ---- gate de autenticación + carga de datos ----
  const Splash = () => (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e6e9f2' }}>
      <div style={{ opacity: 0.4 }}><Logo size={56} /></div>
    </div>
  )
  // Bypass SOLO para desarrollo local: salta el login y usa los datos de demo (makeInitialState).
  // Nunca se activa en producción (import.meta.env.DEV es false en el build).
  // Activar: abrir con ?dev=1 en la URL (queda guardado), o localStorage.setItem('cc-dev','1').
  // Desactivar: localStorage.removeItem('cc-dev') (o abrir con ?dev=0) y recargar.
  const devParam = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('dev') : null
  const devBypass = import.meta.env.DEV && typeof localStorage !== 'undefined' && (localStorage.getItem('cc-dev') === '1' || devParam === '1') && devParam !== '0'
  // MODO DEMO (producción): salta el login y usa datos ficticios locales (nunca toca Supabase).
  const demoActive = isDemo()

  if (!devBypass && !demoActive) {
    if (session === undefined) return <Splash />
    if (!session) return <Login />
    if (dataErr) {
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, background: '#e6e9f2', padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 34 }}>😕</div>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#0B1220' }}>No pudimos cargar tus datos</div>
          <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600, maxWidth: 300 }}>{dataErr}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={() => window.location.reload()} style={{ border: 'none', background: '#7C3AED', color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 13.5, padding: '10px 18px', borderRadius: 12, cursor: 'pointer' }}>Reintentar</button>
            <button onClick={() => supabase.auth.signOut()} style={{ border: '1.5px solid #E2E8F0', background: '#fff', color: '#475569', fontFamily: 'inherit', fontWeight: 800, fontSize: 13.5, padding: '10px 18px', borderRadius: 12, cursor: 'pointer' }}>Cerrar sesión</button>
          </div>
        </div>
      )
    }
    if (!dataReady) return <Splash />
  }

  if (desktop) {
    return (
      <div style={{ height: '100dvh', display: 'flex', background: '#e6e9f2' }}>
        <aside style={{ position: 'relative', width: 400, flexShrink: 0, overflow: 'hidden', background: '#FBFCFE', borderRight: '1px solid #E2E8F0' }}>
          <Inicio s={s} actions={actions} />
        </aside>
        <main style={{ position: 'relative', flex: 1, minWidth: 0, overflow: 'hidden', background: s.screen === 'list' ? '#F4F6FA' : '#FBFCFE' }}>
          {s.screen === 'list' ? <EmptyState /> : screenEl}
        </main>
        {s.addFriend && <AddFriend s={s} actions={actions} />}
        {s.confirmUnpin && <UnpinConfirm s={s} actions={actions} />}
        {s.confirmDeleteGroup && <DeleteGroupConfirm s={s} actions={actions} />}
        {demoActive && <DemoBanner actions={actions} />}
        {showWelcome && <Welcome onDone={dismissWelcome} />}
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', top: 'var(--app-top, 0px)', left: 0, right: 0, height: 'var(--app-h, 100dvh)', display: 'flex', justifyContent: 'center', background: '#e6e9f2', overflow: 'hidden' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 460, height: '100%', background: '#FBFCFE', overflow: 'hidden' }}>
        {s.screen === 'list' ? <Inicio s={s} actions={actions} /> : screenEl}
        {s.addFriend && <AddFriend s={s} actions={actions} />}
        {s.confirmUnpin && <UnpinConfirm s={s} actions={actions} />}
        {s.confirmDeleteGroup && <DeleteGroupConfirm s={s} actions={actions} />}
        {demoActive && <DemoBanner actions={actions} />}
        {showWelcome && <Welcome onDone={dismissWelcome} />}
      </div>
    </div>
  )
}

/** Confirmación antes de desfijar (persona o grupo) del inicio. */
function UnpinConfirm({ s, actions }) {
  const ref = s.confirmUnpin
  const name = ref.kind === 'group' ? (s.groups[ref.id] ? s.groups[ref.id].name : '') : personById(s, ref.id).short
  return (
    <div onClick={actions.cancelUnpin} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15,23,42,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'ccFade .15s ease' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 320, background: '#fff', borderRadius: 20, padding: '22px 20px', textAlign: 'center', boxShadow: '0 30px 60px -20px rgba(15,23,42,.5)' }}>
        <div style={{ fontSize: 30, marginBottom: 8 }}>📌</div>
        <div style={{ fontWeight: 800, fontSize: 16.5, color: '#0B1220' }}>¿Desfijar “{name}”?</div>
        <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600, marginTop: 4, lineHeight: 1.4 }}>Dejará de aparecer en el acceso rápido del inicio. Podés volver a fijarlo cuando quieras.</div>
        <div style={{ display: 'flex', gap: 9, marginTop: 18 }}>
          <button onClick={actions.cancelUnpin} style={{ flex: 1, border: '1.5px solid #E2E8F0', background: '#fff', color: '#475569', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, padding: 12, borderRadius: 13, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={actions.confirmUnpinYes} style={{ flex: 1, border: 'none', background: '#7C3AED', color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, padding: 12, borderRadius: 13, cursor: 'pointer' }}>Desfijar</button>
        </div>
      </div>
    </div>
  )
}

/** Confirmación antes de eliminar un grupo / 1:1 vacío (sin movimientos). Acción destructiva. */
function DeleteGroupConfirm({ s, actions }) {
  const gid = s.confirmDeleteGroup
  const g = s.groups[gid]
  if (!g) return null
  const o2o = g.direct || (!g.isGroup && g.members.length === 2)
  const peer = o2o ? (g.members.find((m) => m.id !== (s.me || 'dani')) || {}) : null
  const name = o2o ? (peer.short || 'este 1:1') : g.name
  return (
    <div onClick={actions.cancelDeleteGroup} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(15,23,42,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'ccFade .15s ease' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 320, background: '#fff', borderRadius: 20, padding: '22px 20px', textAlign: 'center', boxShadow: '0 30px 60px -20px rgba(15,23,42,.5)' }}>
        <div style={{ fontSize: 30, marginBottom: 8 }}>🗑️</div>
        <div style={{ fontWeight: 800, fontSize: 16.5, color: '#0B1220' }}>¿Eliminar “{name}”?</div>
        <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600, marginTop: 4, lineHeight: 1.4 }}>No tiene movimientos, así que se borra para siempre. Esta acción no se puede deshacer.</div>
        <div style={{ display: 'flex', gap: 9, marginTop: 18 }}>
          <button onClick={actions.cancelDeleteGroup} style={{ flex: 1, border: '1.5px solid #E2E8F0', background: '#fff', color: '#475569', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, padding: 12, borderRadius: 13, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={actions.confirmDeleteGroupYes} style={{ flex: 1, border: 'none', background: '#E11D5B', color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, padding: 12, borderRadius: 13, cursor: 'pointer' }}>Eliminar</button>
        </div>
      </div>
    </div>
  )
}

/** Banner flotante del modo demo: avisa que son datos ficticios y ofrece crear cuenta / restaurar / salir. */
function DemoBanner({ actions }) {
  const btn = { border: 'none', fontFamily: 'inherit', fontWeight: 800, fontSize: 11.5, padding: '7px 11px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap' }
  return (
    <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)', zIndex: 60, display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(11,18,32,.92)', color: '#fff', padding: '7px 7px 7px 13px', borderRadius: 999, boxShadow: '0 14px 34px -12px rgba(15,23,42,.6)', backdropFilter: 'blur(6px)', maxWidth: 'calc(100vw - 20px)' }}>
      <span style={{ fontSize: 13 }}>🧪</span>
      <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>Demo · datos ficticios</span>
      <button onClick={actions.restoreDemo} title="Restaurar los datos demo originales" aria-label="Restaurar" style={{ ...btn, background: 'rgba(255,255,255,.14)', color: '#fff', padding: '7px 9px' }}>↺</button>
      <button onClick={actions.exitDemo} style={{ ...btn, background: 'rgba(255,255,255,.14)', color: '#fff' }}>Salir</button>
      <button onClick={actions.demoSignup} style={{ ...btn, background: '#fff', color: '#0B1220' }}>Crear cuenta</button>
    </div>
  )
}

/** Panel derecho vacío en desktop cuando no hay nada seleccionado. */
function EmptyState() {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40, background: '#F4F6FA' }}>
      <div style={{ opacity: 0.5, marginBottom: 18 }}><Logo size={56} /></div>
      <div style={{ fontWeight: 800, fontSize: 18, color: '#475569', marginBottom: 6 }}>Elegí un grupo o tus gastos</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', maxWidth: 300, lineHeight: 1.5 }}>
        Tocá <span style={{ color: '#7C3AED', fontWeight: 800 }}>Mis gastos</span> o cualquier grupo de la izquierda para abrir su chat y empezar a cargar gastos.
      </div>
    </div>
  )
}
