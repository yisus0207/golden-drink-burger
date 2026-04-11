'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import OrderCard from '@/components/OrderCard';
import { playNotificationSound } from '@/lib/sounds';

export default function CocinaPage() {
  const [orders, setOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [showCompleted, setShowCompleted] = useState(false);

  const fetchOrders = useCallback(async () => {
    // Pedidos activos (pendientes y en preparación)
    const { data: active } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .in('status', ['pending', 'preparing'])
      .order('created_at', { ascending: true });

    setOrders(active || []);

    // Pedidos completados (últimos 10)
    const { data: completed } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(10);

    setCompletedOrders(completed || []);
  }, []);

  useEffect(() => {
    fetchOrders();

    // Suscripción en tiempo real
    const channel = supabase
      .channel('kitchen-orders')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          playNotificationSound();
        }
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

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

        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-white">🔥 Panel de Cocina</h2>
              <p className="text-gray-500 text-sm mt-1">Los pedidos aparecen en tiempo real</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-gold/10 border border-gold/20 px-5 py-3 rounded-xl">
                <span className="text-gold font-bold text-2xl">{activeCount}</span>
                <span className="text-gray-400 text-sm">pedidos<br/>activos</span>
              </div>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  showCompleted
                    ? 'bg-status-ready/10 text-status-ready border border-status-ready/30'
                    : 'bg-dark-surface text-gray-400 border border-dark-border hover:text-white'
                }`}
              >
                {showCompleted ? '✅ Ocultar listos' : `✅ Ver listos (${completedOrders.length})`}
              </button>
            </div>
          </div>

          {/* Pendientes */}
          {pendingOrders.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-status-pending mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-status-pending rounded-full animate-pulse" />
                Pendientes ({pendingOrders.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-status-preparing mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-status-preparing rounded-full animate-pulse" />
                En Preparación ({preparingOrders.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
            <div className="text-center text-gray-600 py-24">
              <p className="text-7xl mb-4">👨‍🍳</p>
              <p className="text-xl font-medium text-gray-400">No hay pedidos pendientes</p>
              <p className="text-sm mt-2 text-gray-600">
                Los nuevos pedidos aparecerán aquí automáticamente con un sonido 🔔
              </p>
            </div>
          )}

          {/* Pedidos completados */}
          {showCompleted && completedOrders.length > 0 && (
            <div className="mt-8 pt-8 border-t border-dark-border">
              <h3 className="text-lg font-semibold text-status-ready mb-4 flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-status-ready rounded-full" />
                Completados
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 opacity-60">
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
      </div>
    </ProtectedRoute>
  );
}
