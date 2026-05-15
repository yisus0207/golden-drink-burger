'use client';

import { MapPin, Phone, Camera } from 'lucide-react';

export default function PublicFooter() {
  return (
    <footer className="bg-dark border-t border-gold/15 py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col items-center">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-playfair text-gold mb-2 tracking-tight">
            Golden Drink & Burger
          </h2>
          <p className="text-gray-500 text-sm font-light tracking-widest uppercase">
            Sabor que brilla, momentos que perduran
          </p>
        </div>

        {/* Social Links */}
        <div className="flex gap-6 mb-10">
          <a
            href="#"
            className="p-3 bg-dark-card border border-dark-border rounded-full text-gray-400 hover:text-gold hover:border-gold/30 transition-all duration-300"
            aria-label="Location"
          >
            <MapPin size={20} />
          </a>
          <a
            href="#"
            className="p-3 bg-dark-card border border-dark-border rounded-full text-gray-400 hover:text-gold hover:border-gold/30 transition-all duration-300"
            aria-label="Phone"
          >
            <Phone size={20} />
          </a>
          <a
            href="#"
            className="p-3 bg-dark-card border border-dark-border rounded-full text-gray-400 hover:text-gold hover:border-gold/30 transition-all duration-300"
            aria-label="Instagram"
          >
            <Camera size={20} />
          </a>
        </div>

        {/* Copyright */}
        <div className="w-full pt-8 border-t border-dark-border/50 text-center">
          <p className="text-gray-600 text-[12px] tracking-wide">
            © 2026 Golden Drink & Burger — Todos los derechos reservados
          </p>
        </div>
      </div>
    </footer>
  );
}
