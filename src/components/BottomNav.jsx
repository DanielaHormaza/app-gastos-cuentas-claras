import { NAV_ITEMS } from './navItems'

/** Navegación inferior, estilo app móvil. Solo visible en pantallas chicas. */
export default function BottomNav({ vista, onVista }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden dark:border-slate-700 dark:bg-slate-800/95">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-1.5">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const activo = vista === id
          const center = id === 'cargar'
          if (center) {
            return (
              <button
                key={id}
                onClick={() => onVista(id)}
                className="-mt-6 flex flex-col items-center gap-1"
                aria-label={label}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#2ECCB1] via-[#3B82F6] to-[#7C3AED] text-white shadow-lg shadow-violet-500/30">
                  <Icon width={24} height={24} />
                </span>
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                  {label}
                </span>
              </button>
            )
          }
          return (
            <button
              key={id}
              onClick={() => onVista(id)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 transition ${
                activo ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
              }`}
              aria-label={label}
            >
              <Icon width={22} height={22} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
