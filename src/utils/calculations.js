/**
 * Funciones puras de cálculo y formato.
 * Mantenerlas puras facilita testearlas y reusar las reglas de negocio
 * en el backend (mismas cuentas para WhatsApp y para la web).
 */

const MESES_NOMBRE = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

/**
 * Dólar MEP "actual" (mock). En real vendría de una API (ej. dolarapi.com).
 */
export const MEP_ACTUAL = 1425
// Momento de la última actualización (mock; en real sería un timestamp real).
export const MEP_ACTUALIZADO = 'hoy 09:15'

/**
 * Monedas soportadas. `arsPorUnidad` es el cambio ACTUAL (cuántos ARS vale
 * 1 unidad de esa moneda). Se usa para mostrar y para conversiones de referencia.
 * BACKEND: estos valores vendrían de una API de cotizaciones.
 */
export const MONEDAS = {
  ARS: { symbol: '$', nombre: 'Pesos', arsPorUnidad: 1 },
  USD: { symbol: 'US$', nombre: 'Dólares', arsPorUnidad: MEP_ACTUAL },
  CLP: { symbol: 'CLP$', nombre: 'Pesos chilenos', arsPorUnidad: 1.58 },
}
// Monedas del toggle de visualización del dashboard. CLP NO está acá:
// se puede cargar un gasto en CLP, pero el dashboard se ve solo en ARS o USD.
export const MONEDAS_VISTA = ['ARS', 'USD']

/** Pesos argentinos completos: $48.000 */
export function formatARS(monto) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Math.round(monto || 0))
}

/**
 * Formatea un monto en la moneda indicada: $48.000 (ARS), US$200, CLP$80.000.
 * Los montos chicos en USD muestran centavos para no perder precisión.
 */
export function formatMonto(amount, currency = 'ARS') {
  if (currency === 'ARS') return formatARS(amount)
  const m = MONEDAS[currency] || MONEDAS.USD
  const n = amount || 0
  const dec = currency === 'USD' && Math.abs(n) < 1000 ? 2 : 0
  return (
    m.symbol +
    new Intl.NumberFormat('es-AR', { maximumFractionDigits: dec }).format(dec ? n : Math.round(n))
  )
}

/** Versión corta para gráficos: $48k, $1,2M, US$600 */
export function formatCorto(monto, currency = 'ARS') {
  const pre = (MONEDAS[currency] || MONEDAS.ARS).symbol
  const n = Math.abs(monto || 0)
  if (n >= 1000000) return `${pre}${(monto / 1000000).toFixed(1).replace('.', ',').replace(',0', '')}M`
  if (n >= 1000) return `${pre}${Math.round(monto / 1000)}k`
  return `${pre}${Math.round(monto || 0)}`
}

/**
 * Valor de un gasto en la moneda pedida.
 * Cada gasto guarda los cambios congelados del día (g.rates: { USD, CLP }),
 * así la conversión es la del momento del gasto y la historia no se mueve.
 */
export function valorEn(g, currency = 'ARS') {
  const rates = g.rates || {}
  const arsPorUnidad = (cur) =>
    cur === 'ARS' ? 1 : rates[cur] || (MONEDAS[cur] && MONEDAS[cur].arsPorUnidad) || 1
  const baseARS = g.amount * arsPorUnidad(g.currency || 'ARS')
  return baseARS / arsPorUnidad(currency)
}

/** Convierte entre dos monedas con el cambio actual (referencia, no congelado). */
export function convertirEntre(monto, desde, hasta) {
  if (desde === hasta) return monto
  const ars = (c) => (MONEDAS[c] ? MONEDAS[c].arsPorUnidad : 1)
  return (monto * ars(desde)) / ars(hasta)
}

/** Convierte un monto en ARS a la moneda pedida (cambio actual). */
export function convertir(montoEnARS, currency = 'ARS') {
  return convertirEntre(montoEnARS, 'ARS', currency)
}

/** 'YYYY-MM-DD' => 'YYYY-MM' */
export const mesDe = (fecha) => fecha.slice(0, 7)

/** '2026-05' => 'May' */
export const etiquetaMesCorta = (iso) => MESES_NOMBRE[Number(iso.split('-')[1]) - 1]

/** '2026-05' => 'Mayo 2026' */
export function etiquetaMes(iso) {
  const nombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const [y, m] = iso.split('-')
  return `${nombres[Number(m) - 1]} ${y}`
}

// --- Filtros básicos ---
export const individualesDe = (gastos, persona) =>
  gastos.filter((g) => g.type === 'individual' && g.owner === persona)
export const compartidosDeGrupo = (gastos, groupId) =>
  gastos.filter((g) => g.type === 'shared' && g.groupId === groupId)
export const settlementsDeGrupo = (gastos, groupId) =>
  gastos.filter((g) => g.type === 'settlement' && g.groupId === groupId)
export const filtrarPorMes = (gastos, mes) => gastos.filter((g) => mesDe(g.date) === mes)

/** Total en la moneda pedida (convierte cada gasto a su cambio congelado). */
export const totalDe = (gastos, currency = 'ARS') =>
  gastos.reduce((acc, g) => acc + valorEn(g, currency), 0)

/** Meses presentes en el set, ordenados ascendente. */
export function mesesDisponibles(gastos) {
  return [...new Set(gastos.map((g) => mesDe(g.date)))].sort()
}

/** Desglose por categoría en la moneda pedida, ordenado de mayor a menor. */
export function porCategoria(gastos, currency = 'ARS') {
  const map = {}
  for (const g of gastos) map[g.category] = (map[g.category] || 0) + valorEn(g, currency)
  return Object.entries(map)
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total)
}

/** Categorías únicas presentes en el set. */
export function categoriasDisponibles(gastos) {
  return [...new Set(gastos.map((g) => g.category))].sort()
}

/** Conteo de gastos por categoría, ordenado de más usada a menos. */
export function conteoCategorias(gastos) {
  const map = {}
  for (const g of gastos) {
    if (g.type === 'settlement') continue
    map[g.category] = (map[g.category] || 0) + 1
  }
  return Object.entries(map)
    .map(([nombre, count]) => ({ nombre, count }))
    .sort((a, b) => b.count - a.count)
}

/** Conteo de gastos por etiqueta, ordenado de más usada a menos. */
export function conteoEtiquetas(gastos) {
  const map = {}
  for (const g of gastos) for (const t of g.tags || []) map[t] = (map[t] || 0) + 1
  return Object.entries(map)
    .map(([nombre, count]) => ({ nombre, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * "Parte" que le toca a una persona de los gastos de grupo, como ítems
 * virtuales — sirve para sumar el gasto compartido al panorama personal.
 */
export function parteEnGrupos(gastos, persona) {
  return gastos
    .filter((g) => g.type === 'shared' && g.split && g.split[persona] > 0)
    .map((g) => ({
      id: `grp-${g.id}`,
      date: g.date,
      description: g.description,
      category: g.category,
      amount: g.amount * g.split[persona],
      currency: g.currency || 'ARS',
      rates: g.rates,
      tags: g.tags,
      esGrupo: true,
      groupId: g.groupId,
    }))
}

// --- Gastos compartidos (reciben un set ya filtrado a un grupo) ---

/** Lo que una persona puso de su bolsillo, en la moneda pedida. */
export function pagadoPor(gastos, persona, currency = 'ARS') {
  return gastos
    .filter((g) => g.paidBy === persona)
    .reduce((acc, g) => acc + valorEn(g, currency), 0)
}

/** Lo que a una persona le corresponde absorber, en la moneda pedida. */
export function correspondeAbsorber(gastos, persona, currency = 'ARS') {
  return gastos.reduce(
    (acc, g) => acc + valorEn(g, currency) * ((g.split && g.split[persona]) || 0),
    0,
  )
}

/**
 * Balance entre los dos miembros de un grupo, SEPARADO POR MONEDA.
 * La deuda de un gasto en USD se lleva en USD (exacta, sin tipo de cambio);
 * la de un gasto en ARS, en ARS. Devuelve [{ currency, deudor, acreedor, monto }].
 * (Prototipo: asume grupos de 2 miembros.)
 */
export function balancesPorMoneda(gastos, settlements, miembros) {
  const [a, b] = miembros
  const monedas = [
    ...new Set([
      ...gastos.map((g) => g.currency || 'ARS'),
      ...settlements.map((s) => s.currency || 'ARS'),
    ]),
  ]
  return monedas
    .map((cur) => {
      let saldoA = 0
      for (const g of gastos) {
        if ((g.currency || 'ARS') !== cur) continue
        saldoA += (g.paidBy === a ? g.amount : 0) - g.amount * ((g.split && g.split[a]) || 0)
      }
      for (const s of settlements) {
        if ((s.currency || 'ARS') !== cur) continue
        if (s.from === a) saldoA += s.amount
        if (s.to === a) saldoA -= s.amount
      }
      if (Math.abs(saldoA) < 1) return null
      return saldoA > 0
        ? { currency: cur, deudor: b, acreedor: a, monto: saldoA }
        : { currency: cur, deudor: a, acreedor: b, monto: -saldoA }
    })
    .filter(Boolean)
}

/** Totales por medio de pago en la moneda pedida: { [id]: { total, compartido, individual } } */
export function totalesPorMedioDePago(gastos, currency = 'ARS') {
  const acc = {}
  for (const g of gastos) {
    if (g.type === 'settlement') continue // los pagos de saldo no son consumo de una tarjeta
    if (!acc[g.paymentMethod]) acc[g.paymentMethod] = { total: 0, compartido: 0, individual: 0 }
    acc[g.paymentMethod].total += valorEn(g, currency)
    if (g.type === 'shared') acc[g.paymentMethod].compartido += valorEn(g, currency)
    else acc[g.paymentMethod].individual += valorEn(g, currency)
  }
  return acc
}
