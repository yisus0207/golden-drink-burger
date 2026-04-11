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
  role TEXT NOT NULL DEFAULT 'cajero' CHECK (role IN ('cajero', 'cocinero', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. TABLA DE CATEGORÍAS
-- ============================================
CREATE TABLE public.categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- ============================================
-- 3. TABLA DE PRODUCTOS
-- ============================================
CREATE TABLE public.products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  category_id INTEGER REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url TEXT,
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. TABLA DE PEDIDOS
-- ============================================
CREATE TABLE public.orders (
  id SERIAL PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready')),
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. TABLA DE ITEMS DEL PEDIDO
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
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'cajero');
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
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Profiles: todos pueden ver
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

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
