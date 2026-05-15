# 🍔 Golden Drink & Burger — Sistema POS Premium

¡Bienvenido al sistema de gestión profesional para **Golden Drink & Burger**! Este proyecto es una plataforma de punto de venta (POS) de alto impacto, diseñada para ofrecer una experiencia fluida, rápida y estéticamente superior tanto para el personal como para los clientes.

---

## 🛠️ Stack Tecnológico
El proyecto utiliza las tecnologías más modernas de 2026:

*   **Framework:** [Next.js 16](https://nextjs.org/) (App Router) - El estándar de oro para aplicaciones web modernas.
*   **Librería UI:** [React 19](https://react.dev/) - Aprovechando las últimas mejoras en renderizado y hooks.
*   **Base de Datos y Backend:** [Supabase](https://supabase.com/) - PostgreSQL con capacidades de Realtime para pedidos instantáneos.
*   **Estilos:** [Tailwind CSS 4](https://tailwindcss.com/) - Utilizando el nuevo motor `@theme` para una personalización profunda.
*   **Autenticación:** Supabase Auth con roles personalizados (`admin`, `cajero`, `cocinero`).

---

## 🎨 Sistema de Diseño (UI/UX)
El diseño sigue una estética **Premium Dark** con toques de **Glassmorphism**.

### 🎨 Paleta de Colores
| Token | Valor Hex | Uso |
| :--- | :--- | :--- |
| `gold` | `#D4A843` | Acentos principales, botones, logos. |
| `gold-light` | `#F0D78C` | Estados hover y destacados suaves. |
| `dark` | `#0A0A0A` | Fondo principal de la aplicación. |
| `dark-card` | `#141414` | Fondos de tarjetas y contenedores. |
| `dark-border`| `#2A2A2A` | Bordes sutiles y divisores. |

### 🚥 Estados de Pedidos
*   🔴 **Pendiente:** `#EF4444`
*   🟠 **Preparando:** `#F59E0B`
*   🟢 **Listo:** `#22C55E`

### ✨ Efectos y Animaciones
*   **Glassmorphism:** Uso de `backdrop-filter: blur(12px)` para un efecto de cristal elegante.
*   **Animaciones:** Micro-interacciones suaves (`fadeIn`, `slideUp`, `pulseGold`).
*   **Tipografía:** Inter (Sans-serif) para máxima legibilidad.

---

## 🏗️ Arquitectura del Proyecto
```text
src/
├── app/              # Rutas y páginas (Next.js App Router)
│   ├── admin/        # Gestión de productos y mesas
│   ├── pedidos/      # Interfaz de caja y toma de pedidos
│   ├── cocina/       # Tablero de control para chefs
│   └── login/        # Acceso seguro
├── components/       # Componentes UI reutilizables
├── context/          # Manejo de estado global (Auth, Cart)
├── lib/              # Configuraciones de clientes (Supabase)
└── styles/           # Configuración global de CSS
```

---

## 📊 Modelo de Datos (Supabase)
La base de datos está normalizada para garantizar la integridad y escalabilidad:

1.  **`profiles`**: Almacena información de empleados y sus roles.
2.  **`tables`**: Gestión de las mesas físicas en el local.
3.  **`categories`**: Categorización del menú (Hamburguesas, Granizados, etc.).
4.  **`products`**: Catálogo con precios, imágenes y disponibilidad.
5.  **`orders`**: Registro maestro de pedidos con estado en tiempo real.
6.  **`order_items`**: Detalle de cada producto dentro de un pedido.

---

## 🚀 Funcionalidades Actuales
- [x] **Autenticación Segura:** Login con roles diferenciados.
- [x] **Gestión Administrativa:** Panel para crear/editar productos, mesas y categorías.
- [x] **Real-time:** Actualización instantánea de pedidos entre caja y cocina.
- [x] **Diseño Responsive:** Optimizado para tablets y computadores de escritorio.
- [x] **Control de Disponibilidad:** Activar/Desactivar productos del menú al instante.

---

## 📦 Instalación y Desarrollo

1.  **Clonar el repositorio.**
2.  **Instalar dependencias:**
    ```bash
    npm install
    ```
3.  **Configurar variables de entorno:**
    Crear un archivo `.env.local` con:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=tu_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key
    ```
4.  **Ejecutar el servidor:**
    ```bash
    npm run dev
    ```

---

Desarrollado con ❤️ para **Golden Drink & Burger**.
