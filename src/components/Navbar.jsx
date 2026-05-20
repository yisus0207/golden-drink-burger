'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [notifSupported, setNotifSupported] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifSupported(true);
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleToggleNotifications = async () => {
    if (!notifSupported) return;

    const showNotification = (title, body) => {
      const options = {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        vibrate: [200, 100, 200],
      };

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready
          .then((registration) => {
            registration.showNotification(title, options);
          })
          .catch((err) => {
            console.warn('Error mostrando con Service Worker en Navbar, usando fallback:', err);
            try {
              new Notification(title, options);
            } catch (e) {
              console.error(e);
            }
          });
      } else {
        try {
          new Notification(title, options);
        } catch (e) {
          console.error(e);
        }
      }
    };

    if (Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
          showNotification('🔔 ¡Notificaciones Activadas!', 'Recibirás alertas nativas en este dispositivo de forma exitosa.');
        }
      } catch (err) {
        console.warn('Error solicitando permisos de notificación:', err);
      }
    } else if (Notification.permission === 'denied') {
      alert('Las notificaciones están bloqueadas en tu navegador para esta página.\n\nPara activarlas:\n1. Haz clic en el icono del candado 🔒 o configuración a la izquierda de la dirección URL.\n2. Cambia el interruptor de "Notificaciones" a "Permitir".\n3. Recarga la página para aplicar los cambios.');
    } else if (Notification.permission === 'granted') {
      // Enviar notificación de prueba
      showNotification('🔔 Prueba de Alerta', 'Las alertas nativas del sistema están activas y funcionando en este dispositivo.');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const navLinks = [
    { href: '/pedidos', label: 'Pedidos', icon: '🛒', roles: ['mesero', 'admin'] },
    { href: '/caja', label: 'Caja', icon: '💵', roles: ['cajero', 'admin'] },
    { href: '/cocina', label: 'Cocina', icon: '👨‍🍳', roles: ['cocinero', 'admin'] },
    { href: '/admin', label: 'Admin', icon: '⚙️', roles: ['admin'] },
  ];

  const visibleLinks = mounted && profile
    ? navLinks.filter(link => link.roles.includes(profile.role))
    : [];

  return (
    <>
      <nav className="h-16 bg-dark-card border-b border-dark-border flex items-center justify-between px-6 sticky top-0 z-40">
        {/* Logo + Links */}
        <div className="flex items-center gap-6">
          <Link href="/pedidos" className="flex items-center gap-2 group">
            <span className="text-2xl group-hover:scale-110 transition-transform">🍔</span>
            <span className="text-gold font-bold text-sm sm:text-lg tracking-wide">
              Golden Drink & Burger
            </span>
          </Link>

          {/* Desktop Top Links (Hidden on Mobile) */}
          <div className="hidden md:flex items-center gap-1 ml-2">
            {visibleLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${pathname === link.href
                  ? 'bg-gold/10 text-gold border border-gold/20'
                  : 'text-gray-400 hover:text-white hover:bg-dark-hover'
                  }`}
              >
                <span>{link.icon}</span>
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* User info + Actions */}
        <div className="flex items-center gap-4">
          {mounted && profile && (
            <div className="text-right hidden sm:block animate-fade-in">
              <p className="text-sm text-white truncate max-w-[150px]">
                {profile.full_name || profile.email}
              </p>
              <p className="text-xs text-gold capitalize">{profile.role}</p>
            </div>
          )}

          {/* Botón inteligente de Campana de Notificaciones */}
          {mounted && notifSupported && (
            <button
              onClick={handleToggleNotifications}
              title={
                notificationPermission === 'granted'
                  ? 'Notificaciones activadas (clic para enviar prueba)'
                  : notificationPermission === 'denied'
                  ? 'Notificaciones bloqueadas (clic para ver instrucciones de activación)'
                  : 'Activar notificaciones del sistema'
              }
              className={`p-2 rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center text-base cursor-pointer ${
                notificationPermission === 'granted'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : notificationPermission === 'denied'
                  ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                  : 'bg-dark-surface text-gray-400 border-dark-border hover:text-gold hover:border-gold/30'
              }`}
            >
              {notificationPermission === 'granted' ? '🔔' : '🔕'}
            </button>
          )}

          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm text-gray-400 hover:text-red-400 bg-dark-surface border border-dark-border rounded-lg hover:border-red-500/30 transition-all duration-200 cursor-pointer"
          >
            Salir
          </button>
        </div>
      </nav>

      {/* Floating Bottom Tab Bar (Only visible on Mobile) */}
      <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden backdrop-blur-xl bg-dark-card/85 border border-gold/15 shadow-[0_12px_30px_rgba(0,0,0,0.7)] px-4 py-2.5 rounded-2xl flex justify-around items-center animate-slide-up">
        {visibleLinks.map(link => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition-all duration-200 active:scale-90 relative ${isActive ? 'text-gold' : 'text-gray-400'
                }`}
            >
              <span className={`text-xl transition-transform duration-250 ${isActive ? 'scale-110 text-gold drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]' : ''}`}>
                {link.icon}
              </span>
              <span className="text-[9px] font-semibold tracking-wide uppercase">
                {link.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-1 w-1.5 h-1.5 bg-gold rounded-full shadow-[0_0_8px_#d4af37] animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>
    </>
  );
}
