'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const navLinks = [
    { href: '/pedidos', label: 'Pedidos', icon: '🛒', roles: ['mesero', 'admin'] },
    { href: '/caja', label: 'Caja', icon: '💵', roles: ['cajero', 'admin'] },
    { href: '/cocina', label: 'Cocina', icon: '👨‍🍳', roles: ['cocinero', 'admin'] },
    { href: '/admin', label: 'Admin', icon: '⚙️', roles: ['admin'] },
  ];

  const visibleLinks = navLinks.filter(link =>
    link.roles.includes(profile?.role)
  );

  return (
    <>
      <nav className="h-16 bg-dark-card border-b border-dark-border flex items-center justify-between px-6 sticky top-0 z-40">
        {/* Logo + Links */}
        <div className="flex items-center gap-6">
          <Link href="/pedidos" className="flex items-center gap-2 group">
            <span className="text-2xl group-hover:scale-110 transition-transform">🍔</span>
            <span className="text-gold font-bold text-sm sm:text-lg tracking-wide">
              Golden Drink & Burger
            </span>
          </Link>

          {/* Desktop Top Links (Hidden on Mobile) */}
          <div className="hidden md:flex items-center gap-1 ml-2">
            {visibleLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${pathname === link.href
                  ? 'bg-gold/10 text-gold border border-gold/20'
                  : 'text-gray-400 hover:text-white hover:bg-dark-hover'
                  }`}
              >
                <span>{link.icon}</span>
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* User info + Logout */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm text-white truncate max-w-[150px]">
              {profile?.full_name || profile?.email}
            </p>
            <p className="text-xs text-gold capitalize">{profile?.role}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm text-gray-400 hover:text-red-400 bg-dark-surface border border-dark-border rounded-lg hover:border-red-500/30 transition-all duration-200"
          >
            Salir
          </button>
        </div>
      </nav>

      {/* Floating Bottom Tab Bar (Only visible on Mobile) */}
      <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden backdrop-blur-xl bg-dark-card/85 border border-gold/15 shadow-[0_12px_30px_rgba(0,0,0,0.7)] px-4 py-2.5 rounded-2xl flex justify-around items-center animate-slide-up">
        {visibleLinks.map(link => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition-all duration-200 active:scale-90 relative ${isActive ? 'text-gold' : 'text-gray-400'
                }`}
            >
              <span className={`text-xl transition-transform duration-250 ${isActive ? 'scale-110 text-gold drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]' : ''}`}>
                {link.icon}
              </span>
              <span className="text-[9px] font-semibold tracking-wide uppercase">
                {link.label}
              </span>
              {isActive && (
                <span className="absolute -bottom-1 w-1.5 h-1.5 bg-gold rounded-full shadow-[0_0_8px_#d4af37] animate-pulse" />
              )}
            </Link>
          );
        })}
      </div>
    </>
  );
}
