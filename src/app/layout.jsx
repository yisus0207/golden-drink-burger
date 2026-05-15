import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Golden Drink & Burger | Sistema POS',
  description: 'Sistema profesional de gestión de pedidos para restaurante Golden Drink & Burger',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body suppressHydrationWarning className={`${inter.className} bg-dark text-white min-h-screen`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
