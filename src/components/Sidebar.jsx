import { NAV_ITEMS } from './navItems'
import { Logo } from './Logo'

/** Navegación lateral para desktop. Oculta en pantallas chicas. */
export default function Sidebar({ vista, onVista }) {
  return (
    <aside className="hidden shrink-0 border-r border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-60 md:flex-col dark:border-slate-700 dark:bg-slate-800">
      <div className="px-5 py-5">
        <Logo />
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const activo = vista === id
          return (
            <button
              key={id}
              onClick={() => onVista(id)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                activo
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700/60'
              }`}
            >
              <Icon width={20} height={20} />
              {label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
