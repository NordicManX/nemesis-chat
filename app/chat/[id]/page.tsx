// app/chat/[id]/page.tsx
import { prisma } from '@/lib/prisma';
import ChatInterface from './client-interface'; // Vamos criar esse componente logo abaixo

export const dynamic = 'force-dynamic';

export default async function ChatPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  
  // 1. Busca os dados do chat e as mensagens no banco
  const chat = await prisma.chat.findUnique({
    where: { id: params.id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' }, // Mensagens antigas no topo
      },
    },
  });

  if (!chat) return <div className="text-white p-10">Chat não encontrado!</div>;

  // 2. Passa os dados para o componente Cliente (onde a mágica acontece)
  return <ChatInterface chat={chat} initialMessages={chat.messages} />;
}