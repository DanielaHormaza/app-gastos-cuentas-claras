/**
 * Helpers de fechas reales. Cada gasto guarda su fecha en ISO ('YYYY-MM-DD');
 * las etiquetas (Hoy/Ayer/Lun, 15/jun/26) se derivan al renderizar.
 */
const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const pad = (n) => ('0' + n).slice(-2)

const isoOf = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())

export function todayISO() {
  return isoOf(new Date())
}

// ISO de hace `days` días (para sembrar datos de ejemplo relativos a hoy).
export function isoFromOffset(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return isoOf(d)
}

export function nowTime() {
  const d = new Date()
  return pad(d.getHours()) + ':' + pad(d.getMinutes())
}

export function parseISO(s) {
  const [y, m, d] = (s || '').split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

// '15/jun/26'
export function fmtDateFull(iso) {
  const d = parseISO(iso)
  return d.getDate() + '/' + MES[d.getMonth()] + '/' + String(d.getFullYear()).slice(-2)
}

// 'YYYY-MM'
export function monthKeyOf(iso) {
  return (iso || '').slice(0, 7)
}

// Etiqueta relativa a hoy: Hoy / Ayer / Lun…Sáb (misma semana) / 15/jun/26.
export function dayLabel(iso) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = parseISO(iso)
  d.setHours(0, 0, 0, 0)
  const diff = Math.round((today - d) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  if (diff > 1 && diff < 7) return DOW[d.getDay()]
  return fmtDateFull(iso)
}
