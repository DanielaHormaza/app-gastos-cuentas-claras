import { useState } from 'react'
import { ChevronDown, Search, Check } from './icons'

/** Filtro de categorías multi-select con buscador. value = array de ids ([] = todas). */
export default function CategoryFilter({ value = [], cats, onChange }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const list = cats.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()))
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])

  const label = value.length === 0 ? 'Todas las categorías' : value.length === 1 ? (cats.find((c) => c.id === value[0]) || {}).name || '1 categoría' : value.length + ' categorías'

  return (
    <div style={{ flexShrink: 0, position: 'relative', zIndex: open ? 30 : 'auto' }}>
      <div onClick={() => setOpen((o) => !o)} style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 13, padding: '10px 13px', cursor: 'pointer', boxShadow: '0 2px 10px -7px rgba(15,23,42,.3)' }}>
        <span style={{ fontSize: 16 }}>{value.length === 0 ? '🔎' : '🏷️'}</span>
        <span style={{ flex: 1, fontWeight: 800, fontSize: 14, color: value.length ? '#0B1220' : '#64748B' }}>{label}</span>
        {value.length > 0 && <span onClick={(e) => { e.stopPropagation(); onChange([]) }} style={{ fontSize: 12, fontWeight: 800, color: '#7C3AED' }}>Limpiar</span>}
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', display: 'inline-flex' }}><ChevronDown size={16} color="#94A3B8" w={2.6} /></span>
      </div>

      {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 29 }} />}
      {open && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 6, zIndex: 31, background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 13, boxShadow: '0 18px 44px -16px rgba(15,23,42,.45)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F4F6FA', borderRadius: 11, padding: '9px 12px', margin: 10 }}>
            <Search />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar categoría…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontWeight: 700, fontSize: 13.5, color: '#0B1220', width: '100%', fontFamily: 'inherit' }} />
          </div>
          <div style={{ maxHeight: 250, overflowY: 'auto', padding: '0 6px 8px' }}>
            <div onClick={() => onChange([])} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 9px', borderRadius: 10, cursor: 'pointer', background: value.length === 0 ? '#F1ECFD' : 'transparent' }}>
              <span style={{ fontSize: 17, width: 22, textAlign: 'center' }}>🔎</span>
              <span style={{ flex: 1, fontWeight: 800, fontSize: 13.5, color: value.length === 0 ? '#7C3AED' : '#334155' }}>Todas las categorías</span>
              {value.length === 0 && <Check size={16} />}
            </div>
            {list.map((c) => {
              const on = value.includes(c.id)
              return (
                <div key={c.id} onClick={() => toggle(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 9px', borderRadius: 10, cursor: 'pointer', background: on ? '#F1ECFD' : 'transparent' }}>
                  <span style={{ width: 18, height: 18, borderRadius: 6, border: on ? 'none' : '1.5px solid #CBD5E1', background: on ? '#7C3AED' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{on && <Check size={12} color="#fff" w={3.4} />}</span>
                  <span style={{ fontSize: 17, width: 22, textAlign: 'center' }}>{c.icon}</span>
                  <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5, color: on ? '#0B1220' : '#334155' }}>{c.name}</span>
                </div>
              )
            })}
            {list.length === 0 && <div style={{ textAlign: 'center', fontSize: 12.5, color: '#B6BFCC', fontWeight: 700, padding: '10px 0' }}>Sin coincidencias</div>}
          </div>
        </div>
      )}
    </div>
  )
}

/** Barra de filtros: categorías (multi) + buscador por nombre de movimiento. */
export function Filters({ cats, catFilter, onCat, query, onQuery }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
      {cats.length > 0 && <CategoryFilter value={catFilter} cats={cats} onChange={onCat} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 13, padding: '10px 13px', boxShadow: '0 2px 10px -7px rgba(15,23,42,.3)' }}>
        <Search />
        <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Buscar movimiento…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontWeight: 700, fontSize: 14, color: '#0B1220', width: '100%', fontFamily: 'inherit' }} />
        {query && <span onClick={() => onQuery('')} style={{ fontSize: 12, fontWeight: 800, color: '#7C3AED', cursor: 'pointer' }}>Limpiar</span>}
      </div>
    </div>
  )
}
