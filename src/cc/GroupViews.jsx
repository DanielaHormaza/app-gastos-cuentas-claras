import { compute, fmt, buildHistory, scheduled, catById } from './logic'
import { METHOD_COLORS, MONTH_LONG } from './initialState'
import { Chevron, ChevronDown } from './icons'

const cardShadow = '0 2px 10px -7px rgba(15,23,42,.3)'
const MONTH_NAMES = ['Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre']

/** Vista "Gastos futuros": cuotas y fijos por venir (solo grupos). */
export function Futuros({ s, actions }) {
  const gid = s.groupId
  const g = s.groups[gid]
  const c = compute(s, gid)

  if (g.personal) {
    return (
      <Scroll>
        <div style={{ textAlign: 'center', padding: '36px 16px', color: '#B6BFCC' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🗓️</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#64748B', marginBottom: 4 }}>Sin gastos futuros</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.45 }}>Acá vas a ver cuotas o gastos fijos personales que cargues a futuro.</div>
        </div>
      </Scroll>
    )
  }

  const sched = scheduled(gid)
  let totalAmbos = 0
  const months = MONTH_NAMES.map((label, idx) => {
    const items = []
    sched.forEach((sc) => {
      const payer = g.members.find((m) => m.id === sc.payerId) || { initial: '?', color: '#94A3B8', short: '?' }
      if (sc.kind === 'rec') items.push({ icon: sc.icon, title: sc.title, kindText: 'Gasto fijo', amount: sc.perMonth, payer })
      else if (sc.kind === 'cuota' && idx >= sc.startIdx && idx < sc.startIdx + sc.cuotas) items.push({ icon: sc.icon, title: sc.title, kindText: 'Cuota ' + (idx - sc.startIdx + 1) + '/' + sc.cuotas, amount: sc.perMonth, payer })
    })
    const mTotal = items.reduce((a, b) => a + b.amount, 0)
    totalAmbos += mTotal
    return { idx, label: label + ' 2026', isCurrent: idx === 0, items, mTotal, expanded: !!s.expandedMonths[idx] }
  })

  return (
    <Scroll>
      <div style={{ borderRadius: 18, padding: '14px 16px', background: 'linear-gradient(135deg,rgba(46,204,177,.13),rgba(124,58,237,.13))' }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', marginBottom: 10 }}>COMPROMETIDO · PRÓXIMOS 6 MESES</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700 }}>Total de ambos</div>
            <div className="num" style={{ fontWeight: 700, fontSize: 23, letterSpacing: '-0.02em', color: '#0B1220' }}>{fmt(totalAmbos)}</div>
          </div>
          <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(124,58,237,.2)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#7C3AED', fontWeight: 800 }}>Tu parte</div>
            <div className="num" style={{ fontWeight: 700, fontSize: 23, letterSpacing: '-0.02em', color: '#7C3AED' }}>{fmt((totalAmbos * c.daniPct) / 100)}</div>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600, background: '#fff', borderRadius: 12, padding: '9px 11px', display: 'flex', alignItems: 'center', gap: 7, boxShadow: cardShadow }}>
        <span style={{ fontSize: 14 }}>💳</span>El avatar indica quién puso la tarjeta de esa cuota.
      </div>
      {months.map((m) => (
        <div key={m.idx} style={{ background: '#fff', borderRadius: 18, padding: 14, boxShadow: cardShadow, border: m.isCurrent ? '1.5px solid #D9C9FB' : '1px solid #EEF1F6' }}>
          <div onClick={() => actions.toggleMonth(m.idx)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <span style={{ flexShrink: 0, transform: m.expanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .2s ease', display: 'inline-flex' }}><ChevronDown size={16} color="#94A3B8" w={2.8} /></span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: '#0B1220' }}>{m.label}</span>
              {m.isCurrent && <span style={{ fontSize: 9.5, fontWeight: 800, color: '#7C3AED', background: '#F1ECFD', padding: '3px 7px', borderRadius: 999, whiteSpace: 'nowrap' }}>ESTE MES</span>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="num" style={{ fontWeight: 700, fontSize: 17, color: '#0B1220', letterSpacing: '-0.02em' }}>{fmt(m.mTotal)}</div>
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, whiteSpace: 'nowrap' }}>tu parte {fmt((m.mTotal * c.daniPct) / 100)}</div>
            </div>
          </div>
          {m.expanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 13, paddingTop: 13, borderTop: '1px solid #F1F4F9' }}>
              {m.items.length === 0 && <div style={{ fontSize: 12, color: '#B6BFCC', fontWeight: 700, textAlign: 'center' }}>Nada este mes.</div>}
              {m.items.map((it, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 9, background: '#F4F6FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{it.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: '#334155' }}>{it.title}</div>
                    <div style={{ fontSize: 10.5, color: '#94A3B8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {it.kindText} · <span style={{ width: 14, height: 14, borderRadius: 4, background: it.payer.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, flexShrink: 0 }}>{it.payer.initial}</span>{it.payer.short}
                    </div>
                  </div>
                  <div className="num" style={{ fontWeight: 700, fontSize: 14, color: '#0B1220' }}>{fmt(it.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </Scroll>
  )
}

/** Vista "Gastos históricos": barras por mes + desglose + movimientos por mes. */
export function Historicos({ s, actions }) {
  const gid = s.groupId
  const g = s.groups[gid]
  const months = buildHistory(s, gid)
  const histMax = Math.max(1, ...months.map((m) => m.total))
  const selKey = s.histSel[gid] || '2026-06'
  const sel = months.find((m) => m.key === selKey) || months[months.length - 1]

  return (
    <Scroll>
      {/* bar chart */}
      <div style={{ background: '#fff', borderRadius: 18, padding: '15px 16px', boxShadow: cardShadow }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 13 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14.5, color: '#0B1220' }}>Gastos por mes</div>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, marginTop: 1 }}>{MONTH_LONG[sel.key]}</div>
          </div>
          <div className="num" style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em', color: '#0B1220' }}>{fmt(sel.total)}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
          {months.map((m) => {
            const isSel = m.key === sel.key
            return (
              <div key={m.key} onClick={() => actions.setHistSel(gid, m.key)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', borderRadius: '7px 7px 4px 4px', background: isSel ? 'linear-gradient(180deg,#7C3AED,#3B82F6)' : m.current ? '#D9C9FB' : '#E7EAF1', height: Math.max(6, Math.round((m.total / histMax) * 80)), minHeight: 6, transition: 'height .25s ease' }} />
                <div style={{ fontSize: 10, fontWeight: 800, color: isSel ? '#7C3AED' : '#94A3B8' }}>{m.label}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* por medio de pago (personal) */}
      {g.personal && <MethodBreak s={s} sel={sel} actions={actions} />}

      {/* movimientos por mes */}
      <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.05em', padding: '4px 4px 0' }}>MOVIMIENTOS POR MES</div>
      <div style={{ background: '#fff', borderRadius: 18, padding: '6px 14px', boxShadow: cardShadow }}>
        {months.slice().reverse().map((m) => (
          <div key={m.key} onClick={() => actions.openMonthDetail(m.key)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 4px', borderBottom: '1px solid #F4F6FA', cursor: 'pointer' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: m.current ? '#7C3AED' : '#CBD5E1', flexShrink: 0 }} />
            <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5, color: '#334155' }}>{MONTH_LONG[m.key]}</span>
            <span className="num" style={{ fontWeight: 700, fontSize: 14.5, color: '#0B1220' }}>{fmt(m.total)}</span>
            <Chevron size={16} color="#C3CCDA" />
          </div>
        ))}
      </div>
    </Scroll>
  )
}

function MethodBreak({ s, sel, actions }) {
  const entries = Object.entries(sel.methods || {}).filter(([, v]) => v > 0)
  const mtot = entries.reduce((a, [, v]) => a + v, 0)
  const sorted = entries.sort((a, b) => b[1] - a[1])
  return (
    <div style={{ background: '#fff', borderRadius: 18, padding: '15px 16px', boxShadow: cardShadow }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
        <div style={{ fontWeight: 800, fontSize: 14.5, color: '#0B1220' }}>Por medio de pago</div>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#7C3AED', background: '#F1ECFD', padding: '3px 9px', borderRadius: 999 }}>{MONTH_LONG[sel.key]}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map(([mid, amt], i) => {
          const meth = mid === 'sin' ? { name: 'Sin especificar', icon: '🚫' } : s.methods.find((x) => x.id === mid) || { name: mid, icon: '💳' }
          return (
            <div key={mid} onClick={() => actions.openMethodDetail(mid)} style={{ padding: '7px 6px', borderRadius: 12, cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: '#F4F6FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{meth.icon}</div>
                <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5, color: '#334155' }}>{meth.name}</span>
                <span className="num" style={{ fontWeight: 700, fontSize: 14, color: '#0B1220' }}>{fmt(amt)}</span>
                <Chevron size={16} color="#C3CCDA" />
              </div>
              <div style={{ height: 7, borderRadius: 999, background: '#EEF1F6', overflow: 'hidden', marginLeft: 37 }}>
                <div style={{ width: (mtot ? Math.round((amt / mtot) * 100) : 0) + '%', height: '100%', background: METHOD_COLORS[i % METHOD_COLORS.length], borderRadius: 999 }} />
              </div>
            </div>
          )
        })}
        {entries.length === 0 && <div style={{ textAlign: 'center', fontSize: 12.5, color: '#B6BFCC', fontWeight: 700, padding: '6px 0' }}>Sin gastos en este mes.</div>}
      </div>
    </div>
  )
}

const Scroll = ({ children }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#F4F6FA' }}>
    <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
  </div>
)
