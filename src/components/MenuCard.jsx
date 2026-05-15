'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

export default function MenuCard({ item, index, onClick }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-slide-up');
          entry.target.style.opacity = '1';
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      style={{ 
        opacity: 0, 
        animationDelay: `${index * 100}ms` 
      }}
      className="group relative bg-dark-card border border-dark-border rounded-[16px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-gold/50 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(212,168,67,0.15)] cursor-pointer active:scale-95"
    >
      {/* Badge */}
      {item.badge && (
        <div className="absolute top-1 left-1 z-10 px-1 py-0.5 bg-black/60 backdrop-blur-sm rounded border border-white/5">
          <span className="text-[6px] md:text-[8px] font-bold text-gold uppercase tracking-tighter">
            {item.badge}
          </span>
        </div>
      )}

      {/* Image Container */}
      <div className="relative aspect-[21/9] w-full bg-dark-surface overflow-hidden">
        {/* Shimmer Skeleton */}
        {!isLoaded && (
          <div className="absolute inset-0 bg-gradient-to-r from-dark-surface via-gold/5 to-dark-surface bg-[length:200%_100%] animate-[shimmer_1.5s_infinite] pulse-gold" />
        )}
        
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          loading="lazy"
          className={`object-cover transition-transform duration-700 group-hover:scale-110 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setIsLoaded(true)}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-card via-transparent to-transparent opacity-60" />
      </div>

      {/* Content */}
      <div className="p-2 md:p-3 flex flex-col h-full">
        <h3 className="text-[10px] md:text-[14px] font-bold text-white mb-0.5 font-outfit group-hover:text-gold transition-colors whitespace-nowrap overflow-hidden">
          {item.name}
        </h3>
        <p className="text-gray-500 text-[8px] md:text-xs leading-tight mb-2 flex-grow">
          {item.description?.split(' ').slice(0, 10).join(' ')}
          {item.description?.split(' ').length > 10 ? '...' : ''}
        </p>
        
        <div className="flex items-center justify-between mt-auto">
          <span className="text-[10px] md:text-xl font-bold text-gold font-dm-sans">
            {formatPrice(item.price)}
          </span>
          <div className="hidden md:flex w-6 h-6 rounded-full border border-gold/20 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-gold text-[10px]">✨</span>
          </div>
        </div>
      </div>
    </div>
  );
}
