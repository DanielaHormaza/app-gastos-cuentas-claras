import { useEffect, useRef } from 'react'
import { compute, balanceLines, catById, memberById, descFor, fmt, impactOf } from './logic'
import { BRAND_GRADIENT } from './initialState'
import { Back, ChevronDown, Gear, Check, Close, Send, Lock, Chevron } from './icons'
import { Futuros, Historicos } from './GroupViews'
import Config from './Config'
import { dayLabel, fmtDateFull } from './dates'

const card = { background: '#fff', border: '1px solid #EAEEF4', boxShadow: '0 6px 18px -12px rgba(15,23,42,.35)' }
const aiAvatar = { width: 28, height: 28, borderRadius: '50%', background: BRAND_GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: 13, fontWeight: 800 }
const primaryBtn = { border: 'none', background: BRAND_GRADIENT, color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 13, padding: 9, borderRadius: 11, cursor: 'pointer', boxShadow: '0 8px 18px -10px rgba(59,130,246,.7)' }
const ghostBtn = { border: '1.5px solid #E2E8F0', background: '#fff', color: '#475569', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, padding: '9px 14px', borderRadius: 11, cursor: 'pointer' }
const closeBtn = { width: 38, border: '1.5px solid #E2E8F0', background: '#fff', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }

/** Pantalla de grupo: header + (chat | movimientos | futuros | históricos). */
export default function Chat({ s, actions }) {
  const gid = s.groupId
  const g = s.groups[gid]
  const c = compute(s, gid)
  const lines = balanceLines(s, gid)
  const readOnly = !!s.archived[gid]
  const bannerLabel = g.personal ? 'Gastado' : 'En este grupo'
  const inputHint = g.personal ? 'Anotá un gasto tuyo… ej: 3000 café' : 'Escribí un gasto… ej: 8000 nafta pagó Juan'

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#F4F6FA', animation: 'ccIn .26s ease' }}>
      {/* header */}
      <div style={{ background: '#fff', padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #EEF1F6' }}>
        <div onClick={actions.back} style={{ width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}><Back /></div>
        <div onClick={actions.toggleMenu} style={{ flex: 1, display: 'flex', justifyContent: 'center', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 14px', borderRadius: 999, background: '#F4F6FA' }}>
            <div style={{ width: 24, height: 24, borderRadius: 8, background: g.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 11 }}>{g.initial}</div>
            <span style={{ fontWeight: 800, fontSize: 15, color: '#0B1220' }}>{g.name}</span>
            <ChevronDown />
          </div>
        </div>
        <div onClick={actions.openConfig} style={{ width: 38, height: 38, borderRadius: '50%', background: '#F1F4F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}><Gear /></div>
      </div>

      {/* menú de vistas */}
      {s.menuOpen && <ViewMenu s={s} actions={actions} />}

      {s.view === 'chat' && (
        <ChatView s={s} g={g} c={c} bannerLabel={bannerLabel} lines={lines} inputHint={inputHint} readOnly={readOnly} actions={actions} />
      )}
      {s.view === 'ledger' && (
        <LedgerView s={s} g={g} c={c} bannerLabel={g.personal ? 'Gastado' : 'Saldo en el grupo'} lines={lines} actions={actions} />
      )}
      {s.view === 'months' && <Futuros s={s} actions={actions} />}
      {s.view === 'hist' && <Historicos s={s} actions={actions} />}

      {s.configOpen && <Config s={s} actions={actions} />}
    </div>
  )
}

function ViewMenu({ s, actions }) {
  const items = [
    { view: 'chat', emoji: '💬', bg: '#F1ECFD', title: 'Chat', sub: 'Cargar gastos' },
    { view: 'ledger', emoji: '📆', bg: '#E7F0FE', title: 'Movimientos', sub: 'Tocá un gasto para editarlo' },
    { view: 'months', emoji: '📅', bg: '#EAF8F3', title: 'Gastos futuros', sub: 'Cuotas y fijos por venir' },
    { view: 'hist', emoji: '📊', bg: '#FDF0E7', title: 'Gastos históricos', sub: 'Por mes y medio de pago' },
  ]
  return (
    <>
      <div onClick={actions.closeMenu} style={{ position: 'absolute', inset: 0, zIndex: 8 }} />
      <div style={{ position: 'absolute', top: 76, left: '50%', transform: 'translateX(-50%)', width: 258, background: '#fff', borderRadius: 18, padding: 8, zIndex: 9, boxShadow: '0 18px 44px -16px rgba(15,23,42,.45)', border: '1px solid #EEF1F6', animation: 'ccFade .15s ease' }}>
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
      </div>
    </>
  )
}

function ChatView({ s, g, c, bannerLabel, lines, inputHint, readOnly, actions }) {
  const gid = g.id
  const scrollRef = useRef(null)
  const thread = s.threads[gid] || []
  const lastE = (s.ledgers[gid] || []).slice(-1)[0]

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [thread.length, gid])

  const mkExp = (ex) => {
    const cat = ex.categoryId ? catById(s, ex.categoryId) : { icon: ex.catIcon || '🏷️', name: ex.catName || 'Gasto' }
    const payer = memberById(s, gid, ex.payerId)
    return {
      catIcon: cat.icon, catName: ex.desc || cat.name, amountText: fmt(ex.amount, ex.currency),
      payerInitial: payer.initial, payerColor: payer.color,
      descText: descFor(s, gid, ex, c.daniPct),
      dateText: ex.date ? fmtDateFull(ex.date) : 'hoy', cuotasText: ex.cuotas ? '· en ' + ex.cuotas + ' cuotas' : '',
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* banner de saldo */}
      <div style={{ margin: '14px 16px 4px', borderRadius: 18, padding: '14px 18px', background: 'linear-gradient(135deg,rgba(46,204,177,.13),rgba(124,58,237,.13))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>{bannerLabel}</div>
          <BalanceLines lines={lines} size={16} />
        </div>
        <button onClick={() => actions.goView('ledger')} style={{ border: 'none', background: '#fff', borderRadius: 999, padding: '9px 14px', fontFamily: 'inherit', fontWeight: 800, fontSize: 12.5, color: '#7C3AED', boxShadow: '0 2px 8px -2px rgba(124,58,237,.3)', cursor: 'pointer', flexShrink: 0 }}>Ver detalle</button>
      </div>

      {/* hilo */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '10px 14px 12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 800, color: '#B6BFCC', letterSpacing: '0.05em', margin: '2px 0' }}>HOY</div>
          {thread.map((m) => (
            <Message key={m.id} m={m} s={s} g={g} gid={gid} lastE={lastE} mkExp={mkExp} actions={actions} />
          ))}
        </div>
      </div>

      {/* input / read-only */}
      {readOnly ? (
        <div style={{ padding: '13px 16px 22px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderTop: '1px solid #EEF1F6' }}>
          <Lock />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#94A3B8' }}>Grupo archivado · solo lectura</span>
        </div>
      ) : (
        <div style={{ padding: '10px 14px 20px', background: '#fff', display: 'flex', alignItems: 'center', gap: 9 }}>
          <input
            value={s.chatInput}
            onChange={(e) => actions.onChatInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && actions.sendChat()}
            placeholder={inputHint}
            style={{ flex: 1, background: '#F4F6FA', border: 'none', outline: 'none', borderRadius: 999, padding: '13px 16px', fontSize: 14, color: '#0B1220', fontWeight: 600, fontFamily: 'inherit' }}
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
            <button onClick={() => actions.confirmExp(m.id)} style={ghostBtn}>Editar</button>
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
    const e = mkExp({ ...m.exp, payerId: 'dani' })
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

/** Saldo en una o varias monedas. Si todas comparten la misma frase
 * (ej. "Juan te debe"), la muestra una vez y junta los montos. */
export function BalanceLines({ lines, size = 16 }) {
  const uniform = lines.length > 1 && lines.every((l) => l.pre === lines[0].pre && l.post === lines[0].post)
  if (uniform) {
    return (
      <div style={{ fontWeight: 800, fontSize: size, color: '#0B1220', marginTop: 1, lineHeight: 1.3 }}>
        {lines[0].pre}
        {lines.map((l, i) => (
          <span key={i} style={{ color: l.color }}>{i > 0 ? ' · ' : ''}{l.amount}</span>
        ))}
        {lines[0].post}
      </div>
    )
  }
  return (
    <div style={{ marginTop: 1 }}>
      {lines.map((l, i) => (
        <div key={i} style={{ fontWeight: 800, fontSize: size, color: '#0B1220', lineHeight: 1.3 }}>
          {l.pre}<span style={{ color: l.color }}>{l.amount}</span>{l.post}
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
  const arrowColor = netArs > 1 ? '#0E9F86' : netArs < -1 ? '#E11D5B' : '#94A3B8'

  const order = []
  const byDay = {}
  ;(s.ledgers[gid] || [])
    .filter((e) => !e.future)
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .forEach((e) => {
      const key = (dayLabel(e.date) + ' · ' + fmtDateFull(e.date)).toUpperCase()
      if (!byDay[key]) { byDay[key] = []; order.push(key) }
      const cat = catById(s, e.categoryId)
      const payer = memberById(s, gid, e.payerId)
      const cur = e.currency || 'ARS'
      const meth = s.methods.find((x) => x.id === e.methodId)
      const imp = impactOf(s, gid, e, c.daniPct)
      byDay[key].push({
        entry: e, avatarColor: payer.color, avatarInitial: payer.initial, catIcon: cat.icon, title: e.desc || cat.name,
        sub: g.personal ? (meth ? meth.name : 'Sin medio') + (e.time ? ' · ' + e.time : '') : 'Pagó ' + payer.short + (e.time ? ' · ' + e.time : ''),
        amountText: fmt(e.amount, cur),
        implText: imp.text,
        implColor: imp.color,
      })
    })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#F4F6FA' }}>
      <div style={{ margin: '14px 16px 6px', borderRadius: 16, padding: '13px 16px', background: 'linear-gradient(135deg,rgba(46,204,177,.14),rgba(124,58,237,.14))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>{bannerLabel}</div>
          <BalanceLines lines={lines} size={15} />
        </div>
        <div className="num" style={{ fontWeight: 700, fontSize: 22, color: arrowColor }}>{arrow}</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 16px 16px', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {order.map((k) => (
          <div key={k} style={{ display: 'contents' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.05em', padding: '8px 4px 2px' }}>{k}</div>
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
                  <div style={{ fontSize: 11, fontWeight: 800, color: it.implColor }}>{it.implText}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

