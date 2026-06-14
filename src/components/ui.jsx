/** Primitivas de UI reutilizables. */

/** Card base: bordes redondeados, sombra suave, soporte dark. */
export function Card({ className = '', children }) {
  return (
    <div
      className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700/70 ${className}`}
    >
      {children}
    </div>
  )
}

/** Título de sección con bajada opcional. */
export function SectionTitle({ title, subtitle }) {
  return (
    <div className="mb-2">
      <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
      {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>}
    </div>
  )
}

/** Estado vacío para listas filtradas. */
export function EmptyState({ children }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400 dark:border-slate-700 dark:text-slate-500">
      {children}
    </div>
  )
}

/** Modal: hoja inferior en mobile, centrado en desktop. */
export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-white p-5 dark:bg-slate-800 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  )
}
