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

// 'Dom 21/jun/26' — día de semana + fecha completa
export function fmtDateDow(iso) {
  return DOW[parseISO(iso).getDay()] + ' ' + fmtDateFull(iso)
}

// 'YYYY-MM'
export function monthKeyOf(iso) {
  return (iso || '').slice(0, 7)
}

const MESES = { enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5, julio: 6, agosto: 7, septiembre: 8, setiembre: 8, octubre: 9, noviembre: 10, diciembre: 11 }
export const NOMBRES_MES = Object.keys(MESES).join('|')

// Lee una fecha en lenguaje natural: "31 de mayo [de 2026]", "ayer", "hoy",
// "anteayer". Devuelve ISO o null si no encuentra.
export function parseSpanishDate(text) {
  const t = ' ' + (text || '').toLowerCase() + ' '
  if (/\banteayer\b/.test(t)) return isoFromOffset(2)
  if (/\bayer\b/.test(t)) return isoFromOffset(1)
  if (/\bhoy\b/.test(t)) return todayISO()
  const m = t.match(new RegExp('(\\d{1,2})\\s+de\\s+(' + NOMBRES_MES + ')(?:\\s+de\\s+(\\d{4}))?'))
  if (m) {
    const d = parseInt(m[1], 10)
    const mo = MESES[m[2]]
    const y = m[3] ? parseInt(m[3], 10) : new Date().getFullYear()
    if (d >= 1 && d <= 31) return y + '-' + pad(mo + 1) + '-' + pad(d)
  }
  return null
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
