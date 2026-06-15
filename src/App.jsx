import { useState, useEffect } from 'react'
import { makeInitialState, PALETTE, GRADIENTS } from './cc/initialState'
import { parseChat, nowTime, guessIcon, adjustSplit, setEqualSplit } from './cc/logic'
import Inicio from './cc/Inicio'
import Chat from './cc/Chat'
import EditSheet from './cc/EditSheet'
import Profile from './cc/Profile'
import Archived from './cc/Archived'
import NewGroup from './cc/NewGroup'
import { MethodDetail, MonthDetail } from './cc/Detail'

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
    openNewGroup: () => set({ screen: 'newgroup', newGroup: { name: '', desc: '', members: [], memberName: '', invited: false } }),
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

    // ---- gastos futuros / históricos ----
    toggleMonth: (idx) => set((prev) => ({ expandedMonths: { ...prev.expandedMonths, [idx]: !prev.expandedMonths[idx] } })),
    setHistSel: (g, key) => set((prev) => ({ histSel: { ...prev.histSel, [g]: key } })),
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
    onEqual: () => set((prev) => ({ splits: { ...prev.splits, [gid]: setEqualSplit(prev.splits[gid]) } })),
    adjustSplit: (id, delta) => set((prev) => ({ splits: { ...prev.splits, [gid]: adjustSplit(prev.splits[gid], id, delta) } })),
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

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', justifyContent: 'center', background: '#e6e9f2' }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: 460, minHeight: '100dvh', background: '#FBFCFE', overflow: 'hidden' }}>
        {s.screen === 'list' && <Inicio s={s} actions={actions} />}
        {s.screen === 'chat' && <Chat s={s} actions={actions} />}
        {s.screen === 'profile' && <Profile s={s} actions={actions} />}
        {s.screen === 'archived' && <Archived s={s} actions={actions} />}
        {s.screen === 'newgroup' && <NewGroup s={s} actions={actions} />}
        {s.screen === 'methodDetail' && <MethodDetail s={s} actions={actions} />}
        {s.screen === 'monthDetail' && <MonthDetail s={s} actions={actions} />}

        {s.editId != null && <EditSheet s={s} actions={actions} />}
      </div>
    </div>
  )
}
