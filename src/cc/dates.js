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

// Mes suelto SIN día ("agosto", "en agosto", "fecha de agosto") → primer día de ese mes.
// Si el mes ya pasó este año, rueda al año siguiente. Devuelve ISO o null si no hay mes.
// Se usa como fallback para el arranque de cuotas cuando no se dio una fecha con día.
export function parseBareMonth(text) {
  const t = ' ' + (text || '').toLowerCase() + ' '
  const m = t.match(new RegExp('\\b(' + NOMBRES_MES + ')\\b'))
  if (!m) return null
  const mo = MESES[m[1]]
  const now = new Date()
  const y = mo < now.getMonth() ? now.getFullYear() + 1 : now.getFullYear()
  return y + '-' + pad(mo + 1) + '-01'
}

// Convierte un nombre de mes (+ día opcional) a ISO, eligiendo el año más cercano hacia adelante
// (si el mes ya pasó este año, rueda al que viene). Día por defecto = 1. null si el mes no es válido.
// Lo usa el camino de IA: la IA devuelve mes+día y el cliente arma la fecha (evita que el LLM
// se equivoque con la aritmética de años).
export function monthToISO(monthName, day) {
  const mo = MESES[String(monthName || '').toLowerCase()]
  if (mo == null) return null
  const now = new Date()
  const y = mo < now.getMonth() ? now.getFullYear() + 1 : now.getFullYear()
  const d = day && day >= 1 && day <= 31 ? day : 1
  return y + '-' + pad(mo + 1) + '-' + pad(d)
}

// Resuelve un cronograma de cuotas [{month, day?, amount}] a [{date ISO, amount}], con roll-over de
// año: el 1er mes toma el año más cercano hacia adelante; si un mes es <= al anterior, sube un año
// (para planes que cruzan diciembre→enero). Ignora items con mes inválido.
export function resolveSchedule(items) {
  const now = new Date()
  let year = null
  let prevIdx = null
  const out = []
  for (const it of items || []) {
    const idx = MESES[String(it.month || '').toLowerCase()]
    if (idx == null) continue
    if (year === null) year = idx < now.getMonth() ? now.getFullYear() + 1 : now.getFullYear()
    else if (prevIdx !== null && idx <= prevIdx) year++
    prevIdx = idx
    const d = it.day && it.day >= 1 && it.day <= 31 ? it.day : 1
    out.push({ date: year + '-' + pad(idx + 1) + '-' + pad(d), amount: it.amount })
  }
  return out
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
