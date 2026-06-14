/**
 * Logo de Cuentas Claras.
 * El anillo abierto lleva el degradé de marca (verde → azul → violeta);
 * el check y el punto usan currentColor, así se adaptan al fondo.
 */
export function LogoMark({ size = 32, className = '' }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cc-grad" x1="8" y1="10" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2ECCB1" />
          <stop offset="0.55" stopColor="#3B82F6" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      {/* Anillo abierto */}
      <path
        d="M53.4 27 A22 22 0 1 1 43.7 13.3"
        stroke="url(#cc-grad)"
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      {/* Punto */}
      <circle cx="50" cy="19.4" r="4.6" fill="currentColor" />
      {/* Check */}
      <path
        d="M22 33 L29 41 L44 23"
        stroke="currentColor"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Logo completo: símbolo + nombre. */
export function Logo({ size = 30, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LogoMark size={size} className="shrink-0 text-slate-900 dark:text-white" />
      <span className="font-marca text-lg font-extrabold tracking-tight">
        <span className="text-slate-900 dark:text-white">Cuentas </span>
        <span className="text-violet-600 dark:text-violet-400">Claras</span>
      </span>
    </div>
  )
}
