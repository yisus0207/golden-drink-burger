'use client';

export default function Cart({ items, total, onRemove, onUpdateQuantity, onSend, sending }) {
  return (
    <div className="w-[380px] min-w-[340px] bg-dark-card border-l border-dark-border flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-dark-border">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          🛒 Pedido Actual
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {items.length === 0 ? 'Sin productos' : `${items.length} producto${items.length > 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-center text-gray-600 py-12">
            <p className="text-4xl mb-3">🛒</p>
            <p className="text-sm">Selecciona productos del menú</p>
            <p className="text-xs mt-1 text-gray-700">para agregar al pedido</p>
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              className="bg-dark-surface rounded-xl p-3 animate-slide-in border border-dark-border/50"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-white text-sm font-medium flex-1 pr-2">{item.name}</h4>
                <button
                  onClick={() => onRemove(item.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors text-xs p-1"
                  title="Eliminar"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdateQuantity(item.id, -1)}
                    className="w-7 h-7 bg-dark-border rounded-lg flex items-center justify-center text-white hover:bg-gold/20 hover:text-gold transition-colors text-sm font-bold"
                  >
                    −
                  </button>
                  <span className="text-white font-semibold text-sm w-6 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.id, 1)}
                    className="w-7 h-7 bg-dark-border rounded-lg flex items-center justify-center text-white hover:bg-gold/20 hover:text-gold transition-colors text-sm font-bold"
                  >
                    +
                  </button>
                </div>
                <span className="text-gold font-semibold text-sm">
                  ${(item.price * item.quantity).toLocaleString('es-CO')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Total + Enviar */}
      <div className="p-5 border-t border-dark-border space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 font-medium">Total</span>
          <span className="text-gold font-bold text-2xl">
            ${total.toLocaleString('es-CO')}
          </span>
        </div>
        <button
          onClick={onSend}
          disabled={items.length === 0 || sending}
          className="w-full py-4 btn-gold rounded-xl text-lg flex items-center justify-center gap-2"
        >
          {sending ? (
            <>
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Enviando...
            </>
          ) : (
            <>📤 Enviar Pedido</>
          )}
        </button>
      </div>
    </div>
  );
}
