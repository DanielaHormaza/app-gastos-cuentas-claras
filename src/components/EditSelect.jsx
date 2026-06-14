/**
 * Select inline para editar un dato del gasto (categoría, medio de pago).
 * Se ve como un chip y al tocarlo despliega las opciones.
 */
export default function EditSelect({ value, options, onChange, tone = 'slate' }) {
  const tonos = {
    slate: 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600',
    rose: 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300',
  }
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`max-w-[9rem] cursor-pointer truncate rounded-md px-1.5 py-0.5 text-xs font-medium outline-none ${tonos[tone]}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
