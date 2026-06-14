import { formatCorto, etiquetaMesCorta, mesDe, porCategoria, valorEn } from '../utils/calculations'
import { useCurrency } from '../context/currency'
import { Card, SectionTitle, EmptyState } from './ui'

// Paleta para las categorías (top 5) + gris para "Otros".
const PALETA = ['#2ECCB1', '#3B82F6', '#7C3AED', '#f59e0b', '#f43f5e']
const COLOR_OTROS = '#94a3b8'

/**
 * Gráfico de barras apiladas por categoría, en CSS puro (sin librerías).
 * Cada barra mensual se divide en segmentos de color; top 5 categorías + "Otros".
 */
export default function StackedCategoryChart({ titulo, gastos, meses, mesActivo, onSelectMes }) {
  const currency = useCurrency()
  const ranking = porCategoria(gastos, currency)
  if (ranking.length === 0) {
    return (
      <Card>
        <SectionTitle title={titulo} subtitle="Composición por categoría" />
        <EmptyState>Todavía no hay gastos para graficar.</EmptyState>
      </Card>
    )
  }

  const top = ranking.slice(0, 5).map((r) => r.categoria)
  const hayOtros = ranking.length > 5
  const categorias = hayOtros ? [...top, 'Otros'] : top
  const colorDe = (cat) => (cat === 'Otros' ? COLOR_OTROS : PALETA[top.indexOf(cat)])

  // Total por mes y por categoría.
  const porMes = meses.map((m) => {
    const delMes = gastos.filter((g) => mesDe(g.date) === m)
    const seg = {}
    for (const c of categorias) seg[c] = 0
    for (const g of delMes) {
      seg[top.includes(g.category) ? g.category : 'Otros'] += valorEn(g, currency)
    }
    return { mes: m, seg, total: delMes.reduce((a, g) => a + valorEn(g, currency), 0) }
  })
  const max = Math.max(...porMes.map((d) => d.total), 1)

  return (
    <Card>
      <SectionTitle
        title={titulo}
        subtitle={onSelectMes ? 'Tocá un mes para filtrar' : 'Composición por categoría'}
      />
      <div className="mt-3 flex items-end gap-2" style={{ height: 150 }}>
        {porMes.map((d) => (
          <button
            type="button"
            key={d.mes}
            onClick={() => onSelectMes && onSelectMes(d.mes)}
            className={`flex h-full flex-1 flex-col items-center justify-end rounded-md transition ${
              onSelectMes ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/40' : ''
            } ${d.mes === mesActivo ? 'bg-slate-100 dark:bg-slate-700/50' : ''}`}
          >
            <span
              className={`mb-1 text-[10px] font-semibold ${
                d.mes === mesActivo
                  ? 'text-slate-700 dark:text-slate-200'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {formatCorto(d.total, currency)}
            </span>
            <div
              className="flex w-full flex-col overflow-hidden rounded-md"
              style={{ height: `${(d.total / max) * 78}%` }}
            >
              {categorias.map(
                (c) =>
                  d.total > 0 &&
                  d.seg[c] > 0 && (
                    <div
                      key={c}
                      style={{ height: `${(d.seg[c] / d.total) * 100}%`, backgroundColor: colorDe(c) }}
                    />
                  ),
              )}
            </div>
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2">
        {porMes.map((d) => (
          <span
            key={d.mes}
            className={`flex-1 text-center text-[10px] ${
              d.mes === mesActivo
                ? 'font-semibold text-slate-600 dark:text-slate-300'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {etiquetaMesCorta(d.mes)}
          </span>
        ))}
      </div>
      {/* Leyenda */}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 pt-3 dark:border-slate-700">
        {categorias.map((c) => (
          <span
            key={c}
            className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400"
          >
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colorDe(c) }} />
            {c}
          </span>
        ))}
      </div>
    </Card>
  )
}
