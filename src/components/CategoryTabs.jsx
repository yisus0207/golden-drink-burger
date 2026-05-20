'use client';

export default function CategoryTabs({ categories, selected, onSelect }) {
  const getEmoji = (category) => {
    const name = category.name.toLowerCase();
    if (name.includes('hamburguesa') || name.includes('burger')) return '🍔';
    if (name.includes('granizado') || name.includes('bebida') || name.includes('drink') || name.includes('jugo') || name.includes('lulo') || name.includes('fresa')) return '🍹';
    if (name.includes('sandwich') || name.includes('sándwich') || name.includes('pan')) return '🥪';
    if (name.includes('perro') || name.includes('hot dog')) return '🌭';
    if (name.includes('papa') || name.includes('frita')) return '🍟';
    if (name.includes('postre') || name.includes('dulce')) return '🍰';
    
    // Fallback por ID
    const emojiMap = { 1: '🍹', 2: '🍔' };
    return emojiMap[category.id] || '📦';
  };

  return (
    <div className="flex flex-wrap gap-2 w-full items-center">
      {/* Opción "Todos" para búsqueda total */}
      <button
        onClick={() => onSelect(null)}
        className={`flex-1 sm:flex-none justify-center py-3 px-3 sm:py-2.5 sm:px-5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 active:scale-95 ${
          selected === null
            ? 'bg-gold text-black shadow-lg shadow-gold/25 scale-105'
            : 'bg-dark-surface text-gray-400 border border-dark-border hover:border-gold/30 hover:text-gold'
        }`}
      >
        <span>🍽️</span>
        Todos
      </button>

      {categories.map(category => (
        <button
          key={category.id}
          onClick={() => onSelect(category.id)}
          className={`flex-1 sm:flex-none justify-center py-3 px-3 sm:py-2.5 sm:px-5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 active:scale-95 ${
            selected === category.id
              ? 'bg-gold text-black shadow-lg shadow-gold/25 scale-105'
              : 'bg-dark-surface text-gray-400 border border-dark-border hover:border-gold/30 hover:text-gold'
          }`}
        >
          <span className="text-base">{getEmoji(category)}</span>
          <span>{category.name}</span>
        </button>
      ))}
    </div>
  );
}

