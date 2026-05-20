'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { playChatSound } from '@/lib/sounds';
import { usePathname } from 'next/navigation';

export default function ChatWidget() {
  const { user, profile } = useAuth();
  const pathname = usePathname();
  const isPedidosPage = pathname === '/pedidos';
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const messagesEndRef = useRef(null);
  const isOpenRef = useRef(isOpen);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sincronizar el número de artículos en el carrito
  useEffect(() => {
    const handleCartUpdate = (e) => {
      setCartCount(e.detail);
    };
    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, []);
  
  // No renderizar si no hay usuario o no está montado (evita hydration mismatch)
  if (!mounted || !user || !profile) return null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      scrollToBottom();
      setUnreadCount(0); // Limpiar no leídos al abrir
    }
  }, [isOpen, messages]);

  useEffect(() => {
    // Cargar historial de mensajes (últimos 50)
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (data) {
        // Invertimos porque los trajimos en orden descendente para tener los últimos 50
        setMessages(data.reverse());
      }
    };

    fetchMessages();

    // Suscripción a nuevos mensajes
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, (payload) => {
        const incomingMessage = payload.new;
        
        // Evitar duplicados si por alguna razón llega el mismo evento dos veces
        setMessages(prev => {
          if (prev.some(m => m.id === incomingMessage.id)) return prev;
          return [...prev, incomingMessage];
        });
        
        // Si no fui yo quien lo envió, verificamos el estado actual de isOpen vía la referencia
        if (incomingMessage.sender_id !== user.id) {
          if (!isOpenRef.current) {
            setUnreadCount(prev => prev + 1);
            playChatSound(); // Sonido distintivo para chat
          } else {
            playChatSound(); 
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]); // Solo suscribirse al montar y cuando cambie el user.id

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const tempMessage = newMessage;
    setNewMessage(''); // Limpiar el input rápido para mejor UX

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      sender_name: profile.full_name || profile.email,
      sender_role: profile.role,
      content: tempMessage
    });

    if (error) {
      console.error("Error al enviar mensaje:", error);
      alert("No se pudo enviar el mensaje. Revisa la consola.");
    }
  };

  // Determinar colores basados en el rol
  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'text-purple-400';
      case 'cocinero': return 'text-orange-400';
      case 'cajero': return 'text-blue-400';
      case 'mesero': return 'text-emerald-400';
      default: return 'text-gold';
    }
  };

  return (
    <>
      {/* 1. Desktop Floating Chat Button (Hidden on Mobile) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`hidden md:flex fixed bottom-6 right-6 z-50 items-center justify-center hover:scale-110 transition-transform duration-300 ${isOpen ? 'md:hidden' : 'md:flex'}`}
      >
        <div className="relative animate-float">
          <MessageCircle 
            className="w-16 h-16 text-gold drop-shadow-[0_10px_15px_rgba(212,175,55,0.4)]" 
            fill="currentColor" 
            strokeWidth={1.5} 
            stroke="#1a1a1a"
          />
          {unreadCount > 0 && !isOpen && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-dark shadow-lg">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </button>

      {/* 2. Mobile Floating Quick Actions Menu (Hidden on Desktop) */}
      {/* Overlay to close menu on tap outside */}
      {isMenuExpanded && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] md:hidden animate-fade-in"
          onClick={() => setIsMenuExpanded(false)}
        />
      )}

      {/* Quick Actions Trigger (Mobile Peek Tab) */}
      <button
        onClick={() => setIsMenuExpanded(!isMenuExpanded)}
        className={`md:hidden fixed right-0 bottom-40 z-50 flex items-center justify-center transition-all duration-300 active:scale-95 ${
          isMenuExpanded 
            ? 'translate-x-[-80px] bg-dark-card border-gold/40' 
            : 'translate-x-3.5 hover:translate-x-1 bg-gold/10 hover:bg-gold/20'
        } w-10 h-16 rounded-l-2xl border border-r-0 border-gold/30 shadow-[0_4px_25px_rgba(0,0,0,0.6)] group`}
      >
        <div className="flex flex-col items-center gap-1 text-gold">
          <span className={`text-[10px] font-bold transition-transform duration-300 ${isMenuExpanded ? 'rotate-180' : ''}`}>
            ◀
          </span>
          <div className="flex flex-col gap-0.5 opacity-60">
            <span className="w-1.5 h-1.5 bg-gold rounded-full"></span>
            <span className="w-1.5 h-1.5 bg-gold rounded-full"></span>
            <span className="w-1.5 h-1.5 bg-gold rounded-full"></span>
          </div>
          {(unreadCount > 0 || (isPedidosPage && cartCount > 0)) && !isMenuExpanded && (
            <span className="absolute -top-1 -left-1 w-3.5 h-3.5 bg-red-500 rounded-full animate-pulse border-2 border-dark" />
          )}
        </div>
      </button>

      {/* Chat Action Icon (Mobile Radial Fan) */}
      <button
        onClick={() => {
          setIsOpen(true);
          setIsMenuExpanded(false);
        }}
        className={`md:hidden fixed right-4 bottom-40 z-50 flex items-center justify-center transition-all duration-300 w-14 h-14 bg-dark-card border border-gold/30 rounded-full shadow-2xl ${
          isMenuExpanded 
            ? isPedidosPage 
              ? 'scale-100 translate-x-[-76px] translate-y-[-48px] opacity-100'
              : 'scale-100 translate-x-[-76px] translate-y-0 opacity-100'
            : 'scale-0 translate-x-0 translate-y-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="relative">
          <MessageCircle 
            className="w-8 h-8 text-gold" 
            fill="currentColor" 
            strokeWidth={1.5} 
            stroke="#1a1a1a"
          />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-dark shadow-md">
              {unreadCount}
            </span>
          )}
        </div>
      </button>

      {/* Cart Action Icon (Mobile Radial Fan - Only on /pedidos page) */}
      {isPedidosPage && (
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent('open-cart'));
            setIsMenuExpanded(false);
          }}
          className={`md:hidden fixed right-4 bottom-40 z-50 flex items-center justify-center transition-all duration-300 w-14 h-14 bg-gradient-to-tr from-gold to-yellow-400 text-black rounded-full shadow-2xl hover:scale-105 active:scale-95 ${
            isMenuExpanded 
              ? 'scale-100 translate-x-[-76px] translate-y-[48px] opacity-100'
              : 'scale-0 translate-x-0 translate-y-0 opacity-0 pointer-events-none'
          }`}
        >
          <div className="relative text-xl">
            🛒
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-dark shadow-md animate-bounce">
                {cartCount}
              </span>
            )}
          </div>
        </button>
      )}


      {/* Panel lateral de chat */}
      <div 
        className={`fixed top-0 right-0 h-[100dvh] w-full sm:w-[400px] bg-dark-surface/95 backdrop-blur-xl border-l border-dark-border z-40 transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header del Chat */}
        <div className="p-4 border-b border-dark-border flex items-center justify-between bg-dark-card flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold/10 rounded-full flex items-center justify-center border border-gold/20">
              <MessageCircle className="w-5 h-5 text-gold" fill="currentColor" strokeWidth={1.5} stroke="#1a1a1a" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Chat de Equipo</h3>
              <p className="text-xs text-status-ready flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-status-ready animate-pulse"></span>
                En línea
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-dark hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Área de mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-3 opacity-50">
              <MessageCircle className="w-12 h-12 text-gray-500" strokeWidth={1} />
              <p className="text-sm">Inicia la conversación...</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === user.id;
              
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Nombre y Rol encima de la burbuja */}
                  {!isMe && (
                    <div className="flex items-baseline gap-1.5 mb-1 px-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${getRoleColor(msg.sender_role)}`}>
                        {msg.sender_role}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">
                        {msg.sender_name}
                      </span>
                    </div>
                  )}

                  {/* Burbuja del mensaje */}
                  <div 
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                      isMe 
                        ? 'bg-gold text-black rounded-tr-sm' 
                        : 'bg-dark-card border border-dark-border text-gray-200 rounded-tl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                  
                  {/* Hora de envío */}
                  <span className="text-[10px] text-gray-500 mt-1 px-1">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input de mensaje */}
        <div className="p-4 bg-dark-card border-t border-dark-border flex-shrink-0">
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 bg-dark text-white rounded-xl px-4 py-3 text-sm border border-dark-border focus:border-gold focus:ring-1 focus:ring-gold outline-none transition-all placeholder:text-gray-600"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-gold hover:bg-yellow-400 text-black w-12 h-12 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 disabled:hover:bg-gold shadow-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-1">
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      {/* Overlay oscuro para móvil cuando el chat está abierto */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
