// app/page.tsx
import { prisma } from '@/lib/prisma';
import DashboardClient from './components/dashboard-client';
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export default async function Dashboard(props: { searchParams: Promise<{ chatId?: string }> }) {
  const searchParams = await props.searchParams;
  const selectedChatId = searchParams.chatId;

  // 1. Pega a sessão do usuário logado
  const session = await getServerSession(authOptions);
  
  // Se não tiver sessão (erro raro), redireciona ou usa valores padrão
  const userRole = (session?.user as any)?.role || 'AGENT';
  const userDept = (session?.user as any)?.department || 'GERAL';

  // 2. Define o Filtro de Segurança
  let whereCondition: any = {};

  if (userRole !== 'ADMIN') {
    // Se NÃO for Admin, vê apenas o próprio setor OU Geral
    whereCondition = {
      OR: [
        { department: userDept },
        { department: 'GERAL' } // Agentes também veem o que caiu na triagem
      ]
    };
  }
  // Se for ADMIN, o whereCondition fica vazio ({}) e pega tudo.

  // 3. Busca lista de Chats (COM O FILTRO)
  const chats = await prisma.chat.findMany({
    where: whereCondition,
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { 
        select: { 
          messages: { where: { isRead: false, sender: 'CUSTOMER' } } 
        } 
      }
    },
    // ORDEM DE PRIORIDADE:
    // 1º Nível de Urgência (Decrescente: 3->2->1)
    // 2º Data da última mensagem (Mais recentes primeiro)
    orderBy: [
      { urgencyLevel: 'desc' }, 
      { lastMessageAt: 'desc' }
    ],
  });

  // 4. Se tiver um ID na URL, busca a conversa (Verifica se ele tem permissão de ver essa também)
  let selectedChat = null;
  if (selectedChatId) {
    selectedChat = await prisma.chat.findFirst({
      where: { 
        id: selectedChatId,
        ...whereCondition // <--- Garante que ele não acesse chat de outro setor pela URL
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } }
      }
    });
  }

  // 5. Dados dos Gráficos (Também filtrados para não "vazar" números de outros setores)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentMessages = await prisma.message.findMany({
    select: { createdAt: true },
    where: { 
      createdAt: { gte: sevenDaysAgo },
      chat: whereCondition // <--- Filtra as mensagens pelo setor do chat
    }
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
      selectedChat={selectedChat}
    />
  );
}