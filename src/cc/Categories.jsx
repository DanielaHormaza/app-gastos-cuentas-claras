import { useState } from 'react'
import { Back, Check, ChevronDown, Trash } from './icons'
import { CATEGORY_ICONS, categoryUsage } from './logic'
import { isSystemCategory } from './initialState'
import { BRAND_GRADIENT } from './initialState'

const cardShadow = '0 2px 10px -7px rgba(15,23,42,.3)'
const label = { fontSize: 11, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.04em', margin: '10px 0 6px' }

/** Gestión de categorías: renombrar, cambiar ícono, fusionar y eliminar. */
export default function Categories({ s, actions }) {
  const usage = categoryUsage(s)
  const cats = (s.categories || []).filter((c) => !['transfer', 'inicial', 'sincat'].includes(c.id))
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#F4F6FA', animation: 'ccIn .26s ease', zIndex: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 16px', background: '#fff', borderBottom: '1px solid #EEF1F6' }}>
        <div onClick={actions.closeCategories} style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Back size={20} /></div>
        <span style={{ fontWeight: 800, fontSize: 18 }}>Categorías</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div style={{ fontSize: 12.5, color: '#94A3B8', fontWeight: 700, lineHeight: 1.45 }}>Renombrá, cambiá el ícono o fusioná categorías para mantener la lista prolija. Las del sistema no se pueden borrar; para vaciar una con gastos, fusionala con otra.</div>
        {cats.map((c) => {
          const open = s.catEditId === c.id
          const count = usage[c.id] || 0
          const system = isSystemCategory(c.id)
          return (
            <div key={c.id} style={{ background: '#fff', borderRadius: 15, boxShadow: cardShadow, border: '1px solid #EEF1F6', overflow: 'hidden' }}>
              <div onClick={() => actions.toggleCatEdit(c.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 13px', cursor: 'pointer' }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: '#F4F6FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>{c.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14.5, color: '#0B1220' }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 700 }}>{count} {count === 1 ? 'gasto' : 'gastos'}{system ? ' · del sistema' : ''}</div>
                </div>
                <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', display: 'inline-flex' }}><ChevronDown size={18} color="#94A3B8" w={2.6} /></span>
              </div>
              {open && (
                <div style={{ padding: '2px 13px 14px', borderTop: '1px solid #F1F4F9' }}>
                  <div style={label}>NOMBRE</div>
                  <input value={c.name} onChange={(e) => actions.renameCategory(c.id, e.target.value)} style={{ width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '10px 12px', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, color: '#0B1220', outline: 'none', background: '#fff' }} />
                  <div style={label}>ÍCONO</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {CATEGORY_ICONS.map((ic) => {
                      const on = c.icon === ic
                      return <button key={ic} onClick={() => actions.setCatIconById(c.id, ic)} style={{ width: 34, height: 34, borderRadius: 10, border: on ? '2px solid #7C3AED' : '1.5px solid #E2E8F0', background: on ? '#F1ECFD' : '#fff', fontSize: 17, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>{ic}</button>
                    })}
                  </div>
                  <MergeRow cat={c} cats={cats} count={count} actions={actions} />
                  {!system && count === 0 && (
                    <button onClick={() => actions.deleteCategory(c.id)} style={{ marginTop: 12, width: '100%', border: '1.5px solid #FBD0DC', background: '#FDEEF0', borderRadius: 12, padding: '10px', fontFamily: 'inherit', fontWeight: 800, fontSize: 13.5, color: '#E11D48', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}><Trash /> Eliminar categoría</button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Fusionar esta categoría dentro de otra (mueve sus gastos y la elimina). */
function MergeRow({ cat, cats, count, actions }) {
  const [to, setTo] = useState('')
  const others = cats.filter((c) => c.id !== cat.id)
  return (
    <>
      <div style={label}>FUSIONAR CON OTRA</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <select value={to} onChange={(e) => setTo(e.target.value)} style={{ flex: 1, border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '10px 12px', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, color: '#0B1220', background: '#fff', outline: 'none' }}>
          <option value="">Elegí una categoría…</option>
          {others.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <button disabled={!to} onClick={() => { if (to && window.confirm('¿Fusionar «' + cat.name + '» en la otra? Se mueven ' + count + ' gasto(s) y se elimina «' + cat.name + '».')) actions.mergeCategory(cat.id, to) }} style={{ border: 'none', background: to ? BRAND_GRADIENT : '#CBD5E1', color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 13.5, padding: '0 16px', borderRadius: 12, cursor: to ? 'pointer' : 'default' }}>Fusionar</button>
      </div>
    </>
  )
}
