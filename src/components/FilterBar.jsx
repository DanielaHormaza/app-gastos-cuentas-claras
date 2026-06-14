import { useCatalog } from '../context/catalog'
import { etiquetaMes, etiquetaMesCorta, mesDe } from '../utils/calculations'
import { Card } from './ui'
import SearchSelect from './SearchSelect'

const INPUT =
  'rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'

/** Campo con etiqueta arriba. */
function Campo({ label, children }) {
  return (
    <label className="flex min-w-[8rem] flex-1 flex-col gap-1">
      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{label}</span>
      {children}
    </label>
  )
}

// Día final defensivo del mes (usamos 31 — los date pickers aceptan, los
// gastos no caen ahí; sirve para que el "hasta" cubra el mes entero).
const finMes = (m) => `${m}-31`
const iniMes = (m) => `${m}-01`

// ¿El rango actual coincide exactamente con un mes calendario?
const mesActivo = (desde, hasta) =>
  desde && hasta && mesDe(desde) === mesDe(hasta) && desde === iniMes(mesDe(desde))
    ? mesDe(desde)
    : null

/**
 * Barra de filtros de gastos: chips de meses rápidos + rango libre + categoría
 * / medio / etiqueta. Los chips y el rango libre conviven (el chip que
 * coincida con el rango aparece activo).
 */
export default function FilterBar({ categorias, medios, mesesRapidos = [], filtros, onChange }) {
  const { etiquetas } = useCatalog()
  const activo = mesActivo(filtros.desde, filtros.hasta)
  const seleccionarMes = (m) => {
    onChange('desde', iniMes(m))
    onChange('hasta', finMes(m))
  }
  const limpiarRango = () => {
    onChange('desde', '')
    onChange('hasta', '')
  }

  return (
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
          value={filtros.buscar || ''}
          onChange={(e) => onChange('buscar', e.target.value)}
          placeholder="Buscar por descripción…"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
        />
      </div>
      {mesesRapidos.length > 0 && (
        <div className="-mx-1 mb-2 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          <button
            onClick={limpiarRango}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${
              !filtros.desde && !filtros.hasta
                ? 'bg-indigo-500 text-white ring-indigo-500'
                : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700'
            }`}
          >
            Todo
          </button>
          {mesesRapidos.map((m) => (
            <button
              key={m}
              onClick={() => seleccionarMes(m)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${
                activo === m
                  ? 'bg-indigo-500 text-white ring-indigo-500'
                  : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700'
              }`}
              title={etiquetaMes(m)}
            >
              {etiquetaMesCorta(m)} {m.slice(2, 4)}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Campo label="Desde">
          <input
            type="date"
            value={filtros.desde}
            onChange={(e) => onChange('desde', e.target.value)}
            className={INPUT}
          />
        </Campo>
        <Campo label="Hasta">
          <input
            type="date"
            value={filtros.hasta}
            onChange={(e) => onChange('hasta', e.target.value)}
            className={INPUT}
          />
        </Campo>
        <Campo label="Categoría">
          <SearchSelect
            variant="campo"
            value={filtros.categoria}
            opciones={[
              { value: 'Todas', label: 'Todas' },
              ...categorias.map((c) => ({ value: c, label: c })),
            ]}
            onChange={(v) => onChange('categoria', v)}
          />
        </Campo>
        {medios && medios.length > 0 && (
          <Campo label="Medio de pago">
            <SearchSelect
              variant="campo"
              value={filtros.medio}
              opciones={[
                { value: 'Todos', label: 'Todos' },
                ...medios.map((m) => ({ value: m.id, label: m.nombre })),
              ]}
              onChange={(v) => onChange('medio', v)}
            />
          </Campo>
        )}
        <Campo label="Etiqueta">
          <SearchSelect
            variant="campo"
            value={filtros.etiqueta}
            opciones={[
              { value: 'Todas', label: 'Todas' },
              ...etiquetas.map((e) => ({ value: e, label: e })),
            ]}
            onChange={(v) => onChange('etiqueta', v)}
          />
        </Campo>
      </div>
    </Card>
  )
}
