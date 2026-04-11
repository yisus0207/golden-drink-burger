'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: authError } = await signIn(email, password);

    if (authError) {
      setError('Credenciales incorrectas. Verifica tu correo y contraseña.');
      setLoading(false);
      return;
    }

    // Obtener perfil para redirigir según el rol
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'cocinero') {
        router.push('/cocina');
      } else {
        router.push('/pedidos');
      }
    } else {
      router.push('/pedidos');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark p-4 relative overflow-hidden">
      {/* Decoraciones de fondo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gold/3 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gold/10 border border-gold/20 mb-5 animate-pulse-gold">
            <span className="text-5xl">🍔</span>
          </div>
          <h1 className="text-3xl font-bold text-gold tracking-tight">
            Golden Drink & Burger
          </h1>
          <p className="text-gray-500 mt-2 text-sm">Sistema de Gestión de Pedidos</p>
        </div>

        {/* Card de login */}
        <div className="glass rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-white mb-6">Iniciar Sesión</h2>

          {error && (
            <div className="mb-5 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm animate-fade-in">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 input-dark rounded-xl"
                placeholder="correo@ejemplo.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 input-dark rounded-xl"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 btn-gold rounded-xl text-base flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Ingresando...
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-700 text-xs mt-8">
          © 2026 Golden Drink & Burger — Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}
