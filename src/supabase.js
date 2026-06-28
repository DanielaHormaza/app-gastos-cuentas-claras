import { createClient } from '@supabase/supabase-js'

// Cliente de Supabase. URL + anon key vienen de .env (VITE_*).
// La anon/publishable key es pública por diseño: el acceso real se controla con RLS.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.warn('[supabase] Falta VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env')
}

// Persistencia de sesión explícita: la sesión queda guardada en localStorage y el token
// se refresca solo, así la PWA sigue logueada entre aperturas.
// detectSessionInUrl=true: entramos por magic link (el token vuelve en la URL y se procesa).
// (Cuando haya SMTP propio se puede volver al login por código de 6 dígitos.)
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'cuentas-claras-auth',
  },
})
