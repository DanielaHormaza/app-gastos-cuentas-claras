import { mesDe, etiquetaMes, valorEn, formatMonto, totalDe } from '../utils/calculations'
import { useCurrency } from '../context/currency'
import { Card, SectionTitle, EmptyState } from './ui'

/**
 * Lista de pagos futuros (cuotas y gastos fechados más adelante), agrupados
 * por mes. No cuentan en el saldo de hoy; sirven para ver lo que se viene.
 */
export default function UpcomingPayments({ titulo = 'Próximos pagos', gastos }) {
  const currency = useCurrency()
  const meses = [...new Set(gastos.map((g) => mesDe(g.date)))].sort()

  return (
    <Card>
      <SectionTitle
        title={titulo}
        subtitle="Cuotas y gastos a futuro · no cuentan en el saldo de hoy"
      />
      {gastos.length === 0 ? (
        <EmptyState>No hay pagos futuros agendados.</EmptyState>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            Total comprometido:{' '}
            <strong className="text-slate-800 dark:text-slate-100">
              {formatMonto(totalDe(gastos, currency), currency)}
            </strong>
          </p>
          <div className="space-y-3">
            {meses.map((m) => {
              const delMes = gastos.filter((g) => mesDe(g.date) === m)
              return (
                <div key={m}>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1 dark:border-slate-700/60">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {etiquetaMes(m)}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {formatMonto(totalDe(delMes, currency), currency)}
                    </span>
                  </div>
                  <ul className="mt-1.5 space-y-1.5">
                    {delMes.map((g) => (
                      <li key={g.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate text-slate-700 dark:text-slate-200">
                          {g.description}
                        </span>
                        <span className="shrink-0 text-slate-500 dark:text-slate-400">
                          {formatMonto(valorEn(g, currency), currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </>
      )}
    </Card>
  )
}
