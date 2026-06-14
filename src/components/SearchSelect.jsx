import { useState } from 'react'

/**
 * Selector genérico con buscador + desplegable.
 * - opciones: [{ value, label }]
 * - variant: 'chip' (inline, en filas) | 'campo' (campo de formulario)
 * - crear: si true, ofrece "Crear «texto»" cuando no hay coincidencia exacta.
 */
export default function SearchSelect({
  value,
  opciones,
  onChange,
  placeholder = 'Buscar…',
  crear = false,
  variant = 'chip',
  tono = 'slate',
}) {
  const [abierto, setAbierto] = useState(false)
  const [busca, setBusca] = useState('')

  const actual = opciones.find((o) => o.value === value)
  const etiqueta = actual ? actual.label : value

  const q = busca.trim().toLowerCase()
  const filtradas = opciones.filter((o) => o.label.toLowerCase().includes(q))
  const exacta = opciones.some((o) => o.label.toLowerCase() === q)

  const cerrar = () => {
    setAbierto(false)
    setBusca('')
  }
  const elegir = (v) => {
    onChange(v)
    cerrar()
  }

  const chipTono =
    tono === 'rose'
      ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300'
      : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
  const triggerCls =
    variant === 'campo'
      ? 'w-full truncate rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
      : `max-w-[11rem] truncate rounded-md px-1.5 py-0.5 text-xs font-medium ${chipTono}`

  return (
    <span className={`relative ${variant === 'campo' ? 'block' : 'inline-block'}`}>
      <button type="button" onClick={() => setAbierto((o) => !o)} className={triggerCls}>
        {etiqueta} ▾
      </button>
      {abierto && (
        <>
          <div className="fixed inset-0 z-20" onClick={cerrar} />
          <div className="absolute left-0 z-30 mt-1 w-56 rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
            <input
              autoFocus
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={placeholder}
              className="mb-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            />
            <ul className="max-h-44 overflow-auto">
              {filtradas.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => elegir(o.value)}
                    className={`w-full truncate rounded-md px-2 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-700 ${
                      o.value === value
                        ? 'font-semibold text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {o.label}
                  </button>
                </li>
              ))}
              {crear && q && !exacta && (
                <li>
                  <button
                    type="button"
                    onClick={() => elegir(busca.trim())}
                    className="w-full rounded-md px-2 py-1.5 text-left text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/15"
                  >
                    + Crear «{busca.trim()}»
                  </button>
                </li>
              )}
              {filtradas.length === 0 && !(crear && q) && (
                <li className="px-2 py-1.5 text-xs text-slate-400 dark:text-slate-500">
                  Sin resultados
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </span>
  )
}
