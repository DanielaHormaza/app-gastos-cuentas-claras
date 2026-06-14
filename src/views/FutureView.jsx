import { useState, useMemo } from 'react'
import {
  individualesDe,
  parteEnGrupos,
  valorEn,
  formatMonto,
  mesDe,
  etiquetaMes,
  totalDe,
} from '../utils/calculations'
import { HOY } from '../data/mockData'
import { useCurrency } from '../context/currency'
import { useCatalog } from '../context/catalog'
import { Card, EmptyState } from '../components/ui'
import StackedCategoryChart from '../components/StackedCategoryChart'
import CategoriaSelect from '../components/CategoriaSelect'

const ChevronIcon = ({ abierto }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`transition-transform ${abierto ? 'rotate-90' : ''}`}
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

const fechaCorta = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })

/**
 * Vista Futuro: TODO lo comprometido a futuro (cuotas + gastos fechados más
 * adelante). Pensada para responder "¿cuánto debo en cada mes?" con filtros
 * por persona/categoría/tarjeta y detalle de cuotas pendientes por compra.
 */
export default function FutureView({ gastos, currentUser, onUpdateGasto }) {
  const currency = useCurrency()
  const { categorias, medios, grupos } = useCatalog()
  const nombreGrupo = (id) => grupos.find((g) => g.id === id)?.nombre || 'Grupo'

  // Cuotas por compra: { compraId: { total: N, items: [g1, g2, ...] } }.
  // Permite mostrar "cuota 3/6 · quedan 4 cuotas" sin parsear descripciones.
  const compras = useMemo(() => {
    const map = {}
    for (const g of gastos) {
      if (!g.compraId) continue
      if (!map[g.compraId]) map[g.compraId] = []
      map[g.compraId].push(g)
    }
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.date.localeCompare(b.date)))
    return map
  }, [gastos])

  // Universo: mis individuales futuros + mi parte de los grupos futuros.
  const mios = useMemo(
    () => [...individualesDe(gastos, currentUser), ...parteEnGrupos(gastos, currentUser)],
    [gastos, currentUser],
  )
  const futurosTodos = useMemo(() => mios.filter((g) => g.date > HOY), [mios])

  // --- Filtros ---
  const [filtros, setFiltros] = useState({
    fuente: 'todo', // todo | individual | grupo
    categoria: 'Todas',
    medio: 'Todos',
    mes: 'Todos',
    buscar: '',
  })
  const cambiar = (campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor }))
  // Toggle del gráfico: arranca visible, se puede ocultar.
  const [mostrarGrafico, setMostrarGrafico] = useState(true)

  const aplicaSinMes = (g) => {
    if (filtros.fuente === 'individual' && g.esGrupo) return false
    if (filtros.fuente === 'grupo' && !g.esGrupo) return false
    if (filtros.categoria !== 'Todas' && g.category !== filtros.categoria) return false
    if (filtros.medio !== 'Todos' && g.paymentMethod !== filtros.medio) return false
    const q = filtros.buscar.trim().toLowerCase()
    if (q && !(g.description || '').toLowerCase().includes(q)) return false
    return true
  }
  const aplica = (g) =>
    aplicaSinMes(g) && (filtros.mes === 'Todos' || mesDe(g.date) === filtros.mes)

  const futuros = futurosTodos.filter(aplica)

  // Meses presentes en los futuros (respeta todos los filtros menos el de mes),
  // para que los chips reflejen el subconjunto y no se queden mostrando meses
  // que ya no aplican.
  const mesesFuturos = useMemo(() => {
    const set = new Set(futurosTodos.filter(aplicaSinMes).map((g) => mesDe(g.date)))
    return [...set].sort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [futurosTodos, filtros.fuente, filtros.categoria, filtros.medio, filtros.buscar])

  // Subtotal por mes (ignora el filtro de mes; respeta los otros).
  const totalPorMes = (m) =>
    totalDe(
      futurosTodos.filter((g) => mesDe(g.date) === m && aplicaSinMes(g)),
      currency,
    )

  // --- Insights ---
  const totalComprometido = totalDe(futuros, currency)
  const cantMeses = mesesFuturos.length
  const pico = mesesFuturos
    .map((m) => ({ m, total: totalPorMes(m) }))
    .sort((a, b) => b.total - a.total)[0]

  // --- Agrupado por mes (para la lista) ---
  const agrupado = useMemo(() => {
    const map = {}
    for (const g of futuros) {
      const m = mesDe(g.date)
      if (!map[m]) map[m] = []
      map[m].push(g)
    }
    Object.values(map).forEach((arr) => arr.sort((a, b) => a.date.localeCompare(b.date)))
    return map
  }, [futuros])
  const mesesLista = Object.keys(agrupado).sort()

  const [mesesColapsados, setMesesColapsados] = useState(new Set())
  const toggleMes = (m) =>
    setMesesColapsados((curr) => {
      const next = new Set(curr)
      if (next.has(m)) next.delete(m)
      else next.add(m)
      return next
    })

  // Categorías y medios disponibles en el universo (no en el filtrado).
  const catsDisponibles = [...new Set(futurosTodos.map((g) => g.category))].sort()
  const mediosDisponibles = medios.filter((m) =>
    futurosTodos.some((g) => g.paymentMethod === m.id),
  )

  // Info de cuotas para un gasto. Sólo los individuales llevan `compraId`; los
  // ítems virtuales de "parteEnGrupos" no, así que esto solo dispara ahí.
  const infoCuota = (g) => {
    if (!g.compraId) return null
    const arr = compras[g.compraId] || []
    const total = arr.length
    const idx = arr.findIndex((x) => x.id === g.id) + 1
    const restantes = arr.filter((x) => x.date > HOY).length
    return { idx, total, restantes }
  }

  // Nombre del medio (display).
  const nombreMedio = (id) => medios.find((m) => m.id === id)?.nombre || 'Sin medio'

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Gastos futuros
        </h1>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Lo que tenés comprometido a partir de mañana: cuotas en curso y gastos fechados más
          adelante. No afecta lo que debés hoy.
        </p>
      </div>

      {/* Resumen / insights */}
      <Card>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          <div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Total comprometido</p>
            <p className="mt-0.5 text-lg font-bold text-slate-800 dark:text-slate-100">
              {formatMonto(totalComprometido, currency)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Meses afectados</p>
            <p className="mt-0.5 text-lg font-bold text-slate-800 dark:text-slate-100">
              {cantMeses}
            </p>
          </div>
          {pico && (
            <div className="col-span-2 md:col-span-1">
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Mes más pesado</p>
              <p className="mt-0.5 text-sm font-semibold text-rose-600 dark:text-rose-400">
                {etiquetaMes(pico.m)} · {formatMonto(pico.total, currency)}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Filtros */}
      <Card className="!p-3">
        <div className="mb-2 flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-slate-400 dark:text-slate-500"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={filtros.buscar}
            onChange={(e) => cambiar('buscar', e.target.value)}
            placeholder="Buscar por descripción…"
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          />
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              Fuente
            </span>
            <select
              value={filtros.fuente}
              onChange={(e) => cambiar('fuente', e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="todo">Todo</option>
              <option value="individual">Sólo mío</option>
              <option value="grupo">Sólo de grupos</option>
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              Categoría
            </span>
            <select
              value={filtros.categoria}
              onChange={(e) => cambiar('categoria', e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="Todas">Todas</option>
              {catsDisponibles.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              Tarjeta
            </span>
            <select
              value={filtros.medio}
              onChange={(e) => cambiar('medio', e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              <option value="Todos">Todas</option>
              {mediosDisponibles.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      {/* Gráfico (toggleable). Respeta los filtros menos el de mes —
          mostrar el panorama completo de cómo se reparte el compromiso. */}
      {mesesFuturos.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Compromiso por mes
            </span>
            <button
              onClick={() => setMostrarGrafico((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
            >
              <span
                className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${
                  mostrarGrafico ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`h-4 w-4 rounded-full bg-white transition ${
                    mostrarGrafico ? 'translate-x-4' : ''
                  }`}
                />
              </span>
              {mostrarGrafico ? 'Ocultar gráfico' : 'Mostrar gráfico'}
            </button>
          </div>
          {mostrarGrafico && (
            <StackedCategoryChart
              titulo="Total comprometido por mes"
              gastos={futurosTodos.filter(aplicaSinMes)}
              meses={mesesFuturos}
              mesActivo={filtros.mes === 'Todos' ? undefined : filtros.mes}
              onSelectMes={(m) => cambiar('mes', m === filtros.mes ? 'Todos' : m)}
            />
          )}
        </>
      )}

      {/* Chips por mes con subtotales */}
      {mesesFuturos.length > 0 && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <button
            onClick={() => cambiar('mes', 'Todos')}
            className={`shrink-0 rounded-xl px-3 py-2 text-left ring-1 transition ${
              filtros.mes === 'Todos'
                ? 'bg-indigo-500 text-white ring-indigo-500'
                : 'bg-white text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
            }`}
          >
            <span className="block text-[11px] opacity-80">Todos</span>
            <span className="block text-sm font-semibold">
              {formatMonto(totalComprometido, currency)}
            </span>
          </button>
          {mesesFuturos.map((m) => (
            <button
              key={m}
              onClick={() => cambiar('mes', m === filtros.mes ? 'Todos' : m)}
              className={`shrink-0 rounded-xl px-3 py-2 text-left ring-1 transition ${
                filtros.mes === m
                  ? 'bg-indigo-500 text-white ring-indigo-500'
                  : 'bg-white text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
              }`}
            >
              <span className="block text-[11px] opacity-80">{etiquetaMes(m)}</span>
              <span className="block text-sm font-semibold">
                {formatMonto(totalPorMes(m), currency)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Lista agrupada por mes */}
      {futuros.length === 0 ? (
        <EmptyState>No hay pagos futuros con estos filtros.</EmptyState>
      ) : (
        <div className="space-y-2">
          {mesesLista.map((m) => {
            const items = agrupado[m]
            const total = totalDe(items, currency)
            const colapsado = mesesColapsados.has(m)
            return (
              <Card key={m} className="!p-3">
                <button
                  onClick={() => toggleMes(m)}
                  className="flex w-full items-center justify-between gap-2"
                >
                  <span className="flex items-center gap-2">
                    <ChevronIcon abierto={!colapsado} />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {etiquetaMes(m)}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">
                      {items.length} pago{items.length === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {formatMonto(total, currency)}
                  </span>
                </button>
                {!colapsado && (
                  <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-700/60">
                    {items.map((g) => {
                      const cuota = infoCuota(g)
                      return (
                        <li
                          key={g.id}
                          className="flex items-start justify-between gap-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
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
                                </>
                              ) : (
                                <>
                                  <CategoriaSelect
                                    value={g.category}
                                    onChange={(v) =>
                                      onUpdateGasto && onUpdateGasto(g.id, { category: v })
                                    }
                                  />
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                                    {nombreMedio(g.paymentMethod)}
                                  </span>
                                </>
                              )}
                              {cuota && (
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                                  Cuota {cuota.idx}/{cuota.total} · quedan {cuota.restantes}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {formatMonto(valorEn(g, currency), currency)}
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500">
                              {g.esGrupo ? 'tu parte' : 'cuota'}
                            </p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
