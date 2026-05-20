'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [tableNumber, setTableNumber] = useState('');
  const [sending, setSending] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const notifId = useRef(0);

  // Unificación de consultas en paralelo y manejo de errores asíncronos
  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      await Promise.all([
        fetchCategories(),
        fetchProducts(),
        fetchTables()
      ]);
    } catch (err) {
      console.error('Error cargando datos de pedidos:', err);
      setLoadError(err.message || 'Error de conexión con la base de datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Suscripción a cambios de estado de pedidos para notificar al mesero cuando estén listos
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
  }, [loadData]);
  
  // Sincronizar apertura del carrito desde el menú flotante radial
  useEffect(() => {
    const handleOpenCart = () => setIsCartOpen(true);
    window.addEventListener('open-cart', handleOpenCart);
    return () => window.removeEventListener('open-cart', handleOpenCart);
  }, []);

  // Notificar cambios en el carrito al menú flotante radial
  useEffect(() => {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    window.dispatchEvent(new CustomEvent('cart-updated', { detail: count }));
  }, [cart]);


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
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('id');
    if (error) throw error;
    setCategories(data || []);
    if (data?.length > 0) setSelectedCategory(data[0].id);
  }

  async function fetchTables() {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .order('id');
    if (error) throw error;
    setTables(data || []);
  }

  async function fetchProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('available', true)
      .order('name');
    if (error) throw error;
    setProducts(data || []);
  }

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory ? product.category_id === selectedCategory : true;
    const matchesSearch = searchQuery
      ? product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    return matchesCategory && matchesSearch;
  });

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
      setIsCartOpen(false); // Cerrar carrito en móvil al enviar
      setSuccessMessage(`✅ Pedido #${order.id} enviado a cocina`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Error creando pedido:', err);
      alert('Error al crear el pedido. Intenta de nuevo.');
    }

    setSending(false);
  }

  return (
    <ProtectedRoute allowedRoles={['mesero', 'admin']}>
      <div className="min-h-screen bg-dark relative">
        <Navbar />

        {/* 🔔 Toast Notifications para Pedidos Listos */}
        <div className="fixed top-20 left-4 sm:left-1/2 sm:-translate-x-1/2 z-50 flex flex-col gap-3 pointer-events-none w-[90%] sm:w-auto max-w-sm notranslate" translate="no">
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

        {/* Mensaje de éxito de envío */}
        {successMessage && (
          <div className="fixed top-20 right-4 z-50 animate-slide-in pointer-events-none notranslate" translate="no">
            <div className="bg-gold/10 border border-gold/30 text-gold px-6 py-4 rounded-xl shadow-2xl backdrop-blur-sm">
              <p className="font-semibold">{successMessage}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden relative">
          {/* Izquierda: Menú de productos */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto pb-24 lg:pb-6">
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Menú</h2>
                <p className="text-gray-500 text-sm">Selecciona los productos para el pedido</p>
              </div>

              {/* Buscador Rápido y Limpio */}
              <div className="relative w-full md:w-80">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 text-sm">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Buscar producto (ej. lulo, BBQ...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-dark-surface border border-dark-border text-white rounded-xl focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold text-sm transition-all placeholder:text-gray-600 shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-500 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <CategoryTabs
              categories={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />

            {loading ? (
              // Spinner Premium Dorado de Carga Local
              <div key="pedidos-loading" className="flex-1 flex flex-col items-center justify-center py-24 animate-pulse notranslate" translate="no">
                <div className="w-14 h-14 border-4 border-gold/10 border-t-gold rounded-full animate-spin mb-4" />
                <p className="text-gold/80 font-medium text-sm tracking-wider uppercase">Cargando menú de productos...</p>
                <p className="text-gray-500 text-xs mt-2">Obteniendo la información más reciente</p>
              </div>
            ) : loadError ? (
              // Error Premium de Conexión con botón de reintento
              <div key="pedidos-error" className="flex-1 flex items-center justify-center py-16 px-4 animate-fade-in">
                <div className="max-w-md w-full bg-dark-card border border-gold/20 rounded-2xl p-6 sm:p-8 text-center shadow-[0_0_30px_rgba(212,175,55,0.05)]">
                  <div className="w-14 h-14 bg-red-500/10 rounded-full border border-red-500/25 flex items-center justify-center mx-auto text-2xl mb-4 text-red-400">
                    ⚠️
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Error de conexión</h3>
                  <p className="text-gray-400 text-xs sm:text-sm mb-6 leading-relaxed">
                    No pudimos establecer comunicación con el servidor para cargar los productos. Por favor comprueba tu conexión.
                  </p>
                  <button
                    onClick={loadData}
                    className="w-full py-3.5 bg-gradient-to-tr from-gold to-yellow-400 text-black font-bold rounded-xl transition-all duration-200 hover:scale-[1.01] active:scale-95 shadow-[0_4px_15px_rgba(212,168,67,0.2)] text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>🔄</span> Reintentar Cargar
                  </button>
                </div>
              </div>
            ) : (
              <div key="pedidos-list" className="animate-fade-in">
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mt-6">
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
                    <p className="text-5xl mb-3">{searchQuery ? '🔍' : '📦'}</p>
                    <p className="text-lg">
                      {searchQuery 
                        ? `No se encontraron resultados para "${searchQuery}"` 
                        : 'No hay productos en esta categoría'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>


          {/* Derecha: Carrito (Overlay en móvil, Sidebar en Desktop) */}
          <div
            className={`
              fixed inset-0 z-40 bg-dark transform transition-transform duration-300 ease-in-out
              lg:relative lg:transform-none lg:w-[400px] xl:w-[450px] lg:flex-shrink-0 lg:border-l border-dark-border
              ${isCartOpen ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
            `}
          >
            {/* Cabecera del modal en móvil (Botón cerrar) */}
            <div className="lg:hidden p-4 border-b border-dark-border flex justify-between items-center bg-dark-card">
              <h3 className="font-bold text-white text-lg">Tu Pedido</h3>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-dark hover:bg-white/10 text-gray-400 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="h-[calc(100vh-73px)] lg:h-full">
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
      </div>
    </ProtectedRoute>
  );
}
