import { useState } from 'react'
import {
  totalesPorMedioDePago,
  mesesDisponibles,
  filtrarPorMes,
  etiquetaMes,
  formatMonto,
  valorEn,
} from '../utils/calculations'
import { useCurrency } from '../context/currency'
import { useCatalog } from '../context/catalog'
import { HOY, USUARIOS } from '../data/mockData'
import { Card, EmptyState } from '../components/ui'

const TIPOS = ['Crédito', 'Débito', 'Billetera', 'Efectivo']

const formatFecha = (iso) =>
  iso
    ? new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
    : '—'

const formatNumero = (n) =>
  new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n || 0)

// "Día del mes" + base de hoy ⇒ próxima fecha que coincida con ese día.
function proximaFechaDelDia(hoyISO, day) {
  if (!day) return null
  let [y, m, d] = hoyISO.split('-').map(Number)
  if (day < d) m++
  if (m > 12) {
    m = 1
    y++
  }
  return `${y}-${String(m).padStart(2, '0')}-${String(Math.min(day, 28)).padStart(2, '0')}`
}

const INPUT =
  'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'

/** Formulario reutilizable para crear o editar un medio de pago. */
function MedioForm({ inicial, titularesPermitidos, onCancel, onSubmit, submitLabel }) {
  const [form, setForm] = useState({
    nombre: inicial?.nombre || '',
    titular: inicial?.titular || titularesPermitidos[0],
    tipo: inicial?.tipo || 'Crédito',
    closingDay: inicial?.closingDay || '',
    dueDay: inicial?.dueDay || '',
    limit: inicial?.limit || '',
  })
  const cambiar = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))

  const submit = () => {
    if (!form.nombre.trim()) return
    const payload = {
      nombre: form.nombre.trim(),
      titular: form.titular,
      tipo: form.tipo,
      closingDay: form.closingDay ? Math.min(31, Math.max(1, Number(form.closingDay))) : null,
      dueDay: form.dueDay ? Math.min(31, Math.max(1, Number(form.dueDay))) : null,
      limit: form.limit ? Math.max(0, Number(form.limit)) : null,
    }
    onSubmit(payload)
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="col-span-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        Nombre
        <input
          autoFocus
          value={form.nombre}
          onChange={(e) => cambiar('nombre', e.target.value)}
          placeholder="Ej: Visa crédito Galicia"
          className={INPUT}
        />
      </label>
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
        Titular
        <select
          value={form.titular}
          onChange={(e) => cambiar('titular', e.target.value)}
          className={INPUT}
        >
          {titularesPermitidos.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
        Tipo
        <select
          value={form.tipo}
          onChange={(e) => cambiar('tipo', e.target.value)}
          className={INPUT}
        >
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
        Día de cierre <span className="text-slate-400">(opcional)</span>
        <input
          type="number"
          min={1}
          max={31}
          value={form.closingDay}
          onChange={(e) => cambiar('closingDay', e.target.value)}
          placeholder="28"
          className={INPUT}
        />
      </label>
      <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
        Día de vencimiento <span className="text-slate-400">(opcional)</span>
        <input
          type="number"
          min={1}
          max={31}
          value={form.dueDay}
          onChange={(e) => cambiar('dueDay', e.target.value)}
          placeholder="10"
          className={INPUT}
        />
      </label>
      <label className="col-span-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        Límite en ARS <span className="text-slate-400">(opcional)</span>
        <input
          type="number"
          min={0}
          value={form.limit}
          onChange={(e) => cambiar('limit', e.target.value)}
          placeholder="1000000"
          className={INPUT}
        />
      </label>
      <div className="col-span-2 mt-1 flex gap-2">
        <button
          onClick={submit}
          className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-600"
        >
          {submitLabel}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg bg-white px-3 py-1.5 text-sm text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600 dark:hover:bg-slate-700"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

/** Vista Tarjetas: medios de pago del usuario activo + cuenta compartida. */
export default function CardsView({
  gastos,
  currentUser,
  onAgregarMedio,
  onActualizarMedio,
  onEliminarMedio,
}) {
  const currency = useCurrency()
  const { medios } = useCatalog()
  const meses = mesesDisponibles(gastos)
  const mesActual = meses[meses.length - 1]
  const totalesMes = totalesPorMedioDePago(filtrarPorMes(gastos, mesActual), currency)
  // Comprometido a futuro (cuotas que aún no vencieron) por medio de pago.
  const futuros = gastos.filter((g) => g.type !== 'settlement' && g.date > HOY)

  // Modelo Splitwise: ves tus propias tarjetas y la cuenta compartida.
  const misMedios = medios.filter(
    (m) => m.titular === currentUser || m.titular === 'Ambos',
  )

  const [editandoId, setEditandoId] = useState(null)
  const [creando, setCreando] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null) // medio a borrar (con confirmación)

  const titularesPermitidos = [...new Set([currentUser, 'Ambos', ...USUARIOS])]

  const gastosDelMedio = (mid) =>
    gastos.filter((g) => g.type !== 'settlement' && g.paymentMethod === mid)

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Tus tarjetas
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Acumulado de {etiquetaMes(mesActual)} · comprometido a futuro y límite si lo cargás.
          </p>
        </div>
        {!creando && (
          <button
            onClick={() => setCreando(true)}
            className="shrink-0 rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-600"
          >
            + Agregar
          </button>
        )}
      </div>

      {creando && (
        <Card>
          <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Nuevo medio de pago
          </h3>
          <MedioForm
            titularesPermitidos={titularesPermitidos}
            onCancel={() => setCreando(false)}
            submitLabel="Crear"
            onSubmit={(payload) => {
              onAgregarMedio(payload)
              setCreando(false)
            }}
          />
        </Card>
      )}

      {misMedios.length === 0 && !creando && (
        <EmptyState>
          Todavía no tenés medios de pago cargados. Tocá <strong>+ Agregar</strong> para crear el
          primero.
        </EmptyState>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {misMedios.map((m) => {
          const t = totalesMes[m.id] || { total: 0, compartido: 0, individual: 0 }
          const pctComp = t.total > 0 ? (t.compartido / t.total) * 100 : 0
          const comprometido = futuros
            .filter((g) => g.paymentMethod === m.id)
            .reduce((acc, g) => acc + valorEn(g, currency), 0)
          const limite = m.limit || 0
          const pctLimite = limite > 0 ? Math.min(100, (t.total / limite) * 100) : 0
          const proxVenc = m.dueDay ? proximaFechaDelDia(HOY, m.dueDay) : m.dueDate
          const editando = editandoId === m.id

          return (
            <Card key={m.id}>
              {editando ? (
                <>
                  <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Editar medio
                  </h3>
                  <MedioForm
                    inicial={m}
                    titularesPermitidos={titularesPermitidos}
                    onCancel={() => setEditandoId(null)}
                    submitLabel="Guardar"
                    onSubmit={(payload) => {
                      onActualizarMedio(m.id, payload)
                      setEditandoId(null)
                    }}
                  />
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
                        {m.nombre}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {m.tipo} · {m.titular}
                      </p>
                    </div>
                    <span className="shrink-0 text-lg font-bold text-slate-800 dark:text-slate-100">
                      {formatMonto(t.total, currency)}
                    </span>
                  </div>

                  {t.total > 0 && (
                    <>
                      <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div className="bg-teal-400" style={{ width: `${pctComp}%` }} />
                        <div className="bg-indigo-400" style={{ width: `${100 - pctComp}%` }} />
                      </div>
                      <div className="mt-2 flex justify-between text-xs">
                        <span className="text-teal-600 dark:text-teal-400">
                          Compartido {formatMonto(t.compartido, currency)}
                        </span>
                        <span className="text-indigo-600 dark:text-indigo-400">
                          Individual {formatMonto(t.individual, currency)}
                        </span>
                      </div>
                    </>
                  )}

                  {limite > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">
                          Consumo del mes / límite
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-200">
                          {Math.round(pctLimite)}%
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div
                          className={`h-full rounded-full ${
                            pctLimite > 90 ? 'bg-rose-500' : pctLimite > 70 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${Math.max(pctLimite, 2)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        Límite: ${formatNumero(limite)} · queda{' '}
                        <strong className="text-slate-600 dark:text-slate-300">
                          ${formatNumero(Math.max(0, limite - t.total))}
                        </strong>
                      </p>
                    </div>
                  )}

                  {comprometido > 0 && (
                    <p className="mt-3 rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-500 dark:bg-slate-700/40 dark:text-slate-300">
                      A futuro (cuotas pendientes):{' '}
                      <strong className="text-slate-700 dark:text-slate-100">
                        {formatMonto(comprometido, currency)}
                      </strong>
                    </p>
                  )}

                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
                    <span>
                      Cierre:{' '}
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        {m.closingDay ? `día ${m.closingDay}` : '—'}
                      </span>
                    </span>
                    <span>
                      Vencimiento:{' '}
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        {m.dueDay
                          ? `día ${m.dueDay}${proxVenc ? ` · próx. ${formatFecha(proxVenc)}` : ''}`
                          : m.dueDate
                            ? `próx. ${formatFecha(m.dueDate)}`
                            : '—'}
                      </span>
                    </span>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setEditandoId(m.id)}
                      className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
                        const usos = gastosDelMedio(m.id).length
                        if (usos > 0) {
                          setConfirmDel({ medio: m, usos })
                        } else {
                          onEliminarMedio(m.id)
                        }
                      }}
                      className="rounded-md bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300"
                    >
                      Eliminar
                    </button>
                  </div>
                </>
              )}
            </Card>
          )
        })}
      </div>

      {/* Confirmación de borrado con advertencia si hay gastos asociados */}
      {confirmDel && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
          onClick={() => setConfirmDel(null)}
        >
          <div
            className="w-full max-w-sm rounded-t-2xl bg-white p-5 dark:bg-slate-800 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              ¿Eliminar «{confirmDel.medio.nombre}»?
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Tenés <strong>{confirmDel.usos} gasto{confirmDel.usos === 1 ? '' : 's'}</strong>{' '}
              asociado{confirmDel.usos === 1 ? '' : 's'} a este medio. Si lo eliminás, esos gastos
              van a quedar sin medio de pago (vas a poder reasignarlos manualmente).
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDel(null)}
                className="rounded-lg bg-white px-3 py-1.5 text-sm text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onEliminarMedio(confirmDel.medio.id)
                  setConfirmDel(null)
                }}
                className="rounded-lg bg-rose-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-600"
              >
                Eliminar igual
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
