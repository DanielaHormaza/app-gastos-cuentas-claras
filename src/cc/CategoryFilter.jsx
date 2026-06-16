import { useState } from 'react'
import { ChevronDown, Search, Check } from './icons'

/** Filtro de categoría como desplegable con buscador. value = id | null (Todas). */
export default function CategoryFilter({ value, cats, onChange }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const sel = value ? cats.find((c) => c.id === value) : null
  const list = cats.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()))
  const pick = (id) => { onChange(id); setOpen(false); setQ('') }

  return (
    <div style={{ flexShrink: 0 }}>
      <div onClick={() => setOpen((o) => !o)} style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 13, padding: '10px 13px', cursor: 'pointer', boxShadow: '0 2px 10px -7px rgba(15,23,42,.3)' }}>
        <span style={{ fontSize: 16 }}>{sel ? sel.icon : '🔎'}</span>
        <span style={{ flex: 1, fontWeight: 800, fontSize: 14, color: sel ? '#0B1220' : '#64748B' }}>{sel ? sel.name : 'Todas las categorías'}</span>
        {sel && <span onClick={(e) => { e.stopPropagation(); pick(null) }} style={{ fontSize: 16, color: '#94A3B8', padding: '0 2px' }}>✕</span>}
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', display: 'inline-flex' }}><ChevronDown size={16} color="#94A3B8" w={2.6} /></span>
      </div>

      {open && (
        <div style={{ background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 13, marginTop: 6, boxShadow: '0 18px 44px -16px rgba(15,23,42,.45)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F4F6FA', borderRadius: 11, padding: '9px 12px', margin: 10 }}>
            <Search />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar categoría…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontWeight: 700, fontSize: 13.5, color: '#0B1220', width: '100%', fontFamily: 'inherit' }} />
          </div>
          <div style={{ maxHeight: 230, overflowY: 'auto', padding: '0 6px 8px' }}>
            <Opt label="Todas las categorías" icon="🔎" sel={!value} onClick={() => pick(null)} />
            {list.map((c) => <Opt key={c.id} label={c.name} icon={c.icon} sel={value === c.id} onClick={() => pick(c.id)} />)}
            {list.length === 0 && <div style={{ textAlign: 'center', fontSize: 12.5, color: '#B6BFCC', fontWeight: 700, padding: '10px 0' }}>Sin coincidencias</div>}
          </div>
        </div>
      )}
    </div>
  )
}

const Opt = ({ label, icon, sel, onClick }) => (
  <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 9px', borderRadius: 10, cursor: 'pointer', background: sel ? '#F1ECFD' : 'transparent' }}>
    <span style={{ fontSize: 17, width: 22, textAlign: 'center' }}>{icon}</span>
    <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5, color: sel ? '#7C3AED' : '#334155' }}>{label}</span>
    {sel && <Check size={16} />}
  </div>
)
