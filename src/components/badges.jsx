/** Badges reutilizables: persona, moneda y pago de saldo. */

const PERSONA_CLASES = {
  Dani: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  Juan: 'bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
}
const PERSONA_OTRO = 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'

/** Quién pagó / a quién — coloreado por persona. */
export function PersonaBadge({ persona, children }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        PERSONA_CLASES[persona] || PERSONA_OTRO
      }`}
    >
      {children || persona}
    </span>
  )
}

const MONEDA_CLASES = {
  USD: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  CLP: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
}

/** Marca la moneda en que se pagó (USD ámbar, CLP celeste). ARS no muestra nada. */
export function MonedaBadge({ currency }) {
  if (!currency || currency === 'ARS') return null
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        MONEDA_CLASES[currency] || MONEDA_CLASES.USD
      }`}
    >
      Pagado en {currency}
    </span>
  )
}

/** Pago de saldo: "Dani → Juan". */
export function PagoBadge({ from, to }) {
  return (
    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
      {from} → {to}
    </span>
  )
}
