// app/components/auto-refresh.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    // Configura o intervalo para 10 segundos (10000 ms)
    const interval = setInterval(() => {
      router.refresh(); // Recarrega os dados do servidor (Server Components)
    }, 10000);

    // Limpa o intervalo se o usuário sair da página
    return () => clearInterval(interval);
  }, [router]);

  return null; // Este componente não mostra nada na tela, é invisível
}