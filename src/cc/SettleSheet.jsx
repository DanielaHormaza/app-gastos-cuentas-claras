import { useState } from 'react'
import { fmt, memberById, groupSettlement } from './logic'
import { BRAND_GRADIENT } from './initialState'
import { Close, Check } from './icons'

/** Hoja para saldar cuentas: una fila por cada deuda que te involucra (por persona y moneda). */
export default function SettleSheet({ s, actions }) {
  const gid = s.groupId
  const g = s.groups[gid]
  const me = s.me || 'dani'
  // Solo las deudas donde participás vos (podés registrar pagos tuyos, no entre terceros).
  const rows = groupSettlement(s, gid)
    .filter((t) => t.from === me || t.to === me)
    .map((t) => {
      const iAmCreditor = t.to === me
      const otherId = iAmCreditor ? t.from : t.to
      return { key: otherId + '|' + t.cur, otherId, other: memberById(s, gid, otherId), iAmCreditor, cur: t.cur, net: Math.round(t.amount) }
    })

  const [amounts, setAmounts] = useState(() => { const o = {}; rows.forEach((r) => (o[r.key] = r.net)); return o })
  const [on, setOn] = useState(() => { const o = {}; rows.forEach((r) => (o[r.key] = true)); return o })
  const setAmt = (k, v) => setAmounts((a) => ({ ...a, [k]: parseInt((v || '').replace(/\D/g, '') || '0', 10) }))
  const toggle = (k) => setOn((p) => ({ ...p, [k]: !p[k] }))
  const anyOn = rows.some((r) => on[r.key] && amounts[r.key])

  const confirm = () => {
    const list = rows
      .map((r) => {
        const amt = amounts[r.key]
        if (!amt || !on[r.key]) return null
        return r.iAmCreditor
          ? { from: r.otherId, to: me, amount: amt, currency: r.cur }
          : { from: me, to: r.otherId, amount: amt, currency: r.cur }
      })
      .filter(Boolean)
    if (!list.length) return
    actions.settle(list)
  }

  return (
    <>
      <div onClick={actions.closeSettle} style={{ position: 'absolute', inset: 0, background: 'rgba(11,18,32,.45)', animation: 'ccFade .2s ease', zIndex: 12 }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: '#fff', borderRadius: '28px 28px 0 0', padding: '10px 22px 26px', zIndex: 13, animation: 'ccUp .3s cubic-bezier(.22,1,.36,1)', boxShadow: '0 -20px 50px -20px rgba(15,23,42,.4)', maxHeight: '80%', overflowY: 'auto' }}>
        <div style={{ width: 40, height: 5, borderRadius: 999, background: '#E2E8F0', margin: '6px auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 19, letterSpacing: '-0.01em', color: '#0B1220' }}>Saldar cuentas</div>
            <div style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 700 }}>{g.name}</div>
          </div>
          <div onClick={actions.closeSettle} style={{ width: 30, height: 30, borderRadius: '50%', background: '#F1F4F9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Close size={15} color="#64748B" /></div>
        </div>

        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 8px', color: '#64748B' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#0B1220' }}>Están a mano</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', marginTop: 2 }}>No hay nada para saldar con vos.</div>
          </div>
        ) : (
          <>
            {rows.map((r) => {
              const active = on[r.key]
              const dir = r.iAmCreditor ? r.other.short + ' te paga' : 'Le pagás a ' + r.other.short
              const badgeColor = !active ? '#CBD5E1' : r.iAmCreditor ? r.other.color : '#7C3AED'
              const badgeInitial = r.iAmCreditor ? r.other.initial : 'D'
              return (
                <div key={r.key} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 800, color: active ? '#94A3B8' : '#C3CCDA', letterSpacing: '0.04em', marginBottom: 7 }}>
                    <span style={{ width: 16, height: 16, borderRadius: 5, background: badgeColor, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>{badgeInitial}</span>
                    {dir.toUpperCase()} <span style={{ color: '#C3CCDA' }}>· {r.cur}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div onClick={() => toggle(r.key)} style={{ width: 26, height: 26, flexShrink: 0, borderRadius: 8, border: active ? 'none' : '1.5px solid #CBD5E1', background: active ? BRAND_GRADIENT : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      {active && <Check size={15} color="#fff" />}
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', border: '1.5px solid #E2E8F0', borderRadius: 13, padding: '6px 14px', background: active ? '#fff' : '#F4F6FA', opacity: active ? 1 : 0.6 }}>
                      <span className="num" style={{ fontSize: 22, fontWeight: 700, color: '#94A3B8' }}>{r.cur === 'USD' ? 'US$' : r.cur === 'CLP' ? 'CLP$' : '$'}</span>
                      <input value={amounts[r.key]} onChange={(e) => setAmt(r.key, e.target.value)} disabled={!active} inputMode="numeric" className="num" style={{ flex: 1, border: 'none', outline: 'none', fontSize: 24, fontWeight: 700, color: active ? '#0B1220' : '#94A3B8', letterSpacing: '-0.01em', marginLeft: 4, width: '100%', background: 'transparent' }} />
                      {active && <span onClick={() => setAmt(r.key, String(r.net))} style={{ fontSize: 11.5, fontWeight: 800, color: '#7C3AED', cursor: 'pointer', whiteSpace: 'nowrap' }}>Todo</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: active ? '#94A3B8' : '#C3CCDA', fontWeight: 700, marginTop: 5, paddingLeft: 36 }}>{active ? 'Saldo: ' + fmt(r.net, r.cur) : 'No se salda'}</div>
                </div>
              )
            })}
            <button onClick={confirm} disabled={!anyOn} style={{ width: '100%', border: 'none', background: anyOn ? BRAND_GRADIENT : '#CBD5E1', borderRadius: 13, padding: 14, fontFamily: 'inherit', fontWeight: 800, fontSize: 14.5, color: '#fff', cursor: anyOn ? 'pointer' : 'not-allowed', boxShadow: anyOn ? '0 8px 20px -8px rgba(59,130,246,.6)' : 'none' }}>Registrar pago</button>
          </>
        )}
      </div>
    </>
  )
}
