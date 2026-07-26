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

// Categorías "del sistema": set base curado, siempre presente (se mergea al cargar). No se borran
// (para no romper gastos que las usan). Las custom que cree el usuario se suman a esta lista.
// 'inicial', 'transfer' y 'sincat' son especiales (saldo inicial, transferencias, sin categoría).
export const DEFAULT_CATEGORIES = [
  { id: 'salida', icon: '🍽️', name: 'Salida / Delivery' },
  { id: 'super', icon: '🛒', name: 'Supermercado' },
  { id: 'servicios', icon: '💡', name: 'Servicios / Facturas' },
  { id: 'suscripciones', icon: '📺', name: 'Suscripciones' },
  { id: 'ocio', icon: '🎬', name: 'Ocio' },
  { id: 'transporte', icon: '🚕', name: 'Transporte' },
  { id: 'hogar', icon: '🛋️', name: 'Hogar / Bazar' },
  { id: 'ropa', icon: '👕', name: 'Ropa' },
  { id: 'salud', icon: '💊', name: 'Salud' },
  { id: 'educacion', icon: '🎓', name: 'Educación' },
  { id: 'mascotas', icon: '🐾', name: 'Mascotas' },
  { id: 'belleza', icon: '💇', name: 'Belleza / Cuidado' },
  { id: 'impuestos', icon: '🧾', name: 'Impuestos / Trámites' },
  { id: 'regalos', icon: '🎁', name: 'Regalos' },
  { id: 'alquiler', icon: '🏠', name: 'Alquiler' },
  { id: 'viaje', icon: '✈️', name: 'Viaje' },
  { id: 'otro', icon: '🏷️', name: 'Otro' },
  { id: 'inicial', icon: '⚖️', name: 'Saldo inicial' },
  { id: 'transfer', icon: '🔁', name: 'Pagos y transferencias' },
  { id: 'sincat', icon: '🏷️', name: 'Sin categoría' },
]
// ¿Es una categoría del sistema (no borrable)? Las custom del usuario sí se pueden borrar/fusionar.
export const isSystemCategory = (id) => DEFAULT_CATEGORIES.some((c) => c.id === id)

export function makeInitialState() {
  return {
    // ---- identidad ----
    me: 'dani', // member_key del usuario logueado (se setea desde la sesión; 'dani' por defecto)
    // ---- navegación ----
    screen: 'list', // list | chat | profile | archived | newgroup | methodDetail | monthDetail | friend
    groupId: null,
    friendId: null, // persona abierta en la pantalla de perfil (screen: 'friend')
    homeTab: 'personas', // pestaña del inicio: personas | grupos
    addFriend: null, // hoja "Agregar persona": null | { name, email }
    inviteCopied: null, // id de la persona cuyo enlace de invitación se acaba de copiar (feedback transitorio)
    confirmUnpin: null, // gid pendiente de confirmación para desfijar del inicio
    view: 'chat', // chat | ledger | months | hist
    menuOpen: false,
    configOpen: false,
    settleOpen: false,
    // ---- edición de gasto ----
    editId: null,
    draft: null,
    editPanel: null, // null | cat | payer | method | split
    catQuery: '',
    newCatIcon: null, // icono elegido para la categoría que se está creando (null = autoguess)
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
    catFilter: [], // categorías seleccionadas en el filtro ([] = todas)
    curFilter: 'all', // filtro por moneda ('all' = todas | 'ARS' | 'USD' | 'CLP')
    payerFilter: 'all', // filtro por quién pagó ('all' = todos | id de miembro)
    moveQuery: '', // búsqueda por nombre de movimiento
    personalSrc: 'all', // filtro de origen en "Mis gastos": all | personal | <gid>
    hideAmounts: false, // "ocultar saldos": enmascara los montos (preferencia por dispositivo)
    newGroup: { name: '', desc: '', date: '', members: [], memberName: '', invited: false },
    // config de grupo
    addingMember: false,
    newMemberName: '',
    // perfil / medios de pago
    profMethodEdit: null,
    profMethodName: '',
    addingProfMethod: false,
    newProfMethodName: '',

    // ---- datos ----
    profile: { name: 'Dani', email: 'dani@cuentasclaras.app', gradient: 'linear-gradient(135deg,#7C3AED,#3B82F6)', founderNumber: 1, memberSince: '2026-06-01', currency: 'ARS' },
    methods: [
      { id: 'efectivo', name: 'Efectivo', icon: '💵' },
      { id: 'visa_macro', name: 'Visa Macro (débito)', icon: '💳' },
      { id: 'visa_santander', name: 'Visa Santander (crédito)', icon: '💳' },
      { id: 'mp', name: 'Mercado Pago', icon: '🟦' },
      { id: 'master_galicia', name: 'Mastercard Galicia', icon: '💳' },
      { id: 'transferencia', name: 'Transferencia', icon: '🏦' },
    ],
    archived: {},
    pinned: [], // hasta 2 grupos fijados en el inicio (gids)
    aliases: {}, // cómo VOS llamás a cada persona (member_key → alias), por dispositivo
    catMemory: {}, // memoria de categorización manual: descripción normalizada → categoryId (recuerda para el futuro)
    payments: { pareja: [], asado: [], personal: [] },
    threads: {
      pareja: [],
      asado: [],
      personal: [],
    },
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    groups: {
      pareja: {
        id: 'pareja', name: 'Pareja', initial: 'P',
        gradient: 'linear-gradient(135deg,#3B82F6,#7C3AED)',
        description: 'Gastos compartidos con Juan.',
        createdAt: '1 abr 2026',
        members: [
          { id: 'dani', name: 'Dani (vos)', short: 'Dani', color: '#7C3AED', initial: 'D' },
          { id: 'juan', name: 'Juan', short: 'Juan', color: '#3B82F6', initial: 'J' },
        ],
      },
      // Grupo de ejemplo (3+ personas) para la pestaña Grupos. Pato todavía no tiene cuenta:
      // queda como "Invitación pendiente" (member.pending) y se puede invitar por email.
      asado: {
        id: 'asado', name: 'Asado con amigos', initial: 'A',
        gradient: 'linear-gradient(135deg,#F59E0B,#EF4444)',
        description: 'Juntada del finde.',
        createdAt: '21 jun 2026',
        isGroup: true, // creado como grupo con nombre (no es un 1:1)
        eventDate: '2026-06-21', // fecha del evento (opcional)
        members: [
          { id: 'dani', name: 'Dani (vos)', short: 'Dani', color: '#7C3AED', initial: 'D' },
          { id: 'juan', name: 'Juan', short: 'Juan', color: '#3B82F6', initial: 'J' },
          { id: 'pato', name: 'Pato', short: 'Pato', color: '#F59E0B', initial: 'P', pending: true, email: 'pato@mail.com' },
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
      pareja: { dani: 60, juan: 40 }, // Dani 60% / Juan 40% (como en la planilla) — reparto ACTUAL
      asado: { dani: 33, juan: 33, pato: 34 },
      personal: { dani: 100 },
    },
    // Regímenes de reparto PASADOS por grupo: { until, shares }. Aplican a gastos con fecha < until.
    // Se llenan al cambiar el % (rige "desde hoy"); vacío = el % actual aplicó siempre.
    splitLog: { pareja: [], asado: [], personal: [] },
    // Metadatos del reparto actual por grupo: desde cuándo rige + última edición.
    splitMeta: { pareja: { from: '2000-01-01', at: null, by: null }, asado: { from: '2000-01-01', at: null, by: null }, personal: { from: '2000-01-01', at: null, by: null } },
    ledgers: {
      pareja: PAREJA_LEDGER, // datos reales importados del CSV (ver src/cc/seedPareja)
      asado: [
        { id: 'as1', date: '2026-06-21', currency: 'ARS', categoryId: 'super', desc: 'carne y achuras', amount: 42000, payerId: 'dani', mode: 'group' },
        { id: 'as2', date: '2026-06-21', currency: 'ARS', categoryId: 'salida', desc: 'bebidas', amount: 18000, payerId: 'pato', mode: 'group' },
        { id: 'as3', date: '2026-06-21', currency: 'ARS', categoryId: 'super', desc: 'carbón y hielo', amount: 9000, payerId: 'juan', mode: 'group' },
        { id: 'as4', date: '2026-06-21', currency: 'ARS', categoryId: 'ocio', desc: 'alquiler parrilla', amount: 30000, payerId: 'juan', mode: 'group' },
      ],
      personal: [],
    },
  }
}
