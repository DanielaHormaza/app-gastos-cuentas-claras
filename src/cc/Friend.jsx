import { computeFriend, personById, personColor, isPending, curList, fmt, byRecency, TONE, TONE_BG } from './logic'
import { BRAND_GRADIENT } from './initialState'
import { Back } from './icons'
import { fmtDateFull } from './dates'

/** Perfil de una persona: saldo agregado (todos los grupos), espacios en común y movimientos. */
export default function Friend({ s, actions }) {
  const pid = s.friendId
  const person = personById(s, pid)
  const color = personColor(s, pid)
  const pending = isPending(s, pid)
  const calc = computeFriend(s, pid)
  const lines = curList(calc.nets)
  const allPos = lines.every(([, v]) => v >= 0)
  const allNeg = lines.every(([, v]) => v < 0)

  let balLabel, balColor
  if (lines.length === 0) { balLabel = 'Están a mano'; balColor = TONE.pos }
  else if (allPos) { balLabel = person.short + ' te debe'; balColor = TONE.pos }
  else if (allNeg) { balLabel = 'Le debés a ' + person.short; balColor = TONE.neg }
  else { balLabel = 'Saldos con ' + person.short; balColor = '#64748B' }
  const canSettle = lines.length > 0

  const statusBg = pending ? '#FBF1E3' : '#E6F6F1'
  const statusColor = pending ? '#B5742F' : '#0E9F86'
  const statusText = pending ? 'Invitación pendiente' : 'En la app'

  const groups = calc.groups
  const expenses = calc.expenses.slice().sort(byRecency)

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#F4F6FA', animation: 'ccIn .26s ease' }}>
      {/* header */}
      <div style={{ background: '#fff', padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #EEF1F6' }}>
        <div onClick={actions.backFromFriend} style={{ width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}><Back /></div>
        <div style={{ flex: 1, fontWeight: 800, fontSize: 16, color: '#0B1220' }}>{person.name === person.short ? person.short : person.name}</div>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{person.initial}</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* hero */}
        <div style={{ background: '#fff', borderRadius: 20, padding: '20px 18px', boxShadow: '0 2px 12px -7px rgba(15,23,42,.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ width: 66, height: 66, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 26, marginBottom: 10 }}>{person.initial}</div>
          <div style={{ fontWeight: 800, fontSize: 19, color: '#0B1220' }}>{person.short}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 800, marginTop: 6, padding: '3px 10px', borderRadius: 999, background: statusBg, color: statusColor }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />{statusText}
          </div>

          <div style={{ width: '100%', height: 1, background: '#F1F4F9', margin: '16px 0 14px' }} />

          <div style={{ fontSize: 12.5, color: balColor, fontWeight: 800 }}>{balLabel}</div>
          {lines.length === 0 ? (
            <div className="num" style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em', color: '#0B1220', marginTop: 2 }}>$0</div>
          ) : (
            lines.map(([cur, v], i) => (
              <div key={cur} className="num" style={{ fontSize: i === 0 ? 36 : 20, fontWeight: 700, letterSpacing: '-0.02em', color: '#0B1220', marginTop: i === 0 ? 2 : 0, lineHeight: 1.15 }}>{fmt(Math.abs(v), cur)}</div>
            ))
          )}
          <div style={{ fontSize: 11.5, color: '#B6BFCC', fontWeight: 600, marginTop: 4 }}>Suma de todo lo que comparten</div>

          {canSettle && (
            <div style={{ display: 'flex', gap: 9, marginTop: 16, width: '100%' }}>
              <button onClick={() => actions.openFriendSettle(pid)} style={{ flex: 1, border: 'none', background: BRAND_GRADIENT, color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 13.5, padding: 11, borderRadius: 13, cursor: 'pointer', boxShadow: '0 8px 18px -10px rgba(59,130,246,.7)' }}>Saldar</button>
              <button onClick={() => actions.openFriendChat(pid)} style={{ flex: 1, border: '1.5px solid #E2E8F0', background: '#fff', color: '#475569', fontFamily: 'inherit', fontWeight: 800, fontSize: 13.5, padding: 11, borderRadius: 13, cursor: 'pointer' }}>Recordar</button>
            </div>
          )}
        </div>

        {/* invitación pendiente */}
        {pending && (
          <div style={{ background: '#FBF4E8', border: '1px solid #F3E0BE', borderRadius: 16, padding: '13px 15px', display: 'flex', alignItems: 'flex-start', gap: 11 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 17 }}>✉️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 13.5, color: '#9A621F' }}>Todavía no está en la app</div>
              <div style={{ fontSize: 12, color: '#A87B3C', fontWeight: 600, marginTop: 2, lineHeight: 1.4 }}>
                Podés cargar gastos igual. Cuando se sume{person.email ? <> con <b>{person.email}</b></> : ''}, hereda todo automáticamente.
              </div>
            </div>
          </div>
        )}

        {/* espacios en común */}
        {groups.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, padding: '2px 4px 0' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Espacios en común</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#B6BFCC' }}>{groups.length}</div>
            </div>
            {groups.map((gr) => {
              const gl = curList(gr.nets)
              const gPos = gl.every(([, v]) => v >= 0)
              const gNeg = gl.every(([, v]) => v < 0)
              const subLabel = gl.length === 0 ? 'a mano' : gPos ? 'te debe' : gNeg ? 'le debés' : 'saldos'
              const subColor = gl.length === 0 ? TONE.even : gPos ? TONE.pos : gNeg ? TONE.neg : '#64748B'
              return (
                <div key={gr.gid} onClick={() => actions.openGroup(gr.gid)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 15, padding: '11px 12px', boxShadow: '0 1px 0 #EEF1F6', cursor: 'pointer' }}>
                  <div style={{ width: 42, height: 42, borderRadius: gr.direct ? '50%' : 13, background: gr.direct ? color : gr.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{gr.direct ? person.initial : gr.initial}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: 14.5, color: '#0B1220' }}>{gr.direct ? 'Espacio 1:1' : gr.name}</span>
                      {gr.direct && <span style={{ fontSize: 9, fontWeight: 800, color: '#0E9F86', background: '#E6F6F1', padding: '2px 6px', borderRadius: 999 }}>1:1</span>}
                      {gr.archived && <span style={{ fontSize: 9, fontWeight: 800, color: '#94A3B8', background: '#F1F4F9', padding: '2px 6px', borderRadius: 999 }}>ARCHIVADO</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 600 }}>{gr.direct ? 'Solo ustedes dos' : gr.members + ' personas'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {gl.length === 0 ? (
                      <div className="num" style={{ fontWeight: 700, fontSize: 14, color: '#94A3B8' }}>$0</div>
                    ) : (
                      gl.map(([cur, v]) => (
                        <div key={cur} className="num" style={{ fontWeight: 700, fontSize: 14, color: '#0B1220', lineHeight: 1.25 }}>{fmt(Math.abs(v), cur)}</div>
                      ))
                    )}
                    <div style={{ fontSize: 10.5, color: subColor, fontWeight: 700 }}>{subLabel}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* movimientos compartidos */}
        {expenses.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 4px 0' }}>Movimientos compartidos</div>
            <div style={{ background: '#fff', borderRadius: 16, padding: '4px 13px', boxShadow: '0 1px 0 #EEF1F6' }}>
              {expenses.map((e, i) => {
                let implText, implColor
                if (Math.abs(e.delta) < 1) { implText = '—'; implColor = '#94A3B8' }
                else if (e.delta > 0) { implText = '+' + fmt(e.delta, e.cur); implColor = TONE.pos }
                else { implText = '−' + fmt(-e.delta, e.cur); implColor = TONE.neg }
                const me = s.me || 'dani'
                const payerText = e.transfer ? '' : e.payerId === me ? 'Pagaste vos' : 'Pagó ' + e.payerShort
                return (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0', borderBottom: i < expenses.length - 1 ? '1px solid #F4F6FA' : 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 11, background: '#F4F6FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{e.catIcon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#0B1220' }}>{e.catName}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                        {!e.direct && <span style={{ background: '#F1ECFD', color: '#7C3AED', padding: '1px 7px', borderRadius: 999, fontSize: 10 }}>{e.gname}</span>}{payerText ? payerText + ' · ' : ''}{fmtDateFull(e.date)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div className="num" style={{ fontWeight: 700, fontSize: 13.5, color: '#334155' }}>{fmt(e.amount, e.cur)}</div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: implColor }}>{implText}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 16px', color: '#B6BFCC' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🤝</div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#64748B', marginBottom: 3 }}>Sin gastos compartidos aún</div>
            <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.4 }}>Cuando carguen el primero, aparece acá y empieza a contar el saldo.</div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Hoja "Agregar persona": nombre (+ email opcional) → crea un espacio 1:1 al instante. */
export function AddFriend({ s, actions }) {
  const af = s.addFriend || {}
  const input = { width: '100%', boxSizing: 'border-box', background: '#F4F6FA', border: 'none', outline: 'none', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: '#0B1220', fontWeight: 600, fontFamily: 'inherit' }
  return (
    <div onClick={actions.closeNewFriend} style={{ position: 'fixed', top: 'var(--app-top, 0px)', left: 0, right: 0, height: 'var(--app-h, 100dvh)', zIndex: 40, background: 'rgba(15,23,42,.35)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'ccFade .15s ease' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, background: '#fff', borderRadius: '22px 22px 0 0', padding: '20px 20px 28px', animation: 'ccScr .26s cubic-bezier(.22,1,.36,1)' }}>
        <div style={{ width: 38, height: 4, borderRadius: 999, background: '#E2E8F0', margin: '0 auto 16px' }} />
        <div style={{ fontWeight: 800, fontSize: 17, color: '#0B1220' }}>Agregar persona</div>
        <div style={{ fontSize: 12.5, color: '#94A3B8', fontWeight: 600, marginTop: 2, marginBottom: 16 }}>Se crea un espacio 1:1 al instante. Si todavía no usa la app, queda como invitación pendiente.</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input autoFocus value={af.name || ''} onChange={(e) => actions.onAddFriendField('name', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') actions.createFriend() }} placeholder="Nombre (ej: Caro)" style={input} />
          <input value={af.email || ''} onChange={(e) => actions.onAddFriendField('email', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') actions.createFriend() }} placeholder="Email (opcional, para invitarla)" style={input} />
        </div>
        <div style={{ display: 'flex', gap: 9, marginTop: 18 }}>
          <button onClick={actions.closeNewFriend} style={{ flex: 1, border: '1.5px solid #E2E8F0', background: '#fff', color: '#475569', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, padding: 12, borderRadius: 13, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={actions.createFriend} disabled={!(af.name || '').trim()} style={{ flex: 1.6, border: 'none', background: (af.name || '').trim() ? BRAND_GRADIENT : '#CBD5E1', color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, padding: 12, borderRadius: 13, cursor: (af.name || '').trim() ? 'pointer' : 'default', boxShadow: '0 8px 18px -10px rgba(59,130,246,.7)' }}>Crear espacio 1:1</button>
        </div>
      </div>
    </div>
  )
}
