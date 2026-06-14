import { useState, useEffect } from 'react'
import {
  gastosIniciales,
  USUARIOS,
  mediosDePago as MEDIOS_DEFAULT,
  grupos as GRUPOS_DEFAULT,
  HOY,
} from './data/mockData'
import { MEP_ACTUAL, MEP_ACTUALIZADO, formatARS, MONEDAS_VISTA } from './utils/calculations'
import { CurrencyProvider } from './context/currency'
import { CatalogProvider } from './context/catalog'
import BottomNav from './components/BottomNav'
import Sidebar from './components/Sidebar'
import { SunIcon, MoonIcon } from './components/icons'
import { LogoMark } from './components/Logo'
import PersonalDashboard from './views/PersonalDashboard'
import GroupsListView from './views/GroupsListView'
import GroupDashboard from './views/GroupDashboard'
import CardsView from './views/CardsView'
import SavingsView from './views/SavingsView'
import QuickAddView from './views/QuickAddView'
import CatalogView from './views/CatalogView'
import FutureView from './views/FutureView'

const TITULOS = {
  personal: 'Mi espacio',
  grupo: 'Mis grupos',
  cargar: 'Carga rápida',
  futuro: 'Gastos futuros',
  tarjetas: 'Tarjetas',
  ahorros: 'Ahorros',
  catalogo: 'Categorías',
}

// Clave de persistencia local. Subir la versión si cambia la forma de los datos.
const STORAGE_KEY = 'gestion-gastos:v8'
const CATALOGO_KEY = 'gestion-gastos:catalogo:v1'
const MEDIOS_KEY = 'gestion-gastos:medios:v1'
const GRUPOS_KEY = 'gestion-gastos:grupos:v1'

// Catálogo inicial de categorías (las etiquetas arrancan vacías y se van creando).
const CATALOGO_DEFAULT = {
  categorias: [
    'Alquiler', 'Expensas', 'Servicios', 'Hogar', 'Comida', 'Transporte',
    'Salud', 'Salidas', 'Viajes', 'Indumentaria', 'Tecnología',
    'Cuidado personal', 'Educación', 'Sin categoría',
  ],
  etiquetas: [],
}

export default function App() {
  // Gastos en memoria, persistidos en localStorage.
  // BACKEND / SUPABASE: reemplazar por fetch a la tabla `expenses` (+ INSERT al cargar).
  const [gastos, setGastos] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw)
    } catch {
      /* dato corrupto: se ignora y se usan los iniciales */
    }
    return gastosIniciales
  })
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gastos))
  }, [gastos])

  const [vista, setVista] = useState('personal')
  // Wrapper para que cambiar de sección resetee la navegación interna de grupos
  // (sino al volver a "Mis grupos" vuelve directo al detalle anterior).
  const cambiarVista = (v) => {
    if (v !== 'grupo') setSelectedGroupId(null)
    setVista(v)
  }

  // Usuario activo (login simulado).
  const [currentUser, setCurrentUser] = useState('Dani')

  // Moneda de visualización global (ARS / USD), persistida.
  const [moneda, setMoneda] = useState(() =>
    localStorage.getItem('moneda') === 'USD' ? 'USD' : 'ARS',
  )
  useEffect(() => {
    localStorage.setItem('moneda', moneda)
  }, [moneda])

  // Catálogo de categorías/etiquetas creadas (pueden existir sin gastos aún).
  const [catExtra, setCatExtra] = useState(() => {
    try {
      const raw = localStorage.getItem(CATALOGO_KEY)
      if (raw) return JSON.parse(raw)
    } catch {
      /* ignorar */
    }
    return CATALOGO_DEFAULT
  })
  useEffect(() => {
    localStorage.setItem(CATALOGO_KEY, JSON.stringify(catExtra))
  }, [catExtra])

  // Medios de pago editables. Arrancan con los del mock y se pueden agregar /
  // editar / eliminar desde la vista Tarjetas.
  const [medios, setMedios] = useState(() => {
    try {
      const raw = localStorage.getItem(MEDIOS_KEY)
      if (raw) return JSON.parse(raw)
    } catch {
      /* ignorar */
    }
    return MEDIOS_DEFAULT
  })
  useEffect(() => {
    localStorage.setItem(MEDIOS_KEY, JSON.stringify(medios))
  }, [medios])

  // Grupos editables (crear / archivar / eliminar / restaurar). Lista en la
  // vista Grupos; el detalle vive en `selectedGroupId`.
  const [grupos, setGrupos] = useState(() => {
    try {
      const raw = localStorage.getItem(GRUPOS_KEY)
      if (raw) return JSON.parse(raw)
    } catch {
      /* ignorar */
    }
    return GRUPOS_DEFAULT
  })
  useEffect(() => {
    localStorage.setItem(GRUPOS_KEY, JSON.stringify(grupos))
  }, [grupos])
  const [selectedGroupId, setSelectedGroupId] = useState(null)

  // Tema, persistido en localStorage.
  const [dark, setDark] = useState(() => localStorage.getItem('tema') === 'oscuro')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('tema', dark ? 'oscuro' : 'claro')
  }, [dark])

  // Acepta un movimiento o un array (ej. "saldar todo" registra varios pagos).
  const agregarGasto = (draft) => {
    const lista = Array.isArray(draft) ? draft : [draft]
    const base = Date.now()
    setGastos((prev) => [...lista.map((d, i) => ({ id: base + i, ...d })), ...prev])
  }
  // Editar un gasto. Si es parte de una compra en cuotas, el cambio (categoría,
  // etiquetas, medio de pago) se aplica a todas las cuotas de esa compra.
  const actualizarGasto = (id, cambios) =>
    setGastos((prev) => {
      const objetivo = prev.find((g) => g.id === id)
      const compraId = objetivo && objetivo.compraId
      return prev.map((g) =>
        g.id === id || (compraId && g.compraId === compraId) ? { ...g, ...cambios } : g,
      )
    })
  const reiniciar = () => setGastos(gastosIniciales)

  // --- Gestión del catálogo (sección Categorías) ---
  const agregarCategoria = (c) =>
    setCatExtra((p) => (p.categorias.includes(c) ? p : { ...p, categorias: [...p.categorias, c] }))
  const agregarEtiqueta = (t) =>
    setCatExtra((p) => (p.etiquetas.includes(t) ? p : { ...p, etiquetas: [...p.etiquetas, t] }))
  // Eliminar una categoría también reasigna los gastos que la usaban a
  // "Sin categoría", para que efectivamente desaparezca del catálogo derivado.
  const eliminarCategoria = (c) => {
    if (c === 'Sin categoría') return
    setGastos((prev) =>
      prev.map((g) => (g.category === c ? { ...g, category: 'Sin categoría' } : g)),
    )
    setCatExtra((p) => ({ ...p, categorias: p.categorias.filter((x) => x !== c) }))
  }
  const eliminarEtiqueta = (t) => {
    setCatExtra((p) => ({ ...p, etiquetas: p.etiquetas.filter((x) => x !== t) }))
    setGastos((prev) =>
      prev.map((g) =>
        g.tags?.includes(t) ? { ...g, tags: g.tags.filter((x) => x !== t) } : g,
      ),
    )
  }
  const renombrarCategoria = (vieja, nueva) => {
    setGastos((prev) => prev.map((g) => (g.category === vieja ? { ...g, category: nueva } : g)))
    setCatExtra((p) => ({ ...p, categorias: p.categorias.map((x) => (x === vieja ? nueva : x)) }))
  }
  const renombrarEtiqueta = (vieja, nueva) => {
    setGastos((prev) =>
      prev.map((g) =>
        g.tags?.includes(vieja)
          ? { ...g, tags: g.tags.map((t) => (t === vieja ? nueva : t)) }
          : g,
      ),
    )
    setCatExtra((p) => ({ ...p, etiquetas: p.etiquetas.map((x) => (x === vieja ? nueva : x)) }))
  }

  // --- Gestión de medios de pago (sección Tarjetas) ---
  const agregarMedio = (medio) => {
    const id = `medio-${Date.now()}`
    setMedios((prev) => [...prev, { ...medio, id }])
  }
  const actualizarMedio = (id, cambios) =>
    setMedios((prev) => prev.map((m) => (m.id === id ? { ...m, ...cambios } : m)))
  // Al borrar un medio, los gastos que lo referencian quedan "sin medio" (la
  // UI muestra esa fallback sola); no se borran los gastos.
  const eliminarMedio = (id) => setMedios((prev) => prev.filter((m) => m.id !== id))

  // --- Gestión de grupos (sección Grupos) ---
  const agregarGrupo = ({ nombre, miembros }) => {
    const id = `grupo-${Date.now()}`
    // División equitativa por defecto; se puede personalizar luego.
    const frac = miembros.length > 0 ? 1 / miembros.length : 0
    const acuerdo = Object.fromEntries(miembros.map((m) => [m, frac]))
    const acuerdoLabel =
      miembros.length === 2 ? '50/50' : miembros.length > 0 ? `1/${miembros.length} c/u` : '—'
    setGrupos((prev) => [
      ...prev,
      {
        id,
        nombre,
        miembros,
        acuerdo,
        acuerdoLabel,
        createdAt: HOY,
        archived: false,
      },
    ])
  }
  const archivarGrupo = (id) =>
    setGrupos((prev) => prev.map((g) => (g.id === id ? { ...g, archived: true } : g)))
  const restaurarGrupo = (id) =>
    setGrupos((prev) => prev.map((g) => (g.id === id ? { ...g, archived: false } : g)))
  const actualizarGrupo = (id, cambios) =>
    setGrupos((prev) => prev.map((g) => (g.id === id ? { ...g, ...cambios } : g)))
  // Eliminar un grupo borra también sus gastos compartidos y pagos de saldo.
  // La UI se encarga de pedir confirmación con la advertencia correspondiente.
  const eliminarGrupo = (id) => {
    setGastos((prev) => prev.filter((g) => g.groupId !== id))
    setGrupos((prev) => prev.filter((g) => g.id !== id))
    if (selectedGroupId === id) setSelectedGroupId(null)
  }

  // Catálogo completo = lo creado + lo que ya usan los gastos.
  const categorias = [
    ...new Set([
      ...catExtra.categorias,
      ...gastos.filter((g) => g.type !== 'settlement').map((g) => g.category),
    ]),
  ].sort()
  const etiquetas = [
    ...new Set([...catExtra.etiquetas, ...gastos.flatMap((g) => g.tags || [])]),
  ].sort()

  return (
    <CurrencyProvider value={moneda}>
     <CatalogProvider value={{ categorias, etiquetas, medios, grupos }}>
      <div className="flex min-h-full bg-slate-50 dark:bg-slate-900">
        <Sidebar vista={vista} onVista={cambiarVista} />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
            <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-2 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <LogoMark size={30} className="shrink-0 text-slate-900 dark:text-white" />
                <div className="min-w-0">
                  <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                    Dólar MEP{' '}
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatARS(MEP_ACTUAL)}
                    </span>{' '}
                    · act. {MEP_ACTUALIZADO}
                  </p>
                  <h1 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    {TITULOS[vista]}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Moneda de visualización */}
                <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
                  {MONEDAS_VISTA.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMoneda(m)}
                      className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
                        moneda === m
                          ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {/* Selector de usuario (login simulado) */}
                <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
                  {USUARIOS.map((u) => (
                    <button
                      key={u}
                      onClick={() => setCurrentUser(u)}
                      className={`rounded-md px-2 py-1 text-xs font-medium transition ${
                        currentUser === u
                          ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setDark((d) => !d)}
                  aria-label="Cambiar tema"
                  className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  {dark ? <SunIcon width={18} height={18} /> : <MoonIcon width={18} height={18} />}
                </button>
              </div>
            </div>
          </header>

          {/* Contenido */}
          <main className="mx-auto w-full max-w-4xl px-4 py-4 pb-24 md:pb-10">
            {vista === 'personal' && (
              <PersonalDashboard
                key={currentUser}
                gastos={gastos}
                currentUser={currentUser}
                onUpdateGasto={actualizarGasto}
              />
            )}
            {vista === 'grupo' && !selectedGroupId && (
              <GroupsListView
                key={currentUser}
                gastos={gastos}
                currentUser={currentUser}
                onOpen={setSelectedGroupId}
                onAgregarGrupo={agregarGrupo}
                onActualizarGrupo={actualizarGrupo}
                onArchivarGrupo={archivarGrupo}
                onRestaurarGrupo={restaurarGrupo}
                onEliminarGrupo={eliminarGrupo}
              />
            )}
            {vista === 'grupo' && selectedGroupId && (
              <GroupDashboard
                key={`${currentUser}-${selectedGroupId}`}
                grupoId={selectedGroupId}
                gastos={gastos}
                currentUser={currentUser}
                onBack={() => setSelectedGroupId(null)}
                onAddMovimiento={agregarGasto}
                onUpdateGasto={actualizarGasto}
              />
            )}
            {vista === 'cargar' && (
              <QuickAddView
                key={currentUser}
                gastos={gastos}
                onAddGasto={agregarGasto}
                onReset={reiniciar}
                currentUser={currentUser}
              />
            )}
            {vista === 'futuro' && (
              <FutureView
                gastos={gastos}
                currentUser={currentUser}
                onUpdateGasto={actualizarGasto}
              />
            )}
            {vista === 'tarjetas' && (
              <CardsView
                gastos={gastos}
                currentUser={currentUser}
                onAgregarMedio={agregarMedio}
                onActualizarMedio={actualizarMedio}
                onEliminarMedio={eliminarMedio}
              />
            )}
            {vista === 'ahorros' && <SavingsView currentUser={currentUser} />}
            {vista === 'catalogo' && (
              <CatalogView
                gastos={gastos}
                categorias={categorias}
                etiquetas={etiquetas}
                onAgregarCategoria={agregarCategoria}
                onAgregarEtiqueta={agregarEtiqueta}
                onEliminarCategoria={eliminarCategoria}
                onEliminarEtiqueta={eliminarEtiqueta}
                onRenombrarCategoria={renombrarCategoria}
                onRenombrarEtiqueta={renombrarEtiqueta}
                onUpdateGasto={actualizarGasto}
              />
            )}
          </main>
        </div>

        <BottomNav vista={vista} onVista={cambiarVista} />
      </div>
     </CatalogProvider>
    </CurrencyProvider>
  )
}
