const { Client, LocalAuth } = require('whatsapp-web.js');
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const qrcode = require('qrcode-terminal');
require('dotenv').config({ path: '../.env.local' });

// 1. Configuración de Clientes (Usando las variables de la web)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './sessions' }),
    qrMaxRetries: 15,
    puppeteer: {
        headless: true, // VOLVEMOS A MODO INVISIBLE (PROFESIONAL)
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ],
    }
});

// 2. Funciones de Base de Datos y Robustez
async function restartBot() {
    console.log('🔄 [Bot] Reiniciando en 5 segundos...');
    await updateBotStatus('disconnected');
    setTimeout(() => {
        client.initialize();
    }, 5000);
}

// Cache de configuración, menú y de-duplicación de mensajes
let botConfig = null;
let menuCache = [];
const processedMessages = new Set(); // Para evitar respuestas duplicadas

// Limpiar el caché de mensajes cada 10 minutos para no saturar memoria
setInterval(() => processedMessages.clear(), 10 * 60 * 1000);

// 2. Funciones de Base de Datos
async function loadBotConfig() {
    try {
        const { data, error } = await supabase.from('ai_config').select('*').limit(1).single();
        if (error) {
            console.error('⚠️ [Config] Error al cargar configuración:', error.message);
            // Intentar cargar por lo menos el ID si falla el single()
            const { data: fallback } = await supabase.from('ai_config').select('id').limit(1);
            if (fallback?.[0]) botConfig = { ...botConfig, id: fallback[0].id };
            return null;
        }
        botConfig = data;
        return data;
    } catch (e) {
        console.error('❌ [Config] Error fatal:', e.message);
        return null;
    }
}

async function updateBotStatus(status, qr = null) {
    console.log(`[Status] Actualizando a: ${status}`);
    const update = { whatsapp_status: status, updated_at: new Date() };
    if (qr !== null) update.qr_code = qr;
    if (status === 'connected') update.qr_code = null;
    
    // Asegurarnos de tener el ID correcto (por si cambió o no se cargó)
    const { data: configs } = await supabase.from('ai_config').select('id').limit(1);
    const targetId = configs?.[0]?.id || botConfig?.id || 1;
    
    const { error } = await supabase.from('ai_config').update(update).eq('id', targetId);
    
    if (error) {
        console.error('❌ [Error DB] No se pudo actualizar el estado en Supabase:', error.message);
        console.error('Detalles:', error);
    } else {
        console.log(`✅ [DB] Estado '${status}' sincronizado con éxito.`);
    }
}

async function getMenu() {
    const { data } = await supabase.from('products').select('*, categories(name)').eq('available', true);
    menuCache = data || [];
    return data;
}

async function createOrder(tableNumber, notes, items, total, customerPhone) {
    try {
        console.log(`[Order] Creando pedido para ${customerPhone}...`);
        
        // 1. Crear la cabecera del pedido (marcada como creada por el bot)
        const { data: order, error: orderErr } = await supabase.from('orders').insert({
            table_number: tableNumber || 'WhatsApp',
            notes: `[BOT WA: ${customerPhone}] ${notes || ''}`,
            total: total,
            status: 'pending',
            payment_status: 'unpaid'
        }).select().single();

        if (orderErr) throw orderErr;

        // 2. Crear los items
        const orderItems = items.map(item => ({
            order_id: order.id,
            product_id: item.id,
            product_name: item.name,
            quantity: item.quantity,
            price: item.price
        }));

        const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
        if (itemsErr) throw itemsErr;

        // 3. Registrar en logs
        await supabase.from('ai_logs').insert({
            event_type: 'order_created',
            details: `Pedido #${order.id} creado para ${customerPhone} por un total de $${total}`
        });

        return { success: true, orderId: order.id };
    } catch (error) {
        console.error('[Error] Fallo al crear pedido:', error);
        return { success: false, error: error.message };
    }
}

// 3. Funciones de Historial de Conversación
async function saveConversation(phone, contactName, role, content, orderId = null) {
    try {
        // 1. Buscar si ya existe una conversación activa para este número
        // Usamos maybeSingle() para que no de error si no encuentra nada
        const { data: existing, error: fetchError } = await supabase
            .from('ai_conversations')
            .select('*')
            .eq('phone_number', phone)
            .maybeSingle();

        if (fetchError) throw fetchError;

        const newMessage = {
            role,
            content,
            timestamp: new Date().toISOString()
        };

        if (existing) {
            // Actualizar conversación existente
            const updatedMessages = [...(existing.messages || []), newMessage];
            const updateData = {
                messages: updatedMessages,
                last_message_at: new Date(),
                total_messages: updatedMessages.length,
                status: 'active'
            };
            if (orderId) updateData.order_id = orderId;
            if (contactName) updateData.contact_name = contactName;

            await supabase.from('ai_conversations').update(updateData).eq('id', existing.id);
        } else {
            // Crear nueva conversación
            const { error: insertError } = await supabase.from('ai_conversations').insert({
                phone_number: phone,
                contact_name: contactName || 'Cliente WA',
                messages: [newMessage],
                status: 'active',
                total_messages: 1,
                last_message_at: new Date()
            });
            if (insertError) throw insertError;
        }
    } catch (error) {
        console.error('❌ [History] Fallo al guardar historial:', error.message);
    }
}

// 4. Lógica de Inteligencia Artificial (Handle AI Chat)
async function handleAIChat(phone, message, contactName) {
    if (!botConfig || !botConfig.is_active) return null;

    // Obtener historial de la DB (Solo los últimos mensajes para no saturar)
    const { data: convo } = await supabase
        .from('ai_conversations')
        .select('messages')
        .eq('phone_number', phone)
        .order('last_message_at', { ascending: false })
        .limit(1)
        .single();
    
    // Filtramos para no enviar el mensaje actual si ya se guardó en la DB
    const dbMessages = convo?.messages || [];
    const history = dbMessages.slice(-8).filter(m => m.content !== message);

    const messages = [
        { 
            role: 'system', 
            content: `${botConfig.system_prompt}\n\nREGLA DE CONTINUIDAD: Revisa el historial. Si ya saludaste, NO vuelvas a dar la bienvenida. Si el cliente ya decidió 'Comer aquí', pide el número de mesa inmediatamente. Si es para 'Llevar', pide nombre y dirección.`
        },
        ...history.map(m => ({ 
            role: m.role === 'admin' ? 'assistant' : m.role, 
            content: m.content 
        })),
        { role: 'user', content: message }
    ];

    const tools = [
        // ... (las funciones get_menu y create_order se mantienen iguales)
        {
            type: 'function',
            function: {
                name: 'get_menu',
                description: 'Obtener la lista de productos, precios y categorías disponibles en el restaurante.',
                parameters: { type: 'object', properties: {} }
            }
        },
        {
            type: 'function',
            function: {
                name: 'create_order',
                description: 'Crear un pedido real en el sistema del restaurante.',
                parameters: {
                    type: 'object',
                    properties: {
                        tableNumber: { type: 'string', description: 'Número de mesa o "WhatsApp"' },
                        notes: { type: 'string', description: 'Notas adicionales como "sin cebolla"' },
                        total: { type: 'number', description: 'Precio total del pedido' },
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'integer' },
                                    name: { type: 'string' },
                                    quantity: { type: 'integer' },
                                    price: { type: 'number' }
                                }
                            }
                        }
                    },
                    required: ['items', 'total']
                }
            }
        }
    ];

    const response = await openai.chat.completions.create({
        model: botConfig.openai_model || 'gpt-4o',
        messages,
        tools,
        temperature: botConfig.temperature || 0.7,
    });

    const aiMessage = response.choices[0].message;

    if (aiMessage.tool_calls) {
        for (const toolCall of aiMessage.tool_calls) {
            const functionName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);

            let toolResult;
            if (functionName === 'get_menu') {
                const menu = await getMenu();
                toolResult = JSON.stringify(menu);
            } else if (functionName === 'create_order') {
                const result = await createOrder(args.tableNumber, args.notes, args.items, args.total, phone);
                toolResult = JSON.stringify(result);
            }

            messages.push(aiMessage);
            messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: toolResult
            });
        }

        // Segunda llamada para obtener el texto final después de usar la herramienta
        const finalResponse = await openai.chat.completions.create({
            model: botConfig.openai_model || 'gpt-4o',
            messages,
        });

        return finalResponse.choices[0].message.content;
    }

    return aiMessage.content;
}

// 4. Eventos de WhatsApp
client.on('qr', (qr) => {
    console.log('[QR] Nuevo código generado. Escanea en el panel Admin.');
    qrcode.generate(qr, { small: true });
    updateBotStatus('connecting', qr);
});

client.on('auth_failure', (msg) => {
    console.error('❌ [Bot] Error de autenticación:', msg);
    restartBot();
});

client.on('disconnected', (reason) => {
    console.log('⚠️ [Bot] Se perdió la conexión:', reason);
    restartBot();
});

client.on('ready', async () => {
    const myNumber = client.info.wid.user;
    console.log(`✅ [Bot] ¡Conectado y listo en WhatsApp! (Número: ${myNumber})`);
    
    // Actualizar estado y guardar el número conectado
    await supabase.from('ai_config').update({ 
        whatsapp_status: 'connected',
        connected_phone: myNumber,
        qr_code: null 
    }).eq('id', botConfig?.id || 1);

    // ─── ESCUCHAR MENSAJES MANUALES DEL ADMIN (WEB -> WA) ───
    supabase
        .channel('admin_responses')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ai_logs', filter: 'event_type=eq.admin_response' }, async (payload) => {
            try {
                const { phone, content } = JSON.parse(payload.new.details);
                console.log(`👤 [Manual] Enviando mensaje de Admin a ${phone}: ${content}`);
                await client.sendMessage(phone, content);
            } catch (e) {
                console.error('❌ [Manual] Error al enviar respuesta manual:', e.message);
            }
        })
        .subscribe();
});

client.on('message', async msg => {
    // Evitar responder a grupos, estados o mensajes repetidos
    if (msg.from.includes('@g.us') || msg.isStatus || processedMessages.has(msg.id._serialized)) return;

    // Marcar como procesado inmediatamente
    processedMessages.add(msg.id._serialized);
    
    console.log(`[Msg] De ${msg.from}: ${msg.body}`);

    try {
        const config = await loadBotConfig();
        if (!config || !config.is_active) return;

        const contact = await msg.getContact();
        const contactName = contact.pushname || contact.name;

        // ─── VERIFICAR SI LA IA ESTÁ PAUSADA PARA ESTE CHAT ───
        const { data: convo } = await supabase
            .from('ai_conversations')
            .select('status')
            .eq('phone_number', msg.from)
            .maybeSingle();

        if (convo?.status === 'paused') {
            console.log(`🟡 [Bot] IA Pausada para ${msg.from}. Guardando mensaje para intervención humana.`);
            await saveConversation(msg.from, contactName, 'user', msg.body);
            return;
        }

        const chat = await msg.getChat();
        chat.sendStateTyping();

        // 1. Guardar mensaje del usuario
        await saveConversation(msg.from, contactName, 'user', msg.body);

        // 2. Obtener respuesta de la IA
        const enhancedMessage = `DATOS ACTUALES DEL RESTAURANTE: Si el cliente pide algo que no conoces, USA la función 'get_menu'. No digas que no tienes algo sin consultar el menú primero.\n\nMensaje del cliente: ${msg.body}`;
        const reply = await handleAIChat(msg.from, enhancedMessage, contactName);

        if (reply) {
            await msg.reply(reply);
            
            // 3. Guardar respuesta del bot
            await saveConversation(msg.from, contactName, 'assistant', reply);

            await supabase.from('ai_logs').insert({
                event_type: 'message_sent',
                details: `Bot respondió a ${msg.from}`
            });
        }
    } catch (error) {
        console.error('[Error] Error en procesamiento de mensaje:', error);
        // updateBotStatus('error'); // No queremos desconectar por un error de un mensaje
    }
});

// Iniciar
(async () => {
    try {
        console.log('--- Golden Drink AI Bot ---');
        await loadBotConfig();
        await client.initialize().catch(err => {
            console.error('❌ [Bot] Error durante el arranque:', err.message);
        });
    } catch (e) {
        console.error('❌ [Bot] Error fatal en el inicio:', e.message);
    }
})();
