'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', price: '', category_id: '', available: true });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('products');

  // Form para nueva categoría
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  async function fetchProducts() {
    const { data } = await supabase
      .from('products')
      .select('*, categories(name)')
      .order('category_id')
      .order('name');
    setProducts(data || []);
  }

  async function fetchCategories() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('id');
    setCategories(data || []);
    if (data?.length > 0 && !form.category_id) {
      setForm(prev => ({ ...prev, category_id: data[0].id }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    const productData = {
      name: form.name,
      price: parseFloat(form.price),
      category_id: parseInt(form.category_id),
      available: form.available,
    };

    if (editing) {
      await supabase.from('products').update(productData).eq('id', editing);
      setEditing(null);
    } else {
      await supabase.from('products').insert(productData);
    }

    setForm({ name: '', price: '', category_id: categories[0]?.id || '', available: true });
    setLoading(false);
    fetchProducts();
  }

  function startEdit(product) {
    setEditing(product.id);
    setForm({
      name: product.name,
      price: product.price.toString(),
      category_id: product.category_id?.toString() || '',
      available: product.available,
    });
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function toggleAvailability(product) {
    await supabase
      .from('products')
      .update({ available: !product.available })
      .eq('id', product.id);
    fetchProducts();
  }

  async function deleteProduct(id) {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      await supabase.from('products').delete().eq('id', id);
      fetchProducts();
    }
  }

  function cancelEdit() {
    setEditing(null);
    setForm({ name: '', price: '', category_id: categories[0]?.id || '', available: true });
  }

  async function addCategory(e) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    await supabase.from('categories').insert({ name: newCategory.trim() });
    setNewCategory('');
    fetchCategories();
  }

  async function deleteCategory(id) {
    if (confirm('¿Eliminar esta categoría? Los productos de esta categoría quedarán sin categoría.')) {
      await supabase.from('categories').delete().eq('id', id);
      fetchCategories();
    }
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-dark">
        <Navbar />

        <div className="p-6 max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-2">⚙️ Panel de Administración</h2>
          <p className="text-gray-500 text-sm mb-6">Gestiona los productos y categorías del menú</p>

          {/* Tabs */}
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => setTab('products')}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === 'products'
                  ? 'bg-gold text-black'
                  : 'bg-dark-surface text-gray-400 border border-dark-border hover:text-white'
              }`}
            >
              🍔 Productos
            </button>
            <button
              onClick={() => setTab('categories')}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === 'categories'
                  ? 'bg-gold text-black'
                  : 'bg-dark-surface text-gray-400 border border-dark-border hover:text-white'
              }`}
            >
              📂 Categorías
            </button>
          </div>

          {/* ====== TAB: PRODUCTOS ====== */}
          {tab === 'products' && (
            <>
              {/* Formulario de producto */}
              <div className="glass rounded-2xl p-6 mb-8 animate-fade-in">
                <h3 className="text-lg font-semibold text-gold mb-4">
                  {editing ? '✏️ Editar Producto' : '➕ Nuevo Producto'}
                </h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Nombre del producto"
                    className="px-4 py-3 input-dark rounded-xl"
                    required
                  />
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="Precio"
                    className="px-4 py-3 input-dark rounded-xl"
                    min="0"
                    step="100"
                    required
                  />
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="px-4 py-3 input-dark rounded-xl"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-3 text-gray-300 text-sm px-2">
                    <input
                      type="checkbox"
                      checked={form.available}
                      onChange={(e) => setForm({ ...form, available: e.target.checked })}
                      className="w-4 h-4 accent-gold"
                    />
                    Disponible
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3 btn-gold rounded-xl"
                    >
                      {editing ? 'Guardar' : 'Agregar'}
                    </button>
                    {editing && (
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-4 py-3 bg-dark-surface border border-dark-border rounded-xl text-gray-400 hover:text-white transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Tabla de productos */}
              <div className="glass rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-dark-border">
                        <th className="text-left p-4 text-gray-400 font-medium text-sm">Producto</th>
                        <th className="text-left p-4 text-gray-400 font-medium text-sm">Categoría</th>
                        <th className="text-left p-4 text-gray-400 font-medium text-sm">Precio</th>
                        <th className="text-left p-4 text-gray-400 font-medium text-sm">Estado</th>
                        <th className="text-right p-4 text-gray-400 font-medium text-sm">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <tr
                          key={product.id}
                          className="border-b border-dark-border/50 hover:bg-dark-hover transition-colors"
                        >
                          <td className="p-4 text-white font-medium">{product.name}</td>
                          <td className="p-4 text-gray-400">{product.categories?.name || '—'}</td>
                          <td className="p-4 text-gold font-semibold">
                            ${product.price.toLocaleString('es-CO')}
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => toggleAvailability(product)}
                              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                product.available
                                  ? 'bg-status-ready/10 text-status-ready hover:bg-status-ready/20'
                                  : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                              }`}
                            >
                              {product.available ? '✅ Disponible' : '❌ No disponible'}
                            </button>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => startEdit(product)}
                              className="text-gold hover:text-gold-light mr-4 transition-colors text-sm"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              onClick={() => deleteProduct(product.id)}
                              className="text-red-500/60 hover:text-red-400 transition-colors text-sm"
                            >
                              🗑️ Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {products.length === 0 && (
                  <div className="text-center text-gray-600 py-12">
                    <p className="text-4xl mb-2">📦</p>
                    <p>No hay productos registrados</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ====== TAB: CATEGORÍAS ====== */}
          {tab === 'categories' && (
            <div className="animate-fade-in">
              {/* Formulario nueva categoría */}
              <div className="glass rounded-2xl p-6 mb-8">
                <h3 className="text-lg font-semibold text-gold mb-4">➕ Nueva Categoría</h3>
                <form onSubmit={addCategory} className="flex gap-4">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Nombre de la categoría"
                    className="flex-1 px-4 py-3 input-dark rounded-xl"
                    required
                  />
                  <button type="submit" className="px-6 py-3 btn-gold rounded-xl">
                    Agregar
                  </button>
                </form>
              </div>

              {/* Lista de categorías */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map(cat => (
                  <div key={cat.id} className="glass rounded-xl p-5 flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium text-lg">{cat.name}</p>
                      <p className="text-gray-500 text-sm">
                        {products.filter(p => p.category_id === cat.id).length} productos
                      </p>
                    </div>
                    <button
                      onClick={() => deleteCategory(cat.id)}
                      className="text-red-500/50 hover:text-red-400 transition-colors text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
