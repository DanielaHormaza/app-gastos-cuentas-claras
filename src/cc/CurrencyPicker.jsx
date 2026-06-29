import { useState } from 'react'
import { CURRENCY_INFO, CURRENCIES } from './logic'
import { ChevronDown, Search } from './icons'

/** Selector de moneda (dropdown con todas las monedas habilitadas + buscador por texto).
 *  value = código (ej. 'ARS') · onChange(code). compact = variante chica para la hoja de edición. */
export default function CurrencyPicker({ value, onChange, compact = false }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const cur = value || 'ARS'
  const info = CURRENCY_INFO[cur] || { prefix: '$', name: cur }
  const pad = compact ? '9px 12px' : '12px 14px'
  const close = () => { setOpen(false); setQuery('') }
  const q = query.trim().toLowerCase()
  const list = CURRENCIES.filter((code) => !q || code.toLowerCase().includes(q) || CURRENCY_INFO[code].name.toLowerCase().includes(q))
  return (
    <div style={{ position: 'relative' }}>
      <div
        onClick={() => (open ? close() : setOpen(true))}
        style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 13, padding: pad, cursor: 'pointer' }}
      >
        <span className="num" style={{ fontWeight: 800, fontSize: 14, color: '#7C3AED', minWidth: 34 }}>{info.prefix}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#0B1220' }}>{cur}</div>
          {!compact && <div style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 600 }}>{info.name}</div>}
        </div>
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease', display: 'inline-flex' }}><ChevronDown size={16} color="#94A3B8" w={2.8} /></span>
      </div>
      {open && (
        <>
          <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 29 }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 30, background: '#fff', border: '1px solid #EEF1F6', borderRadius: 14, boxShadow: '0 18px 40px -16px rgba(15,23,42,.4)', maxHeight: 320, overflowY: 'auto', padding: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F4F6FA', borderRadius: 10, padding: '8px 11px', margin: '2px 2px 6px', position: 'sticky', top: 0 }}>
              <Search size={15} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar moneda…"
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontWeight: 700, fontSize: 13.5, color: '#0B1220', width: '100%', fontFamily: 'inherit' }}
              />
            </div>
            {list.length === 0 && <div style={{ textAlign: 'center', fontSize: 12.5, color: '#B6BFCC', fontWeight: 700, padding: '12px 0' }}>Sin coincidencias</div>}
            {list.map((code) => {
              const ci = CURRENCY_INFO[code]
              const on = code === cur
              return (
                <div
                  key={code}
                  onClick={() => { onChange(code); close() }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 11px', borderRadius: 10, cursor: 'pointer', background: on ? '#F3EEFE' : 'transparent' }}
                >
                  <span className="num" style={{ fontWeight: 800, fontSize: 13.5, color: '#7C3AED', minWidth: 38 }}>{ci.prefix}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 13.5, color: '#0B1220' }}>{code}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>{ci.name}</div>
                  </div>
                  {on && <span style={{ color: '#7C3AED', fontWeight: 800, fontSize: 15 }}>✓</span>}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
