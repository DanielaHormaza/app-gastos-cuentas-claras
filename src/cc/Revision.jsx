import { dataFlags, catById, fmt } from './logic'
import { fmtDateFull } from './dates'

const cardShadow = '0 2px 10px -7px rgba(15,23,42,.3)'

/** Vista "Revisión de datos": lista posibles errores de carga, tappables para corregir. */
export default function Revision({ s, actions }) {
  const gid = s.groupId
  const flags = dataFlags(s, gid)
  const ok = flags.length === 0

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 16px', background: '#F4F6FA', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* resumen */}
      <div style={{ borderRadius: 16, padding: '14px 16px', background: ok ? 'linear-gradient(135deg,rgba(46,204,177,.16),rgba(59,130,246,.12))' : 'linear-gradient(135deg,rgba(245,158,11,.16),rgba(239,68,68,.12))', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 26 }}>{ok ? '✅' : '⚠️'}</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: '#0B1220' }}>{ok ? 'Datos en orden' : flags.length + (flags.length > 1 ? ' movimientos para revisar' : ' movimiento para revisar')}</div>
          <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>{ok ? 'No detectamos problemas de carga.' : 'Tocá cada uno para corregirlo.'}</div>
        </div>
      </div>

      {flags.map((f) => {
        const cat = catById(s, f.entry.categoryId)
        return (
          <div key={f.id} onClick={() => actions.openEdit(f.entry)} style={{ background: '#fff', borderRadius: 15, padding: '12px 14px', boxShadow: cardShadow, cursor: 'pointer', borderLeft: '4px solid #F59E0B' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 18, flexShrink: 0 }}>{cat.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#0B1220', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.entry.desc || cat.name}</div>
                <div style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 700 }}>{fmtDateFull(f.entry.date)}</div>
              </div>
              <div className="num" style={{ fontWeight: 700, fontSize: 14, color: '#0B1220', flexShrink: 0 }}>{fmt(f.entry.amount, f.entry.currency)}</div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
              {f.issues.map((is) => (
                <span key={is} style={{ fontSize: 11, fontWeight: 800, color: '#B45309', background: '#FEF3E2', borderRadius: 999, padding: '3px 9px' }}>{is}</span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
