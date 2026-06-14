import { useState } from 'react'
import { valorEn, formatMonto } from '../utils/calculations'
import { useCurrency } from '../context/currency'
import { Card, EmptyState } from '../components/ui'
import CategoriaSelect from '../components/CategoriaSelect'

const fechaCorta = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })

const SIN_CATEGORIA = 'Sin categoría'

/** Input para crear una categoría o etiqueta nueva. */
function CrearFila({ valor, onValor, onCrear, placeholder }) {
  return (
    <div className="mb-3 flex gap-2">
      <input
        value={valor}
        onChange={(e) => onValor(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onCrear()}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
      />
      <button
        onClick={onCrear}
        className="shrink-0 rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-600"
      >
        Crear
      </button>
    </div>
  )
}

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

/**
 * Fila del catálogo (categoría o etiqueta). Al expandirse muestra los gastos
 * asociados con un selector inline para reasignar la categoría. Marca como
 * "destacada" la fila Sin categoría para recordar categorizar pendientes.
 */
function Fila({
  nombre,
  count,
  max,
  color,
  abierto,
  modoEdit,
  destacada,
  bloqueada,
  bloqueadoMotivo,
  onAbrir,
  onRenombrar,
  onComenzarEdit,
  onCancelarEdit,
  onEliminar,
  children,
}) {
  const pct = Math.round((count / max) * 100)
  const [nuevoNombre, setNuevoNombre] = useState(nombre)

  const ring = destacada
    ? 'ring-2 ring-amber-300 bg-amber-50/40 dark:ring-amber-500/40 dark:bg-amber-500/10'
    : 'ring-1 ring-slate-100 dark:ring-slate-700/60'

  return (
    <li className={`rounded-xl ${ring}`}>
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          onClick={onAbrir}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronIcon abierto={abierto} />
          <span
            className={`truncate text-sm font-medium ${
              destacada
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-slate-800 dark:text-slate-100'
            }`}
          >
            {nombre}
          </span>
          {destacada && (
            <span className="shrink-0 rounded-full bg-amber-200/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-500/30 dark:text-amber-200">
              Pendiente
            </span>
          )}
        </button>
        <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
          {count === 0 ? 'sin uso' : `${count} gasto(s)`}
        </span>
      </div>

      <div className="px-2 pb-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className={`h-full rounded-full ${color}`}
            style={{ width: `${Math.max(pct, 2)}%` }}
          />
        </div>
      </div>

      {abierto && (
        <div className="border-t border-slate-100 px-3 pb-3 pt-2 dark:border-slate-700/60">
          {modoEdit ? (
            <div className="mb-2 flex gap-2">
              <input
                autoFocus
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && nuevoNombre.trim()) onRenombrar(nuevoNombre.trim())
                  if (e.key === 'Escape') onCancelarEdit()
                }}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              />
              <button
                onClick={() => nuevoNombre.trim() && onRenombrar(nuevoNombre.trim())}
                className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-600"
              >
                Guardar
              </button>
              <button
                onClick={onCancelarEdit}
                className="rounded-lg bg-white px-3 py-1.5 text-sm text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="mb-2 flex flex-wrap gap-2">
              {!bloqueada && (
                <>
                  <button
                    onClick={onComenzarEdit}
                    className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300"
                  >
                    Renombrar
                  </button>
                  <button
                    onClick={onEliminar}
                    className="rounded-md bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300"
                  >
                    Eliminar
                  </button>
                </>
              )}
              {bloqueada && bloqueadoMotivo && (
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {bloqueadoMotivo}
                </p>
              )}
            </div>
          )}
          {children}
        </div>
      )}
    </li>
  )
}

/** Diálogo de confirmación reutilizable. */
function ConfirmDialog({ open, titulo, descripcion, onConfirm, onCancel, confirmLabel }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-white p-5 dark:bg-slate-800 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{titulo}</h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{descripcion}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg bg-white px-3 py-1.5 text-sm text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-rose-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-600"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Vista Categorías y etiquetas: crear, ver uso, ver gastos, renombrar, eliminar. */
export default function CatalogView({
  gastos,
  categorias,
  etiquetas,
  onAgregarCategoria,
  onAgregarEtiqueta,
  onEliminarCategoria,
  onEliminarEtiqueta,
  onRenombrarCategoria,
  onRenombrarEtiqueta,
  onUpdateGasto,
}) {
  const currency = useCurrency()
  const [abierto, setAbierto] = useState(null) // { tipo, nombre } | null
  const [editando, setEditando] = useState(null) // { tipo, nombre } | null
  const [confirm, setConfirm] = useState(null) // { tipo, nombre, count } | null
  const [nuevaCat, setNuevaCat] = useState('')
  const [nuevaTag, setNuevaTag] = useState('')

  const reales = gastos.filter((g) => g.type !== 'settlement')
  const cats = categorias
    .map((c) => ({ nombre: c, count: reales.filter((g) => g.category === c).length }))
    .sort((a, b) => {
      // Sin categoría siempre primero si tiene gastos (recordatorio); sino por count desc.
      if (a.nombre === SIN_CATEGORIA && a.count > 0) return -1
      if (b.nombre === SIN_CATEGORIA && b.count > 0) return 1
      return b.count - a.count
    })
  const tags = etiquetas
    .map((t) => ({ nombre: t, count: gastos.filter((g) => (g.tags || []).includes(t)).length }))
    .sort((a, b) => b.count - a.count)
  const maxC = Math.max(...cats.map((c) => c.count), 1)
  const maxT = Math.max(...tags.map((t) => t.count), 1)
  const pendientes = cats.find((c) => c.nombre === SIN_CATEGORIA)?.count || 0

  const crearCat = () => {
    const v = nuevaCat.trim()
    if (v) {
      onAgregarCategoria(v)
      setNuevaCat('')
    }
  }
  const crearTag = () => {
    const v = nuevaTag.trim()
    if (v) {
      onAgregarEtiqueta(v)
      setNuevaTag('')
    }
  }

  const abrir = (tipo, nombre) =>
    setAbierto((curr) => (curr && curr.tipo === tipo && curr.nombre === nombre ? null : { tipo, nombre }))

  const gastosDe = (tipo, nombre) =>
    tipo === 'categoria'
      ? reales.filter((g) => g.category === nombre)
      : gastos.filter((g) => (g.tags || []).includes(nombre))

  const pedirEliminar = (tipo, nombre) => {
    const count = gastosDe(tipo, nombre).length
    if (count > 0) {
      setConfirm({ tipo, nombre, count })
    } else {
      if (tipo === 'categoria') onEliminarCategoria(nombre)
      else onEliminarEtiqueta(nombre)
    }
  }

  const confirmarEliminar = () => {
    if (!confirm) return
    if (confirm.tipo === 'categoria') onEliminarCategoria(confirm.nombre)
    else onEliminarEtiqueta(confirm.nombre)
    setConfirm(null)
    setAbierto(null)
  }

  const renderListaGastos = (tipo, nombre) => {
    const lista = [...gastosDe(tipo, nombre)].sort((a, b) => b.date.localeCompare(a.date))
    if (lista.length === 0) {
      return (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Todavía no hay gastos acá. La{' '}
          {tipo === 'categoria' ? 'categoría' : 'etiqueta'} se puede eliminar sin riesgo.
        </p>
      )
    }
    const esCategoria = tipo === 'categoria'
    return (
      <ul className="max-h-80 divide-y divide-slate-100 overflow-auto rounded-lg ring-1 ring-slate-100 dark:divide-slate-700/60 dark:ring-slate-700/60">
        {lista.map((g) => (
          <li key={g.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                {g.description}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                <span>{fechaCorta(g.date)}</span>
                {esCategoria && onUpdateGasto ? (
                  <CategoriaSelect
                    value={g.category}
                    onChange={(v) => onUpdateGasto(g.id, { category: v })}
                  />
                ) : (
                  <span>{g.category}</span>
                )}
              </div>
            </div>
            <span className="shrink-0 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {formatMonto(valorEn(g, currency), currency)}
            </span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Categorías y etiquetas
        </h1>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Tocá una para ver sus gastos, renombrarla o eliminarla. Si tiene gastos, te pedimos
          confirmación antes de borrar.
        </p>
      </div>

      {pendientes > 0 && !abierto && (
        <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30">
          ⚠️ Tenés <strong>{pendientes}</strong> gasto{pendientes === 1 ? '' : 's'} sin
          categorizar. Abrí la fila destacada para asignarles categoría desde ahí.
        </div>
      )}

      <Card>
        <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Categorías
        </h2>
        <CrearFila
          valor={nuevaCat}
          onValor={setNuevaCat}
          onCrear={crearCat}
          placeholder="Nueva categoría…"
        />
        {cats.length === 0 ? (
          <EmptyState>Todavía no hay categorías.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {cats.map((c) => {
              const estaAbierto = abierto?.tipo === 'categoria' && abierto.nombre === c.nombre
              const estaEditando =
                editando?.tipo === 'categoria' && editando.nombre === c.nombre
              const esSin = c.nombre === SIN_CATEGORIA
              return (
                <Fila
                  key={c.nombre}
                  nombre={c.nombre}
                  count={c.count}
                  max={maxC}
                  color={esSin ? 'bg-amber-400' : 'bg-indigo-400'}
                  abierto={estaAbierto}
                  modoEdit={estaEditando}
                  destacada={esSin && c.count > 0}
                  bloqueada={esSin}
                  bloqueadoMotivo={
                    esSin
                      ? 'Esta categoría no se puede renombrar ni eliminar — es el destino al que van los gastos cuando borrás una categoría.'
                      : undefined
                  }
                  onAbrir={() => abrir('categoria', c.nombre)}
                  onComenzarEdit={() => setEditando({ tipo: 'categoria', nombre: c.nombre })}
                  onCancelarEdit={() => setEditando(null)}
                  onRenombrar={(nuevo) => {
                    if (nuevo !== c.nombre) onRenombrarCategoria(c.nombre, nuevo)
                    setEditando(null)
                    setAbierto({ tipo: 'categoria', nombre: nuevo })
                  }}
                  onEliminar={() => pedirEliminar('categoria', c.nombre)}
                >
                  {renderListaGastos('categoria', c.nombre)}
                </Fila>
              )
            })}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Etiquetas
        </h2>
        <CrearFila
          valor={nuevaTag}
          onValor={setNuevaTag}
          onCrear={crearTag}
          placeholder="Nueva etiqueta…"
        />
        {tags.length === 0 ? (
          <EmptyState>
            Todavía no hay etiquetas. Sirven para agrupar gastos de distintas categorías, por
            ejemplo todo lo de un viaje.
          </EmptyState>
        ) : (
          <ul className="space-y-2">
            {tags.map((t) => {
              const estaAbierto = abierto?.tipo === 'etiqueta' && abierto.nombre === t.nombre
              const estaEditando =
                editando?.tipo === 'etiqueta' && editando.nombre === t.nombre
              return (
                <Fila
                  key={t.nombre}
                  nombre={t.nombre}
                  count={t.count}
                  max={maxT}
                  color="bg-violet-400"
                  abierto={estaAbierto}
                  modoEdit={estaEditando}
                  onAbrir={() => abrir('etiqueta', t.nombre)}
                  onComenzarEdit={() => setEditando({ tipo: 'etiqueta', nombre: t.nombre })}
                  onCancelarEdit={() => setEditando(null)}
                  onRenombrar={(nuevo) => {
                    if (nuevo !== t.nombre) onRenombrarEtiqueta(t.nombre, nuevo)
                    setEditando(null)
                    setAbierto({ tipo: 'etiqueta', nombre: nuevo })
                  }}
                  onEliminar={() => pedirEliminar('etiqueta', t.nombre)}
                >
                  {renderListaGastos('etiqueta', t.nombre)}
                </Fila>
              )
            })}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={!!confirm}
        titulo={
          confirm &&
          (confirm.tipo === 'categoria'
            ? `¿Eliminar la categoría «${confirm.nombre}»?`
            : `¿Eliminar la etiqueta «${confirm.nombre}»?`)
        }
        descripcion={
          confirm &&
          (confirm.tipo === 'categoria'
            ? `Tenés asignado${confirm.count === 1 ? '' : 's'} ${confirm.count} gasto${
                confirm.count === 1 ? '' : 's'
              } a esta categoría. Al eliminarla, esos gastos van a quedar en «Sin categoría».`
            : `Tenés asignado${confirm.count === 1 ? '' : 's'} ${confirm.count} gasto${
                confirm.count === 1 ? '' : 's'
              } con esta etiqueta. La etiqueta se va a quitar de cada uno (los gastos no se borran).`)
        }
        confirmLabel="Eliminar igual"
        onConfirm={confirmarEliminar}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
