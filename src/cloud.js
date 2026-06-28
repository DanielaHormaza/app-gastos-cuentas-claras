import { supabase } from './supabase'
import { makeInitialState } from './cc/initialState'

// ----- Escritura -----
const toRow = (e, gid) => ({
  id: e.id, group_id: gid, kind: e.kind || 'expense', date: e.date, time: e.time || null,
  currency: e.currency || 'ARS', category_id: e.categoryId || null, description: e.desc || null,
  amount: e.amount, payer_key: e.payerId || null, mode: e.mode || 'group',
  cuota: e.cuota || null, future: !!e.future, from_key: e.from || null, to_key: e.to || null,
  excluded: e.excluded && e.excluded.length ? e.excluded : null,
  created_by: e.createdBy || null, edited_by: e.editedBy || null, edited_at: e.editedAt || null,
})

export async function cloudUpsertExpense(e, gid) {
  const { error } = await supabase.from('expenses').upsert(toRow(e, gid))
  if (error) console.error('[upsertExpense]', error.message)
}
export async function cloudDeleteExpense(id) {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) console.error('[deleteExpense]', error.message)
}
export async function cloudUpsertCategory(c) {
  const { error } = await supabase.from('categories').upsert({ id: c.id, icon: c.icon, name: c.name })
  if (error) console.error('[upsertCategory]', error.message)
}

// Chat compartido: solo se sincronizan los mensajes "de historial" (user/saved).
const toMsgRow = (m, gid) => ({
  id: m.id, group_id: gid, role: m.role || null, kind: m.kind, text: m.text || null,
  exp_id: m.expId || null, by_name: m.by || null, date: m.date || null, time: m.time || null,
})
export async function cloudUpsertMessage(m, gid) {
  const { error } = await supabase.from('messages').upsert(toMsgRow(m, gid))
  if (error) console.error('[upsertMessage]', error.message)
}
export async function cloudDeleteMessage(id) {
  const { error } = await supabase.from('messages').delete().eq('id', id)
  if (error) console.error('[deleteMessage]', error.message)
}
// Guarda el reparto vigente desde una fecha (reemplaza el de ese mismo día si ya existía).
export async function cloudSaveSplit(gid, fromDate, shares, by, at) {
  await supabase.from('split_history').delete().eq('group_id', gid).eq('from_date', fromDate)
  const { error } = await supabase.from('split_history').insert({ group_id: gid, from_date: fromDate, shares, changed_by: by || null, changed_at: at || null })
  if (error) console.error('[saveSplit]', error.message)
}

// Lee todo lo del usuario desde Supabase y lo arma en la forma del estado `s`.
// userId: auth.user.id del logueado (para detectar quién soy → state.me).
export async function loadCloudState(userId) {
  const [groupsR, membersR, catsR, splitsR, expR, msgR] = await Promise.all([
    supabase.from('groups').select('*'),
    supabase.from('group_members').select('*').order('id', { ascending: true }),
    supabase.from('categories').select('*'),
    supabase.from('split_history').select('*').order('from_date', { ascending: true }),
    supabase.from('expenses').select('*'),
    supabase.from('messages').select('*'),
  ])
  const bad = [groupsR, membersR, catsR, splitsR, expR, msgR].find((r) => r.error)
  if (bad) throw new Error(bad.error.message)

  const base = makeInitialState()

  // grupos + miembros (el primero insertado = "ancla" para los modos full)
  const groups = {}
  for (const g of groupsR.data) {
    groups[g.id] = { id: g.id, name: g.name, initial: g.initial, gradient: g.gradient, description: g.description, personal: !!g.personal, createdAt: g.created_at, members: [] }
  }
  let me = 'dani'
  for (const m of membersR.data) {
    if (!groups[m.group_id]) continue
    groups[m.group_id].members.push({ id: m.member_key, name: m.name, short: m.short, color: m.color, initial: m.initial })
    if (m.user_id && m.user_id === userId) me = m.member_key
  }

  // nombre del usuario (para createdBy/atribución), derivado del miembro logueado
  let meName = base.profile.name
  for (const gid in groups) {
    const mm = groups[gid].members.find((x) => x.id === me)
    if (mm) meName = mm.short
  }

  // reparto: la última fila por fecha = actual; las previas = historial (until = inicio de la siguiente)
  const splits = {}, splitLog = {}, splitMeta = {}
  const byG = {}
  for (const r of splitsR.data) (byG[r.group_id] = byG[r.group_id] || []).push(r)
  for (const gid in byG) {
    const regs = byG[gid]
    const latest = regs[regs.length - 1]
    splits[gid] = latest.shares
    splitMeta[gid] = { from: latest.from_date, at: latest.changed_at, by: latest.changed_by }
    splitLog[gid] = regs.slice(0, -1).map((r, i) => ({ until: regs[i + 1].from_date, shares: r.shares }))
  }

  // movimientos
  const ledgers = {}
  for (const gid in groups) ledgers[gid] = []
  for (const e of expR.data) {
    if (!ledgers[e.group_id]) ledgers[e.group_id] = []
    const entry = { id: e.id, date: e.date, currency: e.currency || 'ARS', categoryId: e.category_id, amount: Number(e.amount), payerId: e.payer_key, mode: e.mode || 'group' }
    if (e.time) entry.time = e.time
    if (e.description) entry.desc = e.description
    if (e.cuota) entry.cuota = e.cuota
    if (e.excluded) entry.excluded = e.excluded
    if (e.future) entry.future = true
    if (e.kind === 'transfer') { entry.kind = 'transfer'; entry.from = e.from_key; entry.to = e.to_key }
    if (e.created_by) entry.createdBy = e.created_by
    if (e.edited_by) { entry.editedBy = e.edited_by; entry.editedAt = e.edited_at }
    ledgers[e.group_id].push(entry)
  }

  const categories = catsR.data.map((c) => ({ id: c.id, icon: c.icon, name: c.name }))

  // chat COMPARTIDO: intro por grupo + mensajes de historial desde la nube (user/saved), ordenados por creación.
  const msgKey = (id) => { const x = String(id || '').match(/\d+/); return x ? Number(x[0]) : 0 }
  const threads = {}
  for (const gid in groups) {
    threads[gid] = [{ id: 'w' + gid, role: 'app', kind: 'text', text: groups[gid].personal ? 'Anotá tus gastos personales. Ej: “3000 café”.' : 'Cargá un gasto escribiéndolo, ej: “8000 nafta pagó Juan”.' }]
  }
  const rank = (r) => (r.kind === 'user' ? 0 : 1) // a igual momento, el mensaje tipeado va antes que la tarjeta
  const msgs = (msgR.data || []).slice().sort((a, b) => msgKey(a.id) - msgKey(b.id) || rank(a) - rank(b))
  for (const r of msgs) {
    if (!threads[r.group_id]) continue
    const m = { id: r.id, role: r.role, kind: r.kind }
    if (r.text != null) m.text = r.text
    if (r.exp_id) m.expId = r.exp_id
    if (r.by_name) m.by = r.by_name
    if (r.date) m.date = r.date
    if (r.time) m.time = r.time
    threads[r.group_id].push(m)
  }

  return {
    ...base,
    me,
    profile: { ...base.profile, name: meName },
    groups,
    splits,
    splitLog,
    splitMeta,
    ledgers,
    categories: categories.length ? categories : base.categories,
    payments: {},
    archived: {},
    threads,
  }
}
