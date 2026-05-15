'use client';

export default function OrderCard({ order, onStatusChange }) {
  const statusConfig = {
    pending: {
      label: 'Pendiente',
      bg: 'bg-status-pending/10',
      border: 'border-status-pending/30',
      text: 'text-status-pending',
      dot: 'bg-status-pending',
      nextAction: '👨‍🍳 Preparar',
      nextStatus: 'preparing',
    },
    preparing: {
      label: 'En Preparación',
      bg: 'bg-status-preparing/10',
      border: 'border-status-preparing/30',
      text: 'text-status-preparing',
      dot: 'bg-status-preparing',
      nextAction: '✅ Listo',
      nextStatus: 'ready',
    },
    ready: {
      label: 'Listo',
      bg: 'bg-status-ready/10',
      border: 'border-status-ready/30',
      text: 'text-status-ready',
      dot: 'bg-status-ready',
    },
  };

  const config = statusConfig[order.status] || statusConfig.pending;
  const timeAgo = getTimeAgo(order.created_at);

  return (
    <div className={`rounded-xl border-2 ${config.border} ${config.bg} p-5 animate-fade-in transition-all duration-300 hover:scale-[1.02]`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <span className="text-white font-bold text-xl">Pedido #{order.id}</span>
          {order.table_number && (
            <span className="text-gold font-medium text-sm">📍 {order.table_number}</span>
          )}
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.text} ${config.bg} border ${config.border} flex items-center gap-1.5`}>
          <span className={`w-2 h-2 rounded-full ${config.dot} animate-pulse`} />
          {config.label}
        </span>
      </div>

      {/* Línea divisora dorada */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent mb-3" />

      {/* Items */}
      <div className="space-y-2 mb-4">
        {order.order_items?.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-gray-300">
              <span className="text-gold font-semibold">{item.quantity}x</span>{' '}
              {item.product_name}
            </span>
          </div>
        ))}
      </div>

      {/* Time + Total */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
        <span>⏱ {timeAgo}</span>
        <span className="text-gold font-semibold">
          Total: ${order.total?.toLocaleString('es-CO')}
        </span>
      </div>

      {/* Action button */}
      {config.nextAction && (
        <button
          onClick={() => onStatusChange(order.id, config.nextStatus)}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
            order.status === 'pending'
              ? 'bg-status-preparing/20 text-status-preparing hover:bg-status-preparing hover:text-black border border-status-preparing/30'
              : 'bg-status-ready/20 text-status-ready hover:bg-status-ready hover:text-black border border-status-ready/30'
          }`}
        >
          {config.nextAction}
        </button>
      )}
    </div>
  );
}

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Hace un momento';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  return `Hace ${diffHours}h ${diffMins % 60}m`;
}
