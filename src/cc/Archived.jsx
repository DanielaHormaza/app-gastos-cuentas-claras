import { Back, Search } from './icons'

/** Pantalla de grupos archivados: buscador + lista con desarchivar. */
export default function Archived({ s, actions }) {
  const allIds = Object.keys(s.groups).filter((id) => id !== 'personal')
  const q = s.groupQuery.trim().toLowerCase()
  const list = allIds.filter((id) => s.archived[id]).filter((id) => !q || s.groups[id].name.toLowerCase().includes(q))

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#FBFCFE', animation: 'ccIn .26s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 16px', borderBottom: '1px solid #EEF1F6' }}>
        <div onClick={actions.backToList} style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Back size={20} /></div>
        <span style={{ fontWeight: 800, fontSize: 18 }}>Grupos archivados</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F1F4F9', borderRadius: 13, padding: '11px 13px', marginBottom: 4 }}>
          <Search />
          <input value={s.groupQuery} onChange={(e) => actions.onGroupQuery(e.target.value)} placeholder="Buscar grupo archivado…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontWeight: 600, fontSize: 14, color: '#0B1220', width: '100%', fontFamily: 'inherit' }} />
        </div>

        {list.map((id) => {
          const g = s.groups[id]
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, background: '#F8FAFC', border: '1px solid #EEF1F6' }}>
              <div onClick={() => actions.openGroup(id)} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, cursor: 'pointer' }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: g.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 18, flexShrink: 0, opacity: 0.6 }}>{g.initial}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#475569' }}>{g.name}</div>
                  <div style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 600 }}>Creado el {g.createdAt} · ver</div>
                </div>
              </div>
              <div onClick={() => actions.restoreGroup(id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 13px', borderRadius: 999, background: '#fff', border: '1.5px solid #E2E8F0', cursor: 'pointer', flexShrink: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#7C3AED' }}>↺ Desarchivar</span>
              </div>
            </div>
          )
        })}

        {list.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 16px', color: '#B6BFCC' }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>📦</div>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>No hay grupos archivados que coincidan.</div>
          </div>
        )}
      </div>
    </div>
  )
}
