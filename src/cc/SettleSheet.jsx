import { useState } from 'react'
import { compute, fmt, CURRENCIES } from './logic'
import { BRAND_GRADIENT } from './initialState'
import { Close } from './icons'

/** Hoja para saldar cuentas: por cada moneda, quién le paga a quién y cuánto. */
export default function SettleSheet({ s, actions }) {
  const gid = s.groupId
  const g = s.groups[gid]
  const c = compute(s, gid)
  const other = c.other || { id: 'otro', short: '?', color: '#94A3B8', initial: '?' }
  const curs = CURRENCIES.filter((cu) => Math.abs(c.nets[cu] || 0) >= 1)
  const [amounts, setAmounts] = useState(() => {
    const o = {}
    curs.forEach((cu) => (o[cu] = Math.round(Math.abs(c.nets[cu]))))
    return o
  })
  const setAmt = (cu, v) => setAmounts((a) => ({ ...a, [cu]: parseInt((v || '').replace(/\D/g, '') || '0', 10) }))

  const confirm = () => {
    const list = curs
      .map((cu) => {
        const amt = amounts[cu]
        if (!amt) return null
        const net = c.nets[cu]
        return net > 0
          ? { from: other.id, to: 'dani', amount: amt, currency: cu }
          : { from: 'dani', to: other.id, amount: amt, currency: cu }
      })
      .filter(Boolean)
    actions.settle(list)
  }

  return (
    <>
      <div onClick={actions.closeSettle} style={{ position: 'absolute', inset: 0, background: 'rgba(11,18,32,.45)', animation: 'ccFade .2s ease', zIndex: 12 }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: '#fff', borderRadius: '28px 28px 0 0', padding: '10px 22px 26px', zIndex: 13, animation: 'ccUp .3s cubic-bezier(.22,1,.36,1)', boxShadow: '0 -20px 50px -20px rgba(15,23,42,.4)' }}>
        <div style={{ width: 40, height: 5, borderRadius: 999, background: '#E2E8F0', margin: '6px auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 19, letterSpacing: '-0.01em', color: '#0B1220' }}>Saldar cuentas</div>
            <div style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 700 }}>{g.name}</div>
          </div>
          <div onClick={actions.closeSettle} style={{ width: 30, height: 30, borderRadius: '50%', background: '#F1F4F9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Close size={15} color="#64748B" /></div>
        </div>

        {curs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 8px', color: '#64748B' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#0B1220' }}>Están a mano</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', marginTop: 2 }}>No hay nada para saldar.</div>
          </div>
        ) : (
          <>
            {curs.map((cu) => {
              const net = c.nets[cu]
              const dir = net > 0 ? other.short + ' te paga' : 'Le pagás a ' + other.short
              return (
                <div key={cu} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.04em', marginBottom: 7 }}>
                    <span style={{ width: 16, height: 16, borderRadius: 5, background: net > 0 ? other.color : '#7C3AED', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>{net > 0 ? other.initial : 'D'}</span>
                    {dir.toUpperCase()} <span style={{ color: '#C3CCDA' }}>· {cu}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E2E8F0', borderRadius: 13, padding: '6px 14px' }}>
                    <span className="num" style={{ fontSize: 22, fontWeight: 700, color: '#94A3B8' }}>{cu === 'USD' ? 'US$' : cu === 'CLP' ? 'CLP$' : '$'}</span>
                    <input value={amounts[cu]} onChange={(e) => setAmt(cu, e.target.value)} inputMode="numeric" className="num" style={{ flex: 1, border: 'none', outline: 'none', fontSize: 24, fontWeight: 700, color: '#0B1220', letterSpacing: '-0.01em', marginLeft: 4, width: '100%', background: 'transparent' }} />
                    <span onClick={() => setAmt(cu, String(Math.round(Math.abs(net))))} style={{ fontSize: 11.5, fontWeight: 800, color: '#7C3AED', cursor: 'pointer', whiteSpace: 'nowrap' }}>Todo</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, marginTop: 5 }}>Saldo: {fmt(Math.abs(net), cu)}</div>
                </div>
              )
            })}
            <button onClick={confirm} style={{ width: '100%', border: 'none', background: BRAND_GRADIENT, borderRadius: 13, padding: 14, fontFamily: 'inherit', fontWeight: 800, fontSize: 14.5, color: '#fff', cursor: 'pointer', boxShadow: '0 8px 20px -8px rgba(59,130,246,.6)' }}>Registrar pago</button>
          </>
        )}
      </div>
    </>
  )
}
