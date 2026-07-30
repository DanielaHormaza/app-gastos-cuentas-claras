/** Iconos lineales estilo Lucide/Feather usados en Cuentas Claras. */
const base = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' }

export const Chevron = ({ size = 18, color = '#B6BFCC', w = 2.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={w} {...base}><path d="M9 18l6-6-6-6" /></svg>
)
export const ChevronDown = ({ size = 14, color = '#64748B', w = 3 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={w} {...base}><path d="M6 9l6 6 6-6" /></svg>
)
export const Back = ({ size = 22, color = '#0B1220', w = 2.4 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={w} {...base}><path d="M15 18l-6-6 6-6" /></svg>
)
export const Check = ({ size = 16, color = '#7C3AED', w = 3 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={w} {...base}><path d="M5 13l4 4L19 7" /></svg>
)
export const Close = ({ size = 15, color = '#94A3B8', w = 2.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={w} {...base}><path d="M6 6l12 12M18 6L6 18" /></svg>
)
export const Plus = ({ size = 20, color = '#94A3B8', w = 2.4 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={w} {...base}><path d="M12 5v14M5 12h14" /></svg>
)
export const Send = ({ size = 20, color = '#fff', w = 2.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={w} {...base}><path d="M12 20V5M6 11l6-6 6 6" /></svg>
)
export const Search = ({ size = 17, color = '#94A3B8', w = 2.4 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={w} {...base}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
)
export const Mic = ({ size = 20, color = '#7C3AED', w = 2.2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={w} {...base}><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8" /></svg>
)
export const Trash = ({ size = 18, color = '#E11D5B', w = 2.2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={w} {...base}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
)
export const Gear = ({ size = 19, color = '#475569', w = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={w} {...base}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></svg>
)
export const Archive = ({ size = 18, color = '#64748B', w = 2.2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={w} {...base}><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" /></svg>
)
export const Lock = ({ size = 15, color = '#94A3B8', w = 2.2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={w} {...base}><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
)
export const Eye = ({ size = 18, color = '#64748B', w = 2.2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={w} {...base}><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" /><circle cx="12" cy="12" r="3" /></svg>
)
export const EyeOff = ({ size = 18, color = '#64748B', w = 2.2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={w} {...base}><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19M6.61 6.61A18.5 18.5 0 0 0 1 12s4 7 11 7a9.12 9.12 0 0 0 5.39-1.61M14.12 14.12a3 3 0 1 1-4.24-4.24M1 1l22 22" /></svg>
)
// Ojo que se CIERRA como un párpado (blink) al ocultar montos, en vez de cambiar de ícono.
// `hidden` = montos ocultos → el párpado baja: el globo se aplana y aparece la línea + pestañas.
export const EyeToggle = ({ size = 18, color = '#64748B', w = 2.2, hidden = false }) => {
  const tr = 'transform .34s cubic-bezier(.4,0,.2,1), opacity .26s ease'
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, overflow: 'visible' }}>
      {/* globo del ojo: se aplana hacia el centro al cerrar */}
      <g style={{ transition: tr, transformOrigin: '12px 12px', transform: hidden ? 'scaleY(0.04)' : 'scaleY(1)', opacity: hidden ? 0 : 1 }}>
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
        <circle cx="12" cy="12" r="3" />
      </g>
      {/* párpado cerrado: línea curva + pestañas, baja desde arriba */}
      <g style={{ transition: tr, transformOrigin: '12px 12px', transform: hidden ? 'translateY(0)' : 'translateY(-7px)', opacity: hidden ? 1 : 0 }}>
        <path d="M3 12c2.6 3.2 15.4 3.2 18 0" />
        <path d="M5.5 14.6l-1 1.9M12 15.7v2.1M18.5 14.6l1 1.9" strokeWidth={w * 0.82} />
      </g>
    </svg>
  )
}

export const Pin = ({ size = 16, color = '#7C3AED', w = 2.1, filled = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <line x1="12" y1="17" x2="12" y2="22" />
    <path d="M5 17h14l-1.7-2.6A2 2 0 0 1 17 13.3V4H7v9.3a2 2 0 0 1-.3 1.1Z" />
  </svg>
)

export const SplitIcon = ({ size = 18, color = '#7C3AED', w = 2.2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" stroke={color} strokeWidth={w} {...base} style={{ flexShrink: 0 }}><path d="M3 12h18M12 3v18" /></svg>
)

/** Logo de marca (check + arco con gradiente). */
export const Logo = ({ size = 28 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} fill="none" style={{ flexShrink: 0 }}>
    <defs>
      <linearGradient id="ccLogo" x1="8" y1="10" x2="56" y2="56" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#2ECCB1" />
        <stop offset="0.55" stopColor="#3B82F6" />
        <stop offset="1" stopColor="#7C3AED" />
      </linearGradient>
    </defs>
    <path d="M53.4 27 A22 22 0 1 1 43.7 13.3" stroke="url(#ccLogo)" strokeWidth="6.5" strokeLinecap="round" />
    <circle cx="50" cy="19.4" r="4.6" fill="#0B1220" />
    <path d="M22 33 L29 41 L44 23" stroke="#0B1220" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
