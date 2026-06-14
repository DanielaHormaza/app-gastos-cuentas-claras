import { Card, SectionTitle, EmptyState } from './ui'
import MontoCell from './MontoCell'
import { PersonaBadge, MonedaBadge } from './badges'
import CategoriaSelect from './CategoriaSelect'
import MedioSelect from './MedioSelect'
import TagEditor, { TagChips } from './TagEditor'
import { useCatalog } from '../context/catalog'

const fechaCorta = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })

/**
 * Lista de gastos. La categoría y el medio de pago son editables (desplegables)
 * en los gastos propios; los ítems que vienen de un grupo se muestran de solo
 * lectura porque se editan desde el grupo.
 */
export default function ExpenseList({ titulo, gastos, variante = 'individual', onUpdateGasto }) {
  const { grupos } = useCatalog()
  const nombreGrupo = (id) => grupos.find((g) => g.id === id)?.nombre || 'Grupo'
  const ordenados = [...gastos].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <Card>
      <SectionTitle title={titulo} subtitle={`${ordenados.length} movimiento(s)`} />
      {ordenados.length === 0 ? (
        <EmptyState>No hay gastos con estos filtros.</EmptyState>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-700/60">
          {ordenados.map((g) => {
            const nativa = g.currency || 'ARS'
            return (
              <li key={g.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-base font-medium text-slate-800 dark:text-slate-100">
                    {g.description}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                    <span>{fechaCorta(g.date)}</span>
                    {g.esGrupo ? (
                      <>
                        <span>·</span>
                        <span>{g.category}</span>
                        <span className="rounded-full bg-teal-50 px-2 py-0.5 font-medium text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">
                          {nombreGrupo(g.groupId)}
                        </span>
                        <MonedaBadge currency={nativa} />
                        <TagChips tags={g.tags} />
                      </>
                    ) : (
                      <>
                        <CategoriaSelect
                          value={g.category}
                          onChange={(v) => onUpdateGasto(g.id, { category: v })}
                        />
                        <MedioSelect
                          value={g.paymentMethod}
                          onChange={(v) => onUpdateGasto(g.id, { paymentMethod: v })}
                        />
                        <MonedaBadge currency={nativa} />
                        <TagEditor
                          tags={g.tags || []}
                          onChange={(t) => onUpdateGasto(g.id, { tags: t })}
                        />
                      </>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <MontoCell gasto={g} />
                  {variante === 'shared' && (
                    <span className="flex items-center gap-1">
                      <PersonaBadge persona={g.paidBy}>Pagó {g.paidBy}</PersonaBadge>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                        {g.splitLabel}
                      </span>
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
