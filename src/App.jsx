import { useState, useEffect } from 'react'
import { makeInitialState } from './cc/initialState'
import { parseChat, nowTime, guessIcon } from './cc/logic'
import Inicio from './cc/Inicio'
import Chat from './cc/Chat'
import EditSheet from './cc/EditSheet'
import { Back } from './cc/icons'

// Persistencia local. SUPABASE (V2): reemplazar por API/DB.
const KEY = 'cuentas-claras:v1'
const DATA_KEYS = ['groups', 'splits', 'ledgers', 'payments', 'threads', 'categories', 'methods', 'profile', 'archived', 'histSel']

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...makeInitialState(), ...JSON.parse(raw) }
  } catch {
    /* dato corrupto: se ignora */
  }
  return makeInitialState()
}

export default function App() {
  const [s, setS] = useState(load)

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
    set({ editId: e.id, draft: { categoryId: e.categoryId, amount: e.amount, payerId: e.payerId, methodId: e.methodId || null, mode: e.mode || 'group' }, editPanel: null, catQuery: '', payerQuery: '', methodQuery: '' })

  const actions = {
    // ---- navegación ----
    openProfile: () => set({ screen: 'profile', menuOpen: false }),
    openPersonal: () => set({ screen: 'chat', groupId: 'personal', view: 'chat', menuOpen: false, configOpen: false }),
    openGroup: (id) => set({ screen: 'chat', groupId: id, view: 'chat', menuOpen: false, configOpen: false }),
    openNewGroup: () => set({ screen: 'newgroup' }),
    openArchived: () => set({ screen: 'archived', groupQuery: '' }),
    backToList: () => set({ screen: 'list' }),
    back: () =>
      set((prev) => ({
        screen: prev.archived[prev.groupId] ? 'archived' : 'list',
        menuOpen: false, configOpen: false, view: 'chat', editId: null, draft: null,
      })),
    toggleMenu: () => set((prev) => ({ menuOpen: !prev.menuOpen })),
    closeMenu: () => set({ menuOpen: false }),
    goView: (view) => set({ view, menuOpen: false }),
    openConfig: () => set((prev) => (prev.groupId === 'personal' ? { screen: 'profile', menuOpen: false } : { configOpen: true, menuOpen: false })),
    closeConfig: () => set({ configOpen: false }),

    // ---- chat ----
    onChatInput: (v) => set({ chatInput: v }),
    sendChat: () => {
      if (s.archived[gid]) return
      const text = (s.chatInput || '').trim()
      if (!text) return
      const b = Date.now()
      const tm = nowTime()
      const user = { id: 'u' + b, role: 'user', kind: 'user', text, time: tm }
      const res = parseChat(s, gid, text)
      let app
      if (res.kind === 'payment') app = { id: 'a' + b, role: 'app', kind: 'payment', exp: res.exp }
      else if (res.kind === 'ambiguous') app = { id: 'a' + b, role: 'app', kind: 'ambiguous', exp: res.exp }
      else if (res.kind === 'interpret') app = { id: 'a' + b, role: 'app', kind: 'interpret', exp: res.exp }
      else if (res.kind === 'correction') app = { id: 'a' + b, role: 'app', kind: 'correction', cor: res.cor }
      else app = { id: 'a' + b, role: 'app', kind: 'text', text: 'No te entendí del todo 🤔. Probá algo como “8000 nafta pagó Juan”.' }
      app.time = tm
      set((prev) => ({ threads: { ...prev.threads, [gid]: [...(prev.threads[gid] || []), user, app] }, chatInput: '' }))
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
        const entry = { id: expId, day: 'Hoy', dateFull: '14/jun/26', categoryId: catId, amount: exp.amount, payerId: exp.payerId, time: 'ahora', mode: exp.mode || 'group' }
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
        const pays = [...(prev.payments[g] || []), { from: ex.from, to: ex.to, amount: ex.amount }]
        return { payments: { ...prev.payments, [g]: pays }, threads: { ...prev.threads, [g]: (prev.threads[g] || []).map((m) => (m.id === id ? { ...m, kind: 'savedPayment' } : m)) } }
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
    onSave: () =>
      set((prev) => {
        const g = prev.groupId
        const l = (prev.ledgers[g] || []).map((it) => (it.id === prev.editId ? { ...it, categoryId: prev.draft.categoryId, amount: prev.draft.amount, payerId: prev.draft.payerId, methodId: prev.draft.methodId !== undefined ? prev.draft.methodId : it.methodId || null, mode: prev.draft.mode || 'group' } : it))
        return { ledgers: { ...prev.ledgers, [g]: l }, editId: null, draft: null, editPanel: null }
      }),
    onDelete: () =>
      set((prev) => {
        const g = prev.groupId
        const l = (prev.ledgers[g] || []).filter((it) => it.id !== prev.editId)
        return { ledgers: { ...prev.ledgers, [g]: l }, editId: null, draft: null, editPanel: null }
      }),
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', justifyContent: 'center', background: '#e6e9f2' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 460, minHeight: '100dvh', background: '#FBFCFE', overflow: 'hidden' }}>
        {s.screen === 'list' && <Inicio s={s} actions={actions} />}
        {s.screen === 'chat' && <Chat s={s} actions={actions} />}
        {(s.screen === 'profile' || s.screen === 'archived' || s.screen === 'newgroup') && <Placeholder s={s} actions={actions} />}

        {s.editId != null && <EditSheet s={s} actions={actions} />}
      </div>
    </div>
  )
}

/** Pantallas de la segunda tanda (perfil / archivados / nuevo grupo). */
function Placeholder({ s, actions }) {
  const title = s.screen === 'profile' ? 'Mi perfil' : s.screen === 'archived' ? 'Grupos archivados' : 'Nuevo grupo'
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#FBFCFE', animation: 'ccIn .26s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 14px', borderBottom: '1px solid #EEF1F6' }}>
        <div onClick={actions.backToList} style={{ width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Back /></div>
        <span style={{ fontWeight: 800, fontSize: 18, color: '#0B1220' }}>{title}</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, color: '#B6BFCC' }}>
        <div style={{ fontSize: 34, marginBottom: 10 }}>🛠️</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: '#64748B', marginBottom: 4 }}>Próximamente</div>
        <div style={{ fontSize: 13, fontWeight: 600, maxWidth: 260 }}>Esta pantalla es parte de la segunda tanda del rediseño.</div>
      </div>
    </div>
  )
}
