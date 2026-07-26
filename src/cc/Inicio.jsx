import { useRef } from 'react'
import { compute, fmt, totalsByCurrency, friendIds, computeFriend, personById, personColor, isPending, isOneToOne, personalSpent, curList, TONE, TONE_BG } from './logic'
import { todayISO, monthKeyOf } from './dates'
import { Logo, Chevron, Plus, Archive, EyeToggle, Pin } from './icons'

/** Pantalla Inicio: cifra hero + pestañas Personas / Grupos. */
export default function Inicio({ s, actions }) {
  const me = s.me || 'dani'
  const allIds = Object.keys(s.groups).filter((id) => id !== 'personal')
  const activeIds = allIds.filter((id) => !s.archived[id]) // visibles en las listas (sin archivados)
  // Pestaña Grupos: todo lo que no sea un 1:1 (grupos de 3+, o grupos con nombre de 2 personas).
  const groupIds = activeIds.filter((id) => !isOneToOne(s, id))
  const archivedIds = allIds.filter((id) => s.archived[id] && !isOneToOne(s, id)) // grupos archivados
  const archivedFriendIds = allIds.filter((id) => s.archived[id] && isOneToOne(s, id)) // 1:1 (amigos) archivados
  // Fijados en el inicio (personas y grupos válidos).
  const friendIdList = friendIds(s)
  const validPins = (s.pinned || []).filter((p) => (p.kind === 'group' ? s.groups[p.id] && !s.archived[p.id] : friendIdList.includes(p.id)))
  // Cuenta nueva: todavía no agregó a nadie ni creó grupos → mostramos la guía de primeros pasos.
  const isNewAccount = friendIdList.length === 0 && groupIds.length === 0 && archivedIds.length === 0 && archivedFriendIds.length === 0
  // Long-press en el inicio para fijar/desfijar sin entrar.
  const lpRef = useRef({})
  const longPress = (kind, id) => {
    const cancel = () => clearTimeout(lpRef.current.t)
    return {
      onPointerDown: () => { lpRef.current.fired = false; lpRef.current.t = setTimeout(() => { lpRef.current.fired = true; actions.togglePin(kind, id) }, 500) },
      onPointerUp: cancel,
      onPointerMove: cancel,
      onPointerLeave: cancel,
      onClickCapture: (e) => { if (lpRef.current.fired) { e.preventDefault(); e.stopPropagation(); lpRef.current.fired = false } },
    }
  }

  // Total por moneda (sin conversión). Cada moneda es una línea. Suma TODOS los espacios (1:1 + grupos),
  // incluidos los archivados: archivar oculta de la lista pero el saldo sigue contando.
  const totals = totalsByCurrency(s, allIds) // [[cur, net], ...]
  const allPos = totals.every(([, v]) => v >= 0)
  const allNeg = totals.every(([, v]) => v < 0)
  const totalLabel = totals.length === 0 ? 'Estás al día' : allPos ? 'En total, te deben' : allNeg ? 'En total, debés' : 'Tu saldo'
  const heroTone = totals.length === 0 ? TONE.pos : allPos ? TONE.pos : allNeg ? TONE.neg : '#94A3B8'

  // "Mis gastos" en la home = saldo del MES EN CURSO (lo personal + tu parte de todos los grupos).
  const ps = personalSpent(s, monthKeyOf(todayISO()))
  const personalAmount = ps.length ? fmt(Math.abs(ps[0][1]), ps[0][0]) : '$0'
  const prof = s.profile
  const profInitial = (prof.name.trim()[0] || 'D').toUpperCase()

  const tab = s.homeTab || 'personas'

  // Personas con las que compartís gastos, ordenadas por saldo (más relevante primero).
  const friends = friendIds(s)
    .map((pid) => ({ pid, calc: computeFriend(s, pid), person: personById(s, pid) }))
    .sort((a, b) => {
      const sa = curList(a.calc.nets).reduce((t, [, v]) => t + Math.abs(v), 0)
      const sb = curList(b.calc.nets).reduce((t, [, v]) => t + Math.abs(v), 0)
      return sb - sa
    })

  // Grupo seleccionado (para resaltar en el panel izquierdo del desktop).
  const sel = s.screen === 'chat' ? s.groupId : null
  const ring = '0 0 0 2px #C9B8F6'

  // Pill segmentado de pestañas.
  const tabBtn = (key, label) => {
    const active = tab === key
    return (
      <div
        onClick={() => actions.setHomeTab(key)}
        style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: 'pointer', color: active ? '#0B1220' : '#94A3B8', background: active ? '#fff' : 'transparent', boxShadow: active ? '0 2px 8px -3px rgba(15,23,42,.25)' : 'none', transition: 'color .15s ease' }}
      >
        {label}
      </div>
    )
  }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#FBFCFE', animation: 'ccInL .26s ease' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Logo size={28} />
          <div>
            <span className="num" style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>
              <span style={{ color: '#0B1220' }}>Cuentas </span>
              <span style={{ color: '#7C3AED' }}>Claras</span>
            </span>
            {prof.founderNumber && (
              <div onClick={actions.openProfile} title="Miembro fundador" style={{ position: 'relative', overflow: 'hidden', display: 'flex', width: 'fit-content', alignItems: 'center', gap: 6, marginTop: 4, padding: '4px 13px 4px 8px', borderRadius: 999, background: 'linear-gradient(135deg,#FDEBAB 0%,#F4C75A 48%,#E3A52E 100%)', border: '1px solid #E7BC5E', boxShadow: '0 2px 7px -3px rgba(199,138,30,.6), inset 0 1px 0 rgba(255,255,255,.55)', cursor: 'pointer' }}>
                <span aria-hidden="true" data-cc-shine style={{ position: 'absolute', top: 0, bottom: 0, width: '38%', background: 'linear-gradient(105deg,transparent,rgba(255,255,255,.7),transparent)', animation: 'ccShine 2.4s ease-in-out forwards' }} />
                <span style={{ position: 'relative', fontSize: 12 }}>🥇</span>
                <span style={{ position: 'relative', fontSize: 11, fontWeight: 800, color: '#7A4710', letterSpacing: '-0.01em' }}>Miembro fundador #{prof.founderNumber}</span>
              </div>
            )}
          </div>
        </div>
        <div
          onClick={actions.openProfile}
          style={{ width: 38, height: 38, borderRadius: '50%', background: prof.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#fff', cursor: 'pointer', flexShrink: 0 }}
        >
          {profInitial}
        </div>
      </div>

      {/* cifra hero (una línea por moneda; sin conversión) */}
      <div style={{ padding: '22px 26px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {totals.length > 0 && <span style={{ width: 8, height: 8, borderRadius: '50%', background: heroTone, flexShrink: 0 }} />}
          <div style={{ fontSize: 13, color: totals.length === 0 ? '#94A3B8' : heroTone, fontWeight: 800 }}>{totalLabel}</div>
          <button onClick={actions.toggleHideAmounts} title={s.hideAmounts ? 'Mostrar montos' : 'Ocultar montos'} aria-label={s.hideAmounts ? 'Mostrar montos' : 'Ocultar montos'} style={{ border: 'none', background: 'transparent', padding: 2, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
            <EyeToggle size={17} color="#94A3B8" hidden={s.hideAmounts} />
          </button>
        </div>
        {totals.length === 0 ? (
          <div className="num" style={{ fontSize: 36, fontWeight: 500, letterSpacing: '-0.02em', color: '#0B1220', marginTop: 4 }}>$0</div>
        ) : (
          totals.map(([cur, v], i) => {
            const pos = v >= 0
            const tone = pos ? TONE.pos : TONE.neg
            return (
              <div key={cur} style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: i === 0 ? 4 : 2, flexWrap: 'wrap' }}>
                <span className="num" style={{ fontSize: i === 0 ? 36 : 19, fontWeight: 500, letterSpacing: '-0.02em', color: tone, lineHeight: 1.15 }}>{fmt(Math.abs(v), cur)}</span>
                <span style={{ fontSize: i === 0 ? 12.5 : 11, fontWeight: 800, color: tone }}>{pos ? 'te deben' : 'debés'}</span>
              </div>
            )
          })
        )}
      </div>

      {/* Mis gastos: acceso fijo, siempre debajo del saldo total y arriba de Fijados / pestañas */}
      <div style={{ padding: '0 16px 12px', flexShrink: 0 }}>
        <div
          onClick={actions.openPersonal}
          style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 13px', borderRadius: 18, background: 'linear-gradient(135deg,rgba(46,204,177,.14),rgba(124,58,237,.14))', cursor: 'pointer', boxShadow: sel === 'personal' ? ring : 'none' }}
        >
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21, flexShrink: 0, boxShadow: '0 2px 8px -4px rgba(15,23,42,.3)' }}>🧾</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15.5, color: '#0B1220' }}>Mis gastos</div>
            <div style={{ fontSize: 12.5, color: '#64748B', fontWeight: 600 }}>Este mes · tuyos + tu parte en grupos</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="num" style={{ fontWeight: 700, fontSize: 16, color: '#0B1220' }}>{personalAmount}</div>
            <Chevron />
          </div>
        </div>
      </div>

      {/* Primeros pasos: guía para una cuenta nueva (sin amigos ni grupos todavía) */}
      {isNewAccount && (
        <div style={{ padding: '0 16px 12px', flexShrink: 0 }}>
          <div style={{ borderRadius: 18, border: '1.5px dashed #DCE2EA', background: '#fff', padding: '15px 15px 13px' }}>
            <div style={{ fontWeight: 800, fontSize: 15.5, color: '#0B1220', marginBottom: 3 }}>👋 Empezá en segundos</div>
            <div style={{ fontSize: 12.5, color: '#64748B', fontWeight: 600, lineHeight: 1.45, marginBottom: 12 }}>
              Cargá los gastos escribiéndolos como hablás. Ej: <b style={{ color: '#0B1220' }}>“8000 nafta pagó Juan”</b>.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { emoji: '🧾', label: 'Cargá un gasto tuyo', sub: 'En “Mis gastos”', onClick: actions.openPersonal },
                { emoji: '👤', label: 'Agregá una persona', sub: 'Se crea un 1:1 al instante', onClick: actions.openNewFriend },
                { emoji: '👥', label: 'Creá un grupo', sub: 'Para un viaje, el depto…', onClick: actions.openNewGroup },
              ].map((a) => (
                <div key={a.label} onClick={a.onClick} style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#F8FAFC', border: '1px solid #EEF1F6', borderRadius: 13, padding: '10px 12px', cursor: 'pointer' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, boxShadow: '0 1px 0 #EEF1F6' }}>{a.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 13.5, color: '#0B1220' }}>{a.label}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>{a.sub}</div>
                  </div>
                  <Chevron />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* fijados: franja de acceso rápido (personas y grupos), uno debajo del otro, arriba del selector */}
      {validPins.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 18px 12px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '0 2px' }}>
            <Pin size={12} filled color="#94A3B8" />Fijados
          </div>
          {validPins.map((p) => {
            const isG = p.kind === 'group'
            const nets = isG ? compute(s, p.id).nets : computeFriend(s, p.id).nets
            const curs = curList(nets)
            const label = curs.length === 0 ? 'a mano' : curs[0][1] > 0 ? 'te debe' : 'le debés'
            const tone = curs.length === 0 ? TONE.even : curs[0][1] > 0 ? TONE.pos : TONE.neg
            const sub = curs.length === 0 ? label : fmt(Math.abs(curs[0][1]), curs[0][0]) + ' · ' + label
            const title = isG ? s.groups[p.id].name : personById(s, p.id).short
            const avatar = isG
              ? <div style={{ width: 36, height: 36, borderRadius: 12, background: s.groups[p.id].gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>{s.groups[p.id].initial}</div>
              : <div style={{ width: 36, height: 36, borderRadius: '50%', background: personColor(s, p.id), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{personById(s, p.id).initial}</div>
            return (
              <div key={p.kind + p.id} onClick={() => (isG ? actions.openGroup(p.id) : actions.openFriendChat(p.id))} style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#fff', border: '1px solid #EEF1F6', borderRadius: 15, padding: '10px 12px', boxShadow: '0 2px 10px -7px rgba(15,23,42,.3)', cursor: 'pointer' }}>
                {avatar}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14.5, color: '#0B1220', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: tone }}>{sub}</div>
                </div>
                <div onClick={(e) => { e.stopPropagation(); actions.requestUnpin(p.kind, p.id) }} title="Desfijar" style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
                  <Pin size={16} filled color="#7C3AED" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* pestañas Personas / Grupos */}
      <div style={{ margin: '0 18px 10px', display: 'flex', gap: 4, background: '#EDF0F5', borderRadius: 13, padding: 4, flexShrink: 0 }}>
        {tabBtn('personas', 'Amigos')}
        {tabBtn('grupos', 'Grupos')}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tab === 'personas' ? (
          <>
            {friends.map(({ pid, calc, person }) => {
              const lines = curList(calc.nets)
              const pending = isPending(s, pid)
              const fAllPos = lines.every(([, v]) => v >= 0)
              const fAllNeg = lines.every(([, v]) => v < 0)
              const label = lines.length === 0 ? 'a mano' : fAllPos ? 'te debe' : fAllNeg ? 'le debés' : 'saldos'
              const labelColor = lines.length === 0 ? TONE.even : fAllPos ? TONE.pos : fAllNeg ? TONE.neg : '#64748B'
              // contexto: cuántos espacios comparten (sin nombrar el 1:1)
              const shared = calc.groups
              let ctx
              if (shared.length === 0) ctx = 'Sin movimientos'
              else if (shared.length === 1) ctx = shared[0].direct ? 'Gastos entre ustedes' : shared[0].name
              else ctx = shared.length + ' espacios compartidos'
              return (
                <div
                  key={pid}
                  onClick={() => actions.openFriendChat(pid)}
                  {...longPress('person', pid)}
                  style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 12px', borderRadius: 18, background: sel && s.groups[sel] && (s.groups[sel].direct || s.groups[sel].members.length === 2) && s.groups[sel].members.some((m) => m.id === pid) ? '#F6F3FE' : '#fff', boxShadow: '0 1px 0 #EEF1F6', cursor: 'pointer' }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: personColor(s, pid), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>{person.initial}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#0B1220' }}>{person.short}</div>
                    {pending ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: '#B5742F', background: '#FBF1E3', padding: '2px 9px', borderRadius: 999, marginTop: 3 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D9942E' }} />Invitación pendiente
                      </span>
                    ) : (
                      <div style={{ fontSize: 12.5, color: '#94A3B8', fontWeight: 600 }}>{ctx}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                    {lines.length === 0 ? (
                      <span className="num" style={{ fontWeight: 700, fontSize: 13.5, color: TONE.even, background: TONE_BG.even, padding: '3px 10px', borderRadius: 999 }}>$0</span>
                    ) : (
                      lines.map(([cur, v]) => (
                        <span key={cur} className="num" style={{ fontWeight: 700, fontSize: 13.5, color: v > 0 ? TONE.pos : TONE.neg, background: v > 0 ? TONE_BG.pos : TONE_BG.neg, padding: '3px 10px', borderRadius: 999 }}>{fmt(Math.abs(v), cur)}</span>
                      ))
                    )}
                    <span style={{ fontSize: 10.5, color: labelColor, fontWeight: 700 }}>{label}</span>
                  </div>
                </div>
              )
            })}

            <div
              onClick={actions.openNewFriend}
              style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 12, borderRadius: 18, border: '1.5px dashed #DCE2EA', marginTop: 2, cursor: 'pointer' }}
            >
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F1F4F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Plus /></div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: '#475569' }}>Agregar persona</div>
                <div style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 600 }}>Se crea un espacio 1:1 al instante</div>
              </div>
            </div>

            {archivedFriendIds.length > 0 && (
              <div
                onClick={actions.openArchived}
                style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px', borderRadius: 16, background: '#F4F6FA', cursor: 'pointer', marginTop: 2 }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 11, background: '#E7EAF1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Archive /></div>
                <div style={{ flex: 1, fontWeight: 800, fontSize: 14.5, color: '#475569' }}>Amigos archivados</div>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', background: '#fff', padding: '3px 9px', borderRadius: 999 }}>{archivedFriendIds.length}</span>
                <Chevron />
              </div>
            )}
          </>
        ) : (
          <>
            {groupIds.map((id) => {
              const g = s.groups[id]
              const c = compute(s, id)
              const curs = curList(c.nets).map(([cu]) => cu)
              const others = g.members.filter((m) => m.id !== me)
              const membersText = others.length === 1 ? others[0].short + ' y ' + s.profile.name : g.members.length + ' personas'
              const label = curs.length === 0 ? 'a mano' : c.nets[curs[0]] > 0 ? 'te debe' : 'le debés'
              const cardTone = curs.length === 0 ? TONE.even : c.nets[curs[0]] > 0 ? TONE.pos : TONE.neg
              return (
                <div
                  key={id}
                  onClick={() => actions.openGroup(id)}
                  {...longPress('group', id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 12px', borderRadius: 18, background: sel === id ? '#F6F3FE' : '#fff', boxShadow: sel === id ? ring : '0 1px 0 #EEF1F6', cursor: 'pointer' }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 16, background: g.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 19, flexShrink: 0 }}>{g.initial}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#0B1220' }}>{g.name}</div>
                    <div style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600 }}>{membersText}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {curs.length === 0 ? (
                      <div className="num" style={{ fontWeight: 800, fontSize: 14.5, color: '#94A3B8' }}>$0</div>
                    ) : (
                      curs.map((cu) => (
                        <div key={cu} className="num" style={{ fontWeight: 800, fontSize: 14.5, color: '#0B1220', lineHeight: 1.25 }}>{fmt(Math.abs(c.nets[cu]), cu)}</div>
                      ))
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5, fontSize: 11, fontWeight: 700, color: cardTone, marginTop: 1 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: cardTone, flexShrink: 0 }} />{label}
                    </div>
                  </div>
                </div>
              )
            })}

            <div
              onClick={actions.openNewGroup}
              style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 12px', borderRadius: 18, border: '1.5px dashed #DCE2EA', marginTop: 2, cursor: 'pointer' }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 16, background: '#F1F4F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Plus /></div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#94A3B8' }}>Nuevo grupo</div>
            </div>

            {archivedIds.length > 0 && (
              <div
                onClick={actions.openArchived}
                style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px', borderRadius: 16, background: '#F4F6FA', cursor: 'pointer', marginTop: 2 }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 11, background: '#E7EAF1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Archive /></div>
                <div style={{ flex: 1, fontWeight: 800, fontSize: 14.5, color: '#475569' }}>Grupos archivados</div>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', background: '#fff', padding: '3px 9px', borderRadius: 999 }}>{archivedIds.length}</span>
                <Chevron />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
