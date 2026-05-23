'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase, createTempClient } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import ConfirmModal from '@/components/ConfirmModal';
import AIConsole from '@/components/AIConsole';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';

// ── Dashboard helpers ──
function formatCOP(n) {
  return '$' + (n || 0).toLocaleString('es-CO');
}

function GoldTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-card/95 backdrop-blur-md border border-gold/20 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-gold font-bold text-sm">
          {p.name}: {typeof p.value === 'number' && p.value > 100 ? formatCOP(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', price: '', category_id: '', available: true, description: '', image_url: '' });
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState('dashboard');

  // Dashboard
  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [dashRange, setDashRange] = useState(7);
  const [selectedDate, setSelectedDate] = useState('');

  // Form para nueva categoría/mesa
  const [newCategory, setNewCategory] = useState('');
  const [tables, setTables] = useState([]);
  const [newTable, setNewTable] = useState('');

  // Gestión de Usuarios
  const [users, setUsers] = useState([]);
  const [userForm, setUserForm] = useState({ full_name: '', email: '', password: '', role: 'mesero' });

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
    fetchUsers();
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    const [ordersRes, itemsRes] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: true }),
      supabase.from('order_items').select('*'),
    ]);
    setOrders(ordersRes.data || []);
    setOrderItems(itemsRes.data || []);
  }

  async function fetchUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers(data || []);
  }

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

  // --- LÓGICA DE USUARIOS ---
  async function handleCreateUser(e) {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Crear el usuario en Auth usando un cliente temporal sin persistencia de sesión
      // Esto evita que la sesión del administrador sea reemplazada por la del nuevo usuario
      const tempSupabase = createTempClient();
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: userForm.email,
        password: userForm.password,
        options: {
          data: {
            full_name: userForm.full_name,
            role: userForm.role
          }
        }
      });

      if (authError) {
        // Manejo amigable para usuarios que ya existen
        if (authError.message?.toLowerCase().includes('already registered') || authError.status === 400) {
          alert('⚠️ El correo electrónico ya se encuentra registrado en el sistema. Por favor, utiliza otro correo.');
          setLoading(false);
          return;
        }
        throw authError;
      }

      // El trigger de Supabase en el backend se encarga automáticamente de crear 
      // el registro en la tabla 'profiles' saltándose las restricciones RLS.
      // Damos un pequeño margen de tiempo (500ms) para que el trigger termine antes de recargar la tabla
      setTimeout(() => {
        alert('¡Usuario registrado con éxito!');
        setUserForm({ full_name: '', email: '', password: '', role: 'mesero' });
        fetchUsers();
        setLoading(false);
      }, 500);

    } catch (error) {
      console.error('Error creando usuario:', error);
      alert('Error: ' + (error.message || 'No se pudo crear el usuario'));
      setLoading(false);
    }
  }

  async function performDeleteUser(id) {
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      
      if (error) {
        console.error('Error al eliminar:', error);
        alert('No se pudo eliminar el usuario. Es posible que falten permisos en Supabase (RLS). Error: ' + error.message);
      } else {
        fetchUsers();
      }
    } catch (err) {
      console.error('Excepción al eliminar:', err);
      alert('Hubo un problema al intentar eliminar el usuario.');
    } finally {
      setModalConfig({ isOpen: false });
    }
  }

  function deleteUser(profile) {
    setModalConfig({
      isOpen: true,
      title: 'Eliminar Usuario',
      message: `¿Estás seguro de eliminar a ${profile.full_name}? Se borrará de la lista de perfiles.`,
      context: profile.email,
      onConfirm: () => performDeleteUser(profile.id)
    });
  }

  // --- LÓGICA DE LIMPIEZA DE PEDIDOS ---
  async function performDeleteAllOrders() {
    setLoading(true);
    try {
      console.log("[Admin] Iniciando limpieza de base de datos de pedidos...");
      
      // Usamos .gte('id', 0) que es más robusto para capturar todos los serials
      const { error, count } = await supabase
        .from('orders')
        .delete({ count: 'exact' })
        .gte('id', 0);

      if (error) throw error;

      console.log(`[Admin] Limpieza completada. Filas afectadas: ${count}`);

      if (count === 0) {
        alert('⚠️ No se eliminó ningún pedido. Esto sucede generalmente cuando las políticas RLS de Supabase no permiten el borrado. \n\nPor favor, asegúrate de haber ejecutado el SQL de permisos en el panel de Supabase.');
      } else {
        alert(`✅ Historial limpiado con éxito. Se eliminaron ${count} pedidos.`);
      }
      
      fetchDashboard();
    } catch (err) {
      console.error('[Admin] Error fatal al eliminar pedidos:', err);
      alert('❌ Error al eliminar pedidos: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
      setModalConfig({ isOpen: false });
    }
  }

  function handleClearOrders() {
    setModalConfig({
      isOpen: true,
      title: '⚠️ ACCIÓN CRÍTICA: Limpiar Historial',
      message: '¿Estás ABSOLUTAMENTE seguro de borrar TODOS los pedidos? Esta acción eliminará el historial de ventas, las estadísticas del dashboard y los items de cada pedido para siempre.',
      context: 'ELIMINAR TODO EL HISTORIAL',
      onConfirm: performDeleteAllOrders
    });
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-dark">
        <Navbar />

        <div className="p-4 sm:p-6 w-full">
          <h2 className="text-2xl font-bold text-white mb-2">⚙️ Panel de Administración</h2>
          <p className="text-gray-500 text-sm mb-6">Gestiona tu negocio desde un solo lugar</p>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 flex-wrap">
            <button
              onClick={() => setTab('dashboard')}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === 'dashboard'
                  ? 'bg-gold text-black'
                  : 'bg-dark-surface text-gray-400 border border-dark-border hover:text-white'
              }`}
            >
              📊 Dashboard
            </button>
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
            <button
              onClick={() => setTab('users')}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === 'users'
                  ? 'bg-gold text-black'
                  : 'bg-dark-surface text-gray-400 border border-dark-border hover:text-white'
              }`}
            >
              👥 Usuarios
            </button>
            <button
              onClick={() => setTab('ai-console')}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === 'ai-console'
                  ? 'bg-gold text-black'
                  : 'bg-dark-surface text-gray-400 border border-dark-border hover:text-white'
              }`}
            >
              🤖 Consola IA
            </button>
          </div>

          {/* ====== TAB: DASHBOARD ====== */}
          {tab === 'dashboard' && (() => {
            // Filtrar órdenes por fecha seleccionada si existe
            const displayOrders = selectedDate 
              ? orders.filter(o => {
                  const d = new Date(o.created_at);
                  const year = d.getFullYear();
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  return `${year}-${month}-${day}` === selectedDate;
                })
              : orders;

            const displayOrderIds = new Set(displayOrders.map(o => o.id));
            const displayItems = selectedDate
              ? orderItems.filter(item => displayOrderIds.has(item.order_id))
              : orderItems;

            const completed = displayOrders.filter(o => o.status === 'ready');
            const totalRevenue = completed.reduce((sum, o) => sum + Number(o.total || 0), 0);
            const totalOrders = completed.length;
            const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

            // Producto estrella
            const productCount = {};
            displayItems.forEach(item => {
              productCount[item.product_name] = (productCount[item.product_name] || 0) + item.quantity;
            });
            const topProductEntry = Object.entries(productCount).sort((a, b) => b[1] - a[1])[0];

            // Hoy
            const today = new Date().toDateString();
            const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today);
            const todayRevenue = todayOrders.filter(o => o.status === 'ready').reduce((sum, o) => sum + Number(o.total || 0), 0);

            // Status counts
            const statusCounts = { pending: 0, preparing: 0, ready: 0 };
            displayOrders.forEach(o => { if (statusCounts[o.status] !== undefined) statusCounts[o.status]++; });

            // Revenue por día (o por horas si se selecciona un día específico)
            const revenueByDay = (() => {
              const grouped = {};
              if (selectedDate) {
                // Agrupar por hora del día seleccionado
                completed.forEach(o => {
                  const date = new Date(o.created_at);
                  const hour = date.getHours().toString().padStart(2, '0') + ':00';
                  grouped[hour] = (grouped[hour] || 0) + Number(o.total || 0);
                });
                return Object.entries(grouped)
                  .sort((a, b) => a[0].localeCompare(b[0]))
                  .map(([hour, total]) => ({ day: hour, total }));
              } else {
                // Agrupar por día para el rango (7/30 días)
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - dashRange);
                completed.filter(o => new Date(o.created_at) >= cutoff).forEach(o => {
                  const day = new Date(o.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
                  grouped[day] = (grouped[day] || 0) + Number(o.total || 0);
                });
                return Object.entries(grouped).map(([day, total]) => ({ day, total }));
              }
            })();

            // Top 5 productos
            const topProducts = Object.entries(productCount)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([name, cantidad]) => ({
                name: name.length > 18 ? name.slice(0, 16) + '…' : name,
                cantidad,
              }));

            return (
              <div className="animate-fade-in">
                {/* Selector de rango y selector de fecha */}
                <div className="flex gap-3 mb-6 items-center flex-wrap">
                  <button 
                    onClick={() => { setDashRange(7); setSelectedDate(''); }} 
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${dashRange === 7 && !selectedDate ? 'bg-gold text-black' : 'bg-dark-surface text-gray-400 border border-dark-border hover:text-white'}`}
                  >
                    7 días
                  </button>
                  <button 
                    onClick={() => { setDashRange(30); setSelectedDate(''); }} 
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${dashRange === 30 && !selectedDate ? 'bg-gold text-black' : 'bg-dark-surface text-gray-400 border border-dark-border hover:text-white'}`}
                  >
                    30 días
                  </button>
                  
                  {/* Selector de Fecha Específica */}
                  <div className="flex items-center gap-2 bg-dark-surface border border-dark-border px-3 py-1.5 rounded-xl hover:border-gold/30 transition-all">
                    <span className="text-xs text-gray-400">📅 Filtrar Día:</span>
                    <input 
                      type="date" 
                      value={selectedDate} 
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        setDashRange(0); // Limpiar rango preestablecido
                      }}
                      className="bg-transparent border-0 text-xs text-gold font-bold focus:outline-none focus:ring-0 cursor-pointer"
                    />
                    {selectedDate && (
                      <button 
                        onClick={() => { setSelectedDate(''); setDashRange(7); }} 
                        className="text-gray-500 hover:text-white text-xs font-bold px-1 transition-colors"
                        title="Limpiar fecha"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <button onClick={fetchDashboard} className="px-4 py-2 rounded-xl text-xs font-semibold bg-dark-surface text-gray-400 border border-dark-border hover:text-gold hover:border-gold/30 transition-all flex items-center gap-1.5">
                    🔄 Actualizar
                  </button>

                  <button 
                    onClick={handleClearOrders}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5 ml-auto"
                    title="Borrar todos los pedidos"
                  >
                    🗑️ Limpiar Historial
                  </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="glass rounded-2xl p-5 relative overflow-hidden group hover:border-gold/30 transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-full -translate-y-8 translate-x-8 group-hover:bg-gold/10 transition-colors" />
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">💰 Ingresos Totales</p>
                    <p className="text-2xl font-bold text-gold">{formatCOP(totalRevenue)}</p>
                    <p className="text-xs text-gray-600 mt-2">Hoy: <span className="text-green-400">{formatCOP(todayRevenue)}</span></p>
                  </div>
                  <div className="glass rounded-2xl p-5 relative overflow-hidden group hover:border-gold/30 transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-full -translate-y-8 translate-x-8 group-hover:bg-gold/10 transition-colors" />
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">📦 Pedidos Completados</p>
                    <p className="text-2xl font-bold text-white">{totalOrders}</p>
                    <p className="text-xs text-gray-600 mt-2">Hoy: <span className="text-blue-400">{todayOrders.length} pedidos</span></p>
                  </div>
                  <div className="glass rounded-2xl p-5 relative overflow-hidden group hover:border-gold/30 transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-full -translate-y-8 translate-x-8 group-hover:bg-gold/10 transition-colors" />
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">🧾 Ticket Promedio</p>
                    <p className="text-2xl font-bold text-white">{formatCOP(Math.round(avgTicket))}</p>
                    <p className="text-xs text-gray-600 mt-2">Por pedido completado</p>
                  </div>
                  <div className="glass rounded-2xl p-5 relative overflow-hidden group hover:border-gold/30 transition-all">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-full -translate-y-8 translate-x-8 group-hover:bg-gold/10 transition-colors" />
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">🏆 Producto Estrella</p>
                    <p className="text-lg font-bold text-white truncate">{topProductEntry?.[0] || '—'}</p>
                    <p className="text-xs text-gray-600 mt-2">{topProductEntry ? <>{topProductEntry[1]} <span className="text-gold">unidades</span></> : 'Sin datos'}</p>
                  </div>
                </div>

                {/* Status Pills */}
                <div className="flex flex-wrap gap-3 mb-8">
                  <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
                    <span className="text-xs text-gray-400">Pendientes</span>
                    <span className="text-sm font-bold text-white">{statusCounts.pending}</span>
                  </div>
                  <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse" />
                    <span className="text-xs text-gray-400">En preparación</span>
                    <span className="text-sm font-bold text-white">{statusCounts.preparing}</span>
                  </div>
                  <div className="glass rounded-xl px-4 py-2.5 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    <span className="text-xs text-gray-400">Listos</span>
                    <span className="text-sm font-bold text-white">{statusCounts.ready}</span>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Area Chart */}
                  <div className="lg:col-span-2 glass rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-white font-semibold">Tendencia de Ingresos</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Últimos {dashRange} días</p>
                      </div>
                      <span className="text-xs text-gold bg-gold/10 px-3 py-1 rounded-full border border-gold/20">En vivo</span>
                    </div>
                    {revenueByDay.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={revenueByDay}>
                          <defs>
                            <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
                          <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                          <Tooltip content={<GoldTooltip />} />
                          <Area type="monotone" dataKey="total" name="Ingresos" stroke="#D4AF37" strokeWidth={2.5} fill="url(#goldGradient)" dot={{ r: 4, fill: '#D4AF37', strokeWidth: 2, stroke: '#1a1a2e' }} activeDot={{ r: 6, fill: '#D4AF37', stroke: '#fff', strokeWidth: 2 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[280px] text-gray-600">
                        <div className="text-center">
                          <p className="text-4xl mb-2">📈</p>
                          <p className="text-sm">No hay datos de ventas en este período</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bar Chart — Top Productos */}
                  <div className="glass rounded-2xl p-6">
                    <div className="mb-6">
                      <h3 className="text-white font-semibold">Top 5 Productos</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Más vendidos</p>
                    </div>
                    {topProducts.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={topProducts} layout="vertical" barCategoryGap="20%">
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                          <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis dataKey="name" type="category" tick={{ fill: '#d1d5db', fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                          <Tooltip content={<GoldTooltip />} />
                          <Bar dataKey="cantidad" name="Vendidos" fill="#D4AF37" radius={[0, 8, 8, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[280px] text-gray-600">
                        <div className="text-center">
                          <p className="text-4xl mb-2">🍔</p>
                          <p className="text-sm">Sin productos vendidos aún</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

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

          {/* ====== TAB: USUARIOS ====== */}
          {tab === 'users' && (
            <div className="animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Formulario Crear Usuario */}
                <div className="lg:col-span-1">
                  <div className="glass rounded-2xl p-6 sticky top-24">
                    <h3 className="text-lg font-semibold text-gold mb-6 flex items-center gap-2">
                      👤 Nuevo Usuario
                    </h3>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Nombre Completo</label>
                        <input
                          type="text"
                          value={userForm.full_name}
                          onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                          className="w-full px-4 py-3 input-dark rounded-xl focus:border-gold/50 outline-none transition-all"
                          required
                          placeholder="Ej: Juan Perez"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Correo Electrónico</label>
                        <input
                          type="email"
                          value={userForm.email}
                          onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                          className="w-full px-4 py-3 input-dark rounded-xl focus:border-gold/50 outline-none transition-all"
                          required
                          placeholder="correo@ejemplo.com"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Contraseña</label>
                        <input
                          type="password"
                          value={userForm.password}
                          onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                          className="w-full px-4 py-3 input-dark rounded-xl focus:border-gold/50 outline-none transition-all"
                          required
                          minLength={6}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">Rol del Sistema</label>
                        <select
                          value={userForm.role}
                          onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                          className="w-full px-4 py-3 input-dark rounded-xl appearance-none bg-dark-surface cursor-pointer"
                        >
                          <option value="mesero">Mesero</option>
                          <option value="cajero">Cajero</option>
                          <option value="cocinero">Cocinero</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 btn-gold rounded-xl mt-4 font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-gold/10"
                      >
                        {loading ? 'Procesando...' : 'Registrar en el Sistema'}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Lista de Usuarios */}
                <div className="lg:col-span-2">
                  <div className="glass rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-dark-border bg-black/20">
                            <th className="text-left p-4 text-gray-400 font-medium text-xs uppercase tracking-wider">Nombre</th>
                            <th className="text-left p-4 text-gray-400 font-medium text-xs uppercase tracking-wider">Email</th>
                            <th className="text-left p-4 text-gray-400 font-medium text-xs uppercase tracking-wider">Rol</th>
                            <th className="text-right p-4 text-gray-400 font-medium text-xs uppercase tracking-wider">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((profile) => (
                            <tr key={profile.id} className="border-b border-dark-border/50 hover:bg-white/5 transition-colors">
                              <td className="p-4 text-white font-medium">{profile.full_name || '—'}</td>
                              <td className="p-4 text-gray-400 text-sm">{profile.email}</td>
                              <td className="p-4">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                  profile.role === 'admin' ? 'bg-gold/10 text-gold border-gold/20' :
                                  profile.role === 'cocinero' ? 'bg-status-preparing/10 text-status-preparing border-status-preparing/20' :
                                  profile.role === 'mesero' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                  profile.role === 'cajero' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                  'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                }`}>
                                  {profile.role}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteUser(profile);
                                  }}
                                  className="p-3 text-red-500/60 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                                  title="Quitar acceso"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ====== TAB: CONSOLA IA ====== */}
          {tab === 'ai-console' && (
            <div className="animate-fade-in">
              <AIConsole />
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
