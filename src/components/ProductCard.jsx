import { useState } from 'react';

export default function ProductCard({ product, onAdd }) {
  const [quantity, setQuantity] = useState(1);

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
    
    return product.category_id === 1 ? '🍹' : '🍔';
  };

  const increment = (e) => {
    e.stopPropagation();
    setQuantity(prev => prev + 1);
  };

  const decrement = (e) => {
    e.stopPropagation();
    setQuantity(prev => Math.max(1, prev - 1));
  };

  return (
    <div className="glass rounded-2xl p-4 border border-dark-border hover:border-gold/30 transition-all duration-200 flex flex-col justify-between h-full group bg-dark-card/40">
      <div>
        <div className="w-full h-24 bg-gradient-to-b from-dark-surface to-dark/40 rounded-xl flex items-center justify-center mb-3.5 group-hover:from-gold/5 group-hover:to-gold/10 border border-dark-border group-hover:border-gold/20 transition-all duration-300 relative overflow-hidden">
          <span className="text-5xl group-hover:scale-110 transition-transform duration-300 select-none">
            {getProductEmoji()}
          </span>
        </div>

        <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2 h-10 flex items-center text-left mb-1" title={product.name}>
          {product.name}
        </h3>
        
        <p className="text-gray-500 text-[11px] line-clamp-1 h-4 mb-3">
          {product.description || 'Delicioso y preparado al instante'}
        </p>
      </div>

      <div className="space-y-4">
        <p className="text-gold font-bold text-lg select-none">
          ${product.price.toLocaleString('es-CO')}
        </p>

        {/* Selector de Cantidad */}
        <div className="flex items-center justify-between bg-black/30 rounded-xl p-1.5 border border-dark-border">
          <button 
            onClick={decrement}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-dark-border text-white hover:text-gold transition-colors font-bold text-lg"
          >
            −
          </button>
          <span className="text-white font-bold text-sm min-w-[20px] text-center">
            {quantity}
          </span>
          <button 
            onClick={increment}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-dark-border text-white hover:text-gold transition-colors font-bold text-lg"
          >
            +
          </button>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd(product, quantity);
            setQuantity(1); // Reset local despues de agregar
          }}
          className="w-full py-3 bg-gold/10 text-gold border border-gold/20 rounded-xl hover:bg-gold hover:text-black font-bold text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
        >
          <span>➕ Agregar</span>
        </button>
      </div>
    </div>
  );
}

