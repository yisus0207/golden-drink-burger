'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, promiseWithTimeout } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import OrderCard from '@/components/OrderCard';
import { playNotificationSound } from '@/lib/sounds';

export default function CocinaPage() {
  const [orders, setOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const notifId = useRef(0);

  function addNotification(order) {
    const id = ++notifId.current;
    const mesa = order.table_number || 'Sin mesa';
    setNotifications(prev => [...prev, { id, mesa, time: new Date() }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }

  const showSystemNotification = useCallback((title, body) => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body,
            icon: '/favicon.ico',
          });
        } catch (err) {
          console.warn('Error mostrando notificación nativa:', err);
        }
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            try {
              new Notification(title, {
                body,
                icon: '/favicon.ico',
              });
            } catch (err) {
              console.warn('Error mostrando notificación nativa tras solicitar permiso:', err);
            }
          }
        });
      }
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const activePromise = supabase
        .from('orders')
        .select('*, order_items(*)')
        .in('status', ['pending', 'preparing'])
        .order('created_at', { ascending: true });

      const { data: active, error: activeError } = await promiseWithTimeout(activePromise, 8000);

      if (activeError) throw activeError;
      setOrders(active || []);

      const completedPromise = supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('status', 'ready')
        .order('created_at', { ascending: false })
        .limit(10);

      const { data: completed, error: completedError } = await promiseWithTimeout(completedPromise, 8000);

      if (completedError) throw completedError;
      setCompletedOrders(completed || []);
    } catch (err) {
      console.error('Error cargando pedidos en cocina:', err);
      setLoadError(err.message || 'Error de conexión con la base de datos (inactividad detectada). Por favor comprueba tu conexión.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Suscripción Realtime y Blindaje ante Inactividad (Focus / Online)
  useEffect(() => {
    fetchOrders();

    let channel;

    const connectRealtime = () => {
      if (channel) {
        supabase.removeChannel(channel);
      }

      channel = supabase
        .channel(`kitchen-orders-${Date.now()}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'orders'
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            playNotificationSound();
            addNotification(payload.new);
            // Disparar notificación nativa siempre para fácil validación
            const mesa = payload.new.table_number || 'Sin mesa';
            showSystemNotification('🔥 ¡Nuevo Pedido en Cocina!', `Mesa ${mesa} • Nuevo pedido ingresado listo para preparar.`);
          }
          fetchOrders();
        })
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            console.warn('Realtime de cocina desconectado, reintentando en 3s...');
            setTimeout(connectRealtime, 3000);
          }
        });
    };

    connectRealtime();

    const handleReactivation = async () => {
      console.log('Cocina reactivada (focus/online), validando sesión y refrescando...');
      try {
        await supabase.auth.getSession();
        fetchOrders();
        connectRealtime();
      } catch (err) {
        console.error('Error reactivando cocina:', err);
      }
    };

    window.addEventListener('focus', handleReactivation);
    window.addEventListener('online', handleReactivation);

    return () => {
      if (channel) supabase.removeChannel(channel);
      window.removeEventListener('focus', handleReactivation);
      window.removeEventListener('online', handleReactivation);
    };
  }, [fetchOrders, showSystemNotification]);

  // Auto-recuperación silenciosa en Cocina cada 5 segundos ante fallos de conexión
  useEffect(() => {
    let intervalId;
    if (loadError) {
      console.log('[Cocina] Programando reintento automático de carga en 5 segundos...');
      intervalId = setInterval(() => {
        console.log('[Cocina] Auto-reintentando cargar pedidos...');
        fetchOrders();
      }, 5000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [loadError, fetchOrders]);

  async function updateStatus(orderId, newStatus) {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (!error) {
      fetchOrders();
    }
  }

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const activeCount = orders.length;

  return (
    <ProtectedRoute allowedRoles={['cocinero', 'admin']}>
      <div className="min-h-screen bg-dark">
        <Navbar />

        {/* 🔔 Toast Notifications — Mobile friendly */}
        <div className="fixed top-16 left-0 right-0 sm:left-auto sm:right-4 sm:top-20 z-50 flex flex-col gap-2 sm:gap-3 pointer-events-none px-3 sm:px-0 notranslate" translate="no">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="pointer-events-auto animate-fade-in bg-gold/10 backdrop-blur-xl border border-gold/30 rounded-xl sm:rounded-2xl px-4 py-3 sm:px-5 sm:py-4 shadow-2xl shadow-gold/10 flex items-center gap-3 w-full sm:min-w-[280px] sm:w-auto"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                <span className="text-lg sm:text-xl">🔔</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gold font-bold text-sm">¡Nuevo Pedido!</p>
                <p className="text-gray-400 text-xs truncate">{notif.mesa} • Justo ahora</p>
              </div>
              <button
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
                className="text-gray-600 hover:text-white transition-colors text-xs flex-shrink-0 p-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 sm:p-6">
          {/* Header — Mobile stacked */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">🔥 Panel de Cocina</h2>
              <p className="text-gray-500 text-xs sm:text-sm mt-1">Los pedidos aparecen en tiempo real</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-gold/10 border border-gold/20 px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl">
                <span className="text-gold font-bold text-xl sm:text-2xl">{activeCount}</span>
                <span className="text-gray-400 text-xs sm:text-sm leading-tight">pedidos<br />activos</span>
              </div>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-medium transition-all ${showCompleted
                    ? 'bg-status-ready/10 text-status-ready border border-status-ready/30'
                    : 'bg-dark-surface text-gray-400 border border-dark-border hover:text-white'
                  }`}
              >
                {showCompleted ? '✅ Ocultar' : `✅ Listos (${completedOrders.length})`}
              </button>
            </div>
          </div>

          {loading && orders.length === 0 && completedOrders.length === 0 ? (
            // Spinner Premium de Carga Local
            <div key="cocina-loading" className="flex flex-col items-center justify-center py-24 animate-pulse notranslate" translate="no">
              <div className="w-14 h-14 border-4 border-gold/10 border-t-gold rounded-full animate-spin mb-4" />
              <p className="text-gold/80 font-medium text-sm tracking-wider uppercase">Cargando pedidos de cocina...</p>
              <p className="text-gray-500 text-xs mt-2">Sincronizando con el servidor en tiempo real</p>
            </div>
          ) : loadError ? (
            // Error de conexión con botón de reintento
            <div key="cocina-error" className="flex items-center justify-center py-16 px-4 animate-fade-in">
              <div className="max-w-md w-full bg-dark-card border border-gold/20 rounded-2xl p-6 sm:p-8 text-center shadow-[0_0_30px_rgba(212,175,55,0.05)]">
                <div className="w-14 h-14 bg-red-500/10 rounded-full border border-red-500/25 flex items-center justify-center mx-auto text-2xl mb-4 text-red-400">
                  ⚠️
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Error de conexión</h3>
                <p className="text-gray-400 text-xs sm:text-sm mb-6 leading-relaxed">
                  No pudimos establecer comunicación con el servidor para cargar las órdenes de cocina. Por favor comprueba tu conexión.
                </p>
                <button
                  onClick={fetchOrders}
                  className="w-full py-3.5 bg-gradient-to-tr from-gold to-yellow-400 text-black font-bold rounded-xl transition-all duration-200 hover:scale-[1.01] active:scale-95 shadow-[0_4px_15px_rgba(212,168,67,0.2)] text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>🔄</span> Reintentar Cargar
                </button>
              </div>
            </div>
          ) : (
            <div key="cocina-content" className="animate-fade-in">
              {/* Pendientes */}
              {pendingOrders.length > 0 && (
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-base sm:text-lg font-semibold text-status-pending mb-3 sm:mb-4 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-status-pending rounded-full animate-pulse" />
                    Pendientes ({pendingOrders.length})
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {pendingOrders.map(order => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onStatusChange={updateStatus}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* En preparación */}
              {preparingOrders.length > 0 && (
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-base sm:text-lg font-semibold text-status-preparing mb-3 sm:mb-4 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-status-preparing rounded-full animate-pulse" />
                    En Preparación ({preparingOrders.length})
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {preparingOrders.map(order => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onStatusChange={updateStatus}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Sin pedidos */}
              {orders.length === 0 && (
                <div className="text-center text-gray-600 py-16 sm:py-24">
                  <p className="text-5xl sm:text-7xl mb-4">👨‍🍳</p>
                  <p className="text-lg sm:text-xl font-medium text-gray-400">No hay pedidos pendientes</p>
                  <p className="text-xs sm:text-sm mt-2 text-gray-600">
                    Los nuevos pedidos aparecerán aquí automáticamente 🔔
                  </p>
                </div>
              )}

              {/* Pedidos completados */}
              {showCompleted && completedOrders.length > 0 && (
                <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-dark-border">
                  <h3 className="text-base sm:text-lg font-semibold text-status-ready mb-3 sm:mb-4 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-status-ready rounded-full" />
                    Completados
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 opacity-60">
                    {completedOrders.map(order => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onStatusChange={updateStatus}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
