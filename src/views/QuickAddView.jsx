import { useState } from 'react'
import {
  formatARS,
  formatMonto,
  valorEn,
  mesDe,
  etiquetaMes,
  MONEDAS,
} from '../utils/calculations'
import { HOY } from '../data/mockData'
import { useCatalog } from '../context/catalog'
import { Card, SectionTitle } from '../components/ui'
import MedioSelect from '../components/MedioSelect'

/**
 * Parser simple que simula la carga por WhatsApp.
 *
 * WHATSAPP API: en producción el texto llegaría desde un webhook de WhatsApp.
 *  - Mensajes de un GRUPO de WhatsApp     => gasto compartido de ese grupo.
 *  - Mensajes del CHAT INDIVIDUAL de c/u  => gasto individual de quien escribe.
 */

// Categoría sugerida a partir de palabras clave del mensaje.
const CATEGORIA_KEYWORDS = [
  [/super|mercado|verdul|carnicer|comida|almac[eé]n/, 'Comida'],
  [/nafta|combustible|transporte|uber|taxi|colectivo|sube|peaje|estacion/, 'Transporte'],
  [/farmacia|m[eé]dic|salud|gimnasio|\bgym\b/, 'Salud'],
  [/cena|almuerzo|caf[eé]|bar|resto|restaurant|salida|trago/, 'Salidas'],
  [/hotel|vuelo|hostel|viaje|pasaje|airbnb/, 'Viajes'],
  [/alquiler/, 'Alquiler'],
  [/expensas/, 'Expensas'],
  [/luz|gas|agua|internet|servicio|wifi/, 'Servicios'],
  [/ropa|indument|zapat|remera|pantal/, 'Indumentaria'],
  [/notebook|tecno|celular|streaming|suscrip|netflix|spotify/, 'Tecnología'],
  [/barber|peluquer|cuidado/, 'Cuidado personal'],
  [/curso|educac|libro|capacita/, 'Educación'],
]
function sugerirCategoria(texto) {
  for (const [re, cat] of CATEGORIA_KEYWORDS) if (re.test(texto)) return cat
  return 'Sin categoría'
}

/**
 * Busca en el historial gastos con descripción parecida (mismo primer token
 * o que arranquen con él) y devuelve la sugerencia más reciente. Sirve para
 * que la segunda vez que cargás "Carrefour 48k" te llene solo la categoría,
 * etiquetas y medio de pago como la vez anterior.
 */
function sugerirDelHistorial(primera, historial) {
  if (!primera || !historial?.length) return null
  const matches = historial
    .filter((g) => {
      if (g.type === 'settlement') return false
      const d = (g.description || '').toLowerCase()
      return d === primera || d.startsWith(primera + ' ') || d.startsWith(primera + '(')
    })
    .sort((a, b) => b.date.localeCompare(a.date))
  if (matches.length === 0) return null
  const m = matches[0]
  return {
    category: m.category,
    tags: m.tags ? [...m.tags] : [],
    paymentMethod: m.paymentMethod,
    coincidencias: matches.length,
  }
}

/** Suma n meses a una fecha 'YYYY-MM-DD'. */
function sumarMeses(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1 + n, d)
  return dt.toISOString().slice(0, 10)
}

/** Devuelve N meses consecutivos desde el mes de `desdeISO` (incluido). */
function proximosMeses(desdeISO, n) {
  let [y, m] = desdeISO.split('-').map(Number)
  return Array.from({ length: n }, () => {
    const tag = `${y}-${String(m).padStart(2, '0')}`
    m++
    if (m > 12) {
      m = 1
      y++
    }
    return tag
  })
}

function parseMensaje(texto, canal, currentUser, grupo, medios, historial) {
  const t = texto.toLowerCase().trim()
  if (!t) return null

  const matchMonto = t.match(/(\d+(?:[.,]\d+)?)\s*(k|usd|clp)?/i)
  if (!matchMonto) return null
  let amount = parseFloat(matchMonto[1].replace(',', '.'))
  const unidad = matchMonto[2]
  if (unidad === 'k') amount *= 1000
  const currency = unidad === 'usd' ? 'USD' : unidad === 'clp' ? 'CLP' : 'ARS'

  // Cuotas: "6 cuotas" / "en 12 cuotas".
  const matchCuotas = t.match(/(\d+)\s*cuotas?/)
  const cuotas = matchCuotas ? Number(matchCuotas[1]) : 1

  let type = canal === 'individual' ? 'individual' : 'shared'
  if (/individual|personal|invert/.test(t)) type = 'individual'

  const medio = medios.find((m) => t.includes(m.nombre.toLowerCase()))
  const primera = t.split(/\s+/)[0]
  const description = primera.charAt(0).toUpperCase() + primera.slice(1)

  // Si ya cargaste algo parecido antes, copiá categoría / etiquetas / medio.
  // Las palabras clave del texto siguen como fallback si no hay match.
  const sugerencia = sugerirDelHistorial(primera, historial)

  const draft = {
    type,
    date: HOY,
    description,
    category: sugerencia?.category || sugerirCategoria(t),
    tags: sugerencia?.tags || [],
    amount,
    currency,
    cuotas,
    rates: { USD: MONEDAS.USD.arsPorUnidad, CLP: MONEDAS.CLP.arsPorUnidad },
    _sugerencia: sugerencia ? { coincidencias: sugerencia.coincidencias } : null,
  }

  if (type === 'individual') {
    draft.owner = currentUser
    draft.paidBy = currentUser
    draft.paymentMethod =
      (medio && medio.id) ||
      sugerencia?.paymentMethod ||
      medios.find((m) => m.titular === currentUser)?.id ||
      medios[0]?.id
    return draft
  }

  // --- Gasto compartido de un grupo ---
  let paidBy = currentUser
  for (const m of grupo.miembros) {
    if (new RegExp(`pag[óo]\\s+${m.toLowerCase()}`).test(t)) paidBy = m
  }

  let split = { ...grupo.acuerdo }
  let splitLabel = grupo.acuerdoLabel
  if (/50\/50|mitad/.test(t)) {
    splitLabel = '50/50'
    split = {}
    grupo.miembros.forEach((m) => { split[m] = 1 / grupo.miembros.length })
  } else {
    for (const m of grupo.miembros) {
      if (t.includes(`para ${m.toLowerCase()}`)) {
        splitLabel = `100% ${m}`
        split = {}
        grupo.miembros.forEach((x) => { split[x] = x === m ? 1 : 0 })
      }
    }
  }

  draft.groupId = grupo.id
  draft.paidBy = paidBy
  draft.paymentMethod =
    (medio && medio.id) ||
    sugerencia?.paymentMethod ||
    medios.find((m) => m.titular === paidBy)?.id ||
    medios.find((m) => m.titular === 'Ambos')?.id ||
    medios[0]?.id
  draft.split = split
  draft.splitLabel = splitLabel
  return draft
}

const EJEMPLOS = {
  grupo: ['Super 48k', 'Cena 32k mitad pagó Juan', 'Heladera 480k 6 cuotas'],
  individual: ['Ropa 25k', 'Notebook 120k 12 cuotas', 'Hostel 90000 clp'],
}

const OPCIONES_CUOTAS = [1, 2, 3, 6, 9, 12, 18]

const SELECT_CLS =
  'rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'

/** Vista Carga rápida: simula cargar un gasto por WhatsApp, con medio y cuotas. */
export default function QuickAddView({ gastos, onAddGasto, onReset, currentUser }) {
  const { medios, grupos } = useCatalog()
  const misGrupos = grupos.filter(
    (g) => !g.archived && g.miembros.includes(currentUser),
  )
  const [canal, setCanal] = useState(misGrupos.length > 0 ? 'grupo' : 'individual')
  const [grupoId, setGrupoId] = useState(misGrupos[0]?.id || null)
  const [texto, setTexto] = useState('')
  const [draft, setDraft] = useState(null)
  const medioPorDefecto =
    medios.find((m) => m.titular === 'Ambos')?.id || medios[0]?.id || ''
  const [medioElegido, setMedioElegido] = useState(medioPorDefecto)
  const [cuotas, setCuotas] = useState(1)
  // Mes en el que cae la primera cuota (YYYY-MM). Por defecto el mes actual,
  // pero se puede empujar a futuro porque en crédito normalmente arranca el
  // ciclo siguiente al cierre.
  const [primeraCuotaMes, setPrimeraCuotaMes] = useState(mesDe(HOY))
  const [confirmado, setConfirmado] = useState(null)

  const grupo = misGrupos.find((g) => g.id === grupoId) || misGrupos[0]

  const interpretar = (valor) => {
    const d = parseMensaje(valor ?? texto, canal, currentUser, grupo, medios, gastos)
    setDraft(d)
    if (d) {
      setMedioElegido(d.paymentMethod)
      setCuotas(d.cuotas || 1)
      setPrimeraCuotaMes(mesDe(HOY))
    }
    setConfirmado(null)
  }

  const confirmar = () => {
    if (!draft) return
    const base = { ...draft, paymentMethod: medioElegido }
    delete base.cuotas
    delete base._sugerencia
    if (cuotas > 1) {
      // Tarjeta de crédito: una cuota por mes, arrancando en el mes elegido.
      // Conservamos el día de HOY (clampeado a 28 para evitar fechas inválidas
      // en meses cortos como febrero).
      const compraId = `compra-${Date.now()}`
      const montoCuota = base.amount / cuotas
      const dia = Math.min(28, Number(HOY.slice(8, 10)))
      const primeraFecha = `${primeraCuotaMes}-${String(dia).padStart(2, '0')}`
      const movs = Array.from({ length: cuotas }, (_, i) => {
        const date = sumarMeses(primeraFecha, i)
        const cuota = {
          ...base,
          amount: montoCuota,
          date,
          description: `${base.description} (cuota ${i + 1}/${cuotas})`,
          compraId,
        }
        // Para cuotas que aún no vencieron en USD/CLP, no congelamos el cambio:
        // el valor se calcula con el MEP actual hasta que la fecha realmente
        // llegue (más realista que asumir el cambio de hoy para todas).
        if (date > HOY) delete cuota.rates
        return cuota
      })
      onAddGasto(movs)
    } else {
      // Un gasto único fechado a futuro: misma lógica.
      if (base.date > HOY) delete base.rates
      onAddGasto(base)
    }
    setConfirmado({ ...base, cuotas })
    setDraft(null)
    setTexto('')
  }

  const cambiarCanal = (c) => {
    setCanal(c)
    setDraft(null)
    setConfirmado(null)
  }

  const montoCuota = draft && cuotas > 1 ? draft.amount / cuotas : 0

  return (
    <div className="mx-auto max-w-xl space-y-3">
      <div>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Carga rápida</h2>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Simula la carga por WhatsApp. Elegí desde qué chat llega el mensaje.
        </p>
      </div>

      {/* Canal: grupo vs chat individual */}
      <div className="flex gap-2">
        <button
          onClick={() => cambiarCanal('grupo')}
          className={`flex-1 rounded-xl px-3 py-2.5 text-left ring-1 transition ${
            canal === 'grupo'
              ? 'bg-teal-50 ring-teal-300 dark:bg-teal-500/15 dark:ring-teal-500/40'
              : 'bg-white ring-slate-200 dark:bg-slate-800 dark:ring-slate-700'
          }`}
        >
          <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            Grupo de WhatsApp
          </span>
          <span className="block text-[11px] text-slate-400 dark:text-slate-500">
            → gasto compartido
          </span>
        </button>
        <button
          onClick={() => cambiarCanal('individual')}
          className={`flex-1 rounded-xl px-3 py-2.5 text-left ring-1 transition ${
            canal === 'individual'
              ? 'bg-indigo-50 ring-indigo-300 dark:bg-indigo-500/15 dark:ring-indigo-500/40'
              : 'bg-white ring-slate-200 dark:bg-slate-800 dark:ring-slate-700'
          }`}
        >
          <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
            Chat de {currentUser}
          </span>
          <span className="block text-[11px] text-slate-400 dark:text-slate-500">
            → gasto individual
          </span>
        </button>
      </div>

      {canal === 'grupo' && (
        <div className="flex flex-wrap gap-2">
          {misGrupos.map((g) => (
            <button
              key={g.id}
              onClick={() => { setGrupoId(g.id); setDraft(null) }}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition ${
                g.id === grupo.id
                  ? 'bg-teal-500 text-white ring-teal-500'
                  : 'bg-white text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700'
              }`}
            >
              {g.nombre}
            </button>
          ))}
        </div>
      )}

      <Card>
        <div className="flex gap-2">
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && interpretar()}
            placeholder='Ej: "Heladera 480k 6 cuotas"'
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          />
          <button
            onClick={() => interpretar()}
            className="shrink-0 rounded-xl bg-indigo-500 px-3 py-2.5 text-sm font-medium text-white hover:bg-indigo-600"
          >
            Leer
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {EJEMPLOS[canal].map((ej) => (
            <button
              key={ej}
              onClick={() => { setTexto(ej); interpretar(ej) }}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
            >
              {ej}
            </button>
          ))}
        </div>

        {draft && (
          <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 dark:border-indigo-500/30 dark:bg-indigo-500/10">
            <SectionTitle title="Así lo interpretamos" />
            {draft._sugerencia && (
              <p className="mb-2 rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                ✨ Encontré {draft._sugerencia.coincidencias} gasto
                {draft._sugerencia.coincidencias === 1 ? '' : 's'} anterior
                {draft._sugerencia.coincidencias === 1 ? '' : 'es'} con esta descripción. Te
                propongo la misma categoría, etiquetas y medio de pago.
              </p>
            )}
            <div className="grid grid-cols-2 items-center gap-x-3 gap-y-1.5 text-sm text-slate-700 dark:text-slate-200">
              <span className="text-slate-400 dark:text-slate-500">Descripción</span>
              <span className="font-medium">{draft.description}</span>
              <span className="text-slate-400 dark:text-slate-500">Categoría sugerida</span>
              <span className="font-medium">{draft.category}</span>
              {draft.tags?.length > 0 && (
                <>
                  <span className="text-slate-400 dark:text-slate-500">Etiquetas</span>
                  <span className="flex flex-wrap gap-1">
                    {draft.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
                      >
                        {t}
                      </span>
                    ))}
                  </span>
                </>
              )}
              <span className="text-slate-400 dark:text-slate-500">Monto</span>
              <span className="font-medium">
                {formatMonto(draft.amount, draft.currency)}
                {draft.currency === 'USD' && ` ≈ ${formatARS(valorEn(draft, 'ARS'))}`}
                {draft.currency === 'CLP' &&
                  ` ≈ ${formatMonto(valorEn(draft, 'USD'), 'USD')} · ${formatARS(valorEn(draft, 'ARS'))}`}
              </span>
              <span className="text-slate-400 dark:text-slate-500">Cambio del día</span>
              <span className="font-medium">
                {draft.currency === 'CLP'
                  ? `1 US$ = CLP$${Math.round(draft.rates.USD / draft.rates.CLP)}`
                  : `1 US$ = ${formatARS(draft.rates.USD)}`}
              </span>
              <span className="text-slate-400 dark:text-slate-500">Tipo</span>
              <span className="font-medium">
                {draft.type === 'shared' ? `Compartido · ${grupo.nombre}` : 'Individual'}
              </span>
              <span className="text-slate-400 dark:text-slate-500">Pagó</span>
              <span className="font-medium">
                {draft.paidBy}
                {draft.type === 'shared' ? ` · ${draft.splitLabel}` : ''}
              </span>
              {/* Editable: medio de pago */}
              <span className="text-slate-400 dark:text-slate-500">Medio de pago</span>
              <MedioSelect value={medioElegido} onChange={setMedioElegido} variant="campo" />
              {/* Editable: cuotas */}
              <span className="text-slate-400 dark:text-slate-500">Cuotas</span>
              <select
                value={cuotas}
                onChange={(e) => setCuotas(Number(e.target.value))}
                className={SELECT_CLS}
              >
                {OPCIONES_CUOTAS.map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? '1 pago' : `${n} cuotas`}
                  </option>
                ))}
              </select>
              {cuotas > 1 && (
                <>
                  <span className="text-slate-400 dark:text-slate-500">Primera cuota</span>
                  <select
                    value={primeraCuotaMes}
                    onChange={(e) => setPrimeraCuotaMes(e.target.value)}
                    className={SELECT_CLS}
                  >
                    {proximosMeses(mesDe(HOY), 12).map((m) => (
                      <option key={m} value={m}>
                        {etiquetaMes(m)}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>

            {cuotas > 1 && (
              <p className="mt-2 rounded-lg bg-white/70 px-2 py-1.5 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
                Se cargan <strong>{cuotas} pagos</strong> de{' '}
                {formatMonto(montoCuota, draft.currency)}, uno por mes desde{' '}
                <strong>{etiquetaMes(primeraCuotaMes)}</strong> hasta{' '}
                <strong>
                  {etiquetaMes(proximosMeses(primeraCuotaMes, cuotas)[cuotas - 1])}
                </strong>
                .
              </p>
            )}

            <div className="mt-3 flex gap-2">
              <button
                onClick={confirmar}
                className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-600"
              >
                Confirmar
              </button>
              <button
                onClick={() => setDraft(null)}
                className="rounded-lg bg-white px-3 py-1.5 text-sm text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600"
              >
                Descartar
              </button>
            </div>
          </div>
        )}

        {confirmado && (
          <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50/70 p-3 text-sm text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-300">
            {confirmado.cuotas > 1 ? (
              <>
                Cargado: <strong>{confirmado.description}</strong> en {confirmado.cuotas} cuotas
                (una por mes).
              </>
            ) : (
              <>
                Gasto agregado: <strong>{confirmado.description}</strong> por{' '}
                {formatMonto(confirmado.amount, confirmado.currency)}.
              </>
            )}
          </div>
        )}
      </Card>

      <button
        onClick={onReset}
        className="w-full rounded-xl border border-slate-200 py-2 text-xs text-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        Restablecer datos de ejemplo
      </button>
    </div>
  )
}
