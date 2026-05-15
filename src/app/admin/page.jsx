'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import ConfirmModal from '@/components/ConfirmModal';

export default function AdminPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', price: '', category_id: '', available: true, description: '', image_url: '' });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState('products');

  // Form para nueva categoría/mesa
  const [newCategory, setNewCategory] = useState('');
  const [tables, setTables] = useState([]);
  const [newTable, setNewTable] = useState('');

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    context: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchTables();
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

  async function fetchTables() {
    const { data } = await supabase
      .from('tables')
      .select('*')
      .order('id');
    setTables(data || []);
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `product-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      setForm(prev => ({ ...prev, image_url: publicUrl }));
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen. Asegúrate de tener el bucket "products" creado en Supabase.');
    } finally {
      setUploading(false);
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
      description: form.description ? form.description.trim() : null,
      image_url: form.image_url
    };

    if (editing) {
      await supabase.from('products').update(productData).eq('id', editing);
      setEditing(null);
    } else {
      await supabase.from('products').insert(productData);
    }

    setForm({ name: '', price: '', category_id: categories[0]?.id || '', available: true, description: '', image_url: '' });
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
      description: product.description || '',
      image_url: product.image_url || ''
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

  async function performDeleteProduct(id) {
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
    setModalConfig({ isOpen: false });
  }

  function deleteProduct(product) {
    setModalConfig({
      isOpen: true,
      title: 'Eliminar Producto',
      message: '¿Estás seguro de eliminar este producto? Se borrará por completo de la base de datos.',
      context: product.name,
      onConfirm: () => performDeleteProduct(product.id)
    });
  }

  function cancelEdit() {
    setEditing(null);
    setForm({ name: '', price: '', category_id: categories[0]?.id || '', available: true, description: '', image_url: '' });
  }

  async function addCategory(e) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    await supabase.from('categories').insert({ name: newCategory.trim() });
    setNewCategory('');
    fetchCategories();
  }

  async function performDeleteCategory(id) {
    await supabase.from('categories').delete().eq('id', id);
    fetchCategories();
    setModalConfig({ isOpen: false });
  }

  function deleteCategory(category) {
    setModalConfig({
      isOpen: true,
      title: 'Eliminar Categoría',
      message: '¿Eliminar esta categoría? Los productos de esta categoría quedarán sin categoría.',
      context: category.name,
      onConfirm: () => performDeleteCategory(category.id)
    });
  }

  async function addTable(e) {
    e.preventDefault();
    if (!newTable.trim()) return;
    await supabase.from('tables').insert({ name: newTable.trim() });
    setNewTable('');
    fetchTables();
  }

  async function performDeleteTable(id) {
    await supabase.from('tables').delete().eq('id', id);
    fetchTables();
    setModalConfig({ isOpen: false });
  }

  function deleteTable(table) {
    setModalConfig({
      isOpen: true,
      title: 'Eliminar Mesa',
      message: 'Estás a punto de eliminar esta mesa. Si está en uso en una orden activa puede ocasionar problemas visuales.',
      context: table.name,
      onConfirm: () => performDeleteTable(table.id)
    });
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
            <button
              onClick={() => setTab('tables')}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === 'tables'
                  ? 'bg-gold text-black'
                  : 'bg-dark-surface text-gray-400 border border-dark-border hover:text-white'
              }`}
            >
              🪑 Mesas
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
                  <input
                    type="text"
                    value={form.description || ''}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Pequeña descripción"
                    className="px-4 py-3 input-dark rounded-xl"
                  />
                  <div className="md:col-span-2 flex flex-col gap-2">
                    <label className="text-xs text-gray-500 ml-1">Imagen del producto</label>
                    <div className="flex gap-3 items-center">
                      <div className="relative w-12 h-12 rounded-lg bg-dark-surface border border-dark-border overflow-hidden flex-shrink-0">
                        {form.image_url ? (
                          <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600 text-xl">🖼️</div>
                        )}
                        {uploading && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        onChange={handleImageUpload}
                        accept="image/*"
                        className="text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-dark-surface file:text-gold hover:file:bg-gold/10 cursor-pointer"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-3 text-gray-300 text-sm px-2 pt-6">
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
                          <td className="p-4 text-white font-medium flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-dark-surface border border-dark-border overflow-hidden flex-shrink-0">
                              {product.image_url ? (
                                <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-700 text-xs">🍔</div>
                              )}
                            </div>
                            <div>
                              {product.name}
                              {product.description && (
                                <p className="text-xs text-gray-500 truncate max-w-[150px]" title={product.description}>
                                  {product.description}
                                </p>
                              )}
                            </div>
                          </td>
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
                              onClick={() => deleteProduct(product)}
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
                      onClick={() => deleteCategory(cat)}
                      className="text-red-500/50 hover:text-red-400 transition-colors text-sm"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ====== TAB: MESAS ====== */}
          {tab === 'tables' && (
            <div className="animate-fade-in">
              {/* Formulario nueva mesa */}
              <div className="glass rounded-2xl p-6 mb-8">
                <h3 className="text-lg font-semibold text-gold mb-4">➕ Nueva Mesa</h3>
                <form onSubmit={addTable} className="flex gap-4">
                  <input
                    type="text"
                    value={newTable}
                    onChange={(e) => setNewTable(e.target.value)}
                    placeholder="Nombre o ID de la mesa (ej. Mesa 1, Barra)"
                    className="flex-1 px-4 py-3 input-dark rounded-xl"
                    required
                  />
                  <button type="submit" className="px-6 py-3 btn-gold rounded-xl">
                    Agregar
                  </button>
                </form>
              </div>

              {/* Lista de mesas */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {tables.map(t => (
                  <div key={t.id} className="glass rounded-xl p-5 flex flex-col items-center justify-center text-center gap-2 group hover:border-gold/30 transition-colors cursor-default">
                    <p className="text-white font-bold text-lg">{t.name}</p>
                    <button
                      onClick={() => deleteTable(t)}
                      className="text-red-500/50 hover:text-red-400 transition-colors text-sm opacity-0 group-hover:opacity-100"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        {...modalConfig}
        onCancel={() => setModalConfig({ isOpen: false })}
      />
    </ProtectedRoute>
  );
}
