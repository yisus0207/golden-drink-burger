-- ============================================
-- GOLDEN DRINK & BURGER — Esquema de Base de Datos
-- ============================================
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto en supabase.com
-- 2. Haz clic en "SQL Editor" en el menú izquierdo
-- 3. Pega TODO este código
-- 4. Haz clic en "Run" (Ejecutar)
-- ============================================

-- ============================================
-- 1. TABLA DE PERFILES (vinculada a auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'mesero' CHECK (role IN ('mesero', 'cajero', 'cocinero', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. TABLA DE MESAS
-- ============================================
CREATE TABLE public.tables (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. TABLA DE CATEGORÍAS
-- ============================================
CREATE TABLE public.categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- ============================================
-- 4. TABLA DE PRODUCTOS
-- ============================================
CREATE TABLE public.products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  category_id INTEGER REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url TEXT,
  available BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. TABLA DE PEDIDOS
-- ============================================
CREATE TABLE public.orders (
  id SERIAL PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready')),
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  table_number TEXT,
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
  payment_method TEXT CHECK (payment_method IN ('efectivo', 'tarjeta', 'transferencia')),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. TABLA DE ITEMS DEL PEDIDO
-- ============================================
CREATE TABLE public.order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL
);

-- ============================================
-- TRIGGER: Crear perfil automáticamente al registrar usuario
-- Lee el nombre y rol desde los metadatos enviados por signUp()
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'mesero')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Profiles: todos pueden ver, admins pueden borrar
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Tables: todos pueden ver
CREATE POLICY "Anyone can view tables" ON public.tables
  FOR SELECT USING (true);
CREATE POLICY "Admins can insert tables" ON public.tables
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can update tables" ON public.tables
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can delete tables" ON public.tables
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Categories: todos pueden ver
CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT USING (true);
CREATE POLICY "Admins can insert categories" ON public.categories
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can update categories" ON public.categories
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can delete categories" ON public.categories
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Products: todos pueden ver, admins administran
CREATE POLICY "Anyone can view products" ON public.products
  FOR SELECT USING (true);
CREATE POLICY "Admins can insert products" ON public.products
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can update products" ON public.products
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can delete products" ON public.products
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Orders: usuarios autenticados pueden ver y crear
CREATE POLICY "Authenticated users can view orders" ON public.orders
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update orders" ON public.orders
  FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can delete orders" ON public.orders
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Order Items: usuarios autenticados pueden ver y crear
CREATE POLICY "Authenticated users can view order items" ON public.order_items
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create order items" ON public.order_items
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- HABILITAR REALTIME (para pedidos en tiempo real)
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Mesas iniciales
INSERT INTO public.tables (name) VALUES
  ('Mesa 1'), ('Mesa 2'), ('Mesa 3'), ('Mesa 4'),
  ('Mesa 5'), ('Mesa 6'), ('Mesa 7'), ('Mesa 8')
ON CONFLICT DO NOTHING;

-- Categorías
INSERT INTO public.categories (name) VALUES
  ('Granizados'),
  ('Hamburguesas');

-- Productos de ejemplo (precios en pesos colombianos)
INSERT INTO public.products (name, price, category_id) VALUES
  ('Granizado de Fresa', 15000, 1),
  ('Granizado de Mango', 15000, 1),
  ('Granizado de Maracuyá', 15000, 1),
  ('Granizado de Lulo', 15000, 1),
  ('Granizado de Limón', 12000, 1),
  ('Granizado Mixto', 18000, 1),
  ('Hamburguesa Clásica', 20000, 2),
  ('Hamburguesa Doble Carne', 28000, 2),
  ('Hamburguesa BBQ', 25000, 2),
  ('Hamburguesa de Pollo', 22000, 2),
  ('Hamburguesa Golden Special', 32000, 2),
  ('Hamburguesa Veggie', 23000, 2);

-- ============================================
-- 7. TABLA DE MENSAJES (Chat en tiempo real)
-- ============================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY PARA MENSAJES
-- ============================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Todos los usuarios autenticados pueden ver los mensajes
CREATE POLICY "Authenticated users can view messages" ON public.messages
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Todos los usuarios autenticados pueden enviar mensajes
CREATE POLICY "Authenticated users can insert messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ============================================
-- HABILITAR REALTIME PARA MENSAJES
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============================================
-- 8. TABLA DE CONFIGURACIÓN DEL AGENTE IA
-- Almacena prompt, estado, y configuración del bot
-- ============================================
CREATE TABLE public.ai_config (
  id SERIAL PRIMARY KEY,
  bot_name TEXT NOT NULL DEFAULT 'Golden Bot',
  is_active BOOLEAN NOT NULL DEFAULT false,
  system_prompt TEXT NOT NULL DEFAULT 'Eres un asistente amable del restaurante Golden Drink & Burger...',
  whatsapp_status TEXT NOT NULL DEFAULT 'disconnected' CHECK (whatsapp_status IN ('disconnected', 'connecting', 'connected', 'error')),
  qr_code TEXT,
  whatsapp_phone TEXT,
  openai_model TEXT NOT NULL DEFAULT 'gpt-4o',
  max_tokens INTEGER NOT NULL DEFAULT 500,
  temperature NUMERIC(2,1) NOT NULL DEFAULT 0.7,
  greeting_message TEXT DEFAULT '¡Hola! 👋 Bienvenido a Golden Drink & Burger. Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?',
  farewell_message TEXT DEFAULT '¡Gracias por tu pedido! 🍔 Tu orden está siendo preparada. ¡Buen provecho!',
  business_hours TEXT DEFAULT '{"open": "10:00", "close": "22:00"}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar config inicial por defecto
INSERT INTO public.ai_config (bot_name, system_prompt) VALUES (
  'Golden Bot',
  'Eres un asistente virtual amable y profesional del restaurante Golden Drink & Burger ubicado en Av. del rio, aleta del tiburon, barranquilla. Tu trabajo es:

1. Saludar amablemente a los clientes
2. Mostrar el menú cuando lo pidan
3. Tomar pedidos con precisión (confirmar cada item, cantidad y notas especiales)
4. Informar sobre el estado de pedidos existentes
5. Responder preguntas sobre el restaurante (horarios, ubicación, métodos de pago)

REGLAS IMPORTANTES:
- Siempre confirma el pedido completo antes de enviarlo
- Si el cliente pide algo que no está en el menú, sugiérele alternativas
- Sé amable pero conciso, no hagas respuestas muy largas
- Usa emojis moderadamente para ser amigable
- Los precios están en pesos colombianos (COP)
- Métodos de pago: efectivo, tarjeta, transferencia'
);

-- ============================================
-- 9. TABLA DE CONVERSACIONES DEL AGENTE IA
-- Registra chats completos con clientes de WhatsApp
-- ============================================
CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  messages JSONB NOT NULL DEFAULT '[]',
  order_id INTEGER REFERENCES public.orders(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  total_messages INTEGER NOT NULL DEFAULT 0,
  first_message_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. TABLA DE LOGS DEL AGENTE IA
-- Registro de actividad para depuración y estadísticas
-- ============================================
CREATE TABLE public.ai_logs (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('message_received', 'message_sent', 'order_created', 'error', 'connection', 'disconnection')),
  conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE SET NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS PARA TABLAS DE IA
-- ============================================
ALTER TABLE public.ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver y modificar la config del bot
CREATE POLICY "Admins can view ai_config" ON public.ai_config
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can update ai_config" ON public.ai_config
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can insert ai_config" ON public.ai_config
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Solo admins pueden ver conversaciones del bot
CREATE POLICY "Admins can view ai_conversations" ON public.ai_conversations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can insert ai_conversations" ON public.ai_conversations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can update ai_conversations" ON public.ai_conversations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Logs: solo admins
CREATE POLICY "Admins can view ai_logs" ON public.ai_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Admins can insert ai_logs" ON public.ai_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Realtime para conversaciones (para actualización en vivo)
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_config;
