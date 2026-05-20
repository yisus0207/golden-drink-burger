'use client';

export default function ProductCard({ product, onAdd }) {
  const getProductEmoji = () => {
    const name = product.name.toLowerCase();
    if (name.includes('fresa')) return '🍓';
    if (name.includes('mango')) return '🥭';
    if (name.includes('maracuyá') || name.includes('passion')) return '🍊';
    if (name.includes('limón') || name.includes('limonada')) return '🍋';
    if (name.includes('lulo')) return '🍈';
    if (name.includes('mixto')) return '🍹';
    
    if (name.includes('bbq')) return '🥓';
    if (name.includes('doble')) return '🍔';
    if (name.includes('pollo')) return '🍗';
    if (name.includes('veggie') || name.includes('vegetariana')) return '🌱';
    if (name.includes('especial') || name.includes('golden')) return '👑';
    
    // Fallback por categoría
    return product.category_id === 1 ? '🍹' : '🍔';
  };

  return (
    <div 
      onClick={onAdd}
      className="glass rounded-2xl p-4 hover:border-gold/40 transition-all duration-200 group animate-fade-in cursor-pointer flex flex-col justify-between h-full active:scale-[0.98] active:bg-white/[0.02]"
    >
      <div>
        {/* Icono del producto con gradiente moderno */}
        <div className="w-full h-24 bg-gradient-to-b from-dark-surface to-dark/40 rounded-xl flex items-center justify-center mb-3.5 group-hover:from-gold/5 group-hover:to-gold/10 border border-dark-border group-hover:border-gold/20 transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-radial-gradient from-gold/0 to-gold/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <span className="text-5xl group-hover:scale-110 transition-transform duration-300 select-none filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]">
            {getProductEmoji()}
          </span>
        </div>

        {/* Nombre - Soporta hasta 2 líneas perfectamente alineadas */}
        <h3 
          className="text-white font-semibold text-sm leading-snug line-clamp-2 h-10 flex items-center text-left mb-1.5 group-hover:text-gold transition-colors duration-200" 
          title={product.name}
        >
          {product.name}
        </h3>
        
        {/* Descripción (si existe) */}
        <p 
          className="text-gray-500 text-[11px] line-clamp-1 h-4 mb-3" 
          title={product.description || ''}
        >
          {product.description || 'Delicioso y preparado al instante'}
        </p>
      </div>

      <div>
        {/* Precio */}
        <p className="text-gold font-bold text-lg mb-3 select-none">
          ${product.price.toLocaleString('es-CO')}
        </p>

        {/* Botón agregar */}
        <button
          onClick={(e) => {
            e.stopPropagation(); // Evita doble trigger si se hace click en el botón directamente
            onAdd();
          }}
          className="w-full py-2.5 bg-gold/10 text-gold border border-gold/20 rounded-xl hover:bg-gold hover:text-black font-semibold text-sm transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 shadow-sm hover:shadow-gold/10"
        >
          <span>➕</span>
          <span>Agregar</span>
        </button>
      </div>
    </div>
  );
}

