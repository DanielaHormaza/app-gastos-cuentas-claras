import { formatMonto, convertir } from '../utils/calculations'
import { useCurrency } from '../context/currency'
import { useCatalog } from '../context/catalog'
import { ahorrosIniciales } from '../data/mockData'
import { Card } from '../components/ui'

/** Vista Ahorros: objetivos de los grupos del usuario + sus inversiones personales. */
export default function SavingsView({ currentUser }) {
  const currency = useCurrency()
  const { grupos } = useCatalog()
  const fmt = (montoARS) => formatMonto(convertir(montoARS, currency), currency)
  const nombreGrupo = (id) => grupos.find((g) => g.id === id)?.nombre || 'Compartido'
  const misGruposIds = grupos
    .filter((g) => g.miembros.includes(currentUser))
    .map((g) => g.id)

  // Modelo Splitwise: ves los objetivos de tus grupos y solo tus inversiones personales.
  const objetivos = ahorrosIniciales.filter(
    (a) => (a.shared && misGruposIds.includes(a.groupId)) || (!a.shared && a.owner === currentUser),
  )
  const compartidos = objetivos.filter((a) => a.shared)
  const personales = objetivos.filter((a) => !a.shared)

  const renderObjetivo = (a) => {
    const pct = Math.round((a.actual / a.objetivo) * 100)
    return (
      <Card key={a.id}>
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-slate-800 dark:text-slate-100">{a.nombre}</p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
              a.shared
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
            }`}
          >
            {a.shared ? nombreGrupo(a.groupId) : 'Personal'}
          </span>
        </div>

        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {fmt(a.actual)}
          </span>
          <span className="text-sm text-slate-400 dark:text-slate-500">
            de {fmt(a.objetivo)}
          </span>
        </div>

        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-500"
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{pct}% del objetivo</p>

        {a.shared && a.aportes && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-sm dark:border-slate-700">
            {Object.entries(a.aportes).map(([persona, monto]) => (
              <span key={persona} className="text-slate-600 dark:text-slate-300">
                {persona}: <strong>{fmt(monto)}</strong>
              </span>
            ))}
          </div>
        )}
      </Card>
    )
  }

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Ahorros e inversiones
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Objetivos de tus grupos y tus inversiones personales.
        </p>
      </div>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Compartidos
      </p>
      <div className="grid gap-3 md:grid-cols-2">{compartidos.map(renderObjetivo)}</div>

      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Tuyos ({currentUser})
      </p>
      <div className="grid gap-3 md:grid-cols-2">{personales.map(renderObjetivo)}</div>
    </div>
  )
}
