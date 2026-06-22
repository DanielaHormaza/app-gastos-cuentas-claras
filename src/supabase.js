import { createClient } from '@supabase/supabase-js'

// Cliente de Supabase. URL + anon key vienen de .env (VITE_*).
// La anon/publishable key es pública por diseño: el acceso real se controla con RLS.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.warn('[supabase] Falta VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env')
}

export const supabase = createClient(url, anonKey)
