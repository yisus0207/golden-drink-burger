'use client';

export default function Cart({ items, total, tables = [], tableNumber, onTableNumberChange, orderNotes = '', onNotesChange, onRemove, onUpdateQuantity, onSend, sending }) {
  return (
    <div className="w-full h-full flex flex-col bg-dark-card lg:border-l border-dark-border">
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

      {/* Opciones Adicionales (Mesa) */}
      {items.length > 0 && (
        <div className="px-5 py-3 border-t border-dark-border space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
              📍 Mesa
            </label>
            <div className="grid grid-cols-4 gap-2">
              {tables.map(t => (
                <button
                  key={t.id}
                  onClick={() => onTableNumberChange(t.name)}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-all border ${
                    tableNumber === t.name
                      ? 'bg-gold text-black border-gold shadow-[0_0_15px_rgba(255,215,0,0.3)] scale-105'
                      : 'bg-dark-surface text-gray-400 border-dark-border hover:border-gold/50 hover:text-white'
                  }`}
                >
                  {t.name.replace('Mesa ', '')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
              📝 Nota / Comentario para cocina
            </label>
            <textarea
              value={orderNotes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Ej: Término medio, sin cebolla, etc..."
              className="w-full bg-dark-surface border border-dark-border rounded-xl p-3 text-sm text-white focus:outline-none focus:border-gold/50 transition-all resize-none placeholder:text-gray-700 h-20"
            />
          </div>
        </div>
      )}

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
          disabled={items.length === 0 || !tableNumber.trim() || sending}
          className="w-full py-4 btn-gold rounded-xl text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
