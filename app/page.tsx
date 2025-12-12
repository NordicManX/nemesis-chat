// app/page.tsx
import { prisma } from '@/lib/prisma';
import DashboardClient from './components/dashboard-client';

export const dynamic = 'force-dynamic';

// O Next.js entrega os parametros da URL (searchParams) aqui
export default async function Dashboard(props: { searchParams: Promise<{ chatId?: string }> }) {
  const searchParams = await props.searchParams;
  const selectedChatId = searchParams.chatId;

  // 1. Busca lista de Chats (Sidebar)
  const chats = await prisma.chat.findMany({
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { 
        select: { 
          messages: { where: { isRead: false, sender: 'CUSTOMER' } } 
        } 
      }
    },
    orderBy: { lastMessageAt: 'desc' }, // <--- AQUI A MÁGICA
  });

  // 2. Se tiver um ID na URL, busca a conversa completa
  let selectedChat = null;
  if (selectedChatId) {
    selectedChat = await prisma.chat.findUnique({
      where: { id: selectedChatId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } } // Histórico completo
      }
    });
  }

  // 3. Dados dos Gráficos (Dashboard)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentMessages = await prisma.message.findMany({
    select: { createdAt: true },
    where: { createdAt: { gte: sevenDaysAgo } }
  });

  const chartDataMap = new Map();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    chartDataMap.set(dateStr, 0);
  }
  recentMessages.forEach(msg => {
    const dateStr = new Date(msg.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    if (chartDataMap.has(dateStr)) chartDataMap.set(dateStr, chartDataMap.get(dateStr) + 1);
  });
  const chartData = Array.from(chartDataMap).map(([date, count]) => ({ date, count }));

  const totalClients = chats.length;
  const totalMessages = chats.reduce((acc, chat) => acc + chat._count.messages, 0);
  const activeNow = chats.filter(c => c.messages.length > 0 && (new Date().getTime() - new Date(c.messages[0].createdAt).getTime()) < 24 * 60 * 60 * 1000).length;

  return (
    <DashboardClient 
      chats={chats}
      chartData={chartData}
      kpi={{ totalClients, totalMessages, activeNow }}
      selectedChat={selectedChat} // Passa o chat selecionado (se houver)
    />
  );
}