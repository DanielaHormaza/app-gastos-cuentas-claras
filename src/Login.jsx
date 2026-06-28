import { useState } from 'react'
import { supabase } from './supabase'
import { Logo } from './cc/icons'

const BRAND = 'linear-gradient(135deg,#2ECCB1,#3B82F6,#7C3AED)'
const inputStyle = { width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 13, padding: '12px 14px', outline: 'none', fontSize: 15, fontWeight: 600, color: '#0B1220', background: '#fff', fontFamily: 'inherit', boxSizing: 'border-box' }
const labelStyle = { fontSize: 11, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.04em', marginBottom: 7 }

/** Login híbrido: email + contraseña (ideal para PWA en iOS, sin salir de la app)
 *  con magic link por email como respaldo / primera vez. */
export default function Login() {
  const [mode, setMode] = useState('signin') // signin | signup | sent
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const mail = email.trim()
  const reset = (m) => { setMode(m); setErr('') }

  // Entrar con email + contraseña (no usa email: anda en iOS-PWA sin redirecciones).
  const signin = async () => {
    if (!mail || !pass || loading) return
    setLoading(true); setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email: mail, password: pass })
    setLoading(false)
    if (error) setErr('Email o contraseña incorrectos. ¿Primera vez? Usá "Entrar con enlace por email" y después creás tu contraseña en el perfil.')
    // si OK, onAuthStateChange (en App) detecta la sesión y entra
  }

  // Crear cuenta con contraseña. Con "Confirm email" desactivado en Supabase, entra al instante.
  const signup = async () => {
    if (!mail || loading) return
    if (pass.length < 6) { setErr('La contraseña tiene que tener al menos 6 caracteres.'); return }
    setLoading(true); setErr('')
    const { data, error } = await supabase.auth.signUp({ email: mail, password: pass })
    setLoading(false)
    if (error) { setErr(error.message); return }
    if (!data.session) setMode('sent') // si pide confirmación por mail
    // si hay sesión, App entra solo
  }

  // Respaldo: enlace por email (magic link).
  const sendMagic = async () => {
    if (!mail || loading) return
    setLoading(true); setErr('')
    const { error } = await supabase.auth.signInWithOtp({ email: mail, options: { shouldCreateUser: true, emailRedirectTo: window.location.origin } })
    setLoading(false)
    if (error) setErr(error.message); else setMode('sent')
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#e6e9f2', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 380, background: '#fff', borderRadius: 24, padding: '36px 26px', boxShadow: '0 24px 60px -24px rgba(15,23,42,.35)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Logo size={48} /></div>
        <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 22, color: '#0B1220', letterSpacing: '-0.01em' }}>Cuentas Claras</div>
        <div style={{ textAlign: 'center', fontSize: 13, color: '#94A3B8', fontWeight: 600, marginTop: 4, marginBottom: 26 }}>Menos lío, más claridad</div>

        {mode === 'sent' ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>📬</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#0B1220', marginBottom: 6 }}>Revisá tu mail</div>
            <div style={{ fontSize: 13.5, color: '#64748B', fontWeight: 600, lineHeight: 1.5 }}>
              Te mandamos un enlace a <b style={{ color: '#0B1220' }}>{mail}</b>. Tocalo desde este dispositivo para entrar.
            </div>
            <div onClick={() => reset('signin')} style={{ marginTop: 18, fontSize: 12.5, fontWeight: 800, color: '#7C3AED', cursor: 'pointer' }}>Volver</div>
          </div>
        ) : (
          <>
            <div style={labelStyle}>TU EMAIL</div>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" inputMode="email" autoComplete="email" placeholder="vos@mail.com" style={{ ...inputStyle, marginBottom: 12 }} />

            <div style={labelStyle}>CONTRASEÑA</div>
            <input value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (mode === 'signup' ? signup() : signin())} type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder={mode === 'signup' ? 'Elegí una contraseña (mín. 6)' : 'Tu contraseña'} style={inputStyle} />

            {err && <div style={{ fontSize: 12, fontWeight: 700, color: '#E11D5B', marginTop: 8, lineHeight: 1.4 }}>{err}</div>}

            <button onClick={mode === 'signup' ? signup : signin} disabled={loading || !mail || !pass}
              style={{ width: '100%', marginTop: 16, border: 'none', background: loading || !mail || !pass ? '#CBD5E1' : BRAND, color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 15, padding: 14, borderRadius: 13, cursor: loading || !mail || !pass ? 'not-allowed' : 'pointer', boxShadow: loading || !mail || !pass ? 'none' : '0 10px 24px -10px rgba(59,130,246,.6)' }}>
              {loading ? 'Cargando…' : mode === 'signup' ? 'Crear cuenta' : 'Entrar'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12.5, fontWeight: 700, color: '#64748B' }}>
              {mode === 'signup'
                ? <>¿Ya tenés cuenta? <span onClick={() => reset('signin')} style={{ color: '#7C3AED', fontWeight: 800, cursor: 'pointer' }}>Entrar</span></>
                : <>¿Primera vez? <span onClick={() => reset('signup')} style={{ color: '#7C3AED', fontWeight: 800, cursor: 'pointer' }}>Crear cuenta</span></>}
            </div>

            <div style={{ borderTop: '1px solid #EEF1F6', margin: '16px 0 0', paddingTop: 14, textAlign: 'center' }}>
              <span onClick={sendMagic} style={{ fontSize: 12.5, fontWeight: 800, color: '#94A3B8', cursor: loading ? 'default' : 'pointer' }}>Entrar con enlace por email</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
