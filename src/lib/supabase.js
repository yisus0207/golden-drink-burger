import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const createTempClient = () => createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

// Función de consulta persistente (Patrón de grandes empresas: Reintento con Backoff)
export async function persistentQuery(queryFn, maxRetries = 3) {
  let delay = 1000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await queryFn();
      if (result.error) throw result.error;
      return result;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      console.warn(`[Network] Fallo detectado. Reintentando en ${delay}ms...`, err);
      await new Promise(res => setTimeout(res, delay));
      delay *= 2; // Backoff exponencial
    }
  }
}

