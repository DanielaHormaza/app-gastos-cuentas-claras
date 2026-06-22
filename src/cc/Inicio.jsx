import { compute, fmt, totalsByCurrency, CURRENCIES } from './logic'
import { Logo, Chevron, Plus, Archive } from './icons'

/** Pantalla Inicio: cifra hero + "Mis gastos" + lista de grupos + archivados. */
export default function Inicio({ s, actions }) {
  const allIds = Object.keys(s.groups).filter((id) => id !== 'personal')
  const activeIds = allIds.filter((id) => !s.archived[id])
  const archivedIds = allIds.filter((id) => s.archived[id])

  // Total por moneda (sin conversión). Cada moneda es una línea.
  const totals = totalsByCurrency(s, activeIds) // [[cur, net], ...]
  const allPos = totals.every(([, v]) => v >= 0)
  const allNeg = totals.every(([, v]) => v < 0)
  const totalLabel = totals.length === 0 ? 'Estás al día' : allPos ? 'En total, te deben' : allNeg ? 'En total, debés' : 'Tu saldo'

  const personalSum = (s.ledgers.personal || []).reduce((a, e) => a + e.amount, 0)
  const prof = s.profile
  const profInitial = (prof.name.trim()[0] || 'D').toUpperCase()

  // Grupo seleccionado (para resaltar en el panel izquierdo del desktop).
  const sel = s.screen === 'chat' ? s.groupId : null
  const ring = '0 0 0 2px #C9B8F6'

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#FBFCFE', animation: 'ccInL .26s ease' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <Logo size={28} />
          <span className="num" style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em' }}>
            <span style={{ color: '#0B1220' }}>Cuentas </span>
            <span style={{ color: '#7C3AED' }}>Claras</span>
          </span>
        </div>
        <div
          onClick={actions.openProfile}
          style={{ width: 38, height: 38, borderRadius: '50%', background: prof.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#fff', cursor: 'pointer', flexShrink: 0 }}
        >
          {profInitial}
        </div>
      </div>

      {/* cifra hero (una línea por moneda; sin conversión) */}
      <div style={{ padding: '24px 26px 20px' }}>
        <div style={{ fontSize: 13, color: '#94A3B8', fontWeight: 700 }}>{totalLabel}</div>
        {totals.length === 0 ? (
          <div className="num" style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.03em', color: '#0B1220', marginTop: 4 }}>$0</div>
        ) : (
          totals.map(([cur, v], i) => (
            <div key={cur} className="num" style={{ fontSize: i === 0 ? 44 : 22, fontWeight: 700, letterSpacing: '-0.03em', color: v >= 0 ? '#0B1220' : '#E11D5B', marginTop: i === 0 ? 4 : 0, lineHeight: 1.1 }}>
              {fmt(Math.abs(v), cur)}
            </div>
          ))
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Mis gastos */}
        <div
          onClick={actions.openPersonal}
          style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 14px', borderRadius: 18, background: 'linear-gradient(135deg,rgba(46,204,177,.14),rgba(124,58,237,.14))', cursor: 'pointer', boxShadow: sel === 'personal' ? ring : 'none' }}
        >
          <div style={{ width: 46, height: 46, borderRadius: 14, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21, flexShrink: 0, boxShadow: '0 2px 8px -4px rgba(15,23,42,.3)' }}>🧾</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15.5, color: '#0B1220' }}>Mis gastos</div>
            <div style={{ fontSize: 12.5, color: '#64748B', fontWeight: 600 }}>Junio 2026 · solo tuyos</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="num" style={{ fontWeight: 700, fontSize: 16, color: '#0B1220' }}>{fmt(personalSum)}</div>
            <Chevron />
          </div>
        </div>

        {/* grupos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 10px 6px' }}>Tus grupos</div>
          {activeIds.map((id) => {
            const g = s.groups[id]
            const c = compute(s, id)
            const curs = CURRENCIES.filter((cu) => Math.abs(c.nets[cu] || 0) >= 1)
            const others = g.members.filter((m) => m.id !== (s.me || 'dani'))
            const membersText = others.length === 1 ? others[0].short + ' y ' + s.profile.name : g.members.length + ' personas'
            const label = curs.length === 0 ? 'a mano' : (c.nets[curs[0]] > 0 ? 'te debe' : 'le debés')
            return (
              <div
                key={id}
                onClick={() => actions.openGroup(id)}
                style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 12px', borderRadius: 18, background: sel === id ? '#F6F3FE' : '#fff', boxShadow: sel === id ? ring : '0 1px 0 #EEF1F6', cursor: 'pointer' }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 16, background: g.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 19, flexShrink: 0 }}>{g.initial}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: '#0B1220' }}>{g.name}</div>
                  <div style={{ fontSize: 13, color: '#94A3B8', fontWeight: 600 }}>{membersText}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {curs.length === 0 ? (
                    <div style={{ fontWeight: 800, fontSize: 14.5, color: '#94A3B8' }}>$0</div>
                  ) : (
                    curs.map((cu) => (
                      <div key={cu} style={{ fontWeight: 800, fontSize: 14.5, color: c.nets[cu] > 0 ? '#0E9F86' : '#E11D5B', lineHeight: 1.25 }}>{fmt(Math.abs(c.nets[cu]), cu)}</div>
                    ))
                  )}
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700 }}>{label}</div>
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
        </div>

        {/* archivados */}
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
      </div>
    </div>
  )
}
