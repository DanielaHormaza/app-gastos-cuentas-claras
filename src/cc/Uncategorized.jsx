import { uncategorizedRows, normDesc, fmt, curList, UNCAT_ID } from './logic'
import { fmtDateFull } from './dates'
import { Back, Check, Close } from './icons'

/** "Sin categorizar": todos los gastos sin categoría (global), agrupados por descripción.
 *  Seleccionás varios y les asignás una categoría; queda recordado para gastos futuros iguales. */
export default function Uncategorized({ s, actions }) {
  const rows = uncategorizedRows(s)
  // Agrupar por descripción normalizada (así "Edemsa" y "edemsa" caen juntos).
  const map = {}
  for (const r of rows) {
    const k = normDesc(r.desc) || '?'
    if (!map[k]) map[k] = { key: k, desc: r.desc, items: [], totals: {} }
    map[k].items.push(r)
    map[k].totals[r.cur] = (map[k].totals[r.cur] || 0) + r.amount
  }
  const groups = Object.values(map).sort((a, b) => b.items.length - a.items.length || (a.desc > b.desc ? 1 : -1))
  const sel = new Set(s.uncatSel || [])
  const keyOf = (r) => r.gid + '|' + r.id
  const allKeys = rows.map(keyOf)
  const groupSelected = (g) => g.items.every((r) => sel.has(keyOf(r)))
  const toggleGroup = (g) => {
    const itemKeys = g.items.map(keyOf)
    const allSel = itemKeys.every((k) => sel.has(k))
    let next = (s.uncatSel || []).filter((k) => !itemKeys.includes(k))
    if (!allSel) next = [...next, ...itemKeys]
    actions.setUncatSel(next)
  }
  const allSelected = rows.length > 0 && allKeys.every((k) => sel.has(k))

  // Categorías asignables (sin el bucket ni los buckets internos).
  const pickable = (s.categories || []).filter((c) => c.id !== UNCAT_ID && c.id !== 'transfer' && c.id !== 'inicial')

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#FBFCFE', animation: 'ccIn .26s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 16px', borderBottom: '1px solid #EEF1F6' }}>
        <div onClick={actions.backToList} style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Back size={20} /></div>
        <span style={{ fontWeight: 800, fontSize: 18, flex: 1 }}>Sin categorizar</span>
        {rows.length > 0 && (
          <span onClick={() => actions.setUncatSel(allSelected ? [] : allKeys)} style={{ fontSize: 12.5, fontWeight: 800, color: '#7C3AED', cursor: 'pointer' }}>
            {allSelected ? 'Limpiar' : 'Todos'}
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 96px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: '#B6BFCC' }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>🎉</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#64748B', marginBottom: 3 }}>¡Todo categorizado!</div>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>No quedan gastos sin categoría.</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12.5, color: '#64748B', fontWeight: 600, lineHeight: 1.45, padding: '0 2px 4px' }}>
              Seleccioná gastos y asignales una categoría. La próxima vez que cargues un gasto con la misma descripción, se categoriza solo.
            </div>
            {groups.map((g) => {
              const isSel = groupSelected(g)
              const totals = curList(g.totals)
              const last = g.items.slice().sort((a, b) => (a.date < b.date ? 1 : -1))[0]
              return (
                <div key={g.key} onClick={() => toggleGroup(g)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 13px', borderRadius: 16, background: isSel ? '#F6F3FE' : '#fff', border: '1.5px solid ' + (isSel ? '#C9B8F6' : '#EEF1F6'), cursor: 'pointer', boxShadow: '0 2px 10px -8px rgba(15,23,42,.3)' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 7, border: '2px solid ' + (isSel ? '#7C3AED' : '#CBD5E1'), background: isSel ? '#7C3AED' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {isSel && <Check size={14} color="#fff" />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14.5, color: '#0B1220', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.desc}</div>
                    <div style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 600 }}>
                      {g.items.length === 1 ? (last.personal ? 'Personal' : last.gname) + ' · ' + fmtDateFull(last.date) : g.items.length + ' movimientos'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {totals.map(([cur, v]) => (
                      <div key={cur} className="num" style={{ fontWeight: 700, fontSize: 13.5, color: '#334155', lineHeight: 1.2 }}>{fmt(v, cur)}</div>
                    ))}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* barra inferior: asignar categoría a lo seleccionado */}
      {sel.size > 0 && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 16px calc(env(safe-area-inset-bottom, 0px) + 16px)', background: 'linear-gradient(180deg,rgba(251,252,254,0),#FBFCFE 30%)' }}>
          <button onClick={actions.openUncatPick} style={{ width: '100%', border: 'none', background: 'linear-gradient(135deg,#2ECCB1,#3B82F6,#7C3AED)', color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 15, padding: 15, borderRadius: 14, cursor: 'pointer', boxShadow: '0 12px 26px -12px rgba(59,130,246,.6)' }}>
            Asignar categoría ({sel.size})
          </button>
        </div>
      )}

      {/* hoja: elegir categoría */}
      {s.uncatPick && (
        <div onClick={actions.closeUncatPick} style={{ position: 'fixed', top: 'var(--app-top, 0px)', left: 0, right: 0, height: 'var(--app-h, 100dvh)', zIndex: 40, background: 'rgba(15,23,42,.35)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'ccFade .15s ease' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, background: '#fff', borderRadius: '22px 22px 0 0', padding: '18px 18px 28px', maxHeight: '70%', overflowY: 'auto', animation: 'ccScr .26s cubic-bezier(.22,1,.36,1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#0B1220' }}>Elegí categoría</div>
              <div onClick={actions.closeUncatPick} style={{ width: 30, height: 30, borderRadius: '50%', background: '#F1F4F9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Close size={15} color="#64748B" /></div>
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600, marginBottom: 14 }}>Se aplica a {sel.size} {sel.size === 1 ? 'gasto' : 'gastos'} y se recuerda para los próximos.</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 9 }}>
              {pickable.map((c) => (
                <div key={c.id} onClick={() => actions.assignUncatCategory(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 13px', borderRadius: 13, background: '#F8FAFC', border: '1px solid #EEF1F6', cursor: 'pointer' }}>
                  <span style={{ fontSize: 19, flexShrink: 0 }}>{c.icon}</span>
                  <span style={{ fontWeight: 800, fontSize: 13.5, color: '#0B1220', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
