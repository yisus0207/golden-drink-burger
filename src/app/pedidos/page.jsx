'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import ProductCard from '@/components/ProductCard';
import Cart from '@/components/Cart';
import CategoryTabs from '@/components/CategoryTabs';

export default function PedidosPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [cart, setCart] = useState([]);
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  async function fetchCategories() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('id');
    setCategories(data || []);
    if (data?.length > 0) setSelectedCategory(data[0].id);
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
      <div className="min-h-screen bg-dark">
        <Navbar />

        {/* Mensaje de éxito */}
        {successMessage && (
          <div className="fixed top-20 right-4 z-50 animate-slide-in">
            <div className="bg-status-ready/10 border border-status-ready/30 text-status-ready px-6 py-4 rounded-xl shadow-2xl shadow-status-ready/10 backdrop-blur-sm">
              <p className="font-semibold">{successMessage}</p>
            </div>
          </div>
        )}

        <div className="flex h-[calc(100vh-64px)]">
          {/* Izquierda: Menú de productos */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">Menú</h2>
              <p className="text-gray-500 text-sm">Selecciona los productos para el pedido</p>
            </div>

            <CategoryTabs
              categories={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
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
          <Cart
            items={cart}
            total={total}
            onRemove={removeFromCart}
            onUpdateQuantity={updateQuantity}
            onSend={sendOrder}
            sending={sending}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}
