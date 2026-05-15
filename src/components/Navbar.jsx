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
    { href: '/pedidos', label: 'Caja', icon: '🛒', roles: ['cajero', 'admin'] },
    { href: '/cocina', label: 'Cocina', icon: '👨‍🍳', roles: ['cocinero', 'admin'] },
    { href: '/admin', label: 'Admin', icon: '⚙️', roles: ['admin'] },
  ];

  const visibleLinks = navLinks.filter(link =>
    link.roles.includes(profile?.role)
  );

  return (
    <nav className="h-16 bg-dark-card border-b border-dark-border flex items-center justify-between px-6 sticky top-0 z-40">
      {/* Logo + Links */}
      <div className="flex items-center gap-6">
        <Link href="/pedidos" className="flex items-center gap-2 group">
          <span className="text-2xl group-hover:scale-110 transition-transform">🍔</span>
          <span className="text-gold font-bold text-lg hidden md:block">
            Golden Drink & Burger
          </span>
        </Link>

        <div className="flex items-center gap-1 ml-2">
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
          className="px-4 py-2 text-sm text-gray-400 hover:text-red-400 bg-dark-surface border border-dark-border rounded-lg hover:border-red-500/30 transition-all duration-200"
        >
          Salir
        </button>
      </div>
    </nav>
  );
}
