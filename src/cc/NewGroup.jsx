import { Back, Plus, Close, Check } from './icons'
import { BRAND_GRADIENT, PALETTE } from './initialState'
import { friendIds, personById, personColor } from './logic'

const sectionLabel = { fontSize: 10.5, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.05em', marginBottom: 6 }
const inputStyle = { border: '1.5px solid #E7EAF1', borderRadius: 13, padding: '12px 14px', outline: 'none', color: '#0B1220', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box' }

/** Crear un grupo nuevo: nombre, descripción, participantes, invitar. */
export default function NewGroup({ s, actions }) {
  const ng = s.newGroup
  const me = s.me || 'dani'
  const q = (ng.memberName || '').trim().toLowerCase()
  const addedIds = new Set(ng.members.filter((m) => m.id).map((m) => m.id))
  // Sugerencias: amigos ya cargados que matchean lo que escribís y no están agregados.
  const suggestions = q
    ? friendIds(s).map((pid) => personById(s, pid)).filter((p) => p.id !== me && !addedIds.has(p.id) && ((p.short || '').toLowerCase().includes(q) || (p.name || '').toLowerCase().includes(q)))
    : []
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#FBFCFE', animation: 'ccIn .26s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 16px', borderBottom: '1px solid #EEF1F6' }}>
        <div onClick={actions.backToList} style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Back size={20} /></div>
        <span style={{ fontWeight: 800, fontSize: 18 }}>Nuevo grupo</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <div style={{ position: 'relative', width: 84, height: 84, borderRadius: 24, background: BRAND_GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>
            👥
            <div style={{ position: 'absolute', bottom: -5, right: -5, width: 26, height: 26, borderRadius: '50%', background: '#7C3AED', border: '2.5px solid #FBFCFE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>+</div>
          </div>
        </div>

        <div style={sectionLabel}>NOMBRE DEL GRUPO</div>
        <input value={ng.name} onChange={(e) => actions.onNewGroupField('name', e.target.value)} placeholder="Ej: Viaje a Bariloche" style={{ ...inputStyle, fontWeight: 800, fontSize: 16, marginBottom: 16 }} />

        <div style={sectionLabel}>DESCRIPCIÓN (OPCIONAL)</div>
        <input value={ng.desc} onChange={(e) => actions.onNewGroupField('desc', e.target.value)} placeholder="¿De qué son estos gastos?" style={{ ...inputStyle, fontWeight: 600, fontSize: 14, marginBottom: 18 }} />

        <div style={sectionLabel}>FECHA DEL VIAJE / EVENTO (OPCIONAL)</div>
        <input type="date" value={ng.date || ''} onChange={(e) => actions.onNewGroupField('date', e.target.value)} style={{ ...inputStyle, fontWeight: 700, fontSize: 14, marginBottom: 18, color: ng.date ? '#0B1220' : '#94A3B8' }} />

        <div style={sectionLabel}>PARTICIPANTES</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#7C3AED', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>D</div>
          <span style={{ flex: 1, fontWeight: 800, fontSize: 14, color: '#0B1220' }}>Dani (vos)</span>
          <span style={{ fontSize: 10, fontWeight: 800, color: '#7C3AED', background: '#F1ECFD', padding: '3px 8px', borderRadius: 999 }}>ADMIN</span>
        </div>
        {ng.members.map((m, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: m.id ? personColor(s, m.id) : PALETTE[(i + 1) % PALETTE.length], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{((m.short || m.name || '?').trim()[0] || '?').toUpperCase()}</div>
            <span style={{ flex: 1, fontWeight: 800, fontSize: 14, color: '#0B1220' }}>{m.short || m.name}</span>
            {m.pending && <span style={{ fontSize: 9.5, fontWeight: 800, color: '#B5742F', background: '#FBF1E3', padding: '3px 8px', borderRadius: 999 }}>A invitar</span>}
            <div onClick={() => actions.removeNewGroupMember(i)} style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Close size={15} color="#E11D5B" /></div>
          </div>
        ))}
        <div style={{ position: 'relative', margin: '6px 0 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input value={ng.memberName} onChange={(e) => actions.onNewGroupField('memberName', e.target.value)} onKeyDown={(e) => e.key === 'Enter' && actions.addNewGroupMember()} placeholder="Buscá un amigo o escribí un nombre" style={{ ...inputStyle, flex: 1, padding: '10px 12px', borderRadius: 11, fontWeight: 700, fontSize: 13.5 }} />
            <button onClick={actions.addNewGroupMember} style={{ border: 'none', background: '#0B1220', color: '#fff', borderRadius: 11, padding: '10px 15px', fontFamily: 'inherit', fontWeight: 800, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>Agregar</button>
          </div>
          {q && (
            <div style={{ marginTop: 6, background: '#fff', border: '1px solid #EEF1F6', borderRadius: 13, boxShadow: '0 12px 30px -14px rgba(15,23,42,.35)', overflow: 'hidden' }}>
              {suggestions.map((p) => (
                <div key={p.id} onClick={() => actions.addExistingFriendToGroup(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer' }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: personColor(s, p.id), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{p.initial}</div>
                  <span style={{ flex: 1, fontWeight: 800, fontSize: 13.5, color: '#0B1220' }}>{p.short}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: p.pending ? '#B5742F' : '#0E9F86', background: p.pending ? '#FBF1E3' : '#E6F6F1', padding: '3px 8px', borderRadius: 999 }}>{p.pending ? 'Pendiente' : 'En la app'}</span>
                </div>
              ))}
              <div onClick={actions.addNewGroupMember} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', borderTop: suggestions.length ? '1px solid #F1F4F9' : 'none' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#F1F4F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Plus size={16} /></div>
                <span style={{ flex: 1, fontWeight: 800, fontSize: 13.5, color: '#475569' }}>Sumar a “{ng.memberName.trim()}” e invitar</span>
              </div>
            </div>
          )}
        </div>

        {ng.invited ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#EAF8F3', borderRadius: 13, padding: '11px 13px', marginBottom: 16 }}>
            <Check size={17} color="#0E9F86" /><div style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 12.5, color: '#0B7A63' }}>Link copiado · cuentasclaras.app/i/AB12CD</div>
          </div>
        ) : (
          <div onClick={actions.inviteLink} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1.5px solid #D9C9FB', background: '#F8F5FF', borderRadius: 13, padding: 12, cursor: 'pointer', marginBottom: 16 }}>
            <span style={{ fontWeight: 800, fontSize: 13.5, color: '#7C3AED' }}>🔗 Invitar a unirse con link</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#F4F6FA', borderRadius: 14, padding: '13px 14px' }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
          <div style={{ fontSize: 12.5, color: '#64748B', fontWeight: 600, lineHeight: 1.45 }}>Después vas a poder subir una foto y ajustar la división desde el ⚙ del grupo.</div>
        </div>
      </div>

      <div style={{ padding: '14px 18px 24px', background: '#fff', borderTop: '1px solid #EEF1F6' }}>
        <button onClick={actions.createGroup} style={{ width: '100%', border: 'none', background: BRAND_GRADIENT, borderRadius: 14, padding: 15, fontFamily: 'inherit', fontWeight: 800, fontSize: 15, color: '#fff', cursor: 'pointer', boxShadow: '0 10px 24px -10px rgba(59,130,246,.6)' }}>Crear grupo</button>
      </div>
    </div>
  )
}
