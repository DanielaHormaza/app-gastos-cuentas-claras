import { formatMonto, porCategoria } from '../utils/calculations'
import { useCurrency } from '../context/currency'
import { Card, SectionTitle, EmptyState } from './ui'

// Paleta suave por posición (no depende de la categoría puntual).
const COLORES = ['bg-emerald-400', 'bg-blue-400', 'bg-violet-400', 'bg-amber-400', 'bg-rose-400', 'bg-sky-400', 'bg-teal-400']

/** Desglose por categoría con barras horizontales. */
export default function CategoryBreakdown({ gastos, accent }) {
  const currency = useCurrency()
  const datos = porCategoria(gastos, currency)
  const total = datos.reduce((a, d) => a + d.total, 0)

  return (
    <Card>
      <SectionTitle title="Gastos por categoría" subtitle="Del mes seleccionado" />
      {datos.length === 0 ? (
        <EmptyState>Sin gastos para mostrar.</EmptyState>
      ) : (
        <ul className="mt-3 space-y-3">
          {datos.map((d, i) => {
            const pct = total > 0 ? Math.round((d.total / total) * 100) : 0
            return (
              <li key={d.categoria}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{d.categoria}</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {formatMonto(d.total, currency)} · {pct}%
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  <div
                    className={`h-full rounded-full ${accent || COLORES[i % COLORES.length]}`}
                    style={{ width: `${Math.max(pct, 3)}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
