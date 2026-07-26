import { supabase } from './supabase'
import { makeInitialState } from './cc/initialState'
import { fmtDateFull } from './cc/dates'

// La nube guarda created_at como timestamp ISO ("2026-06-21T18:00:..."); lo mostramos lindo ("21/jun/26").
const fmtCreated = (ts) => (ts ? fmtDateFull(String(ts).slice(0, 10)) : undefined)

// ----- Escritura -----
const toRow = (e, gid) => ({
  id: e.id, group_id: gid, kind: e.kind || 'expense', date: e.date, time: e.time || null,
  currency: e.currency || 'ARS', category_id: e.categoryId || null, description: e.desc || null,
  note: e.note || null,
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

// ----- Grupos y miembros -----
const groupRow = (g) => ({
  id: g.id, name: g.name, initial: g.initial, gradient: g.gradient, description: g.description || null,
  personal: !!g.personal, is_group: !!g.isGroup, direct: !!g.direct, event_date: g.eventDate || null,
})
// Crear un grupo nuevo (o 1:1): usa la función security definer (resuelve el RLS huevo-gallina).
// creatorKey = member_key del usuario logueado, para que quede vinculado y RLS lo deje entrar.
export async function cloudCreateGroup(group, members, creatorKey) {
  const mems = (members || []).map((m) => ({ member_key: m.id, name: m.name, short: m.short, color: m.color, initial: m.initial, email: m.email || null }))
  const { error } = await supabase.rpc('create_group', { g: groupRow(group), mems, creator_key: creatorKey })
  if (error) console.error('[createGroup]', error.message)
}
// Actualizar datos de un grupo existente (nombre, foto, fecha del evento…). RLS: ya sos miembro.
export async function cloudUpsertGroup(group) {
  const { error } = await supabase.from('groups').upsert(groupRow(group))
  if (error) console.error('[upsertGroup]', error.message)
}
// Archivar / desarchivar un grupo (persiste y sincroniza entre dispositivos). RLS: ya sos miembro.
export async function cloudSetArchived(gid, archived) {
  const { error } = await supabase.from('groups').update({ archived: !!archived }).eq('id', gid)
  if (error) console.error('[setArchived]', error.message)
}
// Eliminar un grupo (solo se usa con grupos SIN movimientos). El ON DELETE CASCADE limpia
// miembros, reparto, mensajes y cualquier gasto asociado. RLS: ya sos miembro.
export async function cloudDeleteGroup(gid) {
  const { error } = await supabase.from('groups').delete().eq('id', gid)
  if (error) console.error('[deleteGroup]', error.message)
}
// Alta/edición de un miembro en un grupo donde ya sos miembro (no toca user_id: lo reclama su dueño al loguearse).
export async function cloudUpsertMember(m, gid) {
  const { error } = await supabase
    .from('group_members')
    .upsert({ group_id: gid, member_key: m.id, name: m.name, short: m.short, color: m.color, initial: m.initial, email: m.email || null }, { onConflict: 'group_id,member_key' })
  if (error) console.error('[upsertMember]', error.message)
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

// Guarda los alias del usuario (cómo llama a cada persona) en su perfil. El row ya existe (se crea al login).
export async function cloudSaveAliases(userId, aliases) {
  const { error } = await supabase.from('profiles').update({ aliases: aliases || {} }).eq('id', userId)
  if (error) console.error('[saveAliases]', error.message)
}

// Guarda la moneda por defecto del usuario en su perfil (sigue al usuario entre dispositivos).
export async function cloudSaveCurrency(userId, currency) {
  const { error } = await supabase.from('profiles').update({ currency: currency || 'ARS' }).eq('id', userId)
  if (error) console.error('[saveCurrency]', error.message)
}

// Guarda la memoria de categorización (descripción → categoría) en el perfil; te sigue entre dispositivos.
export async function cloudSaveCatMemory(userId, catMemory) {
  const { error } = await supabase.from('profiles').update({ cat_memory: catMemory || {} }).eq('id', userId)
  if (error) console.error('[saveCatMemory]', error.message)
}

// Lee todo lo del usuario desde Supabase y lo arma en la forma del estado `s`.
// userId: auth.user.id del logueado (para detectar quién soy → state.me).
export async function loadCloudState(userId) {
  const [groupsR, membersR, catsR, splitsR, expR, msgR, profR] = await Promise.all([
    supabase.from('groups').select('*'),
    supabase.from('group_members').select('*').order('id', { ascending: true }),
    supabase.from('categories').select('*'),
    supabase.from('split_history').select('*').order('from_date', { ascending: true }),
    supabase.from('expenses').select('*'),
    supabase.from('messages').select('*'),
    supabase.from('profiles').select('founder_number, created_at, aliases, currency, cat_memory').eq('id', userId).maybeSingle(),
  ])
  const bad = [groupsR, membersR, catsR, splitsR, expR, msgR].find((r) => r.error)
  if (bad) throw new Error(bad.error.message)

  const base = makeInitialState()

  // grupos + miembros (el primero insertado = "ancla" para los modos full)
  const groups = {}
  const archived = {} // gid → true (archivado, persistido en la columna groups.archived)
  for (const g of groupsR.data) {
    groups[g.id] = { id: g.id, name: g.name, initial: g.initial, gradient: g.gradient, description: g.description, personal: !!g.personal, isGroup: !!g.is_group, direct: !!g.direct, eventDate: g.event_date || undefined, createdAt: fmtCreated(g.created_at), members: [] }
    if (g.archived) archived[g.id] = true
  }
  let me = 'dani'
  for (const m of membersR.data) {
    if (!groups[m.group_id]) continue
    // pendiente = tiene email pero todavía nadie reclamó el slot (sin cuenta vinculada)
    const mem = { id: m.member_key, name: m.name, short: m.short, color: m.color, initial: m.initial }
    if (m.email) mem.email = m.email
    if (m.email && !m.user_id) mem.pending = true
    groups[m.group_id].members.push(mem)
    if (m.user_id && m.user_id === userId) me = m.member_key
  }

  // nombre del usuario (para createdBy/atribución), derivado del miembro logueado
  let meName = base.profile.name
  for (const gid in groups) {
    const mm = groups[gid].members.find((x) => x.id === me)
    if (mm) meName = mm.short
  }

  // "Mis gastos" (grupo personal) es PRIVADO de cada usuario: por RLS, uno NO ve el personal de
  // otro. En la nube cada usuario tiene su propio grupo personal con id único (ej. Dani='personal',
  // Juan='personal_<uid>'). Lo remapeamos a la clave cliente fija 'personal' (todo el código usa
  // ese literal) y recordamos su id real en `cloudId` para enrutar las escrituras.
  const rawPersonalId = Object.keys(groups).find((id) => groups[id].personal)
  if (rawPersonalId && rawPersonalId !== 'personal') {
    groups.personal = { ...groups[rawPersonalId], id: 'personal', cloudId: rawPersonalId }
    delete groups[rawPersonalId]
  } else if (rawPersonalId === 'personal') {
    groups.personal.cloudId = 'personal'
  }
  // Traduce el id de la nube → clave cliente (solo afecta al personal).
  const gidOf = (raw) => (rawPersonalId && raw === rawPersonalId ? 'personal' : raw)
  // Si el usuario todavía no tiene personal en la nube (1er login), lo sintetizamos local con
  // cloudId=null; App lo crea en la nube (create_group) la primera vez que carga.
  if (!groups.personal) {
    const init = (meName.trim()[0] || '?').toUpperCase()
    groups.personal = { id: 'personal', name: 'Mis gastos', initial: '🧾', personal: true, gradient: 'linear-gradient(135deg,#7C3AED,#3B82F6)', cloudId: null, members: [{ id: me, name: meName, short: meName, color: '#7C3AED', initial: init }] }
  }

  // reparto: la última fila por fecha = actual; las previas = historial (until = inicio de la siguiente)
  const splits = {}, splitLog = {}, splitMeta = {}
  const byG = {}
  for (const r of splitsR.data) (byG[gidOf(r.group_id)] = byG[gidOf(r.group_id)] || []).push(r)
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
    const lg = gidOf(e.group_id)
    if (!ledgers[lg]) ledgers[lg] = []
    const entry = { id: e.id, date: e.date, currency: e.currency || 'ARS', categoryId: e.category_id, amount: Number(e.amount), payerId: e.payer_key, mode: e.mode || 'group' }
    if (e.time) entry.time = e.time
    if (e.description) entry.desc = e.description
    if (e.note) entry.note = e.note
    if (e.cuota) entry.cuota = e.cuota
    if (e.excluded) entry.excluded = e.excluded
    if (e.future) entry.future = true
    if (e.kind === 'transfer') { entry.kind = 'transfer'; entry.from = e.from_key; entry.to = e.to_key }
    if (e.created_by) entry.createdBy = e.created_by
    if (e.edited_by) { entry.editedBy = e.edited_by; entry.editedAt = e.edited_at }
    ledgers[lg].push(entry)
  }

  const categories = catsR.data.map((c) => ({ id: c.id, icon: c.icon, name: c.name }))
  // Bucket "Sin categoría": debe existir siempre (los gastos no reconocidos caen acá).
  if (!categories.some((c) => c.id === 'sincat')) categories.push({ id: 'sincat', icon: '🏷️', name: 'Sin categoría' })

  // chat COMPARTIDO: intro por grupo + mensajes de historial desde la nube (user/saved), ordenados por creación.
  const msgKey = (id) => { const x = String(id || '').match(/\d+/); return x ? Number(x[0]) : 0 }
  const threads = {}
  for (const gid in groups) {
    threads[gid] = [] // sin burbuja de sugerencia en el chat: la sugerencia vive en el placeholder del input
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

  // Reconstrucción de historial: los gastos que NO tienen tarjeta de chat (cargados antes de que
  // existiera el chat compartido, o en 'personal' que nunca sincronizó mensajes) se muestran igual
  // como tarjetas "Gasto guardado" de solo-historial. _hist=true → NO se re-sincronizan a la nube.
  for (const gid in groups) {
    const referenced = new Set()
    for (const m of threads[gid]) if (m.expId) referenced.add(m.expId)
    const extra = []
    for (const e of ledgers[gid] || []) {
      if (e.kind === 'transfer' || referenced.has(e.id)) continue
      extra.push({ id: 'h_' + e.id, role: 'app', kind: 'saved', expId: e.id, _hist: true, date: e.date, time: e.time })
    }
    if (!extra.length) continue
    const intro = threads[gid].filter((m) => String(m.id).startsWith('w'))
    const rest = threads[gid].filter((m) => !String(m.id).startsWith('w')).concat(extra)
    rest.sort((a, b) => msgKey(a.id) - msgKey(b.id)) // orden de creación (sufijo numérico del id/expId)
    threads[gid] = [...intro, ...rest]
  }

  return {
    ...base,
    me,
    profile: { ...base.profile, name: meName, founderNumber: profR.data?.founder_number || null, memberSince: profR.data?.created_at || null, currency: profR.data?.currency || 'ARS' },
    aliases: profR.data?.aliases || {},
    catMemory: profR.data?.cat_memory || {},
    groups,
    splits,
    splitLog,
    splitMeta,
    ledgers,
    categories: categories.length ? categories : base.categories,
    payments: {},
    archived,
    threads,
  }
}
