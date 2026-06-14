import { useCurrency } from '../context/currency'
import { valorEn, formatMonto, formatARS, MONEDAS } from '../utils/calculations'

/**
 * Celda de monto. Muestra el importe en la moneda elegida arriba y, debajo,
 * las conversiones de referencia (siempre USD + la moneda original si es otra)
 * y el tipo de cambio del dólar congelado el día del gasto.
 */
export default function MontoCell({ gasto, prefijo = '' }) {
  const currency = useCurrency()
  const nativa = gasto.currency || 'ARS'
  // Conversiones de referencia: siempre mostramos ARS y USD (más la nativa si
  // es otra moneda, ej. CLP), menos la moneda actual de visualización. Así un
  // gasto en USD viéndose en USD también muestra "≈ $X" en pesos.
  const otras = [...new Set(['ARS', 'USD', nativa])].filter((c) => c !== currency)
  const rates = gasto.rates || {}

  const refs = otras.map((c) => formatMonto(valorEn(gasto, c), c))
  // Cambio congelado del día del gasto (siempre se muestra el dólar como
  // referencia). Si el gasto fue en CLP, también el dólar contra el peso chileno.
  const rateUSD = rates.USD || MONEDAS.USD.arsPorUnidad
  const rateCLP = rates.CLP || MONEDAS.CLP.arsPorUnidad
  // Si el gasto en USD/CLP no tiene rate congelado (cuota futura), el valor
  // se está usando con el MEP actual — lo dejamos marcado como estimado.
  const estimado = !gasto.rates && nativa !== 'ARS'
  refs.push(`dólar a ${formatARS(rateUSD)}${estimado ? ' (estimado)' : ''}`)
  if (nativa === 'CLP') refs.push(`dólar a CLP$${Math.round(rateUSD / rateCLP)}`)

  return (
    <div className="shrink-0 text-right">
      <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
        {prefijo}
        {formatMonto(valorEn(gasto, currency), currency)}
      </p>
      {refs.length > 0 && (
        <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{refs.join(' · ')}</p>
      )}
    </div>
  )
}
