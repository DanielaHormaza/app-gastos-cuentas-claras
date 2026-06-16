/**
 * Modelo de datos de Cuentas Claras — portado fiel del prototipo de diseño
 * (clase `Component` del handoff). Es la fuente de verdad funcional.
 *
 * BACKEND / SUPABASE (V2): estas estructuras se reemplazarían por tablas
 * (profile, groups, group_members, splits, expenses, payments, threads,
 * categories, payment_methods). El parser de NL puede correr en cliente o server.
 */
import { PAREJA_LEDGER } from './seedPareja'

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

export function makeInitialState() {
  return {
    // ---- navegación ----
    screen: 'list', // list | chat | profile | archived | newgroup | methodDetail | monthDetail
    groupId: null,
    view: 'chat', // chat | ledger | months | hist
    menuOpen: false,
    configOpen: false,
    settleOpen: false,
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
    catFilter: null, // filtro de categoría en históricos / detalle de mes
    newGroup: { name: '', desc: '', members: [], memberName: '', invited: false },
    // config de grupo
    addingMember: false,
    newMemberName: '',
    // perfil / medios de pago
    profMethodEdit: null,
    profMethodName: '',
    addingProfMethod: false,
    newProfMethodName: '',

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
    archived: {},
    payments: { pareja: [], personal: [] },
    threads: {
      pareja: [
        { id: 't1', role: 'app', kind: 'text', text: 'Cargá un gasto escribiéndolo, ej: “8000 nafta pagó Juan”. El saldo inicial de Splitwise ya está cargado.' },
      ],
      personal: [
        { id: 'it1', role: 'app', kind: 'text', text: 'Anotá tus gastos personales. Ej: “3000 café”.' },
      ],
    },
    categories: [
      { id: 'salida', icon: '🍽️', name: 'Salida / Delivery' },
      { id: 'super', icon: '🛒', name: 'Supermercado' },
      { id: 'servicios', icon: '💡', name: 'Servicios' },
      { id: 'ocio', icon: '🎬', name: 'Ocio' },
      { id: 'transporte', icon: '🚕', name: 'Transporte' },
      { id: 'regalos', icon: '🎁', name: 'Regalos' },
      { id: 'alquiler', icon: '🏠', name: 'Alquiler' },
      { id: 'viaje', icon: '✈️', name: 'Viaje' },
      { id: 'salud', icon: '💊', name: 'Salud' },
      { id: 'otro', icon: '🏷️', name: 'Otro' },
      { id: 'inicial', icon: '⚖️', name: 'Saldo inicial' },
    ],
    groups: {
      pareja: {
        id: 'pareja', name: 'Juan', initial: 'J',
        gradient: 'linear-gradient(135deg,#3B82F6,#7C3AED)',
        description: 'Gastos compartidos con Juan.',
        createdAt: '1 abr 2026',
        members: [
          { id: 'dani', name: 'Dani (vos)', short: 'Dani', color: '#7C3AED', initial: 'D' },
          { id: 'juan', name: 'Juan', short: 'Juan', color: '#3B82F6', initial: 'J' },
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
      pareja: { dani: 60, juan: 40 }, // Dani 60% / Juan 40% (como en la planilla)
      personal: { dani: 100 },
    },
    ledgers: {
      pareja: PAREJA_LEDGER, // datos reales importados del CSV (ver src/cc/seedPareja)
      personal: [],
    },
  }
}
