'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { playChatSound } from '@/lib/sounds';

export default function ChatWidget() {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef(null);
  
  // No renderizar si no hay usuario (ej. pantalla de login)
  if (!user || !profile) return null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
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
        setMessages(prev => [...prev, incomingMessage]);
        
        // Si no fui yo quien lo envió, y el chat está cerrado, subimos el contador y suena
        if (incomingMessage.sender_id !== user.id) {
          if (!isOpen) {
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
  }, [user.id, isOpen]); // isOpen en dependencias porque su valor determina si sumamos unreadCount

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
      default: return 'text-gold';
    }
  };

  return (
    <>
      {/* Botón flotante hamburguesa */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-tr from-gold to-yellow-400 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:scale-110 transition-transform duration-300"
      >
        <Image src="/burger-3d.png" alt="Chat" width={40} height={40} className="drop-shadow-md" />
        
        {/* Badge de no leídos */}
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-dark animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel lateral de chat */}
      <div 
        className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-dark-surface/95 backdrop-blur-xl border-l border-dark-border z-40 transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header del Chat */}
        <div className="p-4 border-b border-dark-border flex items-center justify-between bg-dark-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center">
              <Image src="/burger-3d.png" alt="Chat Logo" width={28} height={28} />
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
              <span className="text-5xl">💬</span>
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
        <div className="p-4 bg-dark-card border-t border-dark-border">
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
