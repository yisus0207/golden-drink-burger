'use client';

export default function CategoryTabs({ categories, selected, onSelect }) {
  const emojis = { 1: '🍹', 2: '🍔' };

  return (
    <div className="flex gap-2 flex-wrap">
      {categories.map(category => (
        <button
          key={category.id}
          onClick={() => onSelect(category.id)}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
            selected === category.id
              ? 'bg-gold text-black shadow-lg shadow-gold/20 scale-105'
              : 'bg-dark-surface text-gray-400 border border-dark-border hover:border-gold/30 hover:text-gold'
          }`}
        >
          <span>{emojis[category.id] || '📦'}</span>
          {category.name}
        </button>
      ))}
    </div>
  );
}
