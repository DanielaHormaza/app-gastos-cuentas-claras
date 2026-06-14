import { useState, useEffect } from 'react'
import {
  individualesDe,
  parteEnGrupos,
  mesesDisponibles,
  totalDe,
  etiquetaMes,
  mesDe,
  categoriasDisponibles,
  formatMonto,
} from '../utils/calculations'
import { useCurrency } from '../context/currency'
import { useCatalog } from '../context/catalog'
import { HOY } from '../data/mockData'
import FilterBar from '../components/FilterBar'
import StackedCategoryChart from '../components/StackedCategoryChart'
import CategoryBreakdown from '../components/CategoryBreakdown'
import ExpenseList from '../components/ExpenseList'
import { Card } from '../components/ui'

/** Espacio Personal: gastos individuales (+ opcionalmente la parte de los grupos). */
export default function PersonalDashboard({ gastos, currentUser, onUpdateGasto }) {
  const currency = useCurrency()
  const { medios } = useCatalog()
  // Incluir la parte propia de los gastos de grupo: también es plata que gastás.
  const [incluirGrupos, setIncluirGrupos] = useState(true)
  // Mostrar / ocultar los gráficos (evolución + breakdown). Persistido para que
  // si la usás en modo compacto, te quede así la próxima vez.
  const [mostrarGraficos, setMostrarGraficos] = useState(
    () => localStorage.getItem('personal:graficos') !== 'oculto',
  )
  useEffect(() => {
    localStorage.setItem('personal:graficos', mostrarGraficos ? 'visible' : 'oculto')
  }, [mostrarGraficos])

  const individuales = individualesDe(gastos, currentUser)
  const todos = incluirGrupos
    ? [...individuales, ...parteEnGrupos(gastos, currentUser)]
    : individuales
  // Lo fechado a futuro (cuotas que no vencieron) se ve en la sección Futuro.
  const mios = todos.filter((g) => g.date <= HOY)
  const meses = mesesDisponibles(mios)

  // Por defecto arranca filtrado al mes en curso (más común que querer ver el
  // historial entero). Los chips y "Todo" permiten cambiar.
  const mesHoy = mesDe(HOY)
  const [filtros, setFiltros] = useState({
    desde: `${mesHoy}-01`,
    hasta: `${mesHoy}-31`,
    categoria: 'Todas',
    medio: 'Todos',
    etiqueta: 'Todas',
    buscar: '',
  })
  const cambiar = (campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor }))
  // Click en un mes del gráfico => fija el rango de fechas a ese mes.
  const seleccionarMes = (m) => setFiltros((f) => ({ ...f, desde: `${m}-01`, hasta: `${m}-31` }))

  const aplica = (g) => {
    const q = filtros.buscar.trim().toLowerCase()
    return (
      (!filtros.desde || g.date >= filtros.desde) &&
      (!filtros.hasta || g.date <= filtros.hasta) &&
      (filtros.categoria === 'Todas' || g.category === filtros.categoria) &&
      (filtros.medio === 'Todos' || g.paymentMethod === filtros.medio) &&
      (filtros.etiqueta === 'Todas' || (g.tags || []).includes(filtros.etiqueta)) &&
      (!q || (g.description || '').toLowerCase().includes(q))
    )
  }

  const filtrados = mios.filter(aplica)
  const total = totalDe(filtrados, currency)

  const hayRango = filtros.desde || filtros.hasta
  // Si el rango es exactamente un mes, ese mes se resalta en el gráfico y en el hero.
  const mesActivo =
    filtros.desde &&
    filtros.hasta &&
    mesDe(filtros.desde) === mesDe(filtros.hasta) &&
    filtros.desde === `${mesDe(filtros.desde)}-01`
      ? mesDe(filtros.desde)
      : undefined

  const mediosPersonales = medios.filter(
    (m) => m.titular === currentUser || m.titular === 'Ambos',
  )

  // Últimos 6 meses con datos, ordenados de más nuevo a más viejo (chips rápidos).
  const mesesRapidos = [...meses].reverse().slice(0, 6)

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {/* Filtros (sticky arriba de todo) */}
      <div className="sticky top-[60px] z-20 md:col-span-2">
        <FilterBar
          categorias={categoriasDisponibles(mios)}
          medios={mediosPersonales}
          mesesRapidos={mesesRapidos}
          filtros={filtros}
          onChange={cambiar}
        />
      </div>

      {/* Hero: cuánto gastaste, con el período destacado */}
      <div className="md:col-span-2">
        <Card className="border-0 bg-gradient-to-br from-[#3B82F6] to-[#7C3AED] text-white ring-0">
          {mesActivo ? (
            <p className="text-2xl font-bold leading-tight text-white">
              {etiquetaMes(mesActivo)}
            </p>
          ) : (
            <p className="text-base font-semibold text-white">
              {hayRango ? 'Período seleccionado' : 'Todo tu historial'}
            </p>
          )}
          <p className="mt-1 text-xs opacity-80">
            {mesActivo ? 'Tus gastos del mes' : hayRango ? 'Tus gastos del período' : 'Todos tus gastos'}
          </p>
          <p className="mt-2 text-3xl font-bold">{formatMonto(total, currency)}</p>
          <p className="mt-1 text-xs opacity-70">{filtrados.length} movimiento(s)</p>
        </Card>
      </div>

      {/* Toggle: incluir parte de grupos */}
      <div className="md:col-span-2">
        <button
          onClick={() => setIncluirGrupos((v) => !v)}
          className="flex w-full items-center justify-between rounded-2xl bg-white p-3 text-sm shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700/70"
        >
          <span className="text-slate-600 dark:text-slate-300">
            Incluir mi parte de los gastos de grupo
          </span>
          <span
            className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${
              incluirGrupos ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full bg-white transition ${
                incluirGrupos ? 'translate-x-5' : ''
              }`}
            />
          </span>
        </button>
      </div>

      {/* Toggle de gráficos (compacta la vista cuando ocupan demasiado) */}
      <div className="flex items-center justify-between md:col-span-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Evolución y categorías
        </span>
        <button
          onClick={() => setMostrarGraficos((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
        >
          <span
            className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${
              mostrarGraficos ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          >
            <span
              className={`h-4 w-4 rounded-full bg-white transition ${
                mostrarGraficos ? 'translate-x-4' : ''
              }`}
            />
          </span>
          {mostrarGraficos ? 'Ocultar gráficos' : 'Mostrar gráficos'}
        </button>
      </div>

      {mostrarGraficos && (
        <>
          {/* El gráfico ocupa todo el ancho para ver más meses; categorías abajo. */}
          <div className="md:col-span-2">
            <StackedCategoryChart
              titulo="Evolución de tus gastos"
              gastos={mios}
              meses={meses.slice(-6)}
              mesActivo={mesActivo}
              onSelectMes={seleccionarMes}
            />
          </div>

          <div className="md:col-span-2">
            <CategoryBreakdown gastos={filtrados} />
          </div>
        </>
      )}

      <div className="md:col-span-2">
        <ExpenseList
          titulo="Tus gastos"
          gastos={filtrados}
          variante="individual"
          onUpdateGasto={onUpdateGasto}
        />
      </div>
    </div>
  )
}
