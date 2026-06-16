import { useState } from 'react'
import { compute, fmt, buildHistory, catById, memberById, monthLongLabel, monthData, ledgerMonths, buildCsv, groupCategories, CURRENCIES } from './logic'
import { monthKeyOf } from './dates'
import { METHOD_COLORS } from './initialState'
import { Chevron, ChevronDown } from './icons'
import { Filters } from './CategoryFilter'

function downloadCsv(text, name) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

const cardShadow = '0 2px 10px -7px rgba(15,23,42,.3)'

/** Vista "Gastos futuros": cuotas por venir (solo grupos). */
export function Futuros({ s, actions }) {
  const gid = s.groupId
  const g = s.groups[gid]
  const c = compute(s, gid)
  const fut = (s.ledgers[gid] || []).filter((e) => e.future).slice().sort((a, b) => (a.date < b.date ? -1 : 1))

  if (g.personal || fut.length === 0) {
    return (
      <Scroll>
        <div style={{ textAlign: 'center', padding: '36px 16px', color: '#B6BFCC' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🗓️</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#64748B', marginBottom: 4 }}>Sin gastos futuros</div>
          <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.45 }}>Acá vas a ver cuotas o gastos fijos que cargues a futuro.</div>
        </div>
      </Scroll>
    )
  }

  const byKey = {}
  const order = []
  fut.forEach((e) => { const k = monthKeyOf(e.date); if (!byKey[k]) { byKey[k] = []; order.push(k) } byKey[k].push(e) })
  const totalAmbos = fut.filter((e) => (e.currency || 'ARS') === 'ARS').reduce((a, e) => a + e.amount, 0)

  return (
    <Scroll>
      <div style={{ borderRadius: 18, padding: '14px 16px', background: 'linear-gradient(135deg,rgba(46,204,177,.13),rgba(124,58,237,.13))' }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: '#64748B', letterSpacing: '0.05em', marginBottom: 10 }}>COMPROMETIDO · PRÓXIMOS MESES</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700 }}>Total de ambos</div>
            <div className="num" style={{ fontWeight: 700, fontSize: 23, letterSpacing: '-0.02em', color: '#0B1220' }}>{fmt(totalAmbos)}</div>
          </div>
          <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(124,58,237,.2)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#7C3AED', fontWeight: 800 }}>Tu parte</div>
            <div className="num" style={{ fontWeight: 700, fontSize: 23, letterSpacing: '-0.02em', color: '#7C3AED' }}>{fmt((totalAmbos * c.daniPct) / 100)}</div>
          </div>
        </div>
      </div>

      {order.map((k, idx) => {
        const items = byKey[k]
        const mTotal = items.filter((e) => (e.currency || 'ARS') === 'ARS').reduce((a, e) => a + e.amount, 0)
        const expanded = !!s.expandedMonths[idx]
        return (
          <div key={k} style={{ background: '#fff', borderRadius: 18, padding: 14, boxShadow: cardShadow, border: '1px solid #EEF1F6' }}>
            <div onClick={() => actions.toggleMonth(idx)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <span style={{ flexShrink: 0, transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .2s ease', display: 'inline-flex' }}><ChevronDown size={16} color="#94A3B8" w={2.8} /></span>
              <div style={{ flex: 1, minWidth: 0, fontWeight: 800, fontSize: 15, color: '#0B1220' }}>{monthLongLabel(k)}</div>
              <div style={{ textAlign: 'right' }}>
                <div className="num" style={{ fontWeight: 700, fontSize: 17, color: '#0B1220', letterSpacing: '-0.02em' }}>{fmt(mTotal)}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, whiteSpace: 'nowrap' }}>tu parte {fmt((mTotal * c.daniPct) / 100)}</div>
              </div>
            </div>
            {expanded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 13, paddingTop: 13, borderTop: '1px solid #F1F4F9' }}>
                {items.map((e) => {
                  const cat = catById(s, e.categoryId)
                  const payer = memberById(s, gid, e.payerId)
                  return (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 9, background: '#F4F6FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{cat.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: '#334155' }}>{e.desc || cat.name}</div>
                        <div style={{ fontSize: 10.5, color: '#94A3B8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {e.cuota ? 'Cuota ' + e.cuota.n + '/' + e.cuota.total : 'Gasto fijo'} · <span style={{ width: 14, height: 14, borderRadius: 4, background: payer.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, flexShrink: 0 }}>{payer.initial}</span>{payer.short}
                        </div>
                      </div>
                      <div className="num" style={{ fontWeight: 700, fontSize: 14, color: '#0B1220' }}>{fmt(e.amount, e.currency)}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </Scroll>
  )
}

/** Vista "Gastos históricos": exportar + barras + meses desplegables. */
export function Historicos({ s, actions }) {
  const gid = s.groupId
  const g = s.groups[gid]
  const catFilter = s.catFilter
  const q = s.moveQuery
  const cats = groupCategories(s, gid)
  const months = buildHistory(s, gid, catFilter, q)
  const histMax = Math.max(1, ...months.map((m) => m.total))
  const selKey = s.histSel[gid] || months[months.length - 1].key
  const sel = months.find((m) => m.key === selKey) || months[months.length - 1]
  const monthKeys = ledgerMonths(s, gid)

  return (
    <Scroll>
      {/* exportar */}
      {monthKeys.length > 0 && <ExportBar s={s} gid={gid} monthKeys={monthKeys} />}

      {/* filtros: categorías + buscador por nombre */}
      <Filters cats={cats} catFilter={catFilter} onCat={actions.setCatFilter} query={q} onQuery={actions.setMoveQuery} />

      {/* bar chart (ARS) */}
      <div style={{ background: '#fff', borderRadius: 18, padding: '15px 16px', boxShadow: cardShadow }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 13 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14.5, color: '#0B1220' }}>Gastos por mes</div>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, marginTop: 1 }}>{monthLongLabel(sel.key)} · en ARS</div>
          </div>
          <div className="num" style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em', color: '#0B1220' }}>{fmt(sel.total)}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 100 }}>
          {months.map((m) => {
            const isSel = m.key === sel.key
            return (
              <div key={m.key} onClick={() => actions.setHistSel(gid, m.key)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{ width: '100%', borderRadius: '7px 7px 4px 4px', background: isSel ? 'linear-gradient(180deg,#7C3AED,#3B82F6)' : m.current ? '#D9C9FB' : '#E7EAF1', height: Math.max(6, Math.round((m.total / histMax) * 80)), minHeight: 6, transition: 'height .25s ease' }} />
                <div style={{ fontSize: 10, fontWeight: 800, color: isSel ? '#7C3AED' : '#94A3B8' }}>{m.label}</div>
              </div>
            )
          })}
        </div>
      </div>

      {g.personal && <MethodBreak s={s} sel={sel} actions={actions} />}

      <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.05em', padding: '4px 4px 0' }}>MOVIMIENTOS POR MES</div>
      {monthKeys.map((k) => {
        const { totals, tuParte, transfers, items } = monthData(s, gid, k, catFilter, q)
        if ((catFilter.length || q) && items.length === 0) return null
        const spendCurs = CURRENCIES.filter((cu) => totals[cu])
        const trCurs = CURRENCIES.filter((cu) => transfers[cu])
        const mainCurs = spendCurs.length ? spendCurs : trCurs
        const mainObj = spendCurs.length ? totals : transfers
        const isTr = !spendCurs.length && trCurs.length
        return (
          <div key={k} onClick={() => actions.openMonthDetail(k)} style={{ background: '#fff', borderRadius: 18, boxShadow: cardShadow, border: '1px solid #EEF1F6', display: 'flex', alignItems: 'center', gap: 11, padding: '14px 14px', cursor: 'pointer' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14.5, color: '#0B1220' }}>{monthLongLabel(k)}</div>
              {!g.personal && spendCurs.length > 0 && (
                <div style={{ fontSize: 10.5, color: '#94A3B8', fontWeight: 700, marginTop: 1 }}>
                  tu parte {spendCurs.map((cu) => fmt(tuParte[cu], cu)).join(' · ')}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              {mainCurs.length ? mainCurs.map((cu) => (
                <div key={cu} className="num" style={{ fontWeight: 700, fontSize: 14.5, color: '#0B1220', lineHeight: 1.25 }}>{isTr ? '🔁 ' : ''}{fmt(mainObj[cu], cu)}</div>
              )) : <div className="num" style={{ fontWeight: 700, fontSize: 14.5, color: '#0B1220' }}>{fmt(0)}</div>}
            </div>
            <Chevron size={16} color="#C3CCDA" />
          </div>
        )
      })}
      {monthKeys.length === 0 && <div style={{ textAlign: 'center', fontSize: 12.5, color: '#B6BFCC', fontWeight: 700, padding: '10px 0' }}>Todavía no hay movimientos.</div>}
    </Scroll>
  )
}

/** Barra de exportación a CSV con rango de meses (desde / hasta). */
function ExportBar({ s, gid, monthKeys }) {
  const asc = monthKeys.slice().reverse()
  const [from, setFrom] = useState(asc[0])
  const [to, setTo] = useState(asc[asc.length - 1])
  const doExport = () => {
    const a = from <= to ? from : to
    const b = from <= to ? to : from
    const csv = buildCsv(s, gid, a, b)
    downloadCsv(csv, 'cuentas-claras_' + a + '_' + b + '.csv')
  }
  const selStyle = { border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '7px 9px', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, color: '#0B1220', background: '#fff', outline: 'none' }
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '12px 14px', boxShadow: cardShadow, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontWeight: 800, fontSize: 13, color: '#0B1220' }}>Exportar a planilla</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <select value={from} onChange={(e) => setFrom(e.target.value)} style={{ ...selStyle, flex: 1 }}>
          {asc.map((k) => <option key={k} value={k}>{monthLongLabel(k)}</option>)}
        </select>
        <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 700 }}>→</span>
        <select value={to} onChange={(e) => setTo(e.target.value)} style={{ ...selStyle, flex: 1 }}>
          {asc.map((k) => <option key={k} value={k}>{monthLongLabel(k)}</option>)}
        </select>
      </div>
      <button onClick={doExport} style={{ border: 'none', background: 'linear-gradient(135deg,#2ECCB1,#3B82F6,#7C3AED)', color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 13.5, padding: '11px', borderRadius: 12, cursor: 'pointer', boxShadow: '0 8px 20px -8px rgba(59,130,246,.6)' }}>⤓ Descargar CSV</button>
    </div>
  )
}

function MethodBreak({ s, sel, actions }) {
  const entries = Object.entries(sel.methods || {}).filter(([, v]) => v > 0)
  const mtot = entries.reduce((a, [, v]) => a + v, 0)
  const sorted = entries.sort((a, b) => b[1] - a[1])
  return (
    <div style={{ background: '#fff', borderRadius: 18, padding: '15px 16px', boxShadow: cardShadow }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
        <div style={{ fontWeight: 800, fontSize: 14.5, color: '#0B1220' }}>Por medio de pago</div>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#7C3AED', background: '#F1ECFD', padding: '3px 9px', borderRadius: 999 }}>{monthLongLabel(sel.key)}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map(([mid, amt], i) => {
          const meth = mid === 'sin' ? { name: 'Sin especificar', icon: '🚫' } : s.methods.find((x) => x.id === mid) || { name: mid, icon: '💳' }
          return (
            <div key={mid} onClick={() => actions.openMethodDetail(mid)} style={{ padding: '7px 6px', borderRadius: 12, cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: '#F4F6FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{meth.icon}</div>
                <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5, color: '#334155' }}>{meth.name}</span>
                <span className="num" style={{ fontWeight: 700, fontSize: 14, color: '#0B1220' }}>{fmt(amt)}</span>
                <Chevron size={16} color="#C3CCDA" />
              </div>
              <div style={{ height: 7, borderRadius: 999, background: '#EEF1F6', overflow: 'hidden', marginLeft: 37 }}>
                <div style={{ width: (mtot ? Math.round((amt / mtot) * 100) : 0) + '%', height: '100%', background: METHOD_COLORS[i % METHOD_COLORS.length], borderRadius: 999 }} />
              </div>
            </div>
          )
        })}
        {entries.length === 0 && <div style={{ textAlign: 'center', fontSize: 12.5, color: '#B6BFCC', fontWeight: 700, padding: '6px 0' }}>Sin gastos en este mes.</div>}
      </div>
    </div>
  )
}

const Scroll = ({ children }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#F4F6FA' }}>
    <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
  </div>
)
