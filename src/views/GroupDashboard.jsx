import { useState } from 'react'
import {
  compartidosDeGrupo,
  settlementsDeGrupo,
  mesesDisponibles,
  totalDe,
  balancesPorMoneda,
  pagadoPor,
  formatMonto,
  convertirEntre,
  categoriasDisponibles,
  etiquetaMes,
  mesDe,
  MONEDAS,
} from '../utils/calculations'
import { useCurrency } from '../context/currency'
import { useCatalog } from '../context/catalog'
import { HOY } from '../data/mockData'
import StackedCategoryChart from '../components/StackedCategoryChart'
import CategoryBreakdown from '../components/CategoryBreakdown'
import GroupLedger from '../components/GroupLedger'
import FilterBar from '../components/FilterBar'
import UpcomingPayments from '../components/UpcomingPayments'
import { Card, Modal } from '../components/ui'

const acentoPersona = (p) =>
  p === 'Dani'
    ? 'text-indigo-600 dark:text-indigo-400'
    : p === 'Juan'
      ? 'text-teal-600 dark:text-teal-400'
      : 'text-violet-600 dark:text-violet-400'

/** Mini-stat dentro de una fila. */
function Stat({ label, value, accent }) {
  return (
    <Card className="flex-1 !p-3">
      <p className="text-[11px] text-slate-400 dark:text-slate-500">{label}</p>
      <p className={`mt-0.5 text-base font-semibold ${accent || 'text-slate-800 dark:text-slate-100'}`}>
        {value}
      </p>
    </Card>
  )
}

/**
 * Detalle de un grupo: balance HISTÓRICO + registro filtrable.
 * Se accede desde la lista de grupos. La cuenta se acumula mes a mes; uno va
 * pagando para saldar cuando quiere.
 */
export default function GroupDashboard({
  grupoId,
  gastos,
  currentUser,
  onBack,
  onAddMovimiento,
  onUpdateGasto,
}) {
  const currency = useCurrency()
  const { grupos } = useCatalog()
  const grupo = grupos.find((g) => g.id === grupoId)
  if (!grupo) {
    // El grupo fue borrado mientras lo veías: volver a la lista.
    return (
      <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700/70">
        Este grupo ya no existe.{' '}
        <button onClick={onBack} className="font-semibold text-indigo-600 dark:text-indigo-400">
          Volver
        </button>
      </div>
    )
  }

  // Histórico del grupo. Las cuotas/gastos a futuro van aparte (no al saldo).
  const compartidosTodos = compartidosDeGrupo(gastos, grupo.id)
  const compartidos = compartidosTodos.filter((g) => g.date <= HOY)
  const futuros = compartidosTodos.filter((g) => g.date > HOY)
  const settlements = settlementsDeGrupo(gastos, grupo.id)
  const meses = mesesDisponibles(compartidos)

  const balances = balancesPorMoneda(compartidos, settlements, grupo.miembros)
  const total = totalDe(compartidos, currency)

  // Frase del balance, por moneda, en primera persona, con color según deuda.
  const frase = (b) =>
    b.acreedor === currentUser
      ? `${b.deudor} te debe ${formatMonto(b.monto, b.currency)}`
      : `Le debés ${formatMonto(b.monto, b.currency)} a ${b.acreedor}`
  const fraseColor = (b) =>
    b.acreedor === currentUser
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-rose-600 dark:text-rose-400'

  const otro = grupo.miembros.find((m) => m !== currentUser)
  const neto = balances.reduce((acc, b) => {
    const valor = convertirEntre(b.monto, b.currency, currency)
    return acc + (b.acreedor === currentUser ? valor : -valor)
  }, 0)

  // Filtros del registro (no afectan el balance, que es histórico completo).
  // Arranca en el mes en curso — mismo criterio que el espacio personal.
  const mesHoy = mesDe(HOY)
  const [filtros, setFiltros] = useState({
    desde: `${mesHoy}-01`,
    hasta: `${mesHoy}-31`,
    categoria: 'Todas',
    etiqueta: 'Todas',
    buscar: '',
  })
  const cambiarFiltro = (campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor }))
  const coincide = (m) => {
    const q = filtros.buscar.trim().toLowerCase()
    return (
      (!filtros.desde || m.date >= filtros.desde) &&
      (!filtros.hasta || m.date <= filtros.hasta) &&
      (filtros.categoria === 'Todas' || m.category === filtros.categoria) &&
      (filtros.etiqueta === 'Todas' || (m.tags || []).includes(filtros.etiqueta)) &&
      (!q || (m.description || '').toLowerCase().includes(q))
    )
  }

  const mesActivoFiltro =
    filtros.desde &&
    filtros.hasta &&
    mesDe(filtros.desde) === mesDe(filtros.hasta) &&
    filtros.desde === `${mesDe(filtros.desde)}-01`
      ? mesDe(filtros.desde)
      : undefined
  // Últimos 6 meses con movimientos para los chips del filtro.
  const mesesRapidos = [...meses].reverse().slice(0, 6)

  // --- Modal de pago de saldo ---
  const [modalOpen, setModalOpen] = useState(false)
  const [modo, setModo] = useState('todo')
  const [monedaPago, setMonedaPago] = useState('ARS')
  const [montoPago, setMontoPago] = useState('')
  const balanceSel = balances.find((b) => b.currency === monedaPago) || balances[0]

  const abrirModal = () => {
    if (!balances.length) return
    setModo('todo')
    setMonedaPago(balances[0].currency)
    setMontoPago(String(balances[0].monto))
    setModalOpen(true)
  }
  const elegirMoneda = (cur) => {
    setMonedaPago(cur)
    const b = balances.find((x) => x.currency === cur)
    if (b) setMontoPago(String(b.monto))
  }
  const nuevoSettlement = (b, monto) => ({
    type: 'settlement',
    groupId: grupo.id,
    from: b.deudor,
    to: b.acreedor,
    amount: monto,
    currency: b.currency,
    rates: { USD: MONEDAS.USD.arsPorUnidad, CLP: MONEDAS.CLP.arsPorUnidad },
    date: HOY,
  })
  const saldarTodo = () => {
    if (!balances.length) return
    onAddMovimiento(balances.map((b) => nuevoSettlement(b, b.monto)))
    setModalOpen(false)
  }
  const registrarPago = () => {
    const monto = Number(montoPago)
    if (!monto || monto <= 0 || !balanceSel) return
    onAddMovimiento(nuevoSettlement(balanceSel, monto))
    setModalOpen(false)
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {/* Navegación: volver a la lista de grupos */}
      <div className="md:col-span-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
        >
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
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Mis grupos
        </button>
      </div>

      {/* Filtros sticky (arriba de todo, igual que en personal) */}
      <div className="sticky top-[60px] z-20 md:col-span-2">
        <FilterBar
          categorias={categoriasDisponibles(compartidos)}
          mesesRapidos={mesesRapidos}
          filtros={filtros}
          onChange={cambiarFiltro}
        />
      </div>

      {/* Hero: balance histórico del grupo */}
      <div className="md:col-span-2">
        <div className="rounded-2xl bg-slate-100 p-4 shadow-sm dark:bg-slate-800">
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {grupo.nombre} · balance acumulado
          </p>
          {balances.length === 0 ? (
            <p className="mt-1 text-2xl font-bold text-violet-600 dark:text-violet-400">
              Están a mano
            </p>
          ) : (
            <div className="mt-1 space-y-0.5">
              {balances.map((b) => {
                const enARS = convertirEntre(b.monto, b.currency, 'ARS')
                return (
                  <div key={b.currency}>
                    <p className={`text-xl font-bold leading-tight ${fraseColor(b)}`}>
                      {frase(b)}
                    </p>
                    {b.currency !== 'ARS' && (
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        ≈ {formatMonto(enARS, 'ARS')} al cambio de hoy
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          {balances.length > 1 && (
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Neto estimado:{' '}
              <strong>
                {neto >= 0
                  ? `${otro} te debe ≈ ${formatMonto(neto, currency)}`
                  : `le debés ≈ ${formatMonto(-neto, currency)} a ${otro}`}
              </strong>
            </p>
          )}
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Cuenta de todo el historial. División {grupo.acuerdoLabel}. Las deudas en dólares se
            saldan en dólares.
          </p>
          {balances.length > 0 && (
            <button
              onClick={abrirModal}
              className="mt-3 rounded-lg bg-teal-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-600"
            >
              Registrar pago de saldo
            </button>
          )}
        </div>
      </div>

      {/* Resumen: cuánto puso cada uno (histórico) */}
      <div className="flex gap-2 md:col-span-2">
        {grupo.miembros.map((m) => (
          <Stat
            key={m}
            label={`Puso ${m}`}
            value={formatMonto(pagadoPor(compartidos, m, currency), currency)}
            accent={acentoPersona(m)}
          />
        ))}
        <Stat label="Total del grupo" value={formatMonto(total, currency)} />
      </div>

      <StackedCategoryChart
        titulo="Evolución del grupo"
        gastos={compartidos}
        meses={meses.slice(-6)}
        mesActivo={meses[meses.length - 1]}
      />

      <CategoryBreakdown gastos={compartidos} />

      {/* Encabezado del período activo: separa visualmente el balance histórico
          (arriba) del registro filtrado (abajo). */}
      <div className="md:col-span-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Registro del grupo
        </p>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          {mesActivoFiltro
            ? etiquetaMes(mesActivoFiltro)
            : filtros.desde || filtros.hasta
              ? 'Período seleccionado'
              : 'Todo el historial'}
        </h2>
      </div>

      <div className="md:col-span-2">
        <GroupLedger
          movimientos={[...compartidos, ...settlements]}
          currentUser={currentUser}
          onUpdateGasto={onUpdateGasto}
          filtro={coincide}
        />
      </div>

      <div className="md:col-span-2">
        <UpcomingPayments gastos={futuros} />
      </div>

      {/* Modal: saldar deudas */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Saldar deudas">
        {balanceSel && (
          <>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              Deudas pendientes
            </p>
            <ul className="mt-1 space-y-0.5">
              {balances.map((b) => (
                <li key={b.currency} className={`text-sm font-semibold ${fraseColor(b)}`}>
                  {frase(b)}
                </li>
              ))}
            </ul>

            <button
              onClick={saldarTodo}
              className="mt-3 w-full rounded-xl bg-teal-500 py-2.5 text-sm font-semibold text-white hover:bg-teal-600"
            >
              Marcar todo como saldado
            </button>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Registra el pago de cada moneda y deja el balance en cero. El intercambio del
              equivalente entre monedas lo arreglan ustedes; acá solo queda asentado.
            </p>

            <button
              onClick={() => setModo(modo === 'parcial' ? 'todo' : 'parcial')}
              className="mt-3 text-xs font-medium text-teal-600 hover:underline dark:text-teal-400"
            >
              {modo === 'parcial' ? '− Ocultar pago parcial' : '+ Registrar un pago parcial'}
            </button>

            {modo === 'parcial' && (
              <div className="mt-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-700/40">
                {balances.length > 1 && (
                  <div className="mb-2 flex gap-2">
                    {balances.map((b) => (
                      <button
                        key={b.currency}
                        onClick={() => elegirMoneda(b.currency)}
                        className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${
                          b.currency === monedaPago
                            ? 'bg-teal-500 text-white ring-teal-500'
                            : 'bg-white text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
                        }`}
                      >
                        Deuda en {b.currency}
                      </button>
                    ))}
                  </div>
                )}
                <label className="block text-xs font-medium text-slate-400 dark:text-slate-500">
                  Monto que paga {balanceSel.deudor} ({balanceSel.currency})
                </label>
                <input
                  type="number"
                  value={montoPago}
                  onChange={(e) => setMontoPago(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-teal-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                />
                <button
                  onClick={registrarPago}
                  className="mt-2 w-full rounded-xl bg-slate-700 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-200 dark:text-slate-900"
                >
                  Registrar pago parcial
                </button>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}
