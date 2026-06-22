import { useState } from 'react'
import { supabase } from './supabase'
import { Logo } from './cc/icons'

const BRAND = 'linear-gradient(135deg,#2ECCB1,#3B82F6,#7C3AED)'

/** Pantalla de inicio de sesión con magic link (sin contraseña). */
export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const send = async () => {
    const mail = email.trim()
    if (!mail) return
    setLoading(true)
    setErr('')
    const { error } = await supabase.auth.signInWithOtp({ email: mail, options: { emailRedirectTo: window.location.origin } })
    setLoading(false)
    if (error) setErr(error.message)
    else setSent(true)
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#e6e9f2', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380, background: '#fff', borderRadius: 24, padding: '36px 26px', boxShadow: '0 24px 60px -24px rgba(15,23,42,.35)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Logo size={48} /></div>
        <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 22, color: '#0B1220', letterSpacing: '-0.01em' }}>Cuentas Claras</div>
        <div style={{ textAlign: 'center', fontSize: 13, color: '#94A3B8', fontWeight: 600, marginTop: 4, marginBottom: 26 }}>Menos lío, más claridad</div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>📬</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#0B1220', marginBottom: 6 }}>Revisá tu mail</div>
            <div style={{ fontSize: 13.5, color: '#64748B', fontWeight: 600, lineHeight: 1.5 }}>
              Te mandamos un enlace a <b style={{ color: '#0B1220' }}>{email.trim()}</b>. Tocalo desde este dispositivo para entrar.
            </div>
            <div onClick={() => setSent(false)} style={{ marginTop: 18, fontSize: 12.5, fontWeight: 800, color: '#7C3AED', cursor: 'pointer' }}>Usar otro mail</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.04em', marginBottom: 7 }}>TU EMAIL</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="vos@mail.com"
              style={{ width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 13, padding: '12px 14px', outline: 'none', fontSize: 15, fontWeight: 600, color: '#0B1220', background: '#fff', fontFamily: 'inherit', boxSizing: 'border-box' }}
            />
            {err && <div style={{ fontSize: 12, fontWeight: 700, color: '#E11D5B', marginTop: 8 }}>{err}</div>}
            <button
              onClick={send}
              disabled={loading || !email.trim()}
              style={{ width: '100%', marginTop: 16, border: 'none', background: loading || !email.trim() ? '#CBD5E1' : BRAND, color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 15, padding: 14, borderRadius: 13, cursor: loading || !email.trim() ? 'not-allowed' : 'pointer', boxShadow: loading || !email.trim() ? 'none' : '0 10px 24px -10px rgba(59,130,246,.6)' }}
            >
              {loading ? 'Enviando…' : 'Enviar enlace de acceso'}
            </button>
            <div style={{ fontSize: 11.5, color: '#B6BFCC', fontWeight: 600, textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
              Te llega un enlace para entrar sin contraseña.
            </div>
          </>
        )}
      </div>
    </div>
  )
}
