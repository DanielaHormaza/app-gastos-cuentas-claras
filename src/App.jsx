import { useState, useEffect, useRef } from 'react'
import { makeInitialState, PALETTE, GRADIENTS } from './cc/initialState'
import { parseChat, guessIcon, adjustSplit, setEqualSplit, fmt, memberById } from './cc/logic'
import { todayISO, nowTime } from './cc/dates'
import Inicio from './cc/Inicio'
import Chat from './cc/Chat'
import EditSheet from './cc/EditSheet'
import Profile from './cc/Profile'
import Archived from './cc/Archived'
import NewGroup from './cc/NewGroup'
import { MethodDetail, MonthDetail } from './cc/Detail'
import { Logo } from './cc/icons'
import Login from './Login'
import { supabase } from './supabase'
import { loadCloudState, cloudUpsertExpense, cloudDeleteExpense, cloudUpsertCategory, cloudSaveSplit } from './cloud'

// Huella de un gasto (para detectar cambios y sincronizar solo lo que cambió).
const expFingerprint = (e) => [e.amount, e.categoryId, e.payerId, e.mode, e.currency, e.desc, e.date, e.time, e.methodId, e.future, e.from, e.to, e.editedBy, e.editedAt, JSON.stringify(e.cuota || null)].join('|')
// Snapshot id→{e,gid,fp} de todos los movimientos (para el espejo de sincronización).
const ledSnapshot = (ledgers) => {
  const map = {}
  for (const gid in ledgers) for (const e of ledgers[gid]) map[e.id] = { e, gid, fp: expFingerprint(e) }
  return map
}

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
const DATA_KEYS = ['groups', 'splits', 'splitLog', 'splitMeta', 'ledgers', 'payments', 'threads', 'categories', 'methods', 'profile', 'archived', 'histSel']

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return migrate({ ...makeInitialState(), ...JSON.parse(raw) })
  } catch {
    /* dato corrupto: se ignora */
  }
  return makeInitialState()
}

// Asegura que el historial de reparto exista para cada grupo (estado guardado previo a esta feature).
function migrate(s) {
  s.splitLog = s.splitLog || {}
  s.splitMeta = s.splitMeta || {}
  Object.keys(s.splits || {}).forEach((gid) => {
    if (!s.splitLog[gid]) s.splitLog[gid] = []
    if (!s.splitMeta[gid]) s.splitMeta[gid] = { from: '2000-01-01', at: null, by: null }
  })
  return s
}

export default function App() {
  const [s, setS] = useState(load)
  const desktop = useDesktop()
  // session: undefined = cargando, null = sin sesión (mostrar login), objeto = logueado
  const [session, setSession] = useState(undefined)
  const [dataReady, setDataReady] = useState(false)
  const [dataErr, setDataErr] = useState(null)
  const ledSyncRef = useRef(null) // snapshot de movimientos ya sincronizados
  const catSyncRef = useRef(null) // ids de categorías ya sincronizadas

  useEffect(() => {
    const apply = (sess) => {
      setSession(sess)
      setS((prev) => ({ ...prev, authEmail: sess?.user?.email || null }))
      if (sess?.user) {
        // crear/actualizar perfil (no bloqueante; el claim va en el efecto de carga, secuenciado)
        supabase.from('profiles').upsert({ id: sess.user.id, name: (sess.user.email || '').split('@')[0] }).then(({ error }) => error && console.error('[profile]', error.message))
      }
    }
    supabase.auth.getSession().then(({ data }) => apply(data.session)).catch(() => apply(null))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => apply(sess))
    return () => sub.subscription.unsubscribe()
  }, [])

  // cargar los datos desde la nube cuando hay sesión (primero claim → recién ahí soy miembro y RLS me deja leer)
  useEffect(() => {
    if (!session?.user) { setDataReady(false); return }
    let cancelled = false
    setDataErr(null)
    setDataReady(false)
    ;(async () => {
      try {
        const { error: claimErr } = await supabase.rpc('claim_my_slots')
        if (claimErr) console.error('[claim_my_slots]', claimErr.message)
        const cloud = await loadCloudState(session.user.id)
        // conservar el historial de chat ya guardado (por dispositivo); intro solo si no hay
        if (!cancelled) {
          setS((prev) => {
            const threads = {}
            for (const g in cloud.threads) threads[g] = (prev.threads && prev.threads[g]) || cloud.threads[g]
            return { ...cloud, threads }
          })
          setDataReady(true)
        }
      } catch (e) {
        if (!cancelled) { console.error('[loadCloudState]', e.message); setDataErr(e.message) }
      }
    })()
    return () => { cancelled = true }
  }, [session?.user?.id])

  // espejo de movimientos → Supabase: detecta altas/ediciones/bajas y las sincroniza
  useEffect(() => {
    if (!dataReady) { ledSyncRef.current = null; return }
    const cur = ledSnapshot(s.ledgers)
    const prev = ledSyncRef.current
    if (prev === null) { ledSyncRef.current = cur; return } // primera vez tras cargar: solo snapshot
    for (const id in cur) if (!prev[id] || prev[id].fp !== cur[id].fp) cloudUpsertExpense(cur[id].e, cur[id].gid)
    for (const id in prev) if (!cur[id]) cloudDeleteExpense(id)
    ledSyncRef.current = cur
  }, [s.ledgers, dataReady])

  // espejo de categorías nuevas → Supabase
  useEffect(() => {
    if (!dataReady) { catSyncRef.current = null; return }
    const prev = catSyncRef.current
    if (prev === null) { catSyncRef.current = new Set(s.categories.map((c) => c.id)); return }
    for (const c of s.categories) if (!prev.has(c.id)) cloudUpsertCategory(c)
    catSyncRef.current = new Set(s.categories.map((c) => c.id))
  }, [s.categories, dataReady])

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
          catSyncRef.current = new Set(cloud.categories.map((c) => c.id))
          setS((prev) => ({ ...prev, me: cloud.me, groups: cloud.groups, splits: cloud.splits, splitLog: cloud.splitLog, splitMeta: cloud.splitMeta, ledgers: cloud.ledgers, categories: cloud.categories }))
        } catch (e) {
          console.error('[realtime] error al recargar:', e.message)
        }
      }, 350)
    }
    const ch = supabase
      .channel('cc-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'split_history' }, reload)
      .subscribe((status) => console.log('[realtime] estado del canal:', status))
    return () => { clearTimeout(timer); supabase.removeChannel(ch) }
  }, [session?.user?.id, dataReady])

  // Persiste solo los datos (no el estado de navegación transitorio).
  useEffect(() => {
    const data = {}
    DATA_KEYS.forEach((k) => (data[k] = s[k]))
    localStorage.setItem(KEY, JSON.stringify(data))
  }, DATA_KEYS.map((k) => s[k])) // eslint-disable-line react-hooks/exhaustive-deps

  // Merge parcial (como el setState del prototipo).
  const set = (patch) => setS((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))

  const gid = s.groupId

  // Abre la hoja de edición para un gasto del ledger.
  const openEdit = (e) =>
    set({ editId: e.id, draft: { categoryId: e.categoryId, amount: e.amount, payerId: e.payerId, methodId: e.methodId || null, mode: e.mode || 'group', currency: e.currency || 'ARS', createdBy: e.createdBy, editedBy: e.editedBy, editedAt: e.editedAt }, editPanel: null, catQuery: '', payerQuery: '', methodQuery: '' })

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
    openPersonal: () => set({ screen: 'chat', groupId: 'personal', view: 'chat', menuOpen: false, configOpen: false }),
    openGroup: (id) => set({ screen: 'chat', groupId: id, view: 'chat', menuOpen: false, configOpen: false }),
    openNewGroup: () => set({ screen: 'newgroup', newGroup: { name: '', desc: '', members: [], memberName: '', invited: false } }),
    openArchived: () => set({ screen: 'archived', groupQuery: '' }),
    backToList: () => set({ screen: 'list' }),
    back: () =>
      set((prev) => {
        // Desde una sub-vista (movimientos, históricos, etc.) volvés al chat; desde el chat, a la lista.
        if (prev.view !== 'chat') return { view: 'chat', menuOpen: false, configOpen: false, editId: null, draft: null }
        return { screen: prev.archived[prev.groupId] ? 'archived' : 'list', menuOpen: false, configOpen: false, view: 'chat', editId: null, draft: null }
      }),
    toggleMenu: () => set((prev) => ({ menuOpen: !prev.menuOpen })),
    closeMenu: () => set({ menuOpen: false }),
    goView: (view) => set({ view, menuOpen: false }),
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
    onChatInput: (v) => set({ chatInput: v }),
    sendChat: () => {
      if (s.archived[gid]) return
      // varias líneas = varios gastos (uno por línea)
      const lines = (s.chatInput || '').split('\n').map((l) => l.trim()).filter(Boolean)
      if (!lines.length) return
      const tm = nowTime()
      const base = Date.now()
      const msgs = []
      const day = todayISO()
      lines.forEach((line, i) => {
        const id = base + i
        msgs.push({ id: 'u' + id, role: 'user', kind: 'user', text: line, time: tm, date: day, by: s.profile.name })
        const res = parseChat(s, gid, line)
        let app
        if (res.kind === 'payment') app = { id: 'a' + id, role: 'app', kind: 'payment', exp: res.exp }
        else if (res.kind === 'ambiguous') app = { id: 'a' + id, role: 'app', kind: 'ambiguous', exp: res.exp }
        else if (res.kind === 'interpret') app = { id: 'a' + id, role: 'app', kind: 'interpret', exp: res.exp }
        else if (res.kind === 'correction') app = { id: 'a' + id, role: 'app', kind: 'correction', cor: res.cor }
        else app = { id: 'a' + id, role: 'app', kind: 'text', text: 'No te entendí del todo 🤔. Probá algo como “8000 nafta pagó Juan”.' }
        app.time = tm
        app.date = day
        msgs.push(app)
      })
      set((prev) => ({ threads: { ...prev.threads, [gid]: [...(prev.threads[gid] || []), ...msgs] }, chatInput: '' }))
    },

    confirmExp: (id) =>
      set((prev) => {
        const g = prev.groupId
        const thread = prev.threads[g] || []
        const msg = thread.find((m) => m.id === id)
        if (!msg) return {}
        const exp = msg.exp
        const ledger = prev.ledgers[g] || []
        const dup = ledger.find((e) => e.amount === exp.amount && e.payerId === exp.payerId && e.categoryId === exp.categoryId)
        if (dup && !msg._forced) return { threads: { ...prev.threads, [g]: thread.map((m) => (m.id === id ? { ...m, kind: 'duplicate' } : m)) } }
        let cats = prev.categories
        let catId = exp.categoryId
        if (!catId) {
          catId = 'c' + Date.now()
          cats = [...cats, { id: catId, icon: exp.catIcon || '🏷️', name: exp.catName || 'Gasto' }]
        }
        const expId = 'e' + Date.now()
        const entry = { id: expId, date: exp.date || todayISO(), categoryId: catId, amount: exp.amount, payerId: exp.payerId, time: nowTime(), mode: exp.mode || 'group', currency: exp.currency || 'ARS', createdBy: prev.profile.name }
        let splits = prev.splits
        if (exp.split) {
          const ids = Object.keys(prev.splits[g] || {})
          if (ids.length >= 2) splits = { ...splits, [g]: { [ids[0]]: exp.split.a, [ids[1]]: exp.split.b } }
        }
        return {
          categories: cats,
          ledgers: { ...prev.ledgers, [g]: [...ledger, entry] },
          splits,
          threads: { ...prev.threads, [g]: thread.map((m) => (m.id === id ? { ...m, kind: 'saved', expId, exp: { ...exp, categoryId: catId } } : m)) },
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
        const expId = 'e' + Date.now()
        const entry = { id: expId, date: exp.date || todayISO(), categoryId: catId, amount: exp.amount, payerId: exp.payerId, time: nowTime(), mode: exp.mode || 'group', currency: exp.currency || 'ARS', createdBy: prev.profile.name }
        let splits = prev.splits
        if (exp.split) {
          const ids = Object.keys(prev.splits[g] || {})
          if (ids.length >= 2) splits = { ...splits, [g]: { [ids[0]]: exp.split.a, [ids[1]]: exp.split.b } }
        }
        return {
          categories: cats,
          ledgers: { ...prev.ledgers, [g]: [...(prev.ledgers[g] || []), entry] },
          splits,
          threads: { ...prev.threads, [g]: thread.map((m) => (m.id === id ? { ...m, kind: 'saved', expId, exp: { ...exp, categoryId: catId } } : m)) },
          editId: expId,
          draft: { categoryId: catId, amount: entry.amount, payerId: entry.payerId, methodId: null, mode: entry.mode, currency: entry.currency, createdBy: entry.createdBy },
          editPanel: null, catQuery: '', payerQuery: '', methodQuery: '',
        }
      }),
    editDup: (id) => {
      const msg = (s.threads[gid] || []).find((m) => m.id === id)
      const ex = msg && msg.exp
      const e = (s.ledgers[gid] || []).find((x) => x.amount === ex.amount && x.payerId === ex.payerId && x.categoryId === ex.categoryId)
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
    openPanel: (p) => set({ editPanel: p, catQuery: '', payerQuery: '', methodQuery: '' }),
    backToFields: () => set({ editPanel: null }),
    onAmount: (v) => {
      const n = parseInt((v || '').replace(/\D/g, '') || '0', 10)
      set((prev) => ({ draft: { ...prev.draft, amount: n } }))
    },
    onCatQuery: (v) => set({ catQuery: v }),
    pickCat: (id) => set((prev) => ({ draft: { ...prev.draft, categoryId: id }, editPanel: null, catQuery: '' })),
    onCreateCat: () =>
      set((prev) => {
        const name = prev.catQuery.trim()
        if (!name) return {}
        const id = 'c' + Date.now()
        return { categories: [...prev.categories, { id, icon: guessIcon(name), name }], draft: { ...prev.draft, categoryId: id }, editPanel: null, catQuery: '' }
      }),
    onPayerQuery: (v) => set({ payerQuery: v }),
    pickPayerEdit: (id) => set((prev) => ({ draft: { ...prev.draft, payerId: id }, editPanel: null, payerQuery: '' })),
    onMethodQuery: (v) => set({ methodQuery: v }),
    pickMethod: (id) => set((prev) => ({ draft: { ...prev.draft, methodId: id }, editPanel: null, methodQuery: '' })),
    pickMode: (k) => set((prev) => ({ draft: { ...prev.draft, mode: k }, editPanel: null })),
    pickCurrency: (cur) => set((prev) => ({ draft: { ...prev.draft, currency: cur } })),
    onSave: () =>
      set((prev) => {
        const g = prev.groupId
        const l = (prev.ledgers[g] || []).map((it) => (it.id === prev.editId ? { ...it, categoryId: prev.draft.categoryId, amount: prev.draft.amount, payerId: prev.draft.payerId, methodId: prev.draft.methodId !== undefined ? prev.draft.methodId : it.methodId || null, mode: prev.draft.mode || 'group', currency: prev.draft.currency || 'ARS', editedBy: prev.profile.name, editedAt: todayISO() } : it))
        return { ledgers: { ...prev.ledgers, [g]: l }, editId: null, draft: null, editPanel: null }
      }),
    onDelete: () =>
      set((prev) => {
        const g = prev.groupId
        const l = (prev.ledgers[g] || []).filter((it) => it.id !== prev.editId)
        return { ledgers: { ...prev.ledgers, [g]: l }, editId: null, draft: null, editPanel: null }
      }),

    // ---- gastos futuros / históricos ----
    toggleMonth: (idx) => set((prev) => ({ expandedMonths: { ...prev.expandedMonths, [idx]: !prev.expandedMonths[idx] } })),
    setHistSel: (g, key) => set((prev) => ({ histSel: { ...prev.histSel, [g]: key } })),
    setCatFilter: (id) => set({ catFilter: id }),
    setMoveQuery: (v) => set({ moveQuery: v }),
    openMethodDetail: (mid) => set({ screen: 'methodDetail', methodId: mid }),
    openMonthDetail: (key) => set({ screen: 'monthDetail', monthKey: key, monthFilter: null }),
    setMonthFilter: (id) => set({ monthFilter: id }),
    backToPersonalHist: () => set({ screen: 'chat' }),
    backToHist: () => set({ screen: 'chat' }),

    // ---- config de grupo ----
    onGroupName: (v) => set((prev) => ({ groups: { ...prev.groups, [gid]: { ...prev.groups[gid], name: v, initial: (v.trim()[0] || 'G').toUpperCase() } } })),
    onGroupDesc: (v) => set((prev) => ({ groups: { ...prev.groups, [gid]: { ...prev.groups[gid], description: v } } })),
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

    // ---- archivados ----
    onGroupQuery: (v) => set({ groupQuery: v }),
    restoreGroup: (id) => set((prev) => { const a = { ...prev.archived }; delete a[id]; return { archived: a } }),

    // ---- nuevo grupo ----
    onNewGroupField: (field, v) => set((prev) => ({ newGroup: { ...prev.newGroup, [field]: v } })),
    addNewGroupMember: () =>
      set((prev) => {
        const nm = (prev.newGroup.memberName || '').trim()
        if (!nm) return {}
        return { newGroup: { ...prev.newGroup, members: [...prev.newGroup.members, { name: nm }], memberName: '' } }
      }),
    removeNewGroupMember: (i) => set((prev) => ({ newGroup: { ...prev.newGroup, members: prev.newGroup.members.filter((_, j) => j !== i) } })),
    inviteLink: () => set((prev) => ({ newGroup: { ...prev.newGroup, invited: true } })),
    createGroup: () =>
      set((prev) => {
        const nm = (prev.newGroup.name || '').trim()
        if (!nm) return {}
        const id = 'g' + Date.now()
        const grad = GRADIENTS[Object.keys(prev.groups).length % GRADIENTS.length]
        const members = [{ id: 'dani', name: 'Dani (vos)', short: 'Dani', color: '#7C3AED', initial: 'D' }]
        prev.newGroup.members.forEach((mm, i) => {
          members.push({ id: 'mem' + id + i, name: mm.name, short: mm.name.split(' ')[0], color: PALETTE[(i + 1) % PALETTE.length], initial: mm.name.trim()[0].toUpperCase() })
        })
        const split = {}
        const base = Math.floor(100 / members.length)
        let acc = 0
        members.forEach((mm, i) => { split[mm.id] = i === members.length - 1 ? 100 - acc : base; acc += base })
        const group = { id, name: nm, initial: nm[0].toUpperCase(), gradient: grad, description: (prev.newGroup.desc || '').trim(), createdAt: '15 jun 2026', members }
        return {
          groups: { ...prev.groups, [id]: group },
          splits: { ...prev.splits, [id]: split },
          ledgers: { ...prev.ledgers, [id]: [] },
          threads: { ...prev.threads, [id]: [{ id: 'w' + id, role: 'app', kind: 'text', text: '¡Grupo creado! Cargá el primer gasto escribiéndolo acá.', time: nowTime() }] },
          payments: { ...prev.payments, [id]: [] },
          screen: 'chat', groupId: id, view: 'chat',
          newGroup: { name: '', desc: '', members: [], memberName: '', invited: false },
        }
      }),
  }

  // Pantalla activa (todo lo que no es la lista) + overlay de edición.
  const screenEl = (
    <>
      {s.screen === 'chat' && <Chat s={s} actions={actions} />}
      {s.screen === 'profile' && <Profile s={s} actions={actions} />}
      {s.screen === 'archived' && <Archived s={s} actions={actions} />}
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

  if (desktop) {
    return (
      <div style={{ height: '100dvh', display: 'flex', background: '#e6e9f2' }}>
        <aside style={{ position: 'relative', width: 400, flexShrink: 0, overflow: 'hidden', background: '#FBFCFE', borderRight: '1px solid #E2E8F0' }}>
          <Inicio s={s} actions={actions} />
        </aside>
        <main style={{ position: 'relative', flex: 1, minWidth: 0, overflow: 'hidden', background: s.screen === 'list' ? '#F4F6FA' : '#FBFCFE' }}>
          {s.screen === 'list' ? <EmptyState /> : screenEl}
        </main>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', justifyContent: 'center', background: '#e6e9f2' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 460, minHeight: '100dvh', background: '#FBFCFE', overflow: 'hidden' }}>
        {s.screen === 'list' ? <Inicio s={s} actions={actions} /> : screenEl}
      </div>
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
