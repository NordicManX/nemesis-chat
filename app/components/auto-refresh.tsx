// app/components/auto-refresh.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    // Configura o intervalo para 1 segundo (1000 ms)
    const interval = setInterval(() => {
      router.refresh(); // Recarrega os dados do servidor
    }, 1000);

    return () => clearInterval(interval);
  }, [router]);

  return null; // Invisível
}