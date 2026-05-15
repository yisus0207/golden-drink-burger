'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import MenuCard from '@/components/MenuCard';
import PublicFooter from '@/components/PublicFooter';

const menuData = {
  hamburguesas: [
    {
      name: 'Golden Classic',
      description: 'Carne angus 180g, queso cheddar, lechuga, tomate, cebolla caramelizada y nuestra salsa secreta',
      price: 28000,
      badge: '🔥 Popular',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80'
    },
    {
      name: 'BBQ Bacon King',
      description: 'Doble carne, bacon crujiente, salsa BBQ artesanal, queso americano y aros de cebolla',
      price: 35000,
      badge: '✨ Especial',
      image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&q=80'
    },
    {
      name: 'Mushroom Swiss',
      description: 'Champiñones salteados, queso suizo derretido, rúcula fresca y mayo de trufa',
      price: 32000,
      image: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=600&q=80'
    },
    {
      name: 'Crispy Chicken',
      description: 'Pollo crocante al estilo sureño, coleslaw casero, jalapeños y salsa miel-mostaza',
      price: 30000,
      image: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=600&q=80'
    }
  ],
  granizados: [
    {
      name: 'Mango Tropical',
      description: 'Mango Tommy fresco, limón, chamoy y tajín. Refrescante y adictivo',
      price: 12000,
      badge: '🔥 Popular',
      image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&q=80'
    },
    {
      name: 'Blue Lagoon',
      description: 'Maracuyá, mora azul, coco y menta fresca. Visualmente impresionante',
      price: 13000,
      badge: '✨ Nuevo',
      image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&q=80'
    },
    {
      name: 'Fresa Kiwi',
      description: 'Fresas frescas, kiwi, leche condensada y hielo granizado',
      price: 11000,
      image: 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=600&q=80'
    }
  ],
  acompañamientos: [
    {
      name: 'Papas Golden',
      description: 'Papas fritas con sazón secreto Golden, doradas y crocantes',
      price: 8000,
      badge: '🔥 Popular',
      image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&q=80'
    },
    {
      name: 'Aros de Cebolla',
      description: 'Aros de cebolla empanizados con panko, crocantes por fuera y tiernos por dentro',
      price: 9000,
      image: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=600&q=80'
    }
  ],
  postres: [
    {
      name: 'Brownie Golden',
      description: 'Brownie de chocolate oscuro tibio con helado de vainilla y caramelo dorado',
      price: 10000,
      badge: '✨ Especial',
      image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&q=80'
    }
  ]
};

export default function Home() {
  const [menuItems, setMenuItems] = useState(menuData);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    async function fetchMenu() {
      try {
        // Intentar cargar de Supabase
        const { data, error } = await supabase
          .from('products')
          .select('*, categories(name)')
          .eq('available', true);

        if (error) throw error;

        if (data && data.length > 0) {
          const grouped = data.reduce((acc, item) => {
            const catName = item.categories?.name || 'Otros';
            if (!acc[catName]) acc[catName] = [];
            acc[catName].push({
              name: item.name,
              description: item.description,
              price: item.price,
              image: item.image_url || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
              badge: item.price > 30000 ? '✨ Especial' : null
            });
            return acc;
          }, {});
          setMenuItems(grouped);
        }
      } catch (err) {
        console.error('Error fetching menu from Supabase:', err);
        // No hacemos nada aquí porque ya inicializamos con menuData (fallback)
      } finally {
        setLoading(false);
      }
    }

    fetchMenu();
    
    // Timeout de seguridad: si en 3 segundos no cargó Supabase, quitar el loader y mostrar fallback
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-dark text-white selection:bg-gold/30 selection:text-gold overflow-x-hidden">
      {/* Header / Nav */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-gold/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍔</span>
            <span className="text-xl font-bold font-playfair text-gold tracking-tight">Golden</span>
          </div>
          <Link 
            href="/login" 
            className="px-6 py-2 bg-gold text-black rounded-full text-sm font-bold hover:bg-gold-light transition-all shadow-[0_0_15px_rgba(212,168,67,0.3)]"
          >
            SISTEMA POS
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-[70vh] flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-dark/70 z-10" />
          <img 
            src="/hero-main.png" 
            alt="Hero Background" 
            className="w-full h-full object-cover scale-105 animate-[pulse_10s_infinite_alternate]"
          />
        </div>
        
        <div className="relative z-20 text-center px-6 max-w-4xl animate-fade-in">
          <h1 className="text-4xl md:text-7xl font-playfair text-white mb-6 tracking-tight leading-tight">
            Sabor que <span className="text-gold italic">Brilla</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 font-light max-w-2xl mx-auto mb-10 leading-relaxed">
            Descubre la combinación perfecta de hamburguesas artesanales y granizados premium en un ambiente diseñado para brillar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="#productos" 
              className="px-8 py-4 bg-gold text-black rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_8px_24px_rgba(212,168,67,0.3)]"
            >
              Ver el Menú
            </a>
            <Link 
              href="/login" 
              className="px-8 py-4 glass border border-gold/30 text-gold rounded-xl font-bold transition-all hover:bg-gold/10"
            >
              Acceso Staff
            </Link>
          </div>
        </div>
      </section>

      {/* Menu Sections */}
      <main className="max-w-6xl mx-auto px-6 py-20" id="productos">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-gold/20 border-t-gold rounded-full animate-spin mb-4" />
            <p className="text-gold font-light tracking-widest uppercase text-xs">Cargando Menú...</p>
          </div>
        ) : (
          Object.entries(menuItems).map(([category, items]) => (
            <section key={category} id={category.toLowerCase()} className="mb-24 last:mb-0">
              <div className="flex items-center gap-4 mb-10">
                <h2 className="text-3xl md:text-4xl font-playfair text-gold capitalize tracking-tight">
                  {category}
                </h2>
                <div className="h-[1px] flex-grow bg-gradient-to-r from-gold/30 to-transparent" />
              </div>
              
              <div className="grid grid-cols-3 gap-3 md:gap-8">
                {items.map((item, index) => (
                  <MenuCard 
                    key={item.name} 
                    item={item} 
                    index={index} 
                    onClick={() => setSelectedItem(item)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      <PublicFooter />

      {/* Product Detail Modal */}
      {selectedItem && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center px-4 animate-fade-in"
          onClick={() => setSelectedItem(null)}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          
          <div 
            className="relative bg-dark-card border border-gold/20 w-full max-w-lg rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(212,168,67,0.2)] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 z-50 w-10 h-10 bg-black/50 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-gold hover:text-black transition-all"
            >
              ✕
            </button>

            <div className="relative aspect-video w-full">
              <img 
                src={selectedItem.image} 
                alt={selectedItem.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-dark-card to-transparent" />
              {selectedItem.badge && (
                <div className="absolute bottom-4 left-6 px-3 py-1 bg-gold text-black text-[10px] font-bold rounded-full uppercase tracking-widest">
                  {selectedItem.badge}
                </div>
              )}
            </div>

            <div className="p-8">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-3xl font-playfair text-white font-bold">
                  {selectedItem.name}
                </h3>
                <span className="text-2xl font-bold text-gold font-dm-sans">
                  {new Intl.NumberFormat('es-CO', {
                    style: 'currency',
                    currency: 'COP',
                    maximumFractionDigits: 0
                  }).format(selectedItem.price)}
                </span>
              </div>
              
              <p className="text-gray-400 leading-relaxed mb-8 text-lg">
                {selectedItem.description}
              </p>

              <button 
                onClick={() => setSelectedItem(null)}
                className="w-full py-4 bg-gold text-black font-bold rounded-2xl hover:bg-gold-light transition-all shadow-lg active:scale-95"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
