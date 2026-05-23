'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ─── Subcomponente: Indicador de Estado ────
function StatusBadge({ status }) {
  const map = {
    disconnected: { color: 'bg-gray-500', ring: 'ring-gray-500/30', text: 'Desconectado', icon: '⚫' },
    connecting: { color: 'bg-yellow-400', ring: 'ring-yellow-400/30', text: 'Conectando...', icon: '🟡', pulse: true },
    connected: { color: 'bg-emerald-400', ring: 'ring-emerald-400/30', text: 'Conectado', icon: '🟢' },
    error: { color: 'bg-red-500', ring: 'ring-red-500/30', text: 'Error', icon: '🔴' },
  };
  const s = map[status] || map.disconnected;
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2.5 h-2.5 rounded-full ${s.color} ${s.ring} ring-4 ${s.pulse ? 'animate-pulse' : ''}`} />
      <span className="text-xs font-medium text-gray-400">{s.text}</span>
    </div>
  );
}

// ─── Subcomponente: QRSection ────
function QRSection({ config }) {
  const whatsappStatus = config?.whatsapp_status;
  const qrCode = config?.qr_code;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-dark-border bg-gradient-to-br from-dark-card to-dark-surface p-6">
      {/* Decoración de fondo */}
      <div className="absolute -top-20 -right-20 w-56 h-56 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gold/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <span className="text-xl">📱</span>
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Vinculación WhatsApp</h3>
            <p className="text-gray-500 text-[11px]">Escanea el QR para conectar el bot</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-center">
          {/* QR Display */}
          <div className="w-56 h-56 rounded-2xl bg-white p-4 flex items-center justify-center relative group shadow-2xl shadow-black/40">
            {whatsappStatus === 'connected' ? (
              <div className="text-center animate-fade-in">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center mx-auto mb-3">
                  <span className="text-4xl text-emerald-500">✅</span>
                </div>
                <p className="text-emerald-700 font-bold text-sm">¡Bot Vinculado!</p>
                <p className="text-gray-400 text-[10px] mt-1 uppercase tracking-widest font-bold">Sesión Activa</p>
              </div>
            ) : qrCode ? (
              <div className="relative w-full h-full animate-fade-in group">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCode)}`}
                  alt="WhatsApp QR Code"
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-white/10 group-hover:bg-transparent transition-colors duration-300" />
              </div>
            ) : whatsappStatus === 'connecting' ? (
              <div className="text-center animate-pulse">
                <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-700 font-bold text-xs uppercase tracking-wider">Generando QR...</p>
              </div>
            ) : (
              <div className="w-full h-full rounded-lg bg-gray-100 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 grid grid-cols-12 gap-[2px] p-2 opacity-10">
                  {Array.from({ length: 144 }).map((_, i) => (
                    <div key={i} className={`rounded-[1px] ${Math.random() > 0.5 ? 'bg-black' : 'bg-transparent'}`} />
                  ))}
                </div>
                <div className="relative z-10 backdrop-blur-[2px] text-center p-4">
                  <span className="text-3xl grayscale opacity-30">🔗</span>
                  <p className="text-gray-400 text-[10px] mt-2 font-bold uppercase tracking-widest">Inicie el bot en su PC</p>
                  <p className="text-gray-300 text-[8px] mt-1 italic">Esperando señal del servidor...</p>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="flex-1 space-y-3">
            <h4 className="text-white font-semibold text-sm mb-4">¿Cómo vincular?</h4>
            {[
              { step: 1, text: 'Abre WhatsApp en tu teléfono del restaurante', icon: '📲' },
              { step: 2, text: 'Toca Menú (⋮) → Dispositivos vinculados', icon: '⚙️' },
              { step: 3, text: 'Toca "Vincular un dispositivo"', icon: '🔗' },
              { step: 4, text: 'Apunta la cámara al código QR de arriba', icon: '📷' },
            ].map(({ step, text, icon }) => (
              <div key={step} className="flex items-start gap-3 group/step">
                <div className="w-7 h-7 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gold group-hover/step:bg-gold/20 transition-colors">
                  {step}
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-lg">{icon}</span>
                  <span className="text-xs text-gray-400 leading-tight">{text}</span>
                </div>
              </div>
            ))}

            <div className="mt-5 p-3 rounded-xl bg-gold/5 border border-gold/15">
              <p className="text-[10px] text-gold/80 leading-relaxed">
                <strong>⚡ Fase 2:</strong> Al activar la conexión, el agente IA responderá automáticamente a todos los mensajes entrantes de WhatsApp usando el prompt configurado abajo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponente: Chat Preview ────
function ConversationCard({ conversation, isSelected, onClick }) {
  const lastMsg = conversation.messages?.[conversation.messages.length - 1];
  const timeAgo = (date) => {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
        isSelected
          ? 'bg-gold/10 border-gold/30 shadow-lg shadow-gold/5'
          : 'bg-dark-surface/50 border-dark-border hover:border-gold/20 hover:bg-dark-surface'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg ${
          conversation.status === 'active' ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-dark-border'
        }`}>
          {conversation.status === 'active' ? '💬' : '✅'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-white font-semibold text-sm truncate">
              {conversation.contact_name || conversation.phone_number}
            </span>
            <span className="text-[10px] text-gray-500 flex-shrink-0">
              {timeAgo(conversation.last_message_at)}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {lastMsg?.role === 'assistant' && <span className="text-gold mr-1">Bot:</span>}
            {lastMsg?.content || 'Sin mensajes'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[9px] text-gray-600 bg-dark-border/60 px-2 py-0.5 rounded-full">
              {conversation.total_messages} msgs
            </span>
            {conversation.order_id && (
              <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                🛒 Pedido #{conversation.order_id}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Subcomponente: Chat Detail ────
function ChatDetail({ conversation, onSendMessage, onTogglePause }) {
  const [msgInput, setMsgInput] = useState('');

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 bg-[#0b141a]">
        <div className="text-center">
          <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
            <span className="text-5xl">🤖</span>
          </div>
          <p className="text-sm font-medium text-gray-400">Golden Bot Console</p>
          <p className="text-xs text-gray-600 mt-1">Selecciona un chat para intervenir o ver el historial</p>
        </div>
      </div>
    );
  }

  const messages = conversation.messages || [];

  const handleSend = (e) => {
    e.preventDefault();
    if (!msgInput.trim()) return;
    onSendMessage(conversation.phone_number, msgInput);
    setMsgInput('');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b141a]">
      {/* Chat Header */}
      <div className="p-4 bg-[#202c33] flex items-center justify-between border-b border-white/5 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-500 flex items-center justify-center text-lg font-bold text-black border-2 border-white/10">
            {conversation.contact_name?.[0] || '👤'}
          </div>
          <div>
            <p className="text-white font-bold text-sm">
              {conversation.contact_name || 'Cliente'}
            </p>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${conversation.status === 'paused' ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
              <p className="text-[10px] text-gray-400 uppercase tracking-tighter">
                {conversation.status === 'paused' ? 'Modo Humano (IA Pausada)' : 'IA Activa'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {conversation.order_id && (
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20 font-bold hidden lg:block">
              🛒 PEDIDO #{conversation.order_id}
            </span>
          )}
          <button 
            onClick={() => onTogglePause(conversation)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              conversation.status === 'paused'
                ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-white/5 text-white hover:bg-white/10'
            }`}
          >
            {conversation.status === 'paused' ? '⚡ ACTIVAR IA' : '⏸️ PAUSAR IA'}
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div 
        className="flex-1 overflow-y-auto p-6 space-y-4 bg-repeat"
        style={{ backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e71a75133e66052e0544c1021.png")' }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-600 py-12">
            <p className="text-3xl mb-2">🤖</p>
            <p className="text-sm">Sin mensajes registrados</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm shadow-lg relative ${
                msg.role === 'user'
                  ? 'bg-[#202c33] text-gray-200 border border-white/5 rounded-tl-none'
                  : 'bg-[#005c4b] text-white rounded-tr-none'
              }`}>
                {msg.role === 'assistant' && (
                  <span className="text-[9px] font-black text-emerald-300 block mb-1 uppercase tracking-widest">Golden Bot 🤖</span>
                )}
                {msg.role === 'admin' && (
                   <span className="text-[9px] font-black text-amber-300 block mb-1 uppercase tracking-widest">Admin 👤</span>
                )}
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                {msg.timestamp && (
                  <span className="text-[9px] text-white/40 block mt-1 text-right">
                    {new Date(msg.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Manual Input Area */}
      <div className="p-4 bg-[#2a3942] border-t border-white/5">
        <form onSubmit={handleSend} className="flex gap-3">
          <input 
            type="text"
            value={msgInput}
            onChange={(e) => setMsgInput(e.target.value)}
            disabled={conversation.status !== 'paused'}
            className="flex-1 bg-[#111b21] text-white text-sm rounded-xl px-5 py-3 outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            placeholder={conversation.status === 'paused' ? "Escribe un mensaje manual..." : "Pausa el bot arriba para escribir..."}
          />
          <button 
            type="submit"
            disabled={conversation.status !== 'paused' || !msgInput.trim()}
            className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-black hover:bg-emerald-400 disabled:opacity-50 disabled:grayscale transition-all shadow-xl"
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M1.101 21.757L23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z"></path></svg>
          </button>
        </form>
        <p className="text-[10px] text-gray-500 text-center mt-3 uppercase tracking-tighter">
          El mensaje se enviará directamente al WhatsApp del cliente
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// ─── COMPONENTE PRINCIPAL: AIConsole ────
// ══════════════════════════════════════════════
export default function AIConsole() {
  const [config, setConfig] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savedPrompt, setSavedPrompt] = useState(false);
  const [activeSection, setActiveSection] = useState('control'); // control | prompt | conversations | stats

  // ─── Lógica: Tomar el Control (Enviar Mensaje Manual) ────
  const handleSendMessage = async (phone, content) => {
    if (!content.trim()) return;

    try {
      const newMessage = {
        role: 'admin',
        content: content.trim(),
        timestamp: new Date().toISOString()
      };

      const updatedMessages = [...(selectedConvo.messages || []), newMessage];

      await supabase
        .from('ai_conversations')
        .update({ 
          messages: updatedMessages,
          last_message_at: new Date(),
          total_messages: updatedMessages.length
        })
        .eq('id', selectedConvo.id);

      // Sincronizar UI local inmediatamente
      setSelectedConvo({ ...selectedConvo, messages: updatedMessages });

      // Insertar en log para que el bot lo envíe por WA
      await supabase.from('ai_logs').insert({
        event_type: 'admin_response',
        details: JSON.stringify({ phone, content })
      });

    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    }
  };

  // ─── Lógica: Pausar/Reactivar IA ────
  const togglePause = async (convo) => {
    const newStatus = convo.status === 'paused' ? 'active' : 'paused';
    try {
      await supabase
        .from('ai_conversations')
        .update({ status: newStatus })
        .eq('id', convo.id);
      
      if (selectedConvo?.id === convo.id) {
        setSelectedConvo({ ...selectedConvo, status: newStatus });
      }
    } catch (error) {
      console.error('Error al cambiar estado del bot:', error);
    }
  };

  // ─── Cargar configuración ────
  const loadConfig = useCallback(async () => {
    setLoadingConfig(true);
    const { data } = await supabase.from('ai_config').select('*').limit(1).single();
    if (data) setConfig(data);
    setLoadingConfig(false);
  }, []);

  // ─── Cargar conversaciones ────
  const loadConversations = useCallback(async () => {
    const { data } = await supabase
      .from('ai_conversations')
      .select('*')
      .order('last_message_at', { ascending: false })
      .limit(50);
    setConversations(data || []);
  }, []);

  useEffect(() => {
    loadConfig();
    loadConversations();

    // ─── Suscripción en tiempo real a cambios de configuración (Status & QR) ───
    const configSub = supabase
      .channel('ai_config_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ai_config' }, (payload) => {
        console.log('⚡ [Realtime] ¡Cambio detectado en ai_config!', payload.new);
        setConfig(payload.new);
      })
      .subscribe();

    // ─── Suscripción a nuevas conversaciones/mensajes ───
    const convoSub = supabase
      .channel('ai_convo_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_conversations' }, () => {
        loadConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(configSub);
      supabase.removeChannel(convoSub);
    };
  }, [loadConfig, loadConversations]);

  // ─── Toggle Bot ON/OFF ────
  async function toggleBot() {
    if (!config) return;
    const newState = !config.is_active;
    await supabase
      .from('ai_config')
      .update({ is_active: newState, updated_at: new Date().toISOString() })
      .eq('id', config.id);
    setConfig(prev => ({ ...prev, is_active: newState }));
  }

  // ─── Guardar prompt ────
  async function savePrompt() {
    if (!config) return;
    setSavingConfig(true);
    await supabase
      .from('ai_config')
      .update({
        system_prompt: config.system_prompt,
        bot_name: config.bot_name,
        greeting_message: config.greeting_message,
        farewell_message: config.farewell_message,
        openai_model: config.openai_model,
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        updated_at: new Date().toISOString()
      })
      .eq('id', config.id);
    setSavingConfig(false);
    setSavedPrompt(true);
    setTimeout(() => setSavedPrompt(false), 3000);
  }

  // ─── Stats ────
  const stats = {
    totalConversations: conversations.length,
    activeConversations: conversations.filter(c => c.status === 'active').length,
    ordersCreated: conversations.filter(c => c.order_id).length,
    conversionRate: conversations.length > 0
      ? Math.round((conversations.filter(c => c.order_id).length / conversations.length) * 100)
      : 0,
    totalMessages: conversations.reduce((sum, c) => sum + (c.total_messages || 0), 0),
  };

  if (loadingConfig) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-gold/10 border-t-gold rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gold/80 font-medium text-sm">Cargando Consola IA...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="animate-fade-in">
        <div className="glass rounded-2xl p-8 text-center max-w-lg mx-auto">
          <span className="text-5xl block mb-4">⚠️</span>
          <h3 className="text-white font-bold text-lg mb-2">Configuración no encontrada</h3>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Necesitas ejecutar el SQL de las tablas <code className="text-gold bg-gold/10 px-1.5 py-0.5 rounded text-xs">ai_config</code> en tu base de datos de Supabase.
          </p>
          <p className="text-xs text-gray-600">
            Revisa el archivo <code className="text-gold/70">supabase-schema.sql</code> y ejecuta las secciones 8, 9 y 10.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">

      {/* ═══════ HEADER: Control Principal ═══════ */}
      <div className="relative overflow-hidden rounded-2xl border border-dark-border bg-gradient-to-r from-dark-card via-dark-surface to-dark-card p-6">
        <div className="absolute -top-24 -right-24 w-56 h-56 bg-gold/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Bot Avatar */}
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border-2 transition-all duration-500 ${
              config.is_active 
                ? 'bg-gradient-to-br from-gold/20 to-emerald-500/20 border-gold/40 shadow-lg shadow-gold/10'
                : 'bg-dark-surface border-dark-border'
            }`}>
              🤖
            </div>
            <div>
              <h2 className="text-white font-bold text-xl flex items-center gap-2">
                {config.bot_name}
                {config.is_active && (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                    Activo
                  </span>
                )}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                <StatusBadge status={config.whatsapp_status} />
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                  <span className="text-[10px] text-gray-500 uppercase font-bold">Modelo</span>
                  <span className="text-[10px] text-gray-300 font-medium">{config.openai_model}</span>
                </div>
                {config.connected_phone && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/5 border border-emerald-500/10 transition-all animate-fade-in">
                    <span className="text-[10px] text-emerald-500/70 uppercase font-bold">Número</span>
                    <span className="text-[10px] text-emerald-200 font-medium">+{config.connected_phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Power Switch */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 font-medium">
              {config.is_active ? 'Bot Encendido' : 'Bot Apagado'}
            </span>
            <button
              onClick={toggleBot}
              className={`relative w-16 h-8 rounded-full transition-all duration-500 ${
                config.is_active 
                  ? 'bg-gradient-to-r from-emerald-500 to-green-400 shadow-lg shadow-emerald-500/30'
                  : 'bg-dark-border'
              }`}
            >
              <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${
                config.is_active ? 'left-9' : 'left-1'
              }`}>
                <span className="absolute inset-0 flex items-center justify-center text-[10px]">
                  {config.is_active ? '✓' : '✕'}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ═══════ NAVIGATION TABS ═══════ */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'control', label: '📱 WhatsApp', icon: '' },
          { key: 'prompt', label: '🧠 Prompt IA', icon: '' },
          { key: 'conversations', label: '💬 Conversaciones', icon: '' },
          { key: 'stats', label: '📊 Estadísticas', icon: '' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeSection === tab.key
                ? 'bg-gold text-black shadow-lg shadow-gold/20'
                : 'bg-dark-surface text-gray-400 border border-dark-border hover:text-white hover:border-gold/30'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════ SECCIÓN: WHATSAPP QR ═══════ */}
      {activeSection === 'control' && (
        <QRSection config={config} />
      )}

      {/* ═══════ SECCIÓN: PROMPT EDITOR ═══════ */}
      {activeSection === 'prompt' && (
        <div className="space-y-6">
          {/* Bot Name & Model */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass rounded-2xl p-5">
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold">
                Nombre del Bot
              </label>
              <input
                type="text"
                value={config.bot_name}
                onChange={(e) => setConfig({ ...config, bot_name: e.target.value })}
                className="w-full px-4 py-3 input-dark rounded-xl text-sm focus:border-gold/50 outline-none transition-all"
                placeholder="Golden Bot"
              />
            </div>
            <div className="glass rounded-2xl p-5">
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold">
                Modelo IA
              </label>
              <select
                value={config.openai_model}
                onChange={(e) => setConfig({ ...config, openai_model: e.target.value })}
                className="w-full px-4 py-3 input-dark rounded-xl text-sm appearance-none bg-dark-surface cursor-pointer"
              >
                <option value="gpt-4o">GPT-4o (Recomendado)</option>
                <option value="gpt-4o-mini">GPT-4o Mini (Económico)</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
              </select>
            </div>
            <div className="glass rounded-2xl p-5">
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold">
                Creatividad: <span className="text-gold">{config.temperature}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                className="w-full mt-2 accent-gold cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-gray-600 mt-1">
                <span>Preciso</span>
                <span>Creativo</span>
              </div>
            </div>
          </div>

          {/* System Prompt */}
          <div className="glass rounded-2xl p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-white font-bold flex items-center gap-2">
                  <span className="text-lg">🧠</span>
                  Personalidad e Instrucciones
                </h3>
                <p className="text-gray-500 text-xs mt-0.5">
                  Define cómo debe comportarse el bot y qué información debe manejar
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={savePrompt}
                  disabled={savingConfig}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    savedPrompt
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'btn-gold shadow-lg shadow-gold/10'
                  }`}
                >
                  {savingConfig ? '⏳ Guardando...' : savedPrompt ? '✅ ¡Guardado!' : '💾 Guardar Cambios'}
                </button>
              </div>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-2 mb-4 p-2 bg-black/20 rounded-xl border border-dark-border/50">
              <span className="text-[10px] text-gray-500 w-full mb-1 ml-1 uppercase tracking-widest font-bold">Plantillas Rápidas:</span>
              {[
                { 
                  label: '🌟 Muy Amigable', 
                  desc: 'Ideal para marca juvenil y cercana',
                  prompt: 'Eres un asistente súper alegre y juvenil de Golden Drink & Burger. ¡Usa emojis, exclama con alegría y haz que el cliente se sienta como un amigo! Recomienda siempre los granizados mixtos como nuestra especialidad.' 
                },
                { 
                  label: '💼 Profesional/Formal', 
                  desc: 'Serio, cortés y muy eficiente',
                  prompt: 'Usted es el asistente formal de Golden Drink & Burger. Mantenga un trato de "Usted", sea extremadamente preciso con los precios y tiempos, y evite el uso excesivo de emojis. Su prioridad es la eficiencia absoluta.' 
                },
                { 
                  label: '⚡ Rápido y Directo', 
                  desc: 'Respuestas cortas para domicilios rápidos',
                  prompt: 'Eres el asistente de pedidos rápidos. No des rodeos. Saluda, pide el nombre, toma el pedido, confirma el total y despide. Respuestas de máximo 2 líneas. Tu objetivo es cerrar la venta en menos de 5 mensajes.' 
                },
              ].map(preset => (
                <button
                  key={preset.label}
                  onClick={() => {
                    if (confirm(`¿Quieres reemplazar el prompt actual por la plantilla "${preset.label}"?`)) {
                      setConfig({ ...config, system_prompt: preset.prompt });
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-dark-surface border border-dark-border text-[10px] text-gray-400 hover:text-gold hover:border-gold/30 transition-all flex flex-col items-start gap-0.5"
                  title={preset.desc}
                >
                  <span className="font-bold">{preset.label}</span>
                </button>
              ))}
            </div>

            <textarea
              value={config.system_prompt}
              onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
              className="w-full bg-black/30 border border-dark-border rounded-xl p-4 text-sm text-gray-300 focus:outline-none focus:border-gold/40 transition-all resize-y min-h-[300px] leading-relaxed font-mono placeholder:text-gray-700 shadow-inner"
              placeholder="Escribe las instrucciones para tu agente IA..."
            />
          </div>

          {/* Greeting & Farewell */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass rounded-2xl p-5">
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold">
                👋 Mensaje de Bienvenida
              </label>
              <textarea
                value={config.greeting_message || ''}
                onChange={(e) => setConfig({ ...config, greeting_message: e.target.value })}
                className="w-full bg-dark-surface border border-dark-border rounded-xl p-3 text-sm text-gray-300 focus:outline-none focus:border-gold/40 transition-all resize-none h-24"
                placeholder="Primer mensaje que envía el bot al recibir un chat..."
              />
            </div>
            <div className="glass rounded-2xl p-5">
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold">
                🎉 Mensaje de Despedida
              </label>
              <textarea
                value={config.farewell_message || ''}
                onChange={(e) => setConfig({ ...config, farewell_message: e.target.value })}
                className="w-full bg-dark-surface border border-dark-border rounded-xl p-3 text-sm text-gray-300 focus:outline-none focus:border-gold/40 transition-all resize-none h-24"
                placeholder="Mensaje que envía el bot al finalizar un pedido..."
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══════ SECCIÓN: CONVERSACIONES ═══════ */}
      {activeSection === 'conversations' && (
        <div className="glass rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 380px)', minHeight: '500px' }}>
          <div className="flex h-full">
            {/* Lista de chats */}
            <div className="w-full md:w-96 border-r border-dark-border flex flex-col">
              <div className="p-4 border-b border-dark-border">
                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                  💬 Historial de Chats
                  <span className="text-[10px] bg-gold/10 text-gold px-2 py-0.5 rounded-full">
                    {conversations.length}
                  </span>
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {conversations.length === 0 ? (
                  <div className="text-center text-gray-600 py-16">
                    <span className="text-4xl block mb-3">🤖</span>
                    <p className="text-sm font-medium">Sin conversaciones</p>
                    <p className="text-xs text-gray-700 mt-1">Cuando el bot atienda clientes por WhatsApp, los chats aparecerán aquí</p>
                  </div>
                ) : (
                  conversations.map(convo => (
                    <ConversationCard
                      key={convo.id}
                      conversation={convo}
                      isSelected={selectedConvo?.id === convo.id}
                      onClick={() => setSelectedConvo(convo)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Detalle del chat */}
            <div className="hidden md:flex flex-1 flex-col bg-dark/50">
              <ChatDetail 
                conversation={selectedConvo} 
                onSendMessage={handleSendMessage}
                onTogglePause={togglePause}
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══════ SECCIÓN: ESTADÍSTICAS ═══════ */}
      {activeSection === 'stats' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Conversaciones', value: stats.totalConversations, icon: '💬', color: 'gold' },
              { label: 'Chats Activos', value: stats.activeConversations, icon: '🔵', color: 'blue' },
              { label: 'Pedidos Creados', value: stats.ordersCreated, icon: '🛒', color: 'emerald' },
              { label: 'Tasa Conversión', value: `${stats.conversionRate}%`, icon: '📈', color: 'purple' },
              { label: 'Mensajes Totales', value: stats.totalMessages, icon: '📨', color: 'orange' },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="glass rounded-2xl p-5 relative overflow-hidden group hover:border-gold/30 transition-all">
                <div className={`absolute -top-6 -right-6 w-20 h-20 bg-${color}-500/5 rounded-full group-hover:bg-${color}-500/10 transition-colors`} />
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{icon} {label}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
              </div>
            ))}
          </div>

          {/* Bot Performance */}
          <div className="glass rounded-2xl p-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <span className="text-lg">🎯</span>
              Rendimiento del Bot
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Conversion Funnel */}
              <div className="space-y-3">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Embudo de Conversión</p>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Mensajes Recibidos</span>
                      <span className="text-white font-bold">{stats.totalMessages}</span>
                    </div>
                    <div className="h-2 bg-dark-border rounded-full overflow-hidden">
                      <div className="h-full bg-gold rounded-full" style={{ width: '100%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Conversaciones</span>
                      <span className="text-white font-bold">{stats.totalConversations}</span>
                    </div>
                    <div className="h-2 bg-dark-border rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: stats.totalMessages > 0 ? `${Math.min(100, (stats.totalConversations / Math.max(1, stats.totalMessages)) * 100 * 10)}%` : '0%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Pedidos Generados</span>
                      <span className="text-emerald-400 font-bold">{stats.ordersCreated}</span>
                    </div>
                    <div className="h-2 bg-dark-border rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: stats.totalConversations > 0 ? `${stats.conversionRate}%` : '0%' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Insights */}
              <div className="space-y-3">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Insights Rápidos</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-surface/50 border border-dark-border">
                    <span className="text-lg">🏆</span>
                    <div>
                      <p className="text-xs text-gray-400">Tasa de Conversión</p>
                      <p className="text-white font-bold">{stats.conversionRate}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-surface/50 border border-dark-border">
                    <span className="text-lg">💬</span>
                    <div>
                      <p className="text-xs text-gray-400">Msgs / Conversación</p>
                      <p className="text-white font-bold">
                        {stats.totalConversations > 0 ? Math.round(stats.totalMessages / stats.totalConversations) : 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Distribution */}
              <div className="space-y-3">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Estado de Chats</p>
                <div className="space-y-2">
                  {[
                    { label: 'Activos', count: stats.activeConversations, color: 'emerald' },
                    { label: 'Completados', count: conversations.filter(c => c.status === 'completed').length, color: 'blue' },
                    { label: 'Abandonados', count: conversations.filter(c => c.status === 'abandoned').length, color: 'red' },
                  ].map(({ label, count, color }) => (
                    <div key={label} className="flex items-center justify-between p-3 rounded-xl bg-dark-surface/50 border border-dark-border">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full bg-${color}-500`} />
                        <span className="text-xs text-gray-400">{label}</span>
                      </div>
                      <span className="text-white font-bold text-sm">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Empty State for Stats */}
          {stats.totalConversations === 0 && (
            <div className="glass rounded-2xl p-12 text-center">
              <span className="text-6xl block mb-4">📊</span>
              <h3 className="text-white font-bold text-lg mb-2">Sin datos de rendimiento</h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
                Las estadísticas se generarán automáticamente cuando el bot comience a atender clientes por WhatsApp. 
                Conecta tu WhatsApp y activa el bot para empezar.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
