import { Back } from './icons'
import { fmt, catById, buildHistory, monthMovements, monthLongLabel, CURRENCIES } from './logic'
import { fmtDateFull } from './dates'

const cardShadow = '0 2px 10px -7px rgba(15,23,42,.3)'

/** Detalle de un medio de pago (total, gastos del mes, totales por mes). */
export function MethodDetail({ s, actions }) {
  const mid = s.methodId
  const meth = !mid || mid === 'sin' ? { name: 'Sin especificar', icon: '🚫' } : s.methods.find((x) => x.id === mid) || { name: 'Medio de pago', icon: '💳' }
  const led = (s.ledgers.personal || []).filter((e) => (e.methodId || 'sin') === (mid || 'sin'))
  const mh = buildHistory(s, 'personal')
  const allTot = mh.reduce((a, m) => a + ((m.methods && m.methods[mid || 'sin']) || 0), 0)

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#F4F6FA', animation: 'ccIn .26s ease' }}>
      <Header title="Medio de pago" onBack={actions.backToPersonalHist} />
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ borderRadius: 18, padding: 16, background: 'linear-gradient(135deg,rgba(46,204,177,.14),rgba(124,58,237,.14))', display: 'flex', alignItems: 'center', gap: 13 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 23, flexShrink: 0, boxShadow: '0 2px 8px -4px rgba(15,23,42,.3)' }}>{meth.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#0B1220' }}>{meth.name}</div>
            <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Total acumulado</div>
          </div>
          <div className="num" style={{ fontWeight: 700, fontSize: 24, letterSpacing: '-0.02em', color: '#0B1220' }}>{fmt(allTot)}</div>
        </div>

        <Label>GASTOS DE ESTE MES</Label>
        <div style={{ background: '#fff', borderRadius: 16, padding: 4, boxShadow: cardShadow }}>
          {led.map((e) => {
            const cat = catById(s, e.categoryId)
            return (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 11 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: '#F4F6FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{cat.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 800, fontSize: 14.5, color: '#0B1220' }}>{e.desc || cat.name}</div><div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>{fmtDateFull(e.date)}</div></div>
                <div className="num" style={{ fontWeight: 700, fontSize: 15, color: '#0B1220' }}>{fmt(e.amount, e.currency)}</div>
              </div>
            )
          })}
          {led.length === 0 && <div style={{ textAlign: 'center', fontSize: 12.5, color: '#B6BFCC', fontWeight: 700, padding: '16px 0' }}>Sin gastos con este medio este mes.</div>}
        </div>

        <Label>POR MES</Label>
        <div style={{ background: '#fff', borderRadius: 16, padding: '6px 14px', boxShadow: cardShadow }}>
          {mh.slice().reverse().map((m) => (
            <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 4px', borderBottom: '1px solid #F4F6FA' }}>
              <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5, color: '#334155' }}>{monthLongLabel(m.key)}</span>
              <span className="num" style={{ fontWeight: 700, fontSize: 14, color: '#0B1220' }}>{fmt((m.methods && m.methods[mid || 'sin']) || 0)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Detalle de movimientos de un mes (con filtro por medio en personal). */
export function MonthDetail({ s, actions }) {
  const gid = s.groupId
  const g = s.groups[gid]
  const key = s.monthKey || '2026-06'
  const all = monthMovements(s, gid, key)
  const fkey = s.monthFilter
  const list = g.personal && fkey ? all.filter((m) => m.methodId === fkey) : all

  // Total por moneda (sin conversión).
  const totByCur = {}
  list.forEach((m) => { totByCur[m._cur] = (totByCur[m._cur] || 0) + m._amt })
  const totLines = CURRENCIES.filter((cu) => totByCur[cu]).map((cu) => fmt(totByCur[cu], cu))

  let filters = []
  if (g.personal) {
    const seen = []
    all.forEach((m) => { if (!seen.includes(m.methodId)) seen.push(m.methodId) })
    const lbl = (id) => (id === 'sin' ? 'Sin medio' : (s.methods.find((x) => x.id === id) || {}).name || 'Otro')
    filters = [{ id: null, label: 'Todos' }].concat(seen.map((id) => ({ id, label: lbl(id) })))
  }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#F4F6FA', animation: 'ccIn .26s ease' }}>
      <Header title={monthLongLabel(key)} onBack={actions.backToHist} />
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div style={{ borderRadius: 16, padding: '14px 16px', background: 'linear-gradient(135deg,rgba(46,204,177,.14),rgba(124,58,237,.14))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Total del mes</div>
          <div style={{ textAlign: 'right' }}>
            {totLines.length ? totLines.map((t, i) => <div key={i} className="num" style={{ fontWeight: 700, fontSize: 20, letterSpacing: '-0.02em', color: '#0B1220', lineHeight: 1.2 }}>{t}</div>) : <div className="num" style={{ fontWeight: 700, fontSize: 20, color: '#0B1220' }}>{fmt(0)}</div>}
          </div>
        </div>

        {g.personal && (
          <div style={{ display: 'flex', gap: 7, overflowX: 'auto', padding: '2px 0 4px' }}>
            {filters.map((f) => {
              const on = (f.id || null) === (fkey || null)
              return <div key={f.id || 'all'} onClick={() => actions.setMonthFilter(f.id)} style={{ fontSize: 12, fontWeight: 800, padding: '7px 13px', borderRadius: 999, whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0, background: on ? '#0B1220' : '#F1F4F9', color: on ? '#fff' : '#475569' }}>{f.label}</div>
            })}
          </div>
        )}

        {list.map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#fff', borderRadius: 15, padding: '11px 12px', boxShadow: cardShadow }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: it.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15, position: 'relative', flexShrink: 0 }}>
              {it.avatarInitial}
              <span style={{ position: 'absolute', bottom: -3, right: -3, width: 18, height: 18, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, boxShadow: '0 1px 3px rgba(15,23,42,.2)' }}>{it.catIcon}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 800, fontSize: 14.5, color: '#0B1220' }}>{it.title}</div><div style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 700 }}>{it.sub}</div></div>
            <div className="num" style={{ fontWeight: 700, fontSize: 15, color: '#0B1220' }}>{it.amountText}</div>
          </div>
        ))}
        {list.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 16px', color: '#B6BFCC' }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>🧾</div>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>Sin movimientos en este mes.</div>
          </div>
        )}
      </div>
    </div>
  )
}

const Header = ({ title, onBack }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 16px', background: '#fff', borderBottom: '1px solid #EEF1F6' }}>
    <div onClick={onBack} style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Back size={20} /></div>
    <span style={{ fontWeight: 800, fontSize: 18 }}>{title}</span>
  </div>
)
const Label = ({ children }) => <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.05em', padding: '2px 4px' }}>{children}</div>
