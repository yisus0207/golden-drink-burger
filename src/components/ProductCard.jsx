'use client';

export default function ProductCard({ product, onAdd }) {
  const emoji = product.category_id === 1 ? '🍹' : '🍔';

  return (
    <div className="glass rounded-xl p-4 hover:border-gold/30 transition-all duration-200 group animate-fade-in cursor-pointer">
      {/* Icono del producto */}
      <div className="w-full h-24 bg-dark-surface rounded-lg flex items-center justify-center mb-3 group-hover:bg-gold/5 transition-colors duration-200">
        <span className="text-5xl group-hover:scale-110 transition-transform duration-200">
          {emoji}
        </span>
      </div>

      {/* Nombre */}
      <h3 className="text-white font-medium text-sm mb-1 truncate">{product.name}</h3>

      {/* Precio */}
      <p className="text-gold font-bold text-lg mb-3">
        ${product.price.toLocaleString('es-CO')}
      </p>

      {/* Botón agregar */}
      <button
        onClick={onAdd}
        className="w-full py-2.5 bg-gold/10 text-gold border border-gold/20 rounded-lg hover:bg-gold hover:text-black font-medium text-sm transition-all duration-200"
      >
        + Agregar
      </button>
    </div>
  );
}
