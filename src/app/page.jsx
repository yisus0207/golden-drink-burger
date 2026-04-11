'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.push('/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center">
      <div className="w-16 h-16 border-4 border-gold/20 border-t-gold rounded-full animate-spin" />
    </div>
  );
}
