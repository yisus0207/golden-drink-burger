'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { playRegisterSound, playNotificationSound } from '@/lib/sounds';
import { useAuth } from '@/context/AuthContext';

export default function CajaPage() {
  const { profile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [paidOrders, setPaidOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Filtros y UI
  const [activeTab, setActiveTab] = useState('pending_payment'); // 'pending_payment' | 'ready_payment' | 'paid_history'
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [dbError, setDbError] = useState(null);

  // Checkout
  const [paymentMethod, setPaymentMethod] = useState(''); // 'efectivo' | 'tarjeta' | 'transferencia'
  const [cashReceived, setCashReceived] = useState('');
  const [customCashInput, setCustomCashInput] = useState(false);
  const [vuelto, setVuelto] = useState(0);

  // Historial de alertas de nuevos pedidos
  const [notifications, setNotifications] = useState([]);
  const notifId = useRef(0);

  function addNotification(order) {
    const id = ++notifId.current;
    const mesa = order.table_number || 'Sin mesa';
    setNotifications(prev => [...prev, { id, mesa, time: new Date() }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 6000);
  }

  // Carga de pedidos
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setDbError(null);
    try {
      // 1. Pedidos sin pagar
      const { data: unpaidData, error: unpaidError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*)
        `)
        .eq('payment_status', 'unpaid')
        .order('created_at', { ascending: false });

      if (unpaidError) {
        if (unpaidError.code === '42703' || (unpaidError.message && unpaidError.message.includes('payment_status'))) {
          setDbError('column_missing');
          setLoading(false);
          return;
        }
        throw unpaidError;
      }

      // 2. Pedidos pagados recientemente (límite 15 para historial)
      const { data: paidData, error: paidError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*)
        `)
        .eq('payment_status', 'paid')
        .order('created_at', { ascending: false })
        .limit(15);

      if (paidError) {
        if (paidError.code === '42703' || (paidError.message && paidError.message.includes('payment_status'))) {
          setDbError('column_missing');
          setLoading(false);
          return;
        }
        throw paidError;
      }

      // Obtener perfiles de usuarios de forma segura y separada para evitar errores de relación en Supabase
      const allOrders = [...(unpaidData || []), ...(paidData || [])];
      const userIds = [...new Set(allOrders.map(o => o.created_by).filter(Boolean))];
      
      let profilesMap = {};
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        
        if (!profilesError && profilesData) {
          profilesData.forEach(p => {
            profilesMap[p.id] = p;
          });
        }
      }

      // Mapear perfiles a los pedidos
      const unpaidWithProfiles = (unpaidData || []).map(order => ({
        ...order,
        profiles: order.created_by ? profilesMap[order.created_by] : null
      }));

      const paidWithProfiles = (paidData || []).map(order => ({
        ...order,
        profiles: order.created_by ? profilesMap[order.created_by] : null
      }));

      setOrders(unpaidWithProfiles);
      setPaidOrders(paidWithProfiles);
    } catch (err) {
      console.error('Error cargando pedidos en caja:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Suscripción Realtime
  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel('cashier-view-channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          playNotificationSound();
          addNotification(payload.new);
        }
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  // Manejar cambio en el efectivo recibido
  useEffect(() => {
    if (!selectedOrder) return;
    const received = parseFloat(cashReceived) || 0;
    const total = parseFloat(selectedOrder.total) || 0;
    setVuelto(Math.max(0, received - total));
  }, [cashReceived, selectedOrder]);

  // Auto-selección de efectivo rápido
  const handleQuickCash = (amount) => {
    setCashReceived(amount.toString());
    setCustomCashInput(false);
  };

  // Restablecer selección
  const resetCheckout = () => {
    setSelectedOrder(null);
    setPaymentMethod('');
    setCashReceived('');
    setVuelto(0);
    setCustomCashInput(false);
  };

  // Procesar y Cerrar la Factura
  const handleProcessPayment = async () => {
    if (!selectedOrder) return;
    if (!paymentMethod) {
      alert('Por favor selecciona un método de pago.');
      return;
    }

    const total = parseFloat(selectedOrder.total);
    const received = parseFloat(cashReceived) || 0;

    if (paymentMethod === 'efectivo' && received < total) {
      alert('El efectivo recibido es menor al total a pagar.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          payment_method: paymentMethod,
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      // Reproducir sonido de caja registradora
      playRegisterSound();

      // Mostrar Toast de Éxito
      setSuccessToast(`¡Pedido #${selectedOrder.id} facturado exitosamente! 💸`);
      setTimeout(() => setSuccessToast(''), 4000);

      // Actualizar pedido seleccionado en local para mostrar el sello de pagado
      setSelectedOrder(prev => ({
        ...prev,
        payment_status: 'paid',
        payment_method: paymentMethod,
      }));

      // Refrescar listas
      await fetchOrders();
    } catch (err) {
      console.error('Error procesando pago:', err);
      alert('Hubo un error al procesar el pago. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  // Simular impresión de factura
  const handlePrintReceipt = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Permite las ventanas emergentes para imprimir la factura.');
      return;
    }

    const itemsHtml = selectedOrder.order_items.map(item => `
      <tr style="font-family: monospace; font-size: 13px;">
        <td style="padding: 4px 0;">${item.quantity}x ${item.product_name}</td>
        <td style="text-align: right; padding: 4px 0;">$${(item.price * item.quantity).toLocaleString('es-CO')}</td>
      </tr>
    `).join('');

    const formattedDate = new Date(selectedOrder.created_at).toLocaleString('es-CO');

    printWindow.document.write(`
      <html>
        <head>
          <title>Factura Pedido #${selectedOrder.id}</title>
          <style>
            body { font-family: monospace; padding: 20px; width: 280px; margin: 0 auto; color: #000; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
            table { width: 100%; border-collapse: collapse; }
            .total { font-size: 16px; font-weight: bold; margin-top: 10px; }
            .stamp { border: 2px solid #000; padding: 5px; display: inline-block; transform: rotate(-8deg); font-weight: bold; margin: 15px auto; text-align: center; }
          </style>
        </head>
        <body>
          <div class="center">
            <span class="bold" style="font-size: 16px;">GOLDEN DRINK & BURGER</span><br/>
            <span>NIT: 901.456.789-2</span><br/>
            <span>Dirección: Av. Principal N° 123</span><br/>
            <span>Tel: +57 (321) 456-7890</span><br/>
            <div class="divider"></div>
            <span class="bold">FACTURA DE VENTA</span><br/>
            <span>Pedido: #${selectedOrder.id}</span><br/>
            <span>Mesa: ${selectedOrder.table_number || 'Para Llevar'}</span><br/>
            <span>Fecha: ${formattedDate}</span><br/>
            <span>Atendido por: ${selectedOrder.profiles?.full_name || 'Personal'}</span><br/>
            <div class="divider"></div>
          </div>
          <table>
            <thead>
              <tr style="font-size: 12px; border-bottom: 1px dashed #000;">
                <th style="text-align: left; padding-bottom: 4px;">ITEM</th>
                <th style="text-align: right; padding-bottom: 4px;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="divider"></div>
          <div style="display: flex; justify-content: space-between;" class="bold">
            <span>TOTAL:</span>
            <span>$${parseFloat(selectedOrder.total).toLocaleString('es-CO')}</span>
          </div>
          <div class="divider"></div>
          <div class="center">
            <div class="stamp">★ FACTURA PAGADA ★<br/>Vía: ${selectedOrder.payment_method?.toUpperCase()}</div>
            <br/><br/>
            <span>¡Gracias por su visita!</span><br/>
            <span>Disfrute su comida.</span>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Formatear Fecha
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Filtrado de pedidos según barra de búsqueda y pestaña activa
  const getFilteredOrders = () => {
    let list = activeTab === 'paid_history' ? paidOrders : orders;

    // Filtro por pestaña (cuando no es historial de pagados)
    if (activeTab === 'ready_payment') {
      list = list.filter(o => o.status === 'ready');
    }

    // Filtro por búsqueda (id o mesa)
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      list = list.filter(o =>
        o.id.toString().includes(q) ||
        (o.table_number && o.table_number.toLowerCase().includes(q))
      );
    }

    return list;
  };

  const filteredList = getFilteredOrders();

  // Configuración de visualización de preparación
  const getPrepBadgeStyles = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-status-pending/10 text-status-pending border-status-pending/20';
      case 'preparing':
        return 'bg-status-preparing/10 text-status-preparing border-status-preparing/20';
      case 'ready':
        return 'bg-status-ready/10 text-status-ready border-status-ready/20 animate-pulse';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getPrepLabel = (status) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'preparing': return 'En Cocina';
      case 'ready': return '¡Listo!';
      default: return status;
    }
  };

  return (
    <ProtectedRoute allowedRoles={['cajero', 'admin']}>
      <div className="min-h-screen bg-dark flex flex-col font-inter">
        <Navbar />

        {/* 🔔 Toast de Nuevos Pedidos en Cocina/Bar */}
        <div className="fixed top-16 left-0 right-0 sm:left-auto sm:right-4 sm:top-20 z-50 flex flex-col gap-2 px-3 sm:px-0 pointer-events-none">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="pointer-events-auto animate-fade-in bg-gold/10 backdrop-blur-xl border border-gold/30 rounded-xl px-4 py-3 shadow-2xl flex items-center gap-3 w-full sm:min-w-[280px]"
            >
              <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm">🔔</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gold font-bold text-xs">¡Nuevo Pedido Entrado!</p>
                <p className="text-gray-400 text-[10px] truncate">{notif.mesa} • Listo para ver en panel</p>
              </div>
              <button
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
                className="text-gray-600 hover:text-white text-[10px] p-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="fixed top-20 right-4 z-50 animate-slide-in pointer-events-none">
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-md">
              <p className="font-semibold">{successToast}</p>
            </div>
          </div>
        )}

        {/* Cuerpo Principal del Panel */}
        <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">

          {/* PANEL IZQUIERDO: LISTA DE PEDIDOS */}
          <div className={`flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto ${selectedOrder ? 'hidden lg:flex' : 'flex'}`}>
            {dbError === 'column_missing' ? (
              <div className="flex-1 flex items-center justify-center p-2 sm:p-4">
                <div className="max-w-xl w-full glass rounded-3xl p-6 sm:p-8 border border-gold/30 shadow-[0_0_50px_rgba(212,168,67,0.1)] text-center space-y-6">
                  <div className="w-16 h-16 bg-gold/10 rounded-full border border-gold/40 flex items-center justify-center mx-auto text-3xl animate-bounce">
                    ⚠️
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-lg sm:text-xl font-black text-gold">¡Actualización de Base de Datos Requerida!</h2>
                    <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
                      Detectamos que tu tabla <code className="bg-black/40 px-1.5 py-0.5 rounded text-white font-mono">orders</code> en Supabase no cuenta con las columnas necesarias para el funcionamiento de la Caja (<code className="bg-black/40 px-1.5 py-0.5 rounded text-white font-mono">payment_status</code> y <code className="bg-black/40 px-1.5 py-0.5 rounded text-white font-mono">payment_method</code>).
                    </p>
                  </div>

                  <div className="bg-black/35 border border-dark-border rounded-2xl p-4 text-left space-y-3 text-xs sm:text-sm">
                    <p className="text-white font-bold flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center text-[10px] text-gold font-mono">1</span>
                      Abre el panel de control de Supabase:
                    </p>
                    <a 
                      href="https://supabase.com/dashboard" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="inline-flex items-center gap-1.5 text-xs text-gold hover:underline bg-gold/10 px-3 py-1.5 rounded-xl border border-gold/25 font-bold transition-all ml-7"
                    >
                      Ir a Supabase Dashboard ↗
                    </a>

                    <p className="text-white font-bold flex items-center gap-2 pt-1">
                      <span className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center text-[10px] text-gold font-mono">2</span>
                      Ve a la pestaña <b>SQL Editor</b> en el menú izquierdo de tu proyecto.
                    </p>

                    <p className="text-white font-bold flex items-center gap-2 pt-1">
                      <span className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center text-[10px] text-gold font-mono">3</span>
                      Abre el archivo local <code className="bg-black/40 px-1.5 py-0.5 rounded text-white font-mono">supabase-schema.sql</code>, copia todo su contenido, pégalo en el editor de Supabase y presiona <b>Run (Ejecutar)</b>.
                    </p>

                    <p className="text-white font-bold flex items-center gap-2 pt-1">
                      <span className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center text-[10px] text-gold font-mono">4</span>
                      Una vez completado, haz clic en este botón para cargar la caja:
                    </p>
                  </div>

                  <button
                    onClick={fetchOrders}
                    className="w-full py-3.5 btn-gold rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-gold/15 cursor-pointer text-xs"
                  >
                    🔄 Reintentar Cargar Caja
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <span>💵</span> Facturación de Caja
                    </h2>
                    <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Control de cuentas y recibos en tiempo real</p>
                  </div>

                  {/* Estadísticas rápidas */}
                  <div className="flex items-center gap-2 bg-dark-card border border-dark-border px-4 py-2 rounded-xl">
                    <span className="text-gold font-bold text-lg sm:text-xl">
                      {orders.length}
                    </span>
                    <span className="text-gray-400 text-[10px] sm:text-xs leading-none">
                      cuentas<br />pendientes
                    </span>
                  </div>
                </div>

                {/* Pestañas de Filtros */}
                <div className="flex gap-2 p-1 bg-dark-card border border-dark-border rounded-xl mb-4">
                  <button
                    onClick={() => { setActiveTab('pending_payment'); resetCheckout(); }}
                    className={`flex-1 py-2 text-center text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === 'pending_payment'
                      ? 'bg-gold/15 text-gold border border-gold/25'
                      : 'text-gray-400 hover:text-white hover:bg-dark-hover'
                      }`}
                  >
                    📥 Todos ({orders.length})
                  </button>
                  <button
                    onClick={() => { setActiveTab('ready_payment'); resetCheckout(); }}
                    className={`flex-1 py-2 text-center text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === 'ready_payment'
                      ? 'bg-status-ready/15 text-status-ready border border-status-ready/20'
                      : 'text-gray-400 hover:text-white hover:bg-dark-hover'
                      }`}
                  >
                    🍽️ Listos ({orders.filter(o => o.status === 'ready').length})
                  </button>
                  <button
                    onClick={() => { setActiveTab('paid_history'); resetCheckout(); }}
                    className={`flex-1 py-2 text-center text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === 'paid_history'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-gray-400 hover:text-white hover:bg-dark-hover'
                      }`}
                  >
                    ✅ Pagados ({paidOrders.length})
                  </button>
                </div>

                {/* Input de Búsqueda */}
                <div className="relative mb-4">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">🔍</span>
                  <input
                    type="text"
                    placeholder="Buscar por Mesa o N° de Pedido..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl input-dark text-xs sm:text-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Lista de Pedidos en formato Grid/Cards */}
                {loading && filteredList.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-500 py-12">
                    <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin mb-3"></div>
                    <p className="text-sm">Cargando pedidos de caja...</p>
                  </div>
                ) : filteredList.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-600 py-16">
                    <span className="text-5xl mb-4">🧾</span>
                    <p className="text-base font-semibold text-gray-400">No se encontraron pedidos</p>
                    <p className="text-xs text-gray-600 mt-1 max-w-xs">
                      {activeTab === 'paid_history'
                        ? 'Los pedidos que cobres aparecerán registrados aquí.'
                        : 'Los pedidos creados por los meseros aparecerán para cobro automáticamente.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-8">
                    {filteredList.map((order) => {
                      const isSelected = selectedOrder?.id === order.id;
                      const totalItems = order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
                      const formattedTotal = parseFloat(order.total).toLocaleString('es-CO');

                      return (
                        <div
                          key={order.id}
                          onClick={() => {
                            setSelectedOrder(order);
                            setPaymentMethod(order.payment_method || '');
                            setCashReceived('');
                            setCustomCashInput(false);
                          }}
                          className={`group relative flex flex-col p-4 rounded-xl cursor-pointer transition-all duration-300 ${isSelected
                            ? 'bg-gold/10 border-2 border-gold shadow-[0_0_15px_rgba(212,168,67,0.15)] scale-[1.01]'
                            : 'bg-dark-card hover:bg-dark-hover border-2 border-dark-border hover:border-gold/30'
                            }`}
                        >
                          {/* Header */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex flex-col">
                              <span className="text-white font-bold text-base sm:text-lg">
                                Pedido #{order.id}
                              </span>
                              <span className="text-[10px] text-gray-500 font-mono">
                                {formatDate(order.created_at)}
                              </span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getPrepBadgeStyles(order.status)}`}>
                              {getPrepLabel(order.status)}
                            </span>
                          </div>

                          {/* Mesa e Información del Creador */}
                          <div className="flex items-center justify-between text-xs text-gray-300 bg-black/30 px-3 py-1.5 rounded-lg mb-3">
                            <span className="text-gold font-bold">
                              📍 {order.table_number || 'Llevar'}
                            </span>
                            <span className="text-gray-400 truncate max-w-[120px]">
                              👤 {order.profiles?.full_name || 'Mesero'}
                            </span>
                          </div>

                          {/* Items pre-visualización rápida */}
                          <div className="text-xs text-gray-500 line-clamp-2 flex-1 mb-3">
                            {order.order_items?.map((item, idx) => (
                              <span key={idx} className="mr-2">
                                <span className="text-gold/80 font-medium">{item.quantity}x</span> {item.product_name}
                                {idx < order.order_items.length - 1 ? ',' : ''}
                              </span>
                            ))}
                          </div>

                          {/* Divider */}
                          <div className="w-full h-px bg-dark-border mb-3 group-hover:bg-gold/20 transition-colors" />

                          {/* Total */}
                          <div className="flex items-center justify-between mt-auto">
                            <span className="text-[10px] text-gray-400">
                              {totalItems} {totalItems === 1 ? 'producto' : 'productos'}
                            </span>
                            <span className="text-gold font-bold text-base sm:text-lg">
                              ${formattedTotal} COP
                            </span>
                          </div>

                          {/* Sello de Cobrado / Pendiente en la esquina */}
                          <div className="absolute top-2 right-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {order.payment_status === 'paid' ? (
                              <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded font-mono uppercase">★ PAGADO ★</span>
                            ) : (
                              <span className="bg-status-pending/20 text-status-pending text-[9px] px-1.5 py-0.5 rounded font-mono uppercase">★ PENDIENTE ★</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* PANEL DERECHO: TICKET FISCAL Y CHECKOUT */}
          <div
            className={`
              w-full lg:w-[480px] xl:w-[520px] bg-dark-card border-t lg:border-t-0 lg:border-l border-dark-border flex flex-col h-full
              ${selectedOrder ? 'flex' : 'hidden lg:flex'}
            `}
          >
            {/* Header del panel derecho (para móviles, botón de volver) */}
            <div className="lg:hidden p-4 border-b border-dark-border flex justify-between items-center bg-dark-card">
              <button
                onClick={resetCheckout}
                className="text-xs text-gold font-bold flex items-center gap-1 bg-gold/10 px-3 py-1.5 rounded-lg border border-gold/20"
              >
                ⬅ Volver a Pedidos
              </button>
              <h3 className="font-bold text-white text-sm">Detalle de Factura</h3>
            </div>

            {selectedOrder ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden">

                {/* 1. Recibo de papel térmico (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 md:pb-6 bg-dark-surface/40 flex flex-col items-center">

                  {/* Digital Thermal Ticket Container */}
                  <div className="w-full max-w-sm bg-[#FDFBF7] text-[#1E1B18] shadow-2xl p-6 font-mono text-xs border-t-8 border-b-8 border-dashed border-[#E3D9C9] rounded-sm relative overflow-hidden select-none animate-slide-up">

                    {/* Serrated paper cut visual indicator */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#E3D9C9]/50 to-transparent"></div>

                    {/* Stamp Visual Layer */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none select-none">
                      {selectedOrder.payment_status === 'paid' ? (
                        <div className="border-4 double border-emerald-600/70 text-emerald-600/70 text-center uppercase tracking-widest font-black p-3 text-lg border-double rotate-[15deg] whitespace-nowrap scale-110 bg-[#FDFBF7]/85 shadow-md rounded animate-fade-in">
                          ★ COBRADO ★
                          <div className="text-[9px] font-medium tracking-normal mt-0.5">
                            {selectedOrder.payment_method?.toUpperCase()} • {formatDate(selectedOrder.updated_at || selectedOrder.created_at)}
                          </div>
                        </div>
                      ) : (
                        <div className="border-4 border-dashed border-red-600/60 text-red-600/60 text-center uppercase tracking-widest font-black p-3 text-lg -rotate-[15deg] whitespace-nowrap scale-105 bg-[#FDFBF7]/85 rounded animate-pulse">
                          ★ POR COBRAR ★
                          <div className="text-[9px] font-medium tracking-normal mt-0.5">CAJA GOLDEN</div>
                        </div>
                      )}
                    </div>

                    {/* Receipt Body */}
                    <div className="text-center mb-4">
                      <span className="font-bold text-sm block">🍔 GOLDEN DRINK & BURGER 🍔</span>
                      <span className="text-[10px] text-gray-500 block">NIT: 901.456.789-2</span>
                      <span className="text-[10px] text-gray-500 block">Calle 45 #89-02, Bogotá</span>
                      <span className="text-[10px] text-gray-500 block">Teléfono: +57 (321) 456-7890</span>
                      <div className="border-b border-dashed border-gray-400 my-2"></div>
                      <span className="font-bold block text-sm">FACTURA DE VENTA DE CAJA</span>
                      <span className="block mt-1">Pedido N° {selectedOrder.id}</span>
                    </div>

                    {/* Metadata table */}
                    <div className="space-y-1 text-[10px] text-gray-600 mb-4 bg-black/[0.02] p-2 rounded">
                      <div className="flex justify-between">
                        <span>MESA:</span>
                        <span className="font-bold text-[#1E1B18]">{selectedOrder.table_number || 'PARA LLEVAR'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>FECHA:</span>
                        <span>{formatDate(selectedOrder.created_at)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>MESERO:</span>
                        <span className="uppercase">{selectedOrder.profiles?.full_name || 'DESCONOCIDO'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ESTADO PREP:</span>
                        <span className="font-bold">{getPrepLabel(selectedOrder.status).toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="border-b border-dashed border-gray-400 my-3"></div>

                    {/* Products details */}
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-dashed border-gray-400 font-bold text-[10px]">
                          <th className="pb-1">CANT & PRODUCTO</th>
                          <th className="pb-1 text-right">TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.order_items?.map((item, idx) => (
                          <tr key={idx} className="border-b border-dotted border-gray-200">
                            <td className="py-2 pr-2 leading-tight">
                              <span className="font-bold">{item.quantity}x</span> {item.product_name}
                              <div className="text-[9px] text-gray-400 font-normal">
                                c/u: $${parseFloat(item.price).toLocaleString('es-CO')}
                              </div>
                            </td>
                            <td className="py-2 text-right valign-top font-bold">
                              $${(item.price * item.quantity).toLocaleString('es-CO')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="border-b border-dashed border-gray-400 my-3"></div>

                    {/* Totales */}
                    <div className="space-y-1.5 font-bold text-xs">
                      <div className="flex justify-between font-normal text-[10px] text-gray-600">
                        <span>Subtotal Neto:</span>
                        <span>$${(parseFloat(selectedOrder.total) * 0.92).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="flex justify-between font-normal text-[10px] text-gray-600">
                        <span>Impoconsumo (8% incl.):</span>
                        <span>$${(parseFloat(selectedOrder.total) * 0.08).toLocaleString('es-CO', { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t border-dashed border-gray-400 pt-2 font-black text-black">
                        <span>TOTAL A PAGAR:</span>
                        <span>$${parseFloat(selectedOrder.total).toLocaleString('es-CO')} COP</span>
                      </div>
                    </div>

                    <div className="border-b border-dashed border-gray-400 my-3"></div>

                    {/* Footer del recibo */}
                    <div className="text-center text-[9px] text-gray-500 space-y-1">
                      <span>¡GRACIAS POR TU PREFERENCIA!</span>
                      <span className="block">Propina voluntaria no incluida en la factura.</span>
                      <span className="block font-bold">SISTEMA POS - GOLDEN DRINK</span>
                    </div>
                  </div>

                  {/* Botón de limpiar selección en Desktop si ya está cobrada */}
                  {selectedOrder.payment_status === 'paid' && (
                    <button
                      onClick={resetCheckout}
                      className="mt-4 px-6 py-2 bg-dark-card border border-dark-border text-gray-300 font-bold rounded-xl hover:text-white hover:bg-dark-hover text-xs transition-colors"
                    >
                      🗙 Cerrar Detalle / Nueva Factura
                    </button>
                  )}
                </div>

                {/* 2. Panel de métodos de pago y botones de acción */}
                <div className="p-4 sm:p-6 pb-28 md:pb-6 border-t border-dark-border bg-dark-card relative z-20">
                  {selectedOrder.payment_status === 'unpaid' ? (
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                        Seleccionar Método de Pago
                      </h4>

                      {/* Botones de métodos de pago */}
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => { setPaymentMethod('efectivo'); setCashReceived(''); }}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 font-medium transition-all ${paymentMethod === 'efectivo'
                            ? 'bg-gold/10 border-gold text-gold scale-[1.03]'
                            : 'bg-dark-surface border-dark-border text-gray-400 hover:text-white hover:border-gray-600'
                            }`}
                        >
                          <span className="text-xl sm:text-2xl mb-1">💵</span>
                          <span className="text-[10px] sm:text-xs">Efectivo</span>
                        </button>

                        <button
                          onClick={() => { setPaymentMethod('tarjeta'); setCashReceived(''); }}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 font-medium transition-all ${paymentMethod === 'tarjeta'
                            ? 'bg-gold/10 border-gold text-gold scale-[1.03]'
                            : 'bg-dark-surface border-dark-border text-gray-400 hover:text-white hover:border-gray-600'
                            }`}
                        >
                          <span className="text-xl sm:text-2xl mb-1">💳</span>
                          <span className="text-[10px] sm:text-xs">Tarjeta</span>
                        </button>

                        <button
                          onClick={() => { setPaymentMethod('transferencia'); setCashReceived(''); }}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 font-medium transition-all ${paymentMethod === 'transferencia'
                            ? 'bg-gold/10 border-gold text-gold scale-[1.03]'
                            : 'bg-dark-surface border-dark-border text-gray-400 hover:text-white hover:border-gray-600'
                            }`}
                        >
                          <span className="text-xl sm:text-2xl mb-1">📲</span>
                          <span className="text-[10px] sm:text-xs">Transferencia</span>
                        </button>
                      </div>

                      {/* Detalles dinámicos según el método seleccionado */}
                      {paymentMethod === 'efectivo' && (
                        <div className="bg-dark-surface p-4 rounded-xl border border-dark-border animate-fade-in space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-400">Total Factura:</span>
                            <span className="text-sm font-bold text-white">${parseFloat(selectedOrder.total).toLocaleString('es-CO')} COP</span>
                          </div>

                          {/* Botones de montos rápidos */}
                          <div className="grid grid-cols-4 gap-1.5">
                            <button
                              onClick={() => handleQuickCash(selectedOrder.total)}
                              className="py-1.5 px-1 bg-dark-card border border-dark-border text-[10px] font-semibold rounded text-gold hover:bg-gold/10 hover:text-white transition-all"
                            >
                              Exacto
                            </button>
                            <button
                              onClick={() => handleQuickCash(20000)}
                              className="py-1.5 px-1 bg-dark-card border border-dark-border text-[10px] font-semibold rounded text-gray-300 hover:bg-gold/10 hover:text-white transition-all"
                            >
                              $20k
                            </button>
                            <button
                              onClick={() => handleQuickCash(50000)}
                              className="py-1.5 px-1 bg-dark-card border border-dark-border text-[10px] font-semibold rounded text-gray-300 hover:bg-gold/10 hover:text-white transition-all"
                            >
                              $50k
                            </button>
                            <button
                              onClick={() => handleQuickCash(100000)}
                              className="py-1.5 px-1 bg-dark-card border border-dark-border text-[10px] font-semibold rounded text-gray-300 hover:bg-gold/10 hover:text-white transition-all"
                            >
                              $100k
                            </button>
                          </div>

                          {/* Campo de valor recibido */}
                          <div>
                            <label className="block text-[10px] text-gray-400 mb-1">Monto Recibido de Cliente (COP):</label>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-bold">$</span>
                              <input
                                type="number"
                                placeholder="Ingresar valor..."
                                value={cashReceived}
                                onChange={(e) => {
                                  setCashReceived(e.target.value);
                                  setCustomCashInput(true);
                                }}
                                className="w-full pl-7 pr-3 py-2 rounded-lg bg-dark border border-dark-border text-white text-sm focus:outline-none focus:border-gold"
                              />
                            </div>
                          </div>

                          {/* Cambio (Vuelto) */}
                          <div className="flex justify-between items-center pt-2 border-t border-dark-border">
                            <span className="text-xs text-gray-400">Vuelto / Cambio a Entregar:</span>
                            <span className={`text-base font-extrabold ${parseFloat(cashReceived) >= parseFloat(selectedOrder.total) ? 'text-status-ready' : 'text-status-pending'}`}>
                              ${vuelto.toLocaleString('es-CO')} COP
                            </span>
                          </div>
                        </div>
                      )}

                      {paymentMethod === 'tarjeta' && (
                        <div className="bg-dark-surface p-3.5 rounded-xl border border-dark-border animate-fade-in flex items-center gap-3">
                          <span className="text-2xl">💳</span>
                          <p className="text-[11px] text-gray-400 leading-normal">
                            Inserta o aproxima la tarjeta del cliente en el datáfono. Una vez el datáfono imprima el recibo de <span className="text-white font-semibold">transacción aprobada</span>, confirma el cobro aquí abajo.
                          </p>
                        </div>
                      )}

                      {paymentMethod === 'transferencia' && (
                        <div className="bg-dark-surface p-3.5 rounded-xl border border-dark-border animate-fade-in space-y-2 text-xs">
                          <p className="text-[11px] text-gray-400 leading-normal mb-1">
                            El cliente debe transferir el valor exacto a las cuentas del comercio. Solicita el comprobante digital:
                          </p>
                          <div className="grid grid-cols-2 gap-2 bg-black/40 p-2 rounded-lg text-[10px] font-mono text-gray-300">
                            <div>
                              <p className="text-gold font-bold">📲 NEQUI</p>
                              <p>321-456-7890</p>
                            </div>
                            <div>
                              <p className="text-gold font-bold">🏦 BANCOLOMBIA</p>
                              <p>Ahorros: 123-456-7890</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Botón de enviar definitivo */}
                      <button
                        onClick={handleProcessPayment}
                        disabled={submitting || !paymentMethod || (paymentMethod === 'efectivo' && (parseFloat(cashReceived) || 0) < parseFloat(selectedOrder.total))}
                        className="w-full py-3.5 bg-gradient-to-tr from-gold to-yellow-500 disabled:from-gray-700 disabled:to-gray-800 text-black font-extrabold rounded-xl shadow-[0_4px_20px_rgba(212,168,67,0.15)] hover:shadow-[0_8px_25px_rgba(212,168,67,0.25)] hover:scale-[1.01] active:scale-[0.99] transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {submitting ? (
                          <>
                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                            Procesando Pago...
                          </>
                        ) : (
                          <>
                            <span>💸</span> Registrar Pago y Cerrar Cuenta
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center space-y-1">
                        <span className="text-2xl block">🎉</span>
                        <h4 className="text-emerald-400 font-extrabold text-sm uppercase">¡Cuenta Cerrada con Éxito!</h4>
                        <p className="text-xs text-gray-400">El pago fue registrado el {formatDate(selectedOrder.updated_at)}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={handlePrintReceipt}
                          className="py-3 px-4 bg-dark-surface border border-gold/40 text-gold hover:bg-gold/15 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                        >
                          <span>🖨️</span> Imprimir Recibo
                        </button>

                        <button
                          onClick={resetCheckout}
                          className="py-3 px-4 bg-gold text-black hover:bg-gold-dark font-extrabold rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
                        >
                          <span>🎟️</span> Siguiente Factura
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-600">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-gold/25 flex items-center justify-center mb-6">
                  <span className="text-4xl">📥</span>
                </div>
                <h3 className="text-lg font-bold text-gray-400">Ningún Pedido Seleccionado</h3>
                <p className="text-xs text-gray-600 mt-2 max-w-xs leading-normal">
                  Selecciona una orden de la lista izquierda para previsualizar el ticket térmico, calcular el cambio y procesar la facturación.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
