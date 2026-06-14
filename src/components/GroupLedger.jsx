import { useCurrency } from '../context/currency'
import { useCatalog } from '../context/catalog'
import { valorEn, formatMonto } from '../utils/calculations'
import { Card, SectionTitle, EmptyState } from './ui'
import MontoCell from './MontoCell'
import { PersonaBadge, MonedaBadge, PagoBadge } from './badges'
import CategoriaSelect from './CategoriaSelect'
import TagEditor from './TagEditor'

const fechaCorta = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })

/**
 * Registro de movimientos del grupo: gastos compartidos + pagos de saldo.
 * Cada fila lleva una columna de saldo que se va neteando (en la moneda
 * elegida), para controlar la cuenta y ver quién le debe a quién.
 */
export default function GroupLedger({ movimientos, currentUser, onUpdateGasto, filtro }) {
  const currency = useCurrency()
  const { medios } = useCatalog()
  const nombreMedio = (id) => medios.find((m) => m.id === id)?.nombre || 'Sin medio'

  // Saldo acumulado en la moneda de visualización, desde la mirada del usuario.
  const asc = [...movimientos].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id - b.id,
  )
  let saldo = 0
  const filas = asc.map((m) => {
    const v = valorEn(m, currency)
    let delta
    if (m.type === 'settlement') {
      delta = (m.from === currentUser ? v : 0) - (m.to === currentUser ? v : 0)
    } else {
      delta = (m.paidBy === currentUser ? v : 0) - v * ((m.split && m.split[currentUser]) || 0)
    }
    saldo += delta
    return { m, saldo }
  })
  filas.reverse() // lo más reciente arriba
  // El saldo se calcula sobre todo el historial; el filtro solo decide qué filas se ven.
  const visibles = filtro ? filas.filter(({ m }) => filtro(m)) : filas

  const saldoTexto = (s) => {
    if (Math.abs(s) < 1) return { t: 'al día', c: 'text-slate-400 dark:text-slate-500' }
    return s > 0
      ? { t: `te deben ${formatMonto(s, currency)}`, c: 'text-emerald-600 dark:text-emerald-400' }
      : { t: `debés ${formatMonto(-s, currency)}`, c: 'text-rose-600 dark:text-rose-400' }
  }

  return (
    <Card>
      <SectionTitle
        title="Registro del grupo"
        subtitle="Gastos y pagos · el saldo de cada fila muestra cómo va la cuenta"
      />
      {visibles.length === 0 ? (
        <EmptyState>No hay movimientos con estos filtros.</EmptyState>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-700/60">
          {visibles.map(({ m, saldo }) => {
            const esPago = m.type === 'settlement'
            const nativa = m.currency || 'ARS'
            const s = saldoTexto(saldo)
            return (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-base font-medium text-slate-800 dark:text-slate-100">
                    {esPago ? 'Pago de saldo' : m.description}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                    <span>{fechaCorta(m.date)}</span>
                    {esPago ? (
                      <PagoBadge from={m.from} to={m.to} />
                    ) : (
                      <>
                        <CategoriaSelect
                          value={m.category}
                          onChange={(v) => onUpdateGasto(m.id, { category: v })}
                        />
                        <PersonaBadge persona={m.paidBy}>Pagó {m.paidBy}</PersonaBadge>
                        {/* El medio de pago solo lo ve quien pagó (es privado). */}
                        {m.paidBy === currentUser && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                            vía {nombreMedio(m.paymentMethod)}
                          </span>
                        )}
                      </>
                    )}
                    <MonedaBadge currency={nativa} />
                    {!esPago && (
                      <TagEditor
                        tags={m.tags || []}
                        onChange={(t) => onUpdateGasto(m.id, { tags: t })}
                      />
                    )}
                  </div>
                  {!esPago && m.split && (
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      Le toca:{' '}
                      {Object.entries(m.split)
                        .map(([p, f]) => `${p} ${formatMonto(valorEn(m, currency) * f, currency)}`)
                        .join(' · ')}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <MontoCell gasto={m} prefijo={esPago ? '↧ ' : ''} />
                  <p className={`text-xs font-medium ${s.c}`}>Saldo: {s.t}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
