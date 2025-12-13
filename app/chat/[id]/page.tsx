// app/chat/[id]/page.tsx
import { prisma } from '@/lib/prisma';

// 👇 AJUSTE AQUI: Importe o ChatWindow (verifique se o caminho '@/components/' está certo)
import ChatWindow from '@/app/components/chat-window'; 

// 👇 OBRIGATÓRIO: Garante que a página sempre busque dados novos no banco
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

  // 2. Passa os dados para o ChatWindow
  return <ChatWindow chat={chat} initialMessages={chat.messages} />;
}