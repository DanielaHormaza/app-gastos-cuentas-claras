import { useEffect, useRef, Fragment } from 'react'
import { compute, balanceLines, catById, memberById, descFor, fmt, rowFor, catMatch, curMatch, payerMatch, textMatch, groupCategories, groupCurrencies, groupPayers, daniPctAt, splitAt, byRecency, personColor, isOneToOne, peerOf, friendBalanceLines, friendMovementsByDay, groupBalanceLines, computeFriend, myShareExpenses, personalSpent, curList, CURRENCIES, TONE } from './logic'
import { BRAND_GRADIENT } from './initialState'
import { Back, ChevronDown, Gear, Check, Close, Send, Lock, Chevron, EyeToggle, Pin } from './icons'
import { Futuros, Historicos } from './GroupViews'
import CategoryFilter, { Filters, CurrencyFilter, SourceFilter } from './CategoryFilter'
import Config from './Config'
import SettleSheet from './SettleSheet'
import Revision from './Revision'
import { dayLabel, fmtDateFull, fmtDateDow, todayISO } from './dates'

// Nombre de cada vista (para el menú y la leyenda del header).
const VIEW_TITLES = { chat: 'Chat', ledger: 'Movimientos diarios', months: 'Gastos futuros', hist: 'Gastos históricos', review: 'Revisión de datos' }

const card = { background: '#fff', border: '1px solid #EAEEF4', boxShadow: '0 6px 18px -12px rgba(15,23,42,.35)' }
const aiAvatar = { width: 28, height: 28, borderRadius: '50%', background: BRAND_GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: 13, fontWeight: 800 }
const primaryBtn = { border: 'none', background: BRAND_GRADIENT, color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 13, padding: 9, borderRadius: 11, cursor: 'pointer', boxShadow: '0 8px 18px -10px rgba(59,130,246,.7)' }
const ghostBtn = { border: '1.5px solid #E2E8F0', background: '#fff', color: '#475569', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, padding: '9px 14px', borderRadius: 11, cursor: 'pointer' }
const closeBtn = { width: 38, border: '1.5px solid #E2E8F0', background: '#fff', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }

/** Pantalla de grupo: header + (chat | movimientos | futuros | históricos). */
export default function Chat({ s, actions, typingName }) {
  const gid = s.groupId
  const g = s.groups[gid]
  const c = compute(s, gid)
  const readOnly = !!s.archived[gid]
  // Espacio 1:1: se muestra con el nombre de la persona (sin nombre de grupo) y el saldo/movimientos
  // se AGREGAN con todo lo compartido con ella (1:1 + grupos en común).
  const is1to1 = isOneToOne(s, gid)
  const peer = is1to1 ? peerOf(s, gid) : null
  // Banner: personal = total gastado (tuyo + tu parte en grupos); 1:1 = saldo con la persona; grupo = quién le debe a quién.
  const personalLines = () => {
    const ps = personalSpent(s)
    return ps.length ? ps.map(([cur, v]) => ({ pre: '', amount: fmt(v, cur), post: '', color: '#0B1220' })) : [{ pre: '', amount: fmt(0), post: '', color: '#0B1220' }]
  }
  const lines = g.personal ? personalLines() : is1to1 && peer ? friendBalanceLines(s, peer.id) : groupBalanceLines(s, gid)
  const bannerLabel = g.personal ? 'Gastado' : is1to1 ? 'Entre vos y ' + (peer ? peer.short : '') : 'En este grupo'
  const inputHint = g.personal ? 'Anotá un gasto tuyo… ej: 3000 café' : is1to1 ? 'Cargá un gasto con ' + (peer ? peer.short : '') + '… ej: 2000 café pagué yo' : 'Escribí un gasto… ej: 8000 nafta pagó Juan'

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#F4F6FA', animation: 'ccIn .26s ease' }}>
      {/* header */}
      <div style={{ background: '#fff', padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #EEF1F6' }}>
        <div onClick={actions.back} style={{ width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}><Back /></div>
        <div onClick={actions.toggleMenu} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 14px', borderRadius: 999, background: '#F4F6FA' }}>
            {is1to1 && peer ? (
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: personColor(s, peer.id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 11 }}>{peer.initial}</div>
            ) : (
              <div style={{ width: 24, height: 24, borderRadius: 8, background: g.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 11 }}>{g.initial}</div>
            )}
            <span style={{ fontWeight: 800, fontSize: 15, color: '#0B1220' }}>{is1to1 && peer ? peer.short : g.name}</span>
            <ChevronDown />
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{VIEW_TITLES[s.view] || ''}</span>
        </div>
        {!g.personal && (() => {
          const pk = is1to1 ? 'person' : 'group'
          const pidv = is1to1 && peer ? peer.id : gid
          const isPinned = (s.pinned || []).some((p) => p.kind === pk && p.id === pidv)
          return (
            <div onClick={() => actions.togglePin(pk, pidv)} title={isPinned ? 'Quitar de fijados' : 'Fijar en el inicio'} style={{ width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
              <Pin size={18} filled={isPinned} color={isPinned ? '#7C3AED' : '#94A3B8'} />
            </div>
          )
        })()}
        <div onClick={actions.openConfig} style={{ width: 38, height: 38, borderRadius: '50%', background: '#F1F4F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}><Gear /></div>
      </div>

      {/* menú de vistas */}
      {s.menuOpen && <ViewMenu s={s} actions={actions} />}

      {s.view === 'chat' && (
        <ChatView s={s} g={g} c={c} is1to1={is1to1} peer={peer} bannerLabel={bannerLabel} lines={lines} inputHint={inputHint} readOnly={readOnly} actions={actions} typingName={typingName} />
      )}

      {s.settleOpen && !g.personal && <SettleSheet s={s} actions={actions} />}
      {s.view === 'ledger' && (
        is1to1 && peer
          ? <FriendLedger s={s} peer={peer} lines={lines} actions={actions} />
          : g.personal
            ? <PersonalLedger s={s} actions={actions} />
            : <LedgerView s={s} g={g} c={c} bannerLabel={'Saldo en el grupo'} lines={lines} actions={actions} />
      )}
      {s.view === 'months' && <Futuros s={s} actions={actions} />}
      {s.view === 'hist' && <Historicos s={s} actions={actions} />}
      {s.view === 'review' && <Revision s={s} actions={actions} />}

      {s.configOpen && <Config s={s} actions={actions} />}
    </div>
  )
}

function ViewMenu({ s, actions }) {
  const peer = isOneToOne(s, s.groupId) ? peerOf(s, s.groupId) : null
  const items = [
    { view: 'chat', emoji: '💬', bg: '#F1ECFD', title: 'Chat', sub: 'Cargar gastos' },
    { view: 'ledger', emoji: '📆', bg: '#E7F0FE', title: 'Movimientos diarios', sub: 'Tocá un gasto para editarlo' },
    { view: 'months', emoji: '📅', bg: '#EAF8F3', title: 'Gastos futuros', sub: 'Cuotas y fijos por venir' },
    { view: 'hist', emoji: '📊', bg: '#FDF0E7', title: 'Gastos históricos', sub: 'Por mes y medio de pago' },
    { view: 'review', emoji: '🔎', bg: '#FEF3E2', title: 'Revisión de datos', sub: 'Posibles errores de carga' },
  ]
  return (
    <>
      <div onClick={actions.closeMenu} style={{ position: 'absolute', inset: 0, zIndex: 8 }} />
      <div style={{ position: 'absolute', top: 76, left: '50%', transform: 'translateX(-50%)', width: 258, background: '#fff', borderRadius: 18, padding: 8, zIndex: 9, boxShadow: '0 18px 44px -16px rgba(15,23,42,.45)', border: '1px solid #EEF1F6', animation: 'ccFade .15s ease' }}>
        {peer && (
          <>
            <div onClick={() => actions.openFriend(peer.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 11px', borderRadius: 13, cursor: 'pointer' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: '#EAF8F3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>👤</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#0B1220' }}>Ver perfil de {peer.short}</div>
                <div style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 600 }}>Saldo total y grupos en común</div>
              </div>
              <Chevron size={16} />
            </div>
            <div style={{ height: 1, background: '#F1F4F9', margin: '4px 8px' }} />
          </>
        )}
        {items.map((it) => (
          <div key={it.view} onClick={() => actions.goView(it.view)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 11px', borderRadius: 13, cursor: 'pointer' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: it.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{it.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#0B1220' }}>{it.title}</div>
              <div style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 600 }}>{it.sub}</div>
            </div>
            {s.view === it.view && <Check size={16} />}
          </div>
        ))}
        {!s.groups[s.groupId].personal && (() => {
          const pk = peer ? 'person' : 'group'
          const pidv = peer ? peer.id : s.groupId
          const isPinned = (s.pinned || []).some((p) => p.kind === pk && p.id === pidv)
          return (
            <>
              <div style={{ height: 1, background: '#F1F4F9', margin: '4px 8px' }} />
              <div onClick={() => actions.togglePin(pk, pidv)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 11px', borderRadius: 13, cursor: 'pointer' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: isPinned ? '#F1ECFD' : '#F4F6FA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Pin size={16} filled={isPinned} color={isPinned ? '#7C3AED' : '#64748B'} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#0B1220' }}>{isPinned ? 'Quitar de fijados' : 'Fijar en el inicio'}</div>
                  <div style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 600 }}>{isPinned ? 'Sacar del acceso rápido' : 'Acceso rápido arriba de todo'}</div>
                </div>
              </div>
            </>
          )
        })()}
      </div>
    </>
  )
}

function ChatView({ s, g, c, is1to1, peer, bannerLabel, lines, inputHint, readOnly, actions, typingName }) {
  const gid = g.id
  const meName = s.profile.name
  const scrollRef = useRef(null)
  const taRef = useRef(null)
  const thread = s.threads[gid] || []
  const lastE = (s.ledgers[gid] || []).slice(-1)[0]

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [thread.length, gid])

  // textarea que crece con el contenido (y vuelve a 1 línea al limpiar)
  useEffect(() => {
    const el = taRef.current
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px' }
  }, [s.chatInput])

  const mkExp = (ex) => {
    const cat = ex.categoryId ? catById(s, ex.categoryId) : { icon: ex.catIcon || '🏷️', name: ex.catName || 'Gasto' }
    const payer = memberById(s, gid, ex.payerId)
    return {
      catIcon: cat.icon, catName: ex.desc || cat.name, amountText: fmt(ex.amount, ex.currency),
      payerInitial: payer.initial, payerColor: payer.color,
      descText: descFor(s, gid, ex, daniPctAt(s, gid, ex.date || todayISO())),
      dateText: ex.date ? fmtDateFull(ex.date) : 'hoy', cuotasText: ex.cuotas ? '· en ' + ex.cuotas + ' cuotas' : '',
    }
  }

  // Hilo combinado: mensajes propios del espacio + (en un 1:1) gastos compartidos que VIENEN de otros
  // grupos (etiquetados con su origen), ordenados por fecha. Agrupados por día.
  const num = (id) => { const m = String(id || '').match(/\d+/); return m ? Number(m[0]) : 0 }
  // En "Mis gastos" se inyecta tu parte de los gastos de grupos; en un 1:1, lo compartido de otros grupos.
  const xExps = g.personal ? myShareExpenses(s) : is1to1 && peer ? computeFriend(s, peer.id).expenses.filter((e) => !e.direct) : []
  const items = [
    ...thread.map((m) => ({ t: 'msg', date: m.date || todayISO(), key: num(m.id), m })),
    ...xExps.map((e) => ({ t: 'x', date: e.date, key: num(e.id), e })),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.key - b.key))
  const dayDivider = (date) => (date === todayISO() ? 'HOY' : fmtDateFull(date).toUpperCase())

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* banner de saldo */}
      <div style={{ margin: '14px 16px 4px', borderRadius: 18, padding: '14px 18px', background: 'linear-gradient(135deg,rgba(46,204,177,.13),rgba(124,58,237,.13))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>{bannerLabel}</div>
          <BalanceLines lines={lines} size={16} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
          <button onClick={() => actions.goView('ledger')} style={{ border: 'none', background: '#fff', borderRadius: 999, padding: '8px 14px', fontFamily: 'inherit', fontWeight: 800, fontSize: 12.5, color: '#7C3AED', boxShadow: '0 2px 8px -2px rgba(124,58,237,.3)', cursor: 'pointer' }}>Ver detalle</button>
          {!g.personal && (
            <button onClick={actions.openSettle} style={{ border: 'none', background: BRAND_GRADIENT, borderRadius: 999, padding: '8px 14px', fontFamily: 'inherit', fontWeight: 800, fontSize: 12.5, color: '#fff', boxShadow: '0 6px 16px -8px rgba(59,130,246,.6)', cursor: 'pointer' }}>Saldar</button>
          )}
        </div>
      </div>

      {/* invitación: persona del 1:1 que todavía no está en la app */}
      {is1to1 && peer && peer.pending && (
        <div style={{ margin: '6px 16px 0', borderRadius: 14, padding: '10px 13px', background: '#FBF4E8', border: '1px solid #F3E0BE', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>📩</span>
          <div style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 700, color: '#9A621F' }}>{peer.short} todavía no usa la app. Cuando entre con el enlace, ve todo este historial.</div>
          <button onClick={() => actions.copyInvite(peer.id)} style={{ border: 'none', background: s.inviteCopied === peer.id ? '#0E9F86' : '#9A621F', color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 11.5, padding: '8px 11px', borderRadius: 10, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>{s.inviteCopied === peer.id ? '¡Copiado!' : 'Copiar enlace'}</button>
        </div>
      )}

      {/* hilo */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '10px 14px 12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.length === 0 && <div style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 800, color: '#B6BFCC', letterSpacing: '0.05em', margin: '2px 0' }}>HOY</div>}
          {items.map((it, i) => {
            const prev = items[i - 1]
            const showDay = !prev || prev.date !== it.date
            const senderOf = (x) => (!x ? null : x.t === 'x' ? 'x' : x.m.kind === 'user' ? x.m.by || meName : 'app')
            if (it.t === 'x') {
              return (
                <Fragment key={'x' + it.e.gid + it.e.id}>
                  {showDay && <div style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 800, color: '#B6BFCC', letterSpacing: '0.05em', margin: '2px 0' }}>{dayDivider(it.date)}</div>}
                  <XExpenseCard e={it.e} s={s} actions={actions} />
                </Fragment>
              )
            }
            const m = it.m
            const ts = m.time ? (m.date ? fmtDateDow(m.date) + ' · ' + m.time : m.time) : ''
            const isOwn = m.kind === 'user' && (!m.by || m.by === meName)
            const isPeer = m.kind === 'user' && m.by && m.by !== meName
            const showSender = isPeer && senderOf(prev) !== senderOf(it)
            return (
              <Fragment key={m.id}>
                {showDay && <div style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 800, color: '#B6BFCC', letterSpacing: '0.05em', margin: '2px 0' }}>{dayDivider(it.date)}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                  {isPeer ? (
                    <PeerMessage m={m} s={s} g={g} showSender={showSender} />
                  ) : (
                    <Message m={m} s={s} g={g} gid={gid} lastE={lastE} mkExp={mkExp} actions={actions} />
                  )}
                  {ts && <div style={{ fontSize: 9.5, fontWeight: 700, color: '#B6BFCC', padding: '3px 6px 0' }}>{!isPeer && m.by ? m.by + ' · ' : ''}{ts}</div>}
                </div>
              </Fragment>
            )
          })}
        </div>
      </div>

      {/* "escribiendo…" justo arriba del input (parte de la conversación, discreto) */}
      {!readOnly && typingName && (
        <div style={{ padding: '0 20px 5px', fontSize: 11.5, fontWeight: 700, color: '#94A3B8', fontStyle: 'italic' }}>{typingName} está escribiendo…</div>
      )}

      {/* input / read-only */}
      {readOnly ? (
        <div style={{ padding: '13px 16px 22px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderTop: '1px solid #EEF1F6' }}>
          <Lock />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#94A3B8' }}>Grupo archivado · solo lectura</span>
        </div>
      ) : (
        <div style={{ padding: '10px 14px 20px', background: '#fff', display: 'flex', alignItems: 'flex-end', gap: 9 }}>
          <textarea
            ref={taRef}
            value={s.chatInput}
            onChange={(e) => actions.onChatInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); actions.sendChat() } }}
            placeholder={inputHint}
            rows={1}
            style={{ flex: 1, background: '#F4F6FA', border: 'none', outline: 'none', borderRadius: 22, padding: '13px 16px', fontSize: 14, color: '#0B1220', fontWeight: 600, fontFamily: 'inherit', resize: 'none', maxHeight: 120, lineHeight: 1.35 }}
          />
          <button onClick={actions.sendChat} style={{ width: 46, height: 46, border: 'none', borderRadius: '50%', background: BRAND_GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 6px 16px -6px rgba(59,130,246,.6)', cursor: 'pointer' }}><Send /></button>
        </div>
      )}
    </div>
  )
}

/** Renderiza una burbuja del hilo según su tipo. */
function Message({ m, s, g, gid, lastE, mkExp, actions }) {
  // usuario
  if (m.kind === 'user') {
    return <div style={{ alignSelf: 'flex-end', maxWidth: '82%', background: 'linear-gradient(135deg,#3B82F6,#7C3AED)', color: '#fff', padding: '11px 15px', borderRadius: '18px 18px 4px 18px', fontSize: 14, fontWeight: 600, boxShadow: '0 10px 22px -14px rgba(124,58,237,.7)' }}>{m.text}</div>
  }
  // texto simple de la IA
  if (m.kind === 'text') {
    return (
      <Row>
        <Ai />
        <div style={{ ...card, borderRadius: '16px 16px 16px 4px', padding: '11px 14px', fontSize: 13.5, fontWeight: 600, color: '#334155' }}>{m.text}</div>
      </Row>
    )
  }
  // interpretación / duplicado comparten mkExp
  if (m.kind === 'interpret') {
    const e = mkExp(m.exp)
    return (
      <Row max="92%">
        <Ai mt />
        <div style={{ ...card, borderRadius: '16px 16px 16px 4px', padding: '13px 14px', minWidth: 210 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 10 }}>Detecté este gasto:</div>
          <ExpBox e={e} />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => actions.confirmExp(m.id)} style={{ ...primaryBtn, flex: 1 }}>Confirmar</button>
            <button onClick={() => actions.editInterp(m.id)} style={ghostBtn}>Editar</button>
            <button onClick={() => actions.cancelMsg(m.id)} style={closeBtn}><Close /></button>
          </div>
        </div>
      </Row>
    )
  }
  if (m.kind === 'duplicate') {
    const e = mkExp(m.exp)
    return (
      <Row max="92%">
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#FEF3E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#D97706', fontSize: 15, fontWeight: 800, marginTop: 2 }}>!</div>
        <div style={{ background: '#fff', border: '1px solid #FBE4C2', borderRadius: '16px 16px 16px 4px', padding: '13px 14px', boxShadow: '0 6px 18px -12px rgba(15,23,42,.35)', minWidth: 210 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#B45309', marginBottom: 9 }}>Esto se parece a un gasto cargado recién.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#FEF8EF', borderRadius: 12, padding: '10px 12px' }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{e.catIcon}</div>
            <div style={{ flex: 1, fontWeight: 800, fontSize: 13.5, color: '#0B1220' }}>{e.catName}</div>
            <div className="num" style={{ fontWeight: 700, fontSize: 15, color: '#0B1220' }}>{e.amountText}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button onClick={() => actions.forceExp(m.id)} style={{ flex: 1, border: 'none', background: '#0B1220', color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 12.5, padding: 9, borderRadius: 11, cursor: 'pointer', whiteSpace: 'nowrap' }}>Cargar igual</button>
            <button onClick={() => actions.editDup(m.id)} style={{ ...ghostBtn, fontSize: 12.5, padding: '9px 12px', whiteSpace: 'nowrap' }}>Ver existente</button>
            <button onClick={() => actions.cancelMsg(m.id)} style={{ ...closeBtn, width: 36 }}><Close size={14} /></button>
          </div>
        </div>
      </Row>
    )
  }
  if (m.kind === 'ambiguous') {
    const e = mkExp({ ...m.exp, payerId: s.me || 'dani' })
    return (
      <Row max="92%">
        <Ai mt />
        <div style={{ ...card, borderRadius: '16px 16px 16px 4px', padding: '13px 14px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#334155' }}>Anoté <b style={{ color: '#0B1220' }}>{e.catName} {e.amountText}</b>. ¿Quién pagó?</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 11, flexWrap: 'wrap' }}>
            {g.members.map((x) => (
              <div key={x.id} onClick={() => actions.pickPayer(m.id, x.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 13px 7px 7px', borderRadius: 999, border: '1.5px solid #E2E8F0', cursor: 'pointer' }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: x.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>{x.initial}</span>
                <span style={{ fontWeight: 800, fontSize: 13, color: '#0B1220' }}>{x.short}</span>
              </div>
            ))}
          </div>
        </div>
      </Row>
    )
  }
  if (m.kind === 'payment') {
    const from = memberById(s, gid, m.exp.from)
    return (
      <Row max="92%">
        <Ai mt />
        <div style={{ ...card, borderRadius: '16px 16px 16px 4px', padding: '13px 14px', minWidth: 200 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 10 }}>Detecté un pago entre personas:</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#EAF8F3', borderRadius: 12, padding: '11px 12px' }}>
            <span style={{ width: 30, height: 30, borderRadius: '50%', background: from.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{from.initial}</span>
            <div style={{ flex: 1, fontWeight: 800, fontSize: 13.5, color: '#0B1220' }}>{from.short} te pagó {fmt(m.exp.amount)}</div>
            <div className="num" style={{ fontWeight: 700, fontSize: 16, color: '#0E9F86' }}>{fmt(m.exp.amount)}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => actions.confirmPayment(m.id)} style={{ ...primaryBtn, flex: 1 }}>Confirmar pago</button>
            <button onClick={() => actions.cancelMsg(m.id)} style={closeBtn}><Close /></button>
          </div>
        </div>
      </Row>
    )
  }
  if (m.kind === 'correction') {
    const cor = m.cor
    const lc = lastE ? catById(s, lastE.categoryId).name : 'el último'
    let q
    if (cor.type === 'del') q = lastE ? `¿Borro el último gasto (${lc} ${fmt(lastE.amount)})?` : '¿Borro el último gasto?'
    else if (cor.field === 'amount') q = '¿Actualizo el último gasto' + (lastE ? ' de ' + lc : '') + ' a ' + fmt(cor.amount) + '?'
    else if (cor.field === 'payer') q = '¿Cambio quién pagó el último a ' + memberById(s, gid, cor.payerId).short + '?'
    else if (cor.field === 'category') q = '¿Cambio la categoría del último a ' + cor.catName + '?'
    else if (cor.field === 'split') q = '¿Divido el último ' + cor.a + '/' + cor.b + '?'
    else q = '¿Confirmás el cambio?'
    return (
      <Row max="88%">
        <Ai mt />
        <div style={{ ...card, borderRadius: '16px 16px 16px 4px', padding: '13px 14px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#334155' }}>{q}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
            <button onClick={() => actions.corYes(m.id)} style={{ ...primaryBtn, flex: 1 }}>Sí, dale</button>
            <button onClick={() => actions.corNo(m.id)} style={{ ...ghostBtn, padding: '9px 16px' }}>No</button>
          </div>
        </div>
      </Row>
    )
  }
  if (m.kind === 'saved') {
    let ex = m.exp
    if (!ex && m.expId) {
      const le = (s.ledgers[gid] || []).find((x) => x.id === m.expId)
      if (le) ex = { amount: le.amount, categoryId: le.categoryId, payerId: le.payerId, mode: le.mode }
    }
    const e = ex ? mkExp(ex) : null
    return (
      <Row max="92%">
        <div style={{ ...aiAvatar, marginTop: 2 }}><Check size={15} color="#fff" /></div>
        <div style={{ ...card, borderRadius: '16px 16px 16px 4px', padding: '13px 14px', minWidth: 210 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 800, color: '#0E9F86', marginBottom: 9 }}><Check size={14} color="#0E9F86" />Gasto guardado</div>
          {e && (
            <div style={{ background: '#F6F8FC', borderRadius: 12, padding: '11px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: '#EAF8F3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{e.catIcon}</div>
                <div style={{ flex: 1, minWidth: 0, fontWeight: 800, fontSize: 14.5, color: '#0B1220' }}>{e.catName}</div>
                <div className="num" style={{ fontWeight: 700, fontSize: 16, color: '#0B1220' }}>{e.amountText}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94A3B8', fontWeight: 700 }}>
                <span style={{ width: 16, height: 16, borderRadius: 5, background: e.payerColor, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>{e.payerInitial}</span>{e.descText}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 14, marginTop: 11, paddingLeft: 2 }}>
            <span onClick={() => actions.editExp(m.id)} style={{ fontSize: 12.5, fontWeight: 800, color: '#7C3AED', cursor: 'pointer' }}>Editar</span>
          </div>
        </div>
      </Row>
    )
  }
  if (m.kind === 'savedPayment') {
    const from = memberById(s, gid, m.exp.from)
    return (
      <Row max="90%">
        <div style={{ ...aiAvatar, marginTop: 2 }}><Check size={15} color="#fff" /></div>
        <div style={{ ...card, borderRadius: '16px 16px 16px 4px', padding: '12px 14px' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0E9F86' }}>Pago registrado · {from.short} te pagó {fmt(m.exp.amount)} ({fmt(m.exp.amount)}).</div>
        </div>
      </Row>
    )
  }
  return null
}

/** Burbuja entrante de otra persona (estilo WhatsApp): avatar + nombre con color
 * único, solo en el primer mensaje de una tanda; los siguientes alinean con un spacer. */
function PeerMessage({ m, s, g, showSender }) {
  const mem = g.members.find((x) => x.short === m.by || x.name === m.by) || { id: m.by, initial: (m.by || '?')[0].toUpperCase(), short: m.by }
  const color = personColor(s, mem.id)
  return (
    <div style={{ alignSelf: 'flex-start', maxWidth: '84%', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
      {showSender ? (
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: 12, fontWeight: 800 }}>{mem.initial}</div>
      ) : (
        <div style={{ width: 28, flexShrink: 0 }} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        {showSender && <span style={{ fontSize: 11.5, fontWeight: 800, color, paddingLeft: 3 }}>{mem.short}</span>}
        <div style={{ background: '#fff', border: '1px solid #EAEEF4', borderRadius: showSender ? '4px 16px 16px 16px' : '16px', padding: '9px 13px', fontSize: 13.5, fontWeight: 600, color: '#334155', boxShadow: '0 6px 18px -12px rgba(15,23,42,.35)' }}>{m.text}</div>
      </div>
    </div>
  )
}

/** Tarjeta de un gasto que VIENE de otro grupo, mostrada dentro del chat 1:1.
 * Se distingue visualmente (borde punteado + chip "↗ grupo") y muestra el impacto en tu saldo. */
function XExpenseCard({ e, s, actions }) {
  const me = s.me || 'dani'
  const impColor = Math.abs(e.delta) < 1 ? '#94A3B8' : e.delta > 0 ? TONE.pos : TONE.neg
  const impText = Math.abs(e.delta) < 1 ? '' : (e.delta > 0 ? '+' : '−') + fmt(Math.abs(e.delta), e.cur)
  const payerText = e.transfer ? 'Transferencia' : e.payerId === me ? 'Pagaste vos' : 'Pagó ' + (e.payerShort || '')
  return (
    <div onClick={() => actions.openLedgerOf(e.gid)} style={{ alignSelf: 'flex-start', maxWidth: '92%', display: 'flex', gap: 9, alignItems: 'flex-start', cursor: 'pointer' }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: e.ggrad, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: 11, fontWeight: 800, marginTop: 2 }}>{e.ginitial}</div>
      <div style={{ background: '#F8F6FF', border: '1px dashed #D9CEF6', borderRadius: '14px 14px 14px 4px', padding: '10px 13px', minWidth: 210 }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#7C3AED', background: '#F1ECFD', padding: '2px 8px', borderRadius: 999 }}>↗ {e.gname}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{e.catIcon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 13.5, color: '#0B1220' }}>{e.catName}</div>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700 }}>{payerText}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="num" style={{ fontWeight: 700, fontSize: 14.5, color: '#0B1220' }}>{fmt(e.amount, e.cur)}</div>
            {impText && <div style={{ fontSize: 10.5, fontWeight: 800, color: impColor }}>{impText}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Saldo en una o varias monedas. Monto SIEMPRE en neutro; el color va en un
 * pequeño indicador (punto) + el texto del estado, no en el monto. */
export function BalanceLines({ lines, size = 16 }) {
  const Dot = ({ c }) => <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: c, marginRight: 6, verticalAlign: 'middle', flexShrink: 0 }} />
  const txt = (c) => ({ fontWeight: 700, fontSize: size * 0.84, color: c })
  const amt = { fontWeight: 800, fontSize: size, color: '#0B1220' }
  const uniform = lines.length > 1 && lines.every((l) => l.pre === lines[0].pre && l.post === lines[0].post)
  if (uniform) {
    return (
      <div style={{ marginTop: 2, lineHeight: 1.3 }}>
        {(lines[0].pre || lines[0].post) && <Dot c={lines[0].color} />}
        <span style={txt(lines[0].color)}>{lines[0].pre}</span>
        {lines.map((l, i) => <span key={i} className="num" style={amt}>{i > 0 ? ' · ' : ''}{l.amount}</span>)}
        <span style={txt(lines[0].color)}>{lines[0].post}</span>
      </div>
    )
  }
  return (
    <div style={{ marginTop: 2 }}>
      {lines.map((l, i) => (
        <div key={i} style={{ lineHeight: 1.35 }}>
          {(l.pre || l.post) && <Dot c={l.color} />}
          <span style={txt(l.color)}>{l.pre}</span>
          <span className="num" style={amt}>{l.amount}</span>
          <span style={txt(l.color)}>{l.post}</span>
        </div>
      ))}
    </div>
  )
}

const Row = ({ children, max = '84%' }) => <div style={{ alignSelf: 'flex-start', maxWidth: max, display: 'flex', gap: 9, alignItems: 'flex-start' }}>{children}</div>
const Ai = ({ mt }) => <div style={{ ...aiAvatar, marginTop: mt ? 2 : 0 }}>✦</div>

/** Caja gris con icono+monto+desc (interpretación). */
function ExpBox({ e }) {
  return (
    <div style={{ background: '#F6F8FC', borderRadius: 12, padding: '11px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: '#EAF8F3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{e.catIcon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14.5, color: '#0B1220' }}>{e.catName}</div>
          <div style={{ fontSize: 10.5, color: '#94A3B8', fontWeight: 700 }}>{e.dateText} {e.cuotasText}</div>
        </div>
        <div className="num" style={{ fontWeight: 700, fontSize: 17, color: '#0B1220' }}>{e.amountText}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#64748B', fontWeight: 700 }}>
        <span style={{ width: 17, height: 17, borderRadius: 5, background: e.payerColor, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>{e.payerInitial}</span>{e.descText}
      </div>
    </div>
  )
}

/** Vista Movimientos: feed agrupado por día. */
function LedgerView({ s, g, c, bannerLabel, lines, actions }) {
  const gid = g.id
  const netArs = c.nets.ARS || 0
  const arrow = g.personal ? '' : netArs > 1 ? '↑' : netArs < -1 ? '↓' : '='
  const arrowColor = netArs > 1 ? TONE.pos : netArs < -1 ? TONE.neg : '#94A3B8'

  const cats = groupCategories(s, gid)
  const currencies = groupCurrencies(s, gid)
  const payers = groupPayers(s, gid)
  const meShort = (g.members.find((m) => m.id === (s.me || 'dani')) || {}).short || 'Vos'
  const order = []
  const byDay = {}
  const dayDate = {}
  ;(s.ledgers[gid] || [])
    .filter((e) => !e.future && catMatch(s.catFilter, e) && curMatch(s.curFilter, e) && payerMatch(s.payerFilter, e) && textMatch(s, gid, e, s.moveQuery))
    .slice()
    .sort(byRecency)
    .forEach((e) => {
      const key = (dayLabel(e.date) + ' · ' + fmtDateFull(e.date)).toUpperCase()
      if (!byDay[key]) { byDay[key] = []; order.push(key); dayDate[key] = e.date }
      byDay[key].push(rowFor(s, gid, e))
    })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#F4F6FA' }}>
      <div style={{ margin: '14px 16px 6px', borderRadius: 16, padding: '13px 16px', background: 'linear-gradient(135deg,rgba(46,204,177,.14),rgba(124,58,237,.14))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>{bannerLabel}</div>
          <BalanceLines lines={lines} size={15} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={actions.toggleHideAmounts} title={s.hideAmounts ? 'Mostrar montos' : 'Ocultar montos'} aria-label={s.hideAmounts ? 'Mostrar montos' : 'Ocultar montos'} style={{ border: 'none', background: 'transparent', padding: 2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
            <EyeToggle size={18} color="#64748B" hidden={s.hideAmounts} />
          </button>
          <div className="num" style={{ fontWeight: 700, fontSize: 22, color: arrowColor }}>{arrow}</div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 16px 16px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        <Filters cats={cats} catFilter={s.catFilter} onCat={actions.setCatFilter} query={s.moveQuery} onQuery={actions.setMoveQuery} cur={s.curFilter} onCur={actions.setCurFilter} currencies={currencies} payer={s.payerFilter} onPayer={actions.setPayerFilter} payers={payers} />
        {order.length === 0 && <div style={{ textAlign: 'center', fontSize: 12.5, color: '#B6BFCC', fontWeight: 700, padding: '16px 0' }}>Sin movimientos que coincidan.</div>}
        {order.map((k) => {
          const dp = daniPctAt(s, gid, dayDate[k])
          // Encabezado del día con el reparto vigente: 2 personas → "Vos X% · Otro Y%"; 3+ → todos.
          const splitText = g.members.length === 2
            ? meShort + ' ' + dp + '% · ' + c.other.short + ' ' + (100 - dp) + '%'
            : g.members.map((m) => m.short + ' ' + ((splitAt(s, gid, dayDate[k]) || {})[m.id] || 0) + '%').join(' · ')
          return (
          <div key={k} style={{ display: 'contents' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, padding: '8px 4px 2px' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.05em' }}>{k}</span>
              {!g.personal && <span style={{ fontSize: 10.5, fontWeight: 800, color: '#C3CCDA' }}>{splitText}</span>}
            </div>
            {byDay[k].map((it) => (
              <div key={it.entry.id} onClick={() => actions.openEdit(it.entry)} style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#fff', borderRadius: 15, padding: '11px 12px', boxShadow: '0 2px 10px -7px rgba(15,23,42,.3)', cursor: 'pointer' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: it.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15, position: 'relative', flexShrink: 0 }}>
                  {it.avatarInitial}
                  <span style={{ position: 'absolute', bottom: -3, right: -3, width: 18, height: 18, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, boxShadow: '0 1px 3px rgba(15,23,42,.2)' }}>{it.catIcon}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14.5, color: '#0B1220' }}>{it.title}</div>
                  <div style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 700 }}>{it.sub}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="num" style={{ fontWeight: 700, fontSize: 15, color: '#0B1220' }}>{it.amountText}</div>
                  {it.impText && <div style={{ fontSize: 11, fontWeight: 800, color: it.impColor }}>{it.impText}</div>}
                </div>
              </div>
            ))}
          </div>
          )
        })}
      </div>
    </div>
  )
}

/** "Mis gastos" en detalle: tus gastos personales + tu parte de cada grupo (etiquetada),
 * con filtros (categoría, moneda, búsqueda) y filtro de ORIGEN (todo / personales / un grupo).
 * Los personales se editan; los de grupo saltan a su grupo. */
function PersonalLedger({ s, actions }) {
  const me = s.me || 'dani'
  const all = []
  ;(s.ledgers.personal || []).forEach((e) => {
    if (e.future || e.kind === 'transfer') return
    const cat = catById(s, e.categoryId)
    all.push({ id: e.id, gid: 'personal', own: true, categoryId: e.categoryId, cur: e.currency || 'ARS', spent: e.amount, date: e.date, catIcon: cat.icon, title: e.desc || cat.name, sub: 'Personal', amountText: fmt(e.amount, e.currency || 'ARS'), impText: '', impColor: '#94A3B8', entry: e })
  })
  myShareExpenses(s).forEach((e) => {
    all.push({ id: e.id, gid: e.gid, own: false, gname: e.gname, categoryId: e.categoryId, cur: e.cur, spent: -e.delta, date: e.date, catIcon: e.catIcon, title: e.catName, sub: e.payerId === me ? 'Pagaste vos' : 'Pagó ' + (e.payerShort || ''), amountText: fmt(e.amount, e.cur), impText: '−' + fmt(-e.delta, e.cur), impColor: TONE.neg })
  })

  // filtro de origen: Todo / Solo personales / cada persona (1:1) o grupo, con ícono diferencial
  const srcOptions = [{ value: 'all', label: 'Todo', kind: 'all' }, { value: 'personal', label: 'Solo personales', kind: 'personal' }]
  for (const gid in s.groups) {
    if (gid === 'personal') continue
    const g = s.groups[gid]
    if (isOneToOne(s, gid)) {
      const peer = peerOf(s, gid) || {}
      srcOptions.push({ value: gid, label: peer.short || g.name, kind: 'person', color: peer.id ? personColor(s, peer.id) : g.gradient, initial: peer.initial || g.initial })
    } else {
      srcOptions.push({ value: gid, label: g.name, kind: 'group', gradient: g.gradient, initial: g.initial })
    }
  }
  const src = s.personalSrc || 'all'
  const cats = s.categories.filter((c) => all.some((r) => r.categoryId === c.id))
  const currencies = CURRENCIES.filter((cu) => all.some((r) => r.cur === cu))

  const rows = all
    .filter((r) => (src === 'all' ? true : src === 'personal' ? r.own : r.gid === src))
    .filter((r) => catMatch(s.catFilter, { categoryId: r.categoryId }))
    .filter((r) => curMatch(s.curFilter, { currency: r.cur }))
    .filter((r) => !s.moveQuery || r.title.toLowerCase().includes(s.moveQuery.toLowerCase()))
    .sort(byRecency)

  const totals = {}
  rows.forEach((r) => { totals[r.cur] = (totals[r.cur] || 0) + r.spent })
  const tl = curList(totals)
  const lines = tl.length ? tl.map(([cur, v]) => ({ pre: '', amount: fmt(v, cur), post: '', color: '#0B1220' })) : [{ pre: '', amount: fmt(0), post: '', color: '#0B1220' }]

  const order = []
  const byDay = {}
  rows.forEach((r) => { const k = fmtDateFull(r.date); if (!byDay[k]) { byDay[k] = []; order.push(k) } byDay[k].push(r) })
  const onRow = (r) => { if (r.own) actions.openEdit(r.entry); else actions.openLedgerOf(r.gid) }
  const bannerLabel = src === 'personal' ? 'Gastado · solo personales' : src !== 'all' ? 'Gastado en ' + (srcOptions.find((o) => o.value === src) || {}).label : 'Gastado · vos + tu parte'
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#F4F6FA' }}>
      <div style={{ margin: '14px 16px 6px', borderRadius: 16, padding: '13px 16px', background: 'linear-gradient(135deg,rgba(46,204,177,.14),rgba(124,58,237,.14))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>{bannerLabel}</div>
          <BalanceLines lines={lines} size={15} />
        </div>
        <button onClick={actions.toggleHideAmounts} title={s.hideAmounts ? 'Mostrar montos' : 'Ocultar montos'} aria-label={s.hideAmounts ? 'Mostrar montos' : 'Ocultar montos'} style={{ border: 'none', background: 'transparent', padding: 2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
          <EyeToggle size={18} color="#64748B" hidden={s.hideAmounts} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 16px 16px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <SourceFilter value={src} options={srcOptions} onChange={actions.setPersonalSrc} />
          {cats.length > 0 && <CategoryFilter value={s.catFilter} cats={cats} onChange={actions.setCatFilter} />}
          {currencies.length > 1 && <CurrencyFilter value={s.curFilter} currencies={currencies} onChange={actions.setCurFilter} />}
        </div>
        {order.length === 0 && <div style={{ textAlign: 'center', fontSize: 12.5, color: '#B6BFCC', fontWeight: 700, padding: '16px 0' }}>Sin movimientos que coincidan.</div>}
        {order.map((k) => (
          <div key={k} style={{ display: 'contents' }}>
            <div style={{ padding: '8px 4px 2px' }}><span style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.05em' }}>{k.toUpperCase()}</span></div>
            {byDay[k].map((it) => (
              <div key={it.gid + it.id} onClick={() => onRow(it)} style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#fff', borderRadius: 15, padding: '11px 12px', boxShadow: '0 2px 10px -7px rgba(15,23,42,.3)', cursor: 'pointer' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F4F6FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{it.catIcon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14.5, color: '#0B1220' }}>{it.title}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    {!it.own && <span style={{ background: '#F1ECFD', color: '#7C3AED', padding: '1px 7px', borderRadius: 999, fontSize: 10 }}>{it.gname}</span>}{it.sub}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="num" style={{ fontWeight: 700, fontSize: 15, color: '#0B1220' }}>{it.amountText}</div>
                  {it.impText && <div style={{ fontSize: 11, fontWeight: 800, color: it.impColor }}>{it.impText}</div>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Movimientos AGREGADOS de un 1:1: todo lo compartido con la persona (1:1 + grupos en común),
 * cada fila con el chip de su grupo de origen. Tocar un gasto del propio 1:1 lo edita;
 * uno de otro grupo salta a los movimientos de ese grupo para editarlo ahí. */
function FriendLedger({ s, peer, lines, actions }) {
  const { order, byDay } = friendMovementsByDay(s, peer.id)
  const fc = computeFriend(s, peer.id)
  const netArs = fc.nets.ARS || 0
  const arrow = netArs > 1 ? '↑' : netArs < -1 ? '↓' : '='
  const arrowColor = netArs > 1 ? TONE.pos : netArs < -1 ? TONE.neg : '#94A3B8'
  const onRow = (it) => {
    if (it.gid === s.groupId) { const e = (s.ledgers[it.gid] || []).find((x) => x.id === it.id); if (e) actions.openEdit(e) }
    else actions.openLedgerOf(it.gid)
  }
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#F4F6FA' }}>
      <div style={{ margin: '14px 16px 6px', borderRadius: 16, padding: '13px 16px', background: 'linear-gradient(135deg,rgba(46,204,177,.14),rgba(124,58,237,.14))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>Entre vos y {peer.short}</div>
          <BalanceLines lines={lines} size={15} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={actions.toggleHideAmounts} title={s.hideAmounts ? 'Mostrar montos' : 'Ocultar montos'} aria-label={s.hideAmounts ? 'Mostrar montos' : 'Ocultar montos'} style={{ border: 'none', background: 'transparent', padding: 2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
            <EyeToggle size={18} color="#64748B" hidden={s.hideAmounts} />
          </button>
          <div className="num" style={{ fontWeight: 700, fontSize: 22, color: arrowColor }}>{arrow}</div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 16px 16px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {order.length === 0 && (
          <div style={{ textAlign: 'center', padding: '28px 16px', color: '#B6BFCC' }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>🤝</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#64748B' }}>Sin gastos compartidos con {peer.short} aún</div>
          </div>
        )}
        {order.map((k) => (
          <div key={k} style={{ display: 'contents' }}>
            <div style={{ padding: '8px 4px 2px' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.05em' }}>{k.toUpperCase()}</span>
            </div>
            {byDay[k].map((it) => (
              <div key={it.id} onClick={() => onRow(it)} style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#fff', borderRadius: 15, padding: '11px 12px', boxShadow: '0 2px 10px -7px rgba(15,23,42,.3)', cursor: 'pointer' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F4F6FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{it.catIcon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14.5, color: '#0B1220' }}>{it.title}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    {it.showChip && <span style={{ background: '#F1ECFD', color: '#7C3AED', padding: '1px 7px', borderRadius: 999, fontSize: 10 }}>{it.gname}</span>}{it.payerText}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="num" style={{ fontWeight: 700, fontSize: 15, color: '#0B1220' }}>{it.amountText}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: it.impColor }}>{it.impText}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

