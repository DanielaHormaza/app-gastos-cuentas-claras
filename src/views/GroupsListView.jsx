import { useState } from 'react'
import {
  compartidosDeGrupo,
  settlementsDeGrupo,
  balancesPorMoneda,
  formatMonto,
  convertirEntre,
} from '../utils/calculations'
import { useCurrency } from '../context/currency'
import { useCatalog } from '../context/catalog'
import { USUARIOS } from '../data/mockData'
import { Card, EmptyState } from '../components/ui'

const formatFecha = (iso) =>
  iso
    ? new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—'

const acentoPersona = (p) =>
  p === 'Dani'
    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
    : p === 'Juan'
      ? 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300'
      : 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300'

/**
 * Lee un archivo de imagen y devuelve un data URL escalado a un máximo de
 * 256x256 px en JPEG 80%. Sirve para tener avatars chicos en localStorage
 * sin pasarnos del límite ni cargar imágenes pesadas.
 */
function archivoAAvatar(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const max = 256
        const ratio = Math.min(max / img.width, max / img.height, 1)
        const w = Math.round(img.width * ratio)
        const h = Math.round(img.height * ratio)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

/** Avatar del grupo: foto si hay, sino inicial sobre un gradiente. */
function GrupoAvatar({ grupo, size = 44 }) {
  const initial = (grupo.nombre || '?').trim().charAt(0).toUpperCase()
  if (grupo.foto) {
    return (
      <img
        src={grupo.foto}
        alt={grupo.nombre}
        className="shrink-0 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-teal-400 font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </div>
  )
}

/** Confirm dialog liviano con acción secundaria opcional (ej. "Archivar"). */
function Confirm({
  open,
  titulo,
  descripcion,
  confirmLabel,
  secondaryLabel,
  onConfirm,
  onSecondary,
  onCancel,
}) {
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
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg bg-white px-3 py-1.5 text-sm text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          {secondaryLabel && onSecondary && (
            <button
              onClick={onSecondary}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              {secondaryLabel}
            </button>
          )}
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

const INPUT =
  'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'

/**
 * Form de grupo (crear o editar). En modo "editar" los miembros quedan
 * bloqueados (cambiar miembros invalidaría los splits del histórico).
 */
function GrupoForm({ inicial, currentUser, modo = 'crear', onCancel, onSubmit }) {
  const [nombre, setNombre] = useState(inicial?.nombre || '')
  const [miembros, setMiembros] = useState(inicial?.miembros || [currentUser])
  const [foto, setFoto] = useState(inicial?.foto || null)
  const [custom, setCustom] = useState('')

  const candidatos = [...new Set([currentUser, ...USUARIOS])]
  const editable = modo === 'crear'

  const toggle = (m) =>
    setMiembros((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    )

  const agregarCustom = () => {
    const v = custom.trim()
    if (!v) return
    if (!miembros.includes(v)) setMiembros((prev) => [...prev, v])
    setCustom('')
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await archivoAAvatar(file)
      setFoto(dataUrl)
    } catch {
      /* archivo inválido: lo ignoramos */
    }
    e.target.value = '' // permite re-subir el mismo archivo
  }

  const submit = () => {
    if (!nombre.trim()) return
    if (editable && miembros.length < 2) return
    onSubmit({
      nombre: nombre.trim(),
      foto,
      ...(editable ? { miembros } : {}),
    })
  }

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {modo === 'crear' ? 'Nuevo grupo' : 'Editar grupo'}
      </h3>
      <div className="mb-3 flex items-center gap-3">
        <GrupoAvatar grupo={{ nombre, foto }} size={64} />
        <div className="flex flex-col gap-1">
          <label className="cursor-pointer rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600">
            {foto ? 'Cambiar foto' : 'Subir foto'}
            <input type="file" accept="image/*" className="hidden" onChange={onFile} />
          </label>
          {foto && (
            <button
              onClick={() => setFoto(null)}
              className="text-[11px] font-medium text-rose-600 hover:underline dark:text-rose-400"
            >
              Quitar foto
            </button>
          )}
        </div>
      </div>
      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
        Nombre
        <input
          autoFocus
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Pareja, viaje a Brasil, asado con amigos…"
          className={`mt-1 ${INPUT}`}
        />
      </label>
      {editable ? (
        <>
          <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
            Integrantes
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {candidatos.map((c) => {
              const activo = miembros.includes(c)
              return (
                <button
                  key={c}
                  onClick={() => toggle(c)}
                  disabled={c === currentUser}
                  className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${
                    activo
                      ? 'bg-indigo-500 text-white ring-indigo-500'
                      : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
                  } ${c === currentUser ? 'opacity-80' : ''}`}
                >
                  {c}
                  {c === currentUser && ' · vos'}
                </button>
              )
            })}
            {miembros
              .filter((m) => !candidatos.includes(m))
              .map((m) => (
                <button
                  key={m}
                  onClick={() => toggle(m)}
                  className="rounded-full bg-indigo-500 px-3 py-1 text-xs font-medium text-white ring-1 ring-indigo-500"
                >
                  {m} ✕
                </button>
              ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && agregarCustom()}
              placeholder="Sumar a alguien por nombre (ej. Mamá)"
              className={INPUT}
            />
            <button
              onClick={agregarCustom}
              className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
            >
              +
            </button>
          </div>
          <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">
            Por defecto la división es en partes iguales.
          </p>
        </>
      ) : (
        <div className="mt-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Integrantes</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {miembros.map((m) => (
              <span
                key={m}
                className={`rounded-full px-3 py-1 text-xs font-medium ${acentoPersona(m)}`}
              >
                {m}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
            Los integrantes no se editan acá: cambiarlos invalidaría las divisiones del histórico.
          </p>
        </div>
      )}

      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-lg bg-white px-3 py-1.5 text-sm text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600 dark:hover:bg-slate-700"
        >
          Cancelar
        </button>
        <button
          onClick={submit}
          disabled={!nombre.trim() || (editable && miembros.length < 2)}
          className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {modo === 'crear' ? 'Crear grupo' : 'Guardar'}
        </button>
      </div>
    </Card>
  )
}

/**
 * Tarjeta de un grupo: avatar, nombre, miembros, balance + neto resumido y
 * acciones. Toda la card es clickeable para entrar al detalle.
 */
function GrupoCard({
  grupo,
  gastos,
  currentUser,
  onOpen,
  onEditar,
  onArchivar,
  onEliminar,
  onRestaurar,
}) {
  const currency = useCurrency()
  const compartidos = compartidosDeGrupo(gastos, grupo.id)
  const settlements = settlementsDeGrupo(gastos, grupo.id)
  const tieneMovimientos = compartidos.length > 0 || settlements.length > 0
  const balances = balancesPorMoneda(compartidos, settlements, grupo.miembros)

  const frase = (b) =>
    b.acreedor === currentUser
      ? `${b.deudor} te debe ${formatMonto(b.monto, b.currency)}`
      : `Le debés ${formatMonto(b.monto, b.currency)} a ${b.acreedor}`
  const color = (b) =>
    b.acreedor === currentUser
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-rose-600 dark:text-rose-400'

  // Neto en la moneda de visualización (sumando todas las monedas convertidas).
  const otro = grupo.miembros.find((m) => m !== currentUser)
  const neto = balances.reduce((acc, b) => {
    const v = convertirEntre(b.monto, b.currency, currency)
    return acc + (b.acreedor === currentUser ? v : -v)
  }, 0)

  return (
    <Card className="cursor-pointer transition hover:ring-2 hover:ring-indigo-200 dark:hover:ring-indigo-500/40">
      <div onClick={onOpen}>
        <div className="flex items-start gap-3">
          <GrupoAvatar grupo={grupo} size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate text-lg font-semibold text-slate-800 dark:text-slate-100">
                {grupo.nombre}
              </h3>
              {grupo.archived && (
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">
                  Archivado
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Creado el {formatFecha(grupo.createdAt)} · {compartidos.length + settlements.length}{' '}
              movimiento{compartidos.length + settlements.length === 1 ? '' : 's'}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {grupo.miembros.map((m) => (
                <span
                  key={m}
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${acentoPersona(m)}`}
                >
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-700/60">
          {!tieneMovimientos ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">Sin movimientos todavía.</p>
          ) : balances.length === 0 ? (
            <p className="text-base font-semibold text-violet-600 dark:text-violet-400">
              Están a mano ✓
            </p>
          ) : balances.length === 1 ? (
            // Una sola moneda: mostramos la frase grande y limpia.
            <div>
              <p className={`text-base font-semibold ${color(balances[0])}`}>
                {frase(balances[0])}
              </p>
              {balances[0].currency !== 'ARS' && (
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  ≈ {formatMonto(convertirEntre(balances[0].monto, balances[0].currency, 'ARS'), 'ARS')}
                </p>
              )}
            </div>
          ) : (
            // Varias monedas: el neto va destacado arriba y abajo el desglose.
            <div>
              <p
                className={`text-base font-bold ${
                  neto >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {neto >= 0
                  ? `Neto: ${otro} te debe ≈ ${formatMonto(neto, currency)}`
                  : `Neto: le debés ≈ ${formatMonto(-neto, currency)} a ${otro}`}
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                {balances.map((b) => (
                  <li key={b.currency}>
                    {frase(b)}
                    {b.currency !== 'ARS' && (
                      <span className="text-slate-400 dark:text-slate-500">
                        {' '}
                        (≈ {formatMonto(convertirEntre(b.monto, b.currency, 'ARS'), 'ARS')})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-700/60">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEditar()
          }}
          className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
        >
          Editar
        </button>
        {!grupo.archived ? (
          <>
            {tieneMovimientos && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onArchivar()
                }}
                className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              >
                Archivar
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEliminar()
              }}
              className="rounded-md bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300"
            >
              Eliminar
            </button>
          </>
        ) : (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRestaurar()
              }}
              className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
            >
              Restaurar
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEliminar()
              }}
              className="rounded-md bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300"
            >
              Eliminar
            </button>
          </>
        )}
      </div>
    </Card>
  )
}

/** Vista lista de grupos: cards minimalistas + crear / archivar / eliminar. */
export default function GroupsListView({
  gastos,
  currentUser,
  onOpen,
  onAgregarGrupo,
  onActualizarGrupo,
  onArchivarGrupo,
  onRestaurarGrupo,
  onEliminarGrupo,
}) {
  const { grupos } = useCatalog()
  const [creando, setCreando] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [verArchivados, setVerArchivados] = useState(false)
  // confirmDel = { grupo, count } cuando se está pidiendo confirmación
  const [confirmDel, setConfirmDel] = useState(null)

  const mis = grupos.filter((g) => g.miembros.includes(currentUser))
  const activos = mis.filter((g) => !g.archived)
  const archivados = mis.filter((g) => g.archived)

  const pedirEliminar = (g) => {
    const count = gastos.filter((x) => x.groupId === g.id).length
    setConfirmDel({ grupo: g, count })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Mis grupos
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Tocá una tarjeta para ver el detalle. Si eliminás un grupo con gastos, se borran
            también esos movimientos.
          </p>
        </div>
        {!creando && !editandoId && (
          <button
            onClick={() => setCreando(true)}
            className="shrink-0 rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-600"
          >
            + Nuevo grupo
          </button>
        )}
      </div>

      {creando && (
        <GrupoForm
          currentUser={currentUser}
          modo="crear"
          onCancel={() => setCreando(false)}
          onSubmit={(payload) => {
            onAgregarGrupo(payload)
            setCreando(false)
          }}
        />
      )}

      {editandoId && (
        <GrupoForm
          currentUser={currentUser}
          modo="editar"
          inicial={mis.find((g) => g.id === editandoId)}
          onCancel={() => setEditandoId(null)}
          onSubmit={(payload) => {
            onActualizarGrupo(editandoId, payload)
            setEditandoId(null)
          }}
        />
      )}

      {activos.length === 0 && !creando ? (
        <EmptyState>
          Todavía no tenés grupos. Tocá <strong>+ Nuevo grupo</strong> para crear el primero.
        </EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {activos.map((g) => (
            <GrupoCard
              key={g.id}
              grupo={g}
              gastos={gastos}
              currentUser={currentUser}
              onOpen={() => onOpen(g.id)}
              onEditar={() => setEditandoId(g.id)}
              onArchivar={() => onArchivarGrupo(g.id)}
              onEliminar={() => pedirEliminar(g)}
              onRestaurar={() => onRestaurarGrupo(g.id)}
            />
          ))}
        </div>
      )}

      {archivados.length > 0 && (
        <div>
          <button
            onClick={() => setVerArchivados((v) => !v)}
            className="text-xs font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
          >
            {verArchivados ? '− Ocultar' : '+ Ver'} archivados ({archivados.length})
          </button>
          {verArchivados && (
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              {archivados.map((g) => (
                <GrupoCard
                  key={g.id}
                  grupo={g}
                  gastos={gastos}
                  currentUser={currentUser}
                  onOpen={() => onOpen(g.id)}
                  onEditar={() => setEditandoId(g.id)}
                  onArchivar={() => onArchivarGrupo(g.id)}
                  onEliminar={() => pedirEliminar(g)}
                  onRestaurar={() => onRestaurarGrupo(g.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <Confirm
        open={!!confirmDel}
        titulo={confirmDel && `¿Eliminar el grupo «${confirmDel.grupo.nombre}»?`}
        descripcion={
          confirmDel &&
          (confirmDel.count === 0
            ? 'El grupo no tiene movimientos. Esta acción no se puede deshacer.'
            : `Tenés ${confirmDel.count} movimiento${
                confirmDel.count === 1 ? '' : 's'
              } en este grupo (gastos + pagos de saldo). Si lo eliminás se borran todos junto con el grupo.`)
        }
        confirmLabel="Eliminar igual"
        secondaryLabel={
          confirmDel && confirmDel.count > 0 && !confirmDel.grupo.archived ? 'Archivar' : undefined
        }
        onSecondary={
          confirmDel && confirmDel.count > 0 && !confirmDel.grupo.archived
            ? () => {
                onArchivarGrupo(confirmDel.grupo.id)
                setConfirmDel(null)
              }
            : undefined
        }
        onConfirm={() => {
          onEliminarGrupo(confirmDel.grupo.id)
          setConfirmDel(null)
        }}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  )
}
