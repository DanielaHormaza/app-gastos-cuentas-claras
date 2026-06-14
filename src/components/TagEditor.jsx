import { useState } from 'react'
import { useCatalog } from '../context/catalog'

/** Chip de etiqueta de solo lectura (para ítems derivados de un grupo). */
export function TagChips({ tags = [] }) {
  return tags.map((t) => (
    <span
      key={t}
      className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
    >
      {t}
    </span>
  ))
}

/**
 * Editor de etiquetas de un gasto: muestra las etiquetas como chips quitables
 * y un botón para agregar (buscador con opción de crear una nueva).
 */
export default function TagEditor({ tags = [], onChange }) {
  const { etiquetas } = useCatalog()
  const [abierto, setAbierto] = useState(false)
  const [busca, setBusca] = useState('')

  const cerrar = () => {
    setAbierto(false)
    setBusca('')
  }
  const quitar = (t) => onChange(tags.filter((x) => x !== t))
  const agregar = (t) => {
    const v = t.trim()
    if (v && !tags.includes(v)) onChange([...tags, v])
    cerrar()
  }

  const q = busca.trim().toLowerCase()
  const sugerencias = etiquetas.filter((e) => !tags.includes(e) && e.toLowerCase().includes(q))
  const exacta =
    etiquetas.some((e) => e.toLowerCase() === q) || tags.some((t) => t.toLowerCase() === q)

  return (
    <>
      {tags.map((t) => (
        <span
          key={t}
          className="flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
        >
          {t}
          <button
            type="button"
            onClick={() => quitar(t)}
            className="text-violet-400 hover:text-violet-700 dark:hover:text-violet-200"
          >
            ×
          </button>
        </span>
      ))}
      <span className="relative inline-block">
        <button
          type="button"
          onClick={() => setAbierto((o) => !o)}
          className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[11px] font-medium text-slate-400 hover:border-violet-400 hover:text-violet-600 dark:border-slate-600 dark:hover:border-violet-400"
        >
          + etiqueta
        </button>
        {abierto && (
          <>
            <div className="fixed inset-0 z-20" onClick={cerrar} />
            <div className="absolute left-0 z-30 mt-1 w-52 rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
              <input
                autoFocus
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar o crear etiqueta…"
                className="mb-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              />
              <ul className="max-h-44 overflow-auto">
                {sugerencias.map((e) => (
                  <li key={e}>
                    <button
                      type="button"
                      onClick={() => agregar(e)}
                      className="w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      {e}
                    </button>
                  </li>
                ))}
                {q && !exacta && (
                  <li>
                    <button
                      type="button"
                      onClick={() => agregar(busca)}
                      className="w-full rounded-md px-2 py-1.5 text-left text-xs font-medium text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-500/15"
                    >
                      + Crear “{busca.trim()}”
                    </button>
                  </li>
                )}
                {sugerencias.length === 0 && !q && (
                  <li className="px-2 py-1.5 text-xs text-slate-400 dark:text-slate-500">
                    Escribí para buscar o crear
                  </li>
                )}
              </ul>
            </div>
          </>
        )}
      </span>
    </>
  )
}
