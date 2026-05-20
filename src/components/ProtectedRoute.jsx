'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ChatWidget from './ChatWidget';
import { supabase, promiseWithTimeout } from '@/lib/supabase';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Limpiar cualquier Service Worker residual que haya quedado del despliegue anterior
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().then(() => {
            console.log('[Cleanup] Service Worker desregistrado:', registration.scope);
          });
        });
      }).catch(err => {
        console.warn('Error limpiando Service Workers:', err);
      });
    }

    // Solicitar permiso de notificaciones nativas del navegador
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(err => {
          console.warn('Error al solicitar permiso de notificaciones:', err);
        });
      }
    }
  }, []);

  useEffect(() => {
    const verifySession = async () => {
      if (user) {
        try {
          // Intentar verificar la sesión con un timeout rápido de 3 segundos
          const { data: { session } } = await promiseWithTimeout(supabase.auth.getSession(), 3000);
          if (!session) {
            console.warn('[ProtectedRoute] Sesión expirada o nula. Redirigiendo a login.');
            router.push('/login');
          }
        } catch (err) {
          console.error('[ProtectedRoute] Timeout o error verificando sesión en navegación:', err);
        }
      }
    };

    if (!loading) {
      verifySession();
      if (!user) {
        router.push('/login');
      } else if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
        if (profile.role === 'mesero') router.push('/pedidos');
        else if (profile.role === 'cajero') router.push('/caja');
        else if (profile.role === 'cocinero') router.push('/cocina');
        else router.push('/login');
      }
    }
  }, [user, profile, loading, router, allowedRoles]);


  if (loading) {
    return (
      <div key="loading-screen" className="min-h-screen bg-dark flex items-center justify-center notranslate" translate="no">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gold/20 border-t-gold rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || (allowedRoles && profile && !allowedRoles.includes(profile.role))) {
    return null;
  }

  return (
    <div key="protected-content" className="relative">
      {children}
      <ChatWidget />
    </div>
  );
}
