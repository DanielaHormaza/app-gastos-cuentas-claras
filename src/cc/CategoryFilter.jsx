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

/** Filtro de moneda (segmentado): Todas + las monedas presentes en el grupo. */
export function CurrencyFilter({ value = 'all', currencies, onChange }) {
  const opts = ['all', ...currencies]
  return (
    <div style={{ display: 'flex', gap: 4, background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 13, padding: 4, boxShadow: '0 2px 10px -7px rgba(15,23,42,.3)' }}>
      {opts.map((o) => {
        const on = value === o
        return (
          <button key={o} onClick={() => onChange(o)} style={{ flex: 1, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800, fontSize: 13, padding: '7px 6px', borderRadius: 10, background: on ? '#7C3AED' : 'transparent', color: on ? '#fff' : '#64748B', transition: 'background .15s' }}>{o === 'all' ? 'Todas' : o}</button>
        )
      })}
    </div>
  )
}

/** Filtro de pagador (desplegable single-select): Todos + los miembros que pagaron. */
function PayerFilter({ value = 'all', payers, onChange }) {
  const [open, setOpen] = useState(false)
  const sel = payers.find((m) => m.id === value)
  const active = value !== 'all' && sel
  const label = active ? sel.short : 'Todos los pagadores'
  const avatar = (m, size) => (
    <span style={{ width: size, height: size, borderRadius: '50%', background: m.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.5, fontWeight: 800, flexShrink: 0 }}>{m.initial}</span>
  )

  return (
    <div style={{ flexShrink: 0, position: 'relative', zIndex: open ? 30 : 'auto' }}>
      <div onClick={() => setOpen((o) => !o)} style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 13, padding: '10px 13px', cursor: 'pointer', boxShadow: '0 2px 10px -7px rgba(15,23,42,.3)' }}>
        {active ? avatar(sel, 18) : <span style={{ fontSize: 16 }}>👤</span>}
        <span style={{ flex: 1, fontWeight: 800, fontSize: 14, color: active ? '#0B1220' : '#64748B' }}>{label}</span>
        {active && <span onClick={(e) => { e.stopPropagation(); onChange('all') }} style={{ fontSize: 12, fontWeight: 800, color: '#7C3AED' }}>Limpiar</span>}
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', display: 'inline-flex' }}><ChevronDown size={16} color="#94A3B8" w={2.6} /></span>
      </div>

      {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 29 }} />}
      {open && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 6, zIndex: 31, background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 13, boxShadow: '0 18px 44px -16px rgba(15,23,42,.45)', overflow: 'hidden' }}>
          <div style={{ maxHeight: 250, overflowY: 'auto', padding: 6 }}>
            <div onClick={() => { onChange('all'); setOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 9px', borderRadius: 10, cursor: 'pointer', background: value === 'all' ? '#F1ECFD' : 'transparent' }}>
              <span style={{ fontSize: 17, width: 22, textAlign: 'center' }}>👤</span>
              <span style={{ flex: 1, fontWeight: 800, fontSize: 13.5, color: value === 'all' ? '#7C3AED' : '#334155' }}>Todos los pagadores</span>
              {value === 'all' && <Check size={16} />}
            </div>
            {payers.map((m) => {
              const on = value === m.id
              return (
                <div key={m.id} onClick={() => { onChange(m.id); setOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 9px', borderRadius: 10, cursor: 'pointer', background: on ? '#F1ECFD' : 'transparent' }}>
                  <span style={{ width: 22, textAlign: 'center', display: 'inline-flex', justifyContent: 'center' }}>{avatar(m, 22)}</span>
                  <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5, color: on ? '#0B1220' : '#334155' }}>{m.short}</span>
                  {on && <Check size={16} />}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/** Ícono diferencial de un origen: personal 🧾 · todo 📂 · 1:1 avatar redondo · grupo cuadrado con gradiente. */
function srcIcon(o, size = 24) {
  if (o.kind === 'person') return <span style={{ width: size, height: size, borderRadius: '50%', background: o.color || '#94A3B8', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.46, fontWeight: 800, flexShrink: 0 }}>{o.initial}</span>
  if (o.kind === 'group') return <span style={{ width: size, height: size, borderRadius: size * 0.3, background: o.gradient || '#94A3B8', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.46, fontWeight: 800, flexShrink: 0 }}>{o.initial}</span>
  return <span style={{ fontSize: size * 0.7, width: size, textAlign: 'center', flexShrink: 0 }}>{o.kind === 'personal' ? '🧾' : '📂'}</span>
}

/** Filtro de origen para "Mis gastos" (single-select con buscador): Todo / Solo personales / por persona o grupo. */
export function SourceFilter({ value = 'all', options, onChange }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const sel = options.find((o) => o.value === value) || options[0]
  const list = options.filter((o) => !q || o.label.toLowerCase().includes(q.toLowerCase()))
  return (
    <div style={{ flexShrink: 0, position: 'relative', zIndex: open ? 30 : 'auto' }}>
      <div onClick={() => setOpen((o) => !o)} style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 13, padding: '9px 13px', cursor: 'pointer', boxShadow: '0 2px 10px -7px rgba(15,23,42,.3)' }}>
        {srcIcon(sel, 22)}
        <span style={{ flex: 1, fontWeight: 800, fontSize: 14, color: value !== 'all' ? '#0B1220' : '#64748B' }}>{sel.label}</span>
        {value !== 'all' && <span onClick={(e) => { e.stopPropagation(); onChange('all') }} style={{ fontSize: 12, fontWeight: 800, color: '#7C3AED' }}>Limpiar</span>}
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', display: 'inline-flex' }}><ChevronDown size={16} color="#94A3B8" w={2.6} /></span>
      </div>
      {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 29 }} />}
      {open && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 6, zIndex: 31, background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 13, boxShadow: '0 18px 44px -16px rgba(15,23,42,.45)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F4F6FA', borderRadius: 11, padding: '9px 12px', margin: 10 }}>
            <Search />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar persona o grupo…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontWeight: 700, fontSize: 13.5, color: '#0B1220', width: '100%', fontFamily: 'inherit' }} />
          </div>
          <div style={{ maxHeight: 250, overflowY: 'auto', padding: '0 6px 8px' }}>
            {list.map((o) => {
              const on = value === o.value
              return (
                <div key={o.value} onClick={() => { onChange(o.value); setOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 9px', borderRadius: 10, cursor: 'pointer', background: on ? '#F1ECFD' : 'transparent' }}>
                  {srcIcon(o, 26)}
                  <span style={{ flex: 1, fontWeight: on ? 800 : 700, fontSize: 13.5, color: on ? '#0B1220' : '#334155' }}>{o.label}</span>
                  {on && <Check size={16} />}
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

/** Barra de filtros: categorías (multi) + moneda + pagador + buscador por nombre de movimiento. */
export function Filters({ cats, catFilter, onCat, query, onQuery, cur, onCur, currencies = [], payer, onPayer, payers = [] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
      {cats.length > 0 && <CategoryFilter value={catFilter} cats={cats} onChange={onCat} />}
      {(currencies.length > 1 || (cur && cur !== 'all')) && <CurrencyFilter value={cur} currencies={currencies} onChange={onCur} />}
      {(payers.length > 1 || (payer && payer !== 'all')) && <PayerFilter value={payer} payers={payers} onChange={onPayer} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 13, padding: '10px 13px', boxShadow: '0 2px 10px -7px rgba(15,23,42,.3)' }}>
        <Search />
        <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Buscar movimiento…" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontWeight: 700, fontSize: 14, color: '#0B1220', width: '100%', fontFamily: 'inherit' }} />
        {query && <span onClick={() => onQuery('')} style={{ fontSize: 12, fontWeight: 800, color: '#7C3AED', cursor: 'pointer' }}>Limpiar</span>}
      </div>
    </div>
  )
}
