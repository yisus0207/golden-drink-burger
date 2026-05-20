'use client';

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const initialLoad = useRef(true);

  useEffect(() => {
    // Timeout de seguridad: máximo 4 segundos esperando
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 4000);

    // Función auxiliar para forzar la validación y refresco de la sesión actual
    const checkAndRefreshSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else if (user) {
          // Si ya no hay sesión pero teníamos un usuario, limpiamos para forzar re-login
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('Error auto-refrescando sesión en AuthContext:', err);
      }
    };

    // 1. Obtener sesión una sola vez al montar
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      }
      setLoading(false);
      clearTimeout(timeout);
      initialLoad.current = false;
    }).catch(() => {
      setLoading(false);
      clearTimeout(timeout);
      initialLoad.current = false;
    });

    // 2. Escuchar cambios DESPUÉS de la carga inicial (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Ignorar el evento INITIAL_SESSION para no duplicar
        if (initialLoad.current) return;

        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      }
    );

    // 3. Mecanismo de reactivación proactivo ante reactivación y suspensión de pestañas
    // Se ejecuta al volver a enfocar la app o recuperar internet (especialmente útil en móviles)
    const handleReactivation = () => {
      console.log('[AuthContext] Reactivación detectada (focus/online). Validando sesión...');
      checkAndRefreshSession();
    };

    window.addEventListener('focus', handleReactivation);
    window.addEventListener('online', handleReactivation);

    // 4. Intervalo preventivo de verificación cada 5 minutos
    // Evita la caducidad por inactividad en pantallas encendidas continuamente (caja o cocina)
    const sessionInterval = setInterval(() => {
      console.log('[AuthContext] Verificación preventiva de sesión...');
      checkAndRefreshSession();
    }, 5 * 60 * 1000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
      clearInterval(sessionInterval);
      window.removeEventListener('focus', handleReactivation);
      window.removeEventListener('online', handleReactivation);
    };
  }, []);

  async function fetchProfile(userId) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (data) setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error && data?.user) {
      setUser(data.user);
      await fetchProfile(data.user.id);
    }
    return { data, error };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
