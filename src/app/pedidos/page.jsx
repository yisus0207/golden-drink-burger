'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import ProductCard from '@/components/ProductCard';
import Cart from '@/components/Cart';
import CategoryTabs from '@/components/CategoryTabs';
import { playNotificationSound } from '@/lib/sounds';

export default function PedidosPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [tableNumber, setTableNumber] = useState('');
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [notifications, setNotifications] = useState([]);
  const notifId = useRef(0);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
    fetchTables();

    // Suscripción a cambios de estado de pedidos para notificar al cajero cuando estén listos
    const channel = supabase
      .channel('cashier-orders')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders'
      }, (payload) => {
        // Solo notificar si el estado cambió a 'ready'
        if (payload.new.status === 'ready' && payload.old.status !== 'ready') {
          playNotificationSound();
          addReadyNotification(payload.new);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function addReadyNotification(order) {
    const id = ++notifId.current;
    const mesa = order.table_number || 'Sin mesa';
    setNotifications(prev => [...prev, { id, orderId: order.id, mesa }]);
    
    // Auto-remover después de 8 segundos
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 8000);
  }

  async function fetchCategories() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('id');
    setCategories(data || []);
    if (data?.length > 0) setSelectedCategory(data[0].id);
  }

  async function fetchTables() {
    const { data } = await supabase
      .from('tables')
      .select('*')
      .order('id');
    setTables(data || []);
  }

  async function fetchProducts() {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('available', true)
      .order('name');
    setProducts(data || []);
  }

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products;

  function addToCart(product) {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }

  function removeFromCart(productId) {
    setCart(prev => prev.filter(item => item.id !== productId));
  }

  function updateQuantity(productId, delta) {
    setCart(prev =>
      prev
        .map(item =>
          item.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter(item => item.quantity > 0)
    );
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  async function sendOrder() {
    if (cart.length === 0 || !user) return;
    setSending(true);

    try {
      // Crear pedido
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          status: 'pending',
          total,
          table_number: tableNumber,
          created_by: user.id,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Crear items del pedido
      const items = cart.map(item => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(items);

      if (itemsError) throw itemsError;

      // Limpiar carrito y mostrar éxito
      setCart([]);
      setTableNumber('');
      setSuccessMessage(`✅ Pedido #${order.id} enviado a cocina`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Error creando pedido:', err);
      alert('Error al crear el pedido. Intenta de nuevo.');
    }

    setSending(false);
  }

  return (
    <ProtectedRoute allowedRoles={['cajero', 'admin']}>
      <div className="min-h-screen bg-dark relative">
        <Navbar />

        {/* 🔔 Toast Notifications para Pedidos Listos */}
        <div className="fixed top-20 left-4 sm:left-1/2 sm:-translate-x-1/2 z-50 flex flex-col gap-3 pointer-events-none w-[90%] sm:w-auto max-w-sm">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="pointer-events-auto animate-fade-in bg-status-ready/10 backdrop-blur-xl border border-status-ready/30 rounded-2xl px-5 py-4 shadow-2xl flex items-center gap-4"
              style={{ animation: 'fadeIn 0.3s ease-out, slideDown 0.3s ease-out' }}
            >
              <div className="w-12 h-12 rounded-full bg-status-ready/20 flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">✅</span>
              </div>
              <div className="flex-1">
                <p className="text-status-ready font-bold text-lg leading-tight">¡Pedido Listo!</p>
                <p className="text-gray-300 text-sm mt-0.5">Orden #{notif.orderId} • <span className="text-white font-medium">{notif.mesa}</span></p>
              </div>
              <button
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
                className="text-gray-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Mensaje de éxito de envío (se mantiene el existente) */}
        {successMessage && (
          <div className="fixed top-20 right-4 z-50 animate-slide-in pointer-events-none">
            <div className="bg-gold/10 border border-gold/30 text-gold px-6 py-4 rounded-xl shadow-2xl backdrop-blur-sm">
              <p className="font-semibold">{successMessage}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
          {/* Izquierda: Menú de productos */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">Menú</h2>
              <p className="text-gray-500 text-sm">Selecciona los productos para el pedido</p>
            </div>

            <CategoryTabs
              categories={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mt-6 pb-24 lg:pb-0">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={() => addToCart(product)}
                />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center text-gray-600 py-16">
                <p className="text-5xl mb-3">📦</p>
                <p className="text-lg">No hay productos en esta categoría</p>
              </div>
            )}
          </div>

          {/* Derecha: Carrito */}
          <div className="lg:w-[400px] xl:w-[450px] flex-shrink-0 border-t lg:border-t-0 lg:border-l border-dark-border bg-dark-surface z-20">
            <Cart
              items={cart}
              total={total}
              tables={tables}
              tableNumber={tableNumber}
              onTableNumberChange={setTableNumber}
              onRemove={removeFromCart}
              onUpdateQuantity={updateQuantity}
              onSend={sendOrder}
              sending={sending}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
