/**
 * Seed 100% FICTICIO para el modo demo (botón "Explorar demo" del login).
 * No contiene ningún dato real: personas, montos y descripciones son inventados.
 * Se carga solo en el navegador del visitante (localStorage, clave aparte) y NUNCA toca Supabase.
 *
 * Reusa la forma de estado de makeInitialState() y reemplaza únicamente los datos
 * (perfil, grupos, miembros, reparto, movimientos, chat). Categorías y medios de pago
 * son genéricos, así que se heredan tal cual.
 */
import { makeInitialState } from './initialState'

// Personas ficticias (member_key → datos del miembro).
const ALEX = { id: 'alex', name: 'Alex (vos)', short: 'Alex', color: '#7C3AED', initial: 'A' }
const SOFI = { id: 'sofi', name: 'Sofi', short: 'Sofi', color: '#3B82F6', initial: 'S' }
const MATI = { id: 'mati', name: 'Mati', short: 'Mati', color: '#2ECCB1', initial: 'M' }
const LU = { id: 'lu', name: 'Lu', short: 'Lu', color: '#EC4899', initial: 'L' }
const CARO = { id: 'caro', name: 'Caro', short: 'Caro', color: '#F59E0B', initial: 'C', pending: true, email: 'caro@demo.app' }

const intro = (id, text) => [{ id: 'w' + id, role: 'app', kind: 'text', text }]
const meta0 = { from: '2000-01-01', at: null, by: null }

export function makeDemoState() {
  const base = makeInitialState()
  return {
    ...base,
    demo: true,
    me: 'alex',
    homeTab: 'personas',
    profile: { name: 'Alex', email: 'alex@demo.app', gradient: 'linear-gradient(135deg,#7C3AED,#3B82F6)', founderNumber: 42, memberSince: '2026-01-15', currency: 'ARS' },
    aliases: {},
    pinned: [{ kind: 'group', id: 'depto' }],
    // "Escapada Córdoba" arranca archivada: muestra que archivar oculta de la lista pero conserva el saldo.
    archived: { cordoba: true },

    groups: {
      personal: {
        id: 'personal', name: 'Mis gastos', initial: '🧾', gradient: 'linear-gradient(135deg,#2ECCB1,#7C3AED)',
        description: 'Tus gastos individuales.', createdAt: '15 ene 2026', personal: true,
        members: [ALEX],
      },
      depto: {
        id: 'depto', name: 'Depto compartido', initial: 'D', gradient: 'linear-gradient(135deg,#3B82F6,#7C3AED)',
        description: 'Alquiler y gastos del depto.', createdAt: '15 ene 2026', isGroup: true,
        members: [ALEX, SOFI, MATI],
      },
      viaje: {
        id: 'viaje', name: 'Viaje a Bariloche', initial: 'V', gradient: 'linear-gradient(135deg,#10B981,#3B82F6)',
        description: 'Finde largo en la montaña.', createdAt: '5 jun 2026', isGroup: true, eventDate: '2026-07-12',
        members: [ALEX, SOFI, MATI, LU],
      },
      // Espacio 1:1 con una persona que todavía no usa la app (invitación pendiente).
      caro: {
        id: 'caro', name: 'Caro', initial: 'C', gradient: 'linear-gradient(135deg,#F59E0B,#EF4444)',
        description: 'Gastos entre ustedes.', createdAt: '10 jun 2026', direct: true,
        members: [ALEX, CARO],
      },
      // Grupo archivado de ejemplo (sigue contando el saldo, oculto de la lista).
      cordoba: {
        id: 'cordoba', name: 'Escapada Córdoba', initial: 'E', gradient: 'linear-gradient(135deg,#EC4899,#7C3AED)',
        description: 'Marzo con Sofi.', createdAt: '10 abr 2026', isGroup: true,
        members: [ALEX, SOFI],
      },
    },

    splits: {
      personal: { alex: 100 },
      depto: { alex: 34, sofi: 33, mati: 33 },
      viaje: { alex: 25, sofi: 25, mati: 25, lu: 25 },
      caro: { alex: 50, caro: 50 },
      cordoba: { alex: 50, sofi: 50 },
    },
    splitLog: { personal: [], depto: [], viaje: [], caro: [], cordoba: [] },
    splitMeta: { personal: { ...meta0 }, depto: { ...meta0 }, viaje: { ...meta0 }, caro: { ...meta0 }, cordoba: { ...meta0 } },
    payments: { personal: [], depto: [], viaje: [], caro: [], cordoba: [] },

    ledgers: {
      // Gastos personales del mes en curso (para que "Mis gastos" muestre un número).
      personal: [
        { id: 'dp1', date: '2026-06-03', currency: 'ARS', categoryId: 'salida', desc: 'Café de especialidad', amount: 4200, payerId: 'alex', mode: 'group' },
        { id: 'dp2', date: '2026-06-09', currency: 'ARS', categoryId: 'transporte', desc: 'Carga SUBE', amount: 6000, payerId: 'alex', mode: 'group' },
        { id: 'dp3', date: '2026-06-16', currency: 'ARS', categoryId: 'ocio', desc: 'Libro', amount: 18500, payerId: 'alex', mode: 'group' },
        { id: 'dp4', date: '2026-06-24', currency: 'ARS', categoryId: 'salud', desc: 'Farmacia', amount: 9300, payerId: 'alex', mode: 'group' },
      ],
      depto: [
        { id: 'dd1', date: '2026-06-05', currency: 'ARS', categoryId: 'alquiler', desc: 'Alquiler junio', amount: 480000, payerId: 'alex', mode: 'group' },
        { id: 'dd2', date: '2026-06-08', currency: 'ARS', categoryId: 'servicios', desc: 'Luz y gas', amount: 32000, payerId: 'sofi', mode: 'group' },
        { id: 'dd3', date: '2026-06-12', currency: 'ARS', categoryId: 'super', desc: 'Compra grande', amount: 64500, payerId: 'mati', mode: 'group' },
        { id: 'dd4', date: '2026-06-20', currency: 'ARS', categoryId: 'super', desc: 'Verdulería', amount: 18000, payerId: 'alex', mode: 'group' },
        { id: 'dd5', date: '2026-06-25', currency: 'ARS', categoryId: 'servicios', desc: 'Internet', amount: 22000, payerId: 'sofi', mode: 'group' },
      ],
      viaje: [
        { id: 'dv1', date: '2026-06-15', currency: 'ARS', categoryId: 'viaje', desc: 'Seña cabaña', amount: 90000, payerId: 'alex', mode: 'group' },
        { id: 'dv2', date: '2026-06-18', currency: 'ARS', categoryId: 'transporte', desc: 'Nafta ida', amount: 45000, payerId: 'mati', mode: 'group' },
        { id: 'dv3', date: '2026-06-22', currency: 'USD', categoryId: 'salida', desc: 'Cena de llegada', amount: 40, payerId: 'lu', mode: 'group' },
        // Cuota futura: aparece como pendiente y no cuenta hasta su fecha.
        { id: 'dv4', date: '2026-07-12', currency: 'ARS', categoryId: 'viaje', desc: 'Cabaña cuota 2/2', amount: 90000, payerId: 'alex', mode: 'group', cuota: { n: 2, total: 2 }, future: true },
      ],
      caro: [
        { id: 'dc1', date: '2026-06-10', currency: 'ARS', categoryId: 'ocio', desc: 'Entradas recital', amount: 35000, payerId: 'alex', mode: 'group' },
        { id: 'dc2', date: '2026-06-19', currency: 'ARS', categoryId: 'salida', desc: 'Bar', amount: 12000, payerId: 'caro', mode: 'group' },
      ],
      cordoba: [
        { id: 'dco1', date: '2026-04-10', currency: 'ARS', categoryId: 'viaje', desc: 'Hostel Córdoba', amount: 60000, payerId: 'alex', mode: 'group' },
        { id: 'dco2', date: '2026-04-11', currency: 'ARS', categoryId: 'salida', desc: 'Asado peña', amount: 24000, payerId: 'sofi', mode: 'group' },
      ],
    },

    threads: {
      personal: intro('personal', 'Anotá tus gastos personales. Ej: “3000 café”.'),
      depto: intro('depto', 'Cargá un gasto escribiéndolo, ej: “32000 luz pagó Sofi”.'),
      viaje: intro('viaje', '¡A planear! Cargá un gasto del viaje, ej: “45000 nafta pagó Mati”.'),
      caro: intro('caro', 'Gastos entre vos y Caro. Ej: “12000 bar pagó Caro”.'),
      cordoba: intro('cordoba', 'Cargá un gasto escribiéndolo acá.'),
    },
  }
}
