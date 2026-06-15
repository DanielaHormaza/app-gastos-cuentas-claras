/**
 * Modelo de datos de Cuentas Claras — portado fiel del prototipo de diseño
 * (clase `Component` del handoff). Es la fuente de verdad funcional.
 *
 * BACKEND / SUPABASE (V2): estas estructuras se reemplazarían por tablas
 * (profile, groups, group_members, splits, expenses, payments, threads,
 * categories, payment_methods). El parser de NL puede correr en cliente o server.
 */

// Paletas de marca (ver README · Design Tokens).
export const PALETTE = ['#7C3AED', '#3B82F6', '#2ECCB1', '#F59E0B', '#EC4899', '#10B981']
export const GRADIENTS = [
  'linear-gradient(135deg,#3B82F6,#7C3AED)',
  'linear-gradient(135deg,#2ECCB1,#3B82F6)',
  'linear-gradient(135deg,#F59E0B,#EF4444)',
  'linear-gradient(135deg,#EC4899,#7C3AED)',
  'linear-gradient(135deg,#10B981,#3B82F6)',
]
export const BRAND_GRADIENT = 'linear-gradient(135deg,#2ECCB1,#3B82F6,#7C3AED)'

// Gradiente de marca para botones primarios / avatar IA / FAB.
export const METHOD_COLORS = ['#7C3AED', '#3B82F6', '#2ECCB1', '#F59E0B', '#EC4899', '#64748B']

export const MONTH_ORDER = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']
export const MONTH_SHORT = { '2026-01': 'Ene', '2026-02': 'Feb', '2026-03': 'Mar', '2026-04': 'Abr', '2026-05': 'May', '2026-06': 'Jun' }
export const MONTH_LONG = { '2026-01': 'Enero 2026', '2026-02': 'Febrero 2026', '2026-03': 'Marzo 2026', '2026-04': 'Abril 2026', '2026-05': 'Mayo 2026', '2026-06': 'Junio 2026' }

export function makeInitialState() {
  return {
    // ---- navegación ----
    screen: 'list', // list | chat | profile | archived | newgroup | methodDetail | monthDetail
    groupId: null,
    view: 'chat', // chat | ledger | months | hist
    menuOpen: false,
    configOpen: false,
    // ---- edición de gasto ----
    editId: null,
    draft: null,
    editPanel: null, // null | cat | payer | method | split
    catQuery: '',
    payerQuery: '',
    methodQuery: '',
    // ---- otros estados de UI ----
    methodId: null,
    monthKey: null,
    monthFilter: null,
    chatInput: '',
    groupQuery: '',
    expandedMonths: { 0: true },
    histSel: {},
    newGroup: { name: '', desc: '', members: [], memberName: '', invited: false },

    // ---- datos ----
    profile: { name: 'Dani', email: 'dani@cuentasclaras.app', gradient: 'linear-gradient(135deg,#7C3AED,#3B82F6)' },
    methods: [
      { id: 'efectivo', name: 'Efectivo', icon: '💵' },
      { id: 'visa_macro', name: 'Visa Macro (débito)', icon: '💳' },
      { id: 'visa_santander', name: 'Visa Santander (crédito)', icon: '💳' },
      { id: 'mp', name: 'Mercado Pago', icon: '🟦' },
      { id: 'master_galicia', name: 'Mastercard Galicia', icon: '💳' },
      { id: 'transferencia', name: 'Transferencia', icon: '🏦' },
    ],
    archived: { asado: true },
    payments: { pareja: [], mamucha: [], asado: [], personal: [] },
    threads: {
      pareja: [
        { id: 't1', role: 'user', kind: 'user', text: 'Súper 4500 lo pagué yo', time: '08:15' },
        { id: 't2', role: 'app', kind: 'saved', expId: 'p1', time: '08:15' },
        { id: 't3', role: 'user', kind: 'user', text: 'Nafta 8000 la pagó Juan', time: '09:30' },
        { id: 't4', role: 'app', kind: 'saved', expId: 'p2', time: '09:30' },
      ],
      mamucha: [
        { id: 'mt1', role: 'app', kind: 'text', text: 'Escribí un gasto en lenguaje natural, ej: “1800 farmacia pagué yo”.' },
      ],
      asado: [],
      personal: [
        { id: 'it1', role: 'app', kind: 'text', text: 'Anotá tus gastos personales. Ej: “3000 café”.' },
      ],
    },
    categories: [
      { id: 'super', icon: '🛒', name: 'Súper' },
      { id: 'nafta', icon: '⛽', name: 'Nafta' },
      { id: 'comida', icon: '🍽️', name: 'Comida' },
      { id: 'cafe', icon: '☕', name: 'Café' },
      { id: 'cine', icon: '🎬', name: 'Cine' },
      { id: 'hogar', icon: '🏠', name: 'Hogar' },
      { id: 'transporte', icon: '🚕', name: 'Transporte' },
      { id: 'farmacia', icon: '💊', name: 'Farmacia' },
      { id: 'mandados', icon: '🧺', name: 'Mandados' },
    ],
    groups: {
      pareja: {
        id: 'pareja', name: 'Pareja', initial: 'P',
        gradient: 'linear-gradient(135deg,#3B82F6,#7C3AED)',
        description: 'Gastos de la casa y del día a día.',
        createdAt: '3 may 2026',
        members: [
          { id: 'dani', name: 'Dani (vos)', short: 'Dani', color: '#7C3AED', initial: 'D' },
          { id: 'juan', name: 'Juan', short: 'Juan', color: '#3B82F6', initial: 'J' },
        ],
      },
      mamucha: {
        id: 'mamucha', name: 'Mamucha', initial: 'M',
        gradient: 'linear-gradient(135deg,#2ECCB1,#3B82F6)',
        description: 'Cuentas de mamá entre los dos.',
        createdAt: '18 abr 2026',
        members: [
          { id: 'dani', name: 'Dani (vos)', short: 'Dani', color: '#7C3AED', initial: 'D' },
          { id: 'paula', name: 'Paula', short: 'Paula', color: '#2ECCB1', initial: 'P' },
        ],
      },
      asado: {
        id: 'asado', name: 'Asado del finde', initial: 'A',
        gradient: 'linear-gradient(135deg,#F59E0B,#EF4444)',
        description: 'Junta de cada finde con los pibes.',
        createdAt: '2 mar 2026',
        members: [
          { id: 'dani', name: 'Dani (vos)', short: 'Dani', color: '#7C3AED', initial: 'D' },
          { id: 'leo', name: 'Leo', short: 'Leo', color: '#3B82F6', initial: 'L' },
          { id: 'sofi', name: 'Sofi', short: 'Sofi', color: '#2ECCB1', initial: 'S' },
        ],
      },
      personal: {
        id: 'personal', name: 'Mis gastos', initial: '🧾',
        gradient: 'linear-gradient(135deg,#2ECCB1,#7C3AED)',
        description: 'Tus gastos individuales.',
        createdAt: '1 ene 2026',
        personal: true,
        members: [{ id: 'dani', name: 'Dani (vos)', short: 'Dani', color: '#7C3AED', initial: 'D' }],
      },
    },
    splits: {
      pareja: { dani: 40, juan: 60 },
      mamucha: { dani: 50, paula: 50 },
      asado: { dani: 34, leo: 33, sofi: 33 },
      personal: { dani: 100 },
    },
    ledgers: {
      pareja: [
        { id: 'p1', day: 'Hoy', dateFull: '14/jun/26', categoryId: 'super', amount: 4500, payerId: 'dani', time: '14:20' },
        { id: 'p2', day: 'Hoy', dateFull: '14/jun/26', categoryId: 'nafta', amount: 8000, payerId: 'juan', time: '10:05' },
        { id: 'p3', day: 'Ayer', dateFull: '13/jun/26', categoryId: 'comida', amount: 6200, payerId: 'juan', time: '21:40' },
        { id: 'p4', day: 'Ayer', dateFull: '13/jun/26', categoryId: 'cafe', amount: 2800, payerId: 'dani', time: '17:30' },
        { id: 'p5', day: 'Mié', dateFull: '11/jun/26', categoryId: 'cine', amount: 9000, payerId: 'dani', time: '20:10' },
      ],
      mamucha: [
        { id: 'm1', day: 'Hoy', dateFull: '14/jun/26', categoryId: 'farmacia', amount: 1800, payerId: 'dani', time: '12:00' },
        { id: 'm2', day: 'Ayer', dateFull: '13/jun/26', categoryId: 'mandados', amount: 1200, payerId: 'paula', time: '18:15' },
        { id: 'm3', day: 'Lun', dateFull: '9/jun/26', categoryId: 'transporte', amount: 3500, payerId: 'dani', time: '09:30' },
      ],
      asado: [
        { id: 'a1', day: 'Sáb', dateFull: '7/jun/26', categoryId: 'comida', amount: 18000, payerId: 'dani', time: '21:30' },
        { id: 'a2', day: 'Sáb', dateFull: '7/jun/26', categoryId: 'super', amount: 9000, payerId: 'leo', time: '18:00' },
      ],
      personal: [
        { id: 'i1', day: 'Hoy', dateFull: '14/jun/26', categoryId: 'cafe', amount: 3200, payerId: 'dani', time: '09:10', methodId: 'efectivo' },
        { id: 'i2', day: 'Ayer', dateFull: '13/jun/26', categoryId: 'transporte', amount: 1500, payerId: 'dani', time: '08:30', methodId: 'mp' },
        { id: 'i3', day: 'Mar', dateFull: '10/jun/26', categoryId: 'super', amount: 8700, payerId: 'dani', time: '19:00', methodId: 'visa_macro' },
        { id: 'i4', day: 'Jue', dateFull: '5/jun/26', categoryId: 'farmacia', amount: 2400, payerId: 'dani', time: '11:20', methodId: null },
      ],
    },
  }
}
