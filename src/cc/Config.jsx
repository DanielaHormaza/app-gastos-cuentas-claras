import { Close, Plus, Archive } from './icons'
import { fmtDateFull } from './dates'
import { ledgerMonths } from './logic'
import { ExportBar } from './GroupViews'

const cardShadow = '0 2px 10px -7px rgba(15,23,42,.3)'
const sectionCard = { background: '#fff', borderRadius: 16, padding: 12, boxShadow: cardShadow }

/** Ajustes del grupo (pantalla completa que entra desde ⚙). */
export default function Config({ s, actions }) {
  const gid = s.groupId
  const g = s.groups[gid]
  const sp = s.splits[gid] || {}
  const meta = (s.splitMeta && s.splitMeta[gid]) || {}
  const monthKeys = ledgerMonths(s, gid, true) // incluye meses de gastos futuros en el rango del export

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 14, background: '#F4F6FA', display: 'flex', flexDirection: 'column', animation: 'ccScr .26s cubic-bezier(.22,1,.36,1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: '#fff', borderBottom: '1px solid #EEF1F6' }}>
        <div onClick={actions.closeConfig} style={{ width: 34, height: 34, borderRadius: '50%', background: '#F1F4F9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Close size={16} color="#64748B" /></div>
        <span style={{ fontWeight: 800, fontSize: 16 }}>Ajustes del grupo</span>
        <span onClick={actions.closeConfig} style={{ fontWeight: 800, fontSize: 14, color: '#7C3AED', cursor: 'pointer' }}>Guardar</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* foto + nombre + descripción */}
        <div style={{ ...sectionCard, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div onClick={actions.onChangePhoto} className="num" style={{ position: 'relative', width: 56, height: 56, borderRadius: 16, background: g.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.92)', fontWeight: 800, fontSize: 22, flexShrink: 0, cursor: 'pointer' }}>
            {g.initial}
            <div style={{ position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: '50%', background: '#7C3AED', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff' }}>✎</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input value={g.name} onChange={(e) => actions.onGroupName(e.target.value)} style={{ border: 'none', outline: 'none', fontWeight: 800, fontSize: 16, color: '#0B1220', width: '100%', background: 'transparent', fontFamily: 'inherit' }} />
            <input value={g.description || ''} onChange={(e) => actions.onGroupDesc(e.target.value)} placeholder="Agregá una descripción…" style={{ border: 'none', outline: 'none', fontSize: 11.5, color: '#94A3B8', fontWeight: 600, width: '100%', background: 'transparent', marginTop: 2, fontFamily: 'inherit' }} />
          </div>
        </div>

        {/* miembros */}
        <div style={sectionCard}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#64748B', marginBottom: 4 }}>Miembros · {g.members.length}</div>
          {g.members.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: m.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>{m.initial}</div>
              <span style={{ flex: 1, fontWeight: 800, fontSize: 13.5, color: '#0B1220' }}>{m.name}</span>
              {m.id === (s.me || 'dani') && <span style={{ fontSize: 10, fontWeight: 800, color: '#7C3AED', background: '#F1ECFD', padding: '3px 7px', borderRadius: 999 }}>VOS</span>}
            </div>
          ))}
          {s.addingMember ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0 2px' }}>
              <input value={s.newMemberName} onChange={(e) => actions.onNewMemberName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && actions.onConfirmAddMember()} placeholder="Nombre del nuevo miembro" style={{ flex: 1, border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '9px 11px', outline: 'none', fontWeight: 700, fontSize: 13.5, color: '#0B1220', width: '100%', fontFamily: 'inherit' }} />
              <button onClick={actions.onConfirmAddMember} style={{ border: 'none', background: '#7C3AED', color: '#fff', borderRadius: 10, padding: '9px 14px', fontFamily: 'inherit', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Añadir</button>
            </div>
          ) : (
            <div onClick={actions.onAddMember} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0 2px', color: '#7C3AED', cursor: 'pointer' }}>
              <Plus size={16} color="#7C3AED" /><span style={{ fontWeight: 800, fontSize: 13.5 }}>Añadir miembro</span>
            </div>
          )}
        </div>

        {/* división */}
        <div style={sectionCard}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#64748B' }}>División de gastos</span>
            <span onClick={actions.onEqual} style={{ fontSize: 12, fontWeight: 800, color: '#7C3AED', cursor: 'pointer' }}>Partes iguales</span>
          </div>
          <div style={{ display: 'flex', height: 11, borderRadius: 999, overflow: 'hidden', background: '#EEF1F6', marginBottom: 12 }}>
            {g.members.map((m) => <div key={m.id} style={{ width: (sp[m.id] || 0) + '%', background: m.color, transition: 'width .2s ease' }} />)}
          </div>
          {g.members.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '4px 0' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: m.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, flexShrink: 0 }}>{m.initial}</div>
              <span style={{ flex: 1, fontWeight: 700, fontSize: 13, color: '#334155' }}>{m.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div onClick={() => actions.adjustSplit(m.id, -5)} style={stepper}>−</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '5px 8px' }}>
                  <input value={sp[m.id] || 0} onChange={(e) => actions.setSplitPct(m.id, e.target.value)} inputMode="numeric" className="num" style={{ width: 26, border: 'none', outline: 'none', textAlign: 'right', fontWeight: 700, fontSize: 14, color: '#0B1220', background: 'transparent', fontFamily: 'inherit' }} />
                  <span className="num" style={{ fontWeight: 700, fontSize: 14, color: '#94A3B8' }}>%</span>
                </div>
                <div onClick={() => actions.adjustSplit(m.id, 5)} style={stepper}>+</div>
              </div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: '#B6BFCC', fontWeight: 700, marginTop: 8 }}>
            {meta.by ? 'Modificado por ' + meta.by + ' · ' + fmtDateFull(meta.at) : 'Sin cambios todavía · rige el reparto inicial'}
          </div>
        </div>

        {/* exportar a CSV */}
        {monthKeys.length > 0 && (
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: '#64748B', marginBottom: 8, padding: '0 2px' }}>Exportar movimientos</div>
            <ExportBar s={s} gid={gid} monthKeys={monthKeys} />
          </div>
        )}

        {/* acciones */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '4px 12px', boxShadow: cardShadow }}>
          <div onClick={actions.onArchive} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0', borderBottom: '1px solid #F1F4F9', cursor: 'pointer' }}>
            <Archive size={17} color="#D97706" /><span style={{ flex: 1, fontWeight: 800, fontSize: 13.5, color: '#B45309' }}>Archivar grupo</span>
          </div>
          <div onClick={actions.onArchive} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 0', cursor: 'pointer' }}>
            <Archive size={17} color="#E11D5B" /><span style={{ flex: 1, fontWeight: 800, fontSize: 13.5, color: '#E11D5B' }}>Salir del grupo</span>
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: 11.5, color: '#B6BFCC', fontWeight: 700, padding: '2px 0 6px' }}>Grupo creado el {g.createdAt || '—'}</div>
      </div>
    </div>
  )
}

const stepper = { width: 26, height: 26, borderRadius: '50%', border: '1.5px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 15, cursor: 'pointer', lineHeight: 1 }
