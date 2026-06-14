/**
 * Datos mockeados (todo en memoria, persistidos en localStorage desde App).
 *
 * BACKEND / SUPABASE: estos arrays se reemplazarían por tablas
 * (users, groups, group_members, expenses, payment_methods, savings_goals).
 * La carga por WhatsApp escribiría en `expenses` vía un webhook; el grupo de
 * WhatsApp mapea a un `group`, el chat individual al espacio personal del user.
 */

// Usuarios con "login" en el prototipo (los que pueden abrir la app).
export const USUARIOS = ['Dani', 'Juan']

// "Hoy" del prototipo: los gastos cargados a mano usan esta fecha para caer
// dentro del mes que tienen los datos mock (Mayo 2026).
export const HOY = '2026-05-17'

// Cambios (ARS por unidad) por mes (mock). Cada gasto congela los del mes en
// que se hizo, así el dashboard se puede ver en cualquier moneda sin que la
// historia se mueva. BACKEND: traer las cotizaciones de una API.
const RATES_POR_MES = {
  '2025-12': { USD: 1180, CLP: 1.30 },
  '2026-01': { USD: 1240, CLP: 1.36 },
  '2026-02': { USD: 1300, CLP: 1.42 },
  '2026-03': { USD: 1360, CLP: 1.48 },
  '2026-04': { USD: 1410, CLP: 1.53 },
  '2026-05': { USD: 1425, CLP: 1.58 },
}

/**
 * Grupos: cada uno con sus miembros y su acuerdo de división por defecto.
 * Un usuario tiene además su espacio personal (gastos individuales, privados).
 */
export const grupos = [
  { id: 'pareja', nombre: 'Pareja', miembros: ['Dani', 'Juan'], acuerdo: { Dani: 0.6, Juan: 0.4 }, acuerdoLabel: '60/40', createdAt: '2025-08-01', archived: false },
  { id: 'mama', nombre: 'Gastos con Mamá', miembros: ['Dani', 'Mamá'], acuerdo: { Dani: 0.5, 'Mamá': 0.5 }, acuerdoLabel: '50/50', createdAt: '2025-12-10', archived: false },
]

// Medios de pago. `dueDate` = próxima fecha de vencimiento (mockeada).
export const mediosDePago = [
  { id: 'visa-dani', nombre: 'Visa crédito Santander', titular: 'Dani', tipo: 'Crédito', dueDate: '2026-06-10' },
  { id: 'master-dani', nombre: 'Mastercard Santander', titular: 'Dani', tipo: 'Crédito', dueDate: '2026-06-15' },
  { id: 'mp-dani', nombre: 'Mercado Pago', titular: 'Dani', tipo: 'Billetera', dueDate: '2026-06-05' },
  { id: 'visa-juan', nombre: 'Visa crédito Macro', titular: 'Juan', tipo: 'Crédito', dueDate: '2026-06-12' },
  { id: 'efectivo-juan', nombre: 'Efectivo', titular: 'Juan', tipo: 'Efectivo', dueDate: null },
  { id: 'cuenta-compartida', nombre: 'Cuenta compartida', titular: 'Ambos', tipo: 'Débito', dueDate: '2026-06-08' },
  { id: 'efectivo-mama', nombre: 'Efectivo Mamá', titular: 'Mamá', tipo: 'Efectivo', dueDate: null },
]

// Divisiones reutilizables (split = fracción que absorbe cada miembro).
const PAREJA_6040 = { splitLabel: '60/40', split: { Dani: 0.6, Juan: 0.4 } }
const PAREJA_5050 = { splitLabel: '50/50', split: { Dani: 0.5, Juan: 0.5 } }
const MAMA_5050 = { splitLabel: '50/50', split: { Dani: 0.5, 'Mamá': 0.5 } }

// Variación determinística por mes (para que el gráfico temporal no sea plano).
const vary = (base, i, seed) => {
  const f = 1 + (((i * 3 + seed * 7) % 7) - 3) * 0.04
  return Math.round((base * f) / 500) * 500
}

// Meses históricos generados; Mayo 2026 se define a mano (abajo) con ejemplos reales.
const MESES_HISTORICOS = ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04']

function generarHistorico() {
  const out = []
  let id = 1
  MESES_HISTORICOS.forEach((m, i) => {
    // --- Grupo Pareja ---
    out.push({ id: id++, type: 'shared', groupId: 'pareja', date: `${m}-01`, description: 'Alquiler', category: 'Alquiler', amount: 500000, paidBy: 'Juan', paymentMethod: 'cuenta-compartida', ...PAREJA_6040 })
    out.push({ id: id++, type: 'shared', groupId: 'pareja', date: `${m}-05`, description: 'Supermercado', category: 'Comida', amount: vary(46000, i, 1), paidBy: i % 2 ? 'Juan' : 'Dani', paymentMethod: i % 2 ? 'visa-juan' : 'visa-dani', ...PAREJA_6040 })
    out.push({ id: id++, type: 'shared', groupId: 'pareja', date: `${m}-18`, description: 'Supermercado', category: 'Comida', amount: vary(41000, i, 2), paidBy: 'Dani', paymentMethod: 'visa-dani', ...PAREJA_6040 })
    out.push({ id: id++, type: 'shared', groupId: 'pareja', date: `${m}-10`, description: 'Servicios (luz y gas)', category: 'Servicios', amount: vary(34000, i, 3), paidBy: 'Juan', paymentMethod: 'cuenta-compartida', ...PAREJA_6040 })
    out.push({ id: id++, type: 'shared', groupId: 'pareja', date: `${m}-12`, description: 'Cena afuera', category: 'Salidas', amount: vary(30000, i, 4), paidBy: i % 2 ? 'Dani' : 'Juan', paymentMethod: i % 2 ? 'mp-dani' : 'visa-juan', ...PAREJA_5050 })
    out.push({ id: id++, type: 'shared', groupId: 'pareja', date: `${m}-20`, description: 'Nafta', category: 'Transporte', amount: vary(24000, i, 5), paidBy: 'Dani', paymentMethod: 'visa-dani', ...PAREJA_6040 })
    // --- Grupo Mamá ---
    out.push({ id: id++, type: 'shared', groupId: 'mama', date: `${m}-08`, description: 'Mercado del barrio', category: 'Comida', amount: vary(30000, i, 11), paidBy: i % 2 ? 'Mamá' : 'Dani', paymentMethod: i % 2 ? 'efectivo-mama' : 'mp-dani', ...MAMA_5050 })
    out.push({ id: id++, type: 'shared', groupId: 'mama', date: `${m}-15`, description: 'Expensas casa de mamá', category: 'Expensas', amount: vary(22000, i, 12), paidBy: 'Dani', paymentMethod: 'mp-dani', ...MAMA_5050 })
    // --- Individuales Dani ---
    out.push({ id: id++, type: 'individual', owner: 'Dani', paidBy: 'Dani', date: `${m}-06`, description: 'Gimnasio', category: 'Salud', amount: 22000, paymentMethod: 'mp-dani' })
    out.push({ id: id++, type: 'individual', owner: 'Dani', paidBy: 'Dani', date: `${m}-09`, description: 'Café', category: 'Salidas', amount: vary(8500, i, 6), paymentMethod: 'mp-dani' })
    out.push({ id: id++, type: 'individual', owner: 'Dani', paidBy: 'Dani', date: `${m}-14`, description: 'Ropa', category: 'Indumentaria', amount: vary(28000, i, 7), paymentMethod: 'master-dani' })
    // --- Individuales Juan ---
    out.push({ id: id++, type: 'individual', owner: 'Juan', paidBy: 'Juan', date: `${m}-07`, description: 'Barbería', category: 'Cuidado personal', amount: vary(12000, i, 8), paymentMethod: 'efectivo-juan' })
    out.push({ id: id++, type: 'individual', owner: 'Juan', paidBy: 'Juan', date: `${m}-11`, description: 'Salida con amigos', category: 'Salidas', amount: vary(26000, i, 9), paymentMethod: 'efectivo-juan' })
    out.push({ id: id++, type: 'individual', owner: 'Juan', paidBy: 'Juan', date: `${m}-16`, description: 'Streaming y apps', category: 'Tecnología', amount: vary(9000, i, 10), paymentMethod: 'visa-juan' })
  })
  return { out, nextId: id }
}

const { out: historico, nextId } = generarHistorico()
let id = nextId

// Mayo 2026 (mes en curso): incluye los ejemplos pedidos originalmente.
const mayo2026 = [
  // Grupo Pareja
  { id: id++, type: 'shared', groupId: 'pareja', date: '2026-05-01', description: 'Alquiler', category: 'Alquiler', amount: 500000, paidBy: 'Juan', paymentMethod: 'cuenta-compartida', ...PAREJA_6040 },
  { id: id++, type: 'shared', groupId: 'pareja', date: '2026-05-03', description: 'Supermercado Carrefour', category: 'Comida', amount: 48000, paidBy: 'Dani', paymentMethod: 'visa-dani', ...PAREJA_6040 },
  { id: id++, type: 'shared', groupId: 'pareja', date: '2026-05-08', description: 'Cena restaurante', category: 'Salidas', amount: 32000, paidBy: 'Juan', paymentMethod: 'visa-juan', ...PAREJA_5050 },
  { id: id++, type: 'shared', groupId: 'pareja', date: '2026-05-09', description: 'Servicios (luz y gas)', category: 'Servicios', amount: 33000, paidBy: 'Juan', paymentMethod: 'cuenta-compartida', ...PAREJA_6040 },
  { id: id++, type: 'shared', groupId: 'pareja', date: '2026-05-10', description: 'Farmacia', category: 'Salud', amount: 18000, paidBy: 'Dani', paymentMethod: 'mp-dani', splitLabel: '100% Juan', split: { Dani: 0, Juan: 1 } },
  { id: id++, type: 'shared', groupId: 'pareja', date: '2026-05-12', description: 'Nafta', category: 'Transporte', amount: 25000, paidBy: 'Dani', paymentMethod: 'visa-dani', ...PAREJA_6040 },
  // Gastos en dólares (tarjeta de crédito; se muestran en USD, el cambio queda congelado)
  { id: id++, type: 'shared', groupId: 'pareja', date: '2026-05-16', description: 'Vuelos a Bariloche', category: 'Viajes', amount: 171, currency: 'USD', tags: ['Viaje Bariloche'], paidBy: 'Dani', paymentMethod: 'visa-dani', ...PAREJA_6040 },
  { id: id++, type: 'shared', groupId: 'pareja', date: '2026-05-18', description: 'Reserva hotel', category: 'Viajes', amount: 94, currency: 'USD', tags: ['Viaje Bariloche'], paidBy: 'Juan', paymentMethod: 'visa-juan', ...PAREJA_6040 },
  // Grupo Mamá
  { id: id++, type: 'shared', groupId: 'mama', date: '2026-05-06', description: 'Mercado del barrio', category: 'Comida', amount: 31000, paidBy: 'Dani', paymentMethod: 'mp-dani', ...MAMA_5050 },
  { id: id++, type: 'shared', groupId: 'mama', date: '2026-05-13', description: 'Plomero', category: 'Hogar', amount: 45000, paidBy: 'Mamá', paymentMethod: 'efectivo-mama', ...MAMA_5050 },
  // Individuales Dani
  { id: id++, type: 'individual', owner: 'Dani', paidBy: 'Dani', date: '2026-05-04', description: 'Ropa', category: 'Indumentaria', amount: 35000, paymentMethod: 'master-dani' },
  { id: id++, type: 'individual', owner: 'Dani', paidBy: 'Dani', date: '2026-05-06', description: 'Gimnasio', category: 'Salud', amount: 22000, paymentMethod: 'mp-dani' },
  { id: id++, type: 'individual', owner: 'Dani', paidBy: 'Dani', date: '2026-05-09', description: 'Café', category: 'Salidas', amount: 9000, paymentMethod: 'mp-dani' },
  { id: id++, type: 'individual', owner: 'Dani', paidBy: 'Dani', date: '2026-05-15', description: 'Curso online', category: 'Educación', amount: 27000, paymentMethod: 'visa-dani' },
  { id: id++, type: 'individual', owner: 'Dani', paidBy: 'Dani', date: '2026-05-13', description: 'Suscripción anual', category: 'Tecnología', amount: 60, currency: 'USD', paymentMethod: 'visa-dani' },
  { id: id++, type: 'individual', owner: 'Dani', paidBy: 'Dani', date: '2026-05-14', description: 'Reserva hostel en Chile', category: 'Viajes', amount: 85000, currency: 'CLP', tags: ['Viaje Chile'], paymentMethod: 'visa-dani' },
  // Individuales Juan
  { id: id++, type: 'individual', owner: 'Juan', paidBy: 'Juan', date: '2026-05-05', description: 'Notebook nueva', category: 'Tecnología', amount: 120000, paymentMethod: 'visa-juan' },
  { id: id++, type: 'individual', owner: 'Juan', paidBy: 'Juan', date: '2026-05-07', description: 'Barbería', category: 'Cuidado personal', amount: 13000, paymentMethod: 'efectivo-juan' },
  { id: id++, type: 'individual', owner: 'Juan', paidBy: 'Juan', date: '2026-05-11', description: 'Salida con amigos', category: 'Salidas', amount: 28000, paymentMethod: 'efectivo-juan' },
  // Pago de saldo: Dani le adelantó plata a Juan a cuenta de la deuda del mes.
  { id: id++, type: 'settlement', groupId: 'pareja', from: 'Dani', to: 'Juan', amount: 100000, currency: 'ARS', date: '2026-05-14' },
]

// Cada gasto congela los cambios del mes en que se hizo.
export const gastosIniciales = [...historico, ...mayo2026].map((g) => ({
  ...g,
  rates: RATES_POR_MES[g.date.slice(0, 7)],
}))

/**
 * Objetivos de ahorro / inversión.
 * shared: true => del grupo `groupId` (muestra aportes). false => personal de `owner`.
 */
export const ahorrosIniciales = [
  { id: 'viaje', nombre: 'Viaje a Brasil', shared: true, groupId: 'pareja', objetivo: 3000000, actual: 1200000, aportes: { Dani: 720000, Juan: 480000 } },
  { id: 'emergencia', nombre: 'Fondo de emergencia', shared: true, groupId: 'pareja', objetivo: 2000000, actual: 800000, aportes: { Dani: 480000, Juan: 320000 } },
  { id: 'refaccion', nombre: 'Refacción casa de mamá', shared: true, groupId: 'mama', objetivo: 1500000, actual: 600000, aportes: { Dani: 300000, 'Mamá': 300000 } },
  { id: 'inv-dani', nombre: 'Inversión personal', shared: false, owner: 'Dani', objetivo: 1000000, actual: 500000 },
  { id: 'inv-juan', nombre: 'Inversión personal', shared: false, owner: 'Juan', objetivo: 800000, actual: 350000 },
]
