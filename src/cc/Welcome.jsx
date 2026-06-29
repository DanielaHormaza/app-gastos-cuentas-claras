import { useState } from 'react'
import { Logo } from './icons'
import { BRAND_GRADIENT } from './initialState'

// Slides del onboarding: foco en la propuesta de valor y en la función estrella (cargar por texto).
const SLIDES = [
  {
    art: <Logo size={56} />,
    title: 'Bienvenido a Cuentas Claras',
    text: 'La forma simple de dividir gastos con quien quieras. Vos anotás; la app calcula quién le debe a quién.',
  },
  {
    art: <div style={{ fontSize: 52, lineHeight: 1 }}>💬</div>,
    title: 'Cargalos como hablás',
    text: 'Escribí el gasto en palabras y lo registra solo: monto, categoría y quién pagó.',
    example: '“super 8000 pagó Juan”',
  },
  {
    art: <div style={{ fontSize: 52, lineHeight: 1 }}>👥</div>,
    title: 'Personas y grupos',
    text: 'Agregá a alguien para un 1:1, o creá un grupo para un viaje o el depto. Saldá las cuentas cuando quieras.',
  },
]

/** Onboarding de bienvenida (primer ingreso). Carrusel de 3 slides + "Empezar". */
export default function Welcome({ onDone }) {
  const [i, setI] = useState(0)
  const last = i === SLIDES.length - 1
  const s = SLIDES[i]
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: '#FBFCFE', display: 'flex', flexDirection: 'column', animation: 'ccFade .2s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 18px' }}>
        {!last && <span onClick={onDone} style={{ fontSize: 13.5, fontWeight: 800, color: '#94A3B8', cursor: 'pointer' }}>Saltar</span>}
      </div>

      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 32px', animation: 'ccIn .3s ease' }}>
        <div style={{ width: 116, height: 116, borderRadius: 32, background: 'linear-gradient(135deg,rgba(46,204,177,.12),rgba(124,58,237,.12))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 26 }}>
          {s.art}
        </div>
        <div style={{ fontWeight: 800, fontSize: 23, color: '#0B1220', letterSpacing: '-0.01em', lineHeight: 1.2, marginBottom: 10 }}>{s.title}</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#64748B', lineHeight: 1.5, maxWidth: 320 }}>{s.text}</div>
        {s.example && (
          <div style={{ marginTop: 18, display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #EEF1F6', borderRadius: 14, padding: '11px 15px', boxShadow: '0 8px 22px -14px rgba(15,23,42,.4)' }}>
            <span style={{ fontSize: 16 }}>✦</span>
            <span style={{ fontSize: 14.5, fontWeight: 700, color: '#0B1220' }}>{s.example}</span>
          </div>
        )}
      </div>

      <div style={{ padding: '20px 28px calc(env(safe-area-inset-bottom, 0px) + 28px)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginBottom: 20 }}>
          {SLIDES.map((_, k) => (
            <span key={k} style={{ width: k === i ? 22 : 7, height: 7, borderRadius: 999, background: k === i ? '#7C3AED' : '#D9E0EA', transition: 'all .25s ease' }} />
          ))}
        </div>
        <button
          onClick={() => (last ? onDone() : setI(i + 1))}
          style={{ width: '100%', border: 'none', background: BRAND_GRADIENT, color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 15.5, padding: 15, borderRadius: 14, cursor: 'pointer', boxShadow: '0 12px 26px -12px rgba(59,130,246,.6)' }}
        >
          {last ? 'Empezar' : 'Siguiente'}
        </button>
      </div>
    </div>
  )
}
