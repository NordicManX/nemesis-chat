// app/page.tsx
import { prisma } from '@/lib/prisma';
import DashboardClient from './components/dashboard-client';
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import AutoRefresh from '@/app/components/auto-refresh';

export const dynamic = 'force-dynamic';

export default async function Dashboard(props: { searchParams: Promise<{ chatId?: string, startDate?: string, endDate?: string }> }) {
  const searchParams = await props.searchParams;
  const selectedChatId = searchParams.chatId;

  // 1. Definição de Datas
  const now = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(now.getDate() - 30);
  
  const startDate = searchParams.startDate ? new Date(searchParams.startDate) : defaultStart;
  const endDate = searchParams.endDate ? new Date(searchParams.endDate) : now;
  startDate.setHours(0,0,0,0);
  endDate.setHours(23,59,59,999);

  // 2. Autenticação e Permissões
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role || 'AGENT';
  const userDept = (session?.user as any)?.department || 'GERAL';

  let whereCondition: any = {};
  if (userRole !== 'ADMIN') {
    whereCondition = {
      OR: [{ department: userDept }, { department: 'GERAL' }]
    };
  }

  // 3. Buscar Chats (RAW)
  const chatsRaw = await prisma.chat.findMany({
    where: {
      ...whereCondition,
      lastMessageAt: { gte: startDate, lte: endDate }
    },
    include: {
      // Pegamos a última mensagem para fazer o PREVIEW
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      // Contamos quantas mensagens o CLIENTE mandou e não foram lidas
      _count: { 
        select: { messages: { where: { isRead: false, sender: 'CUSTOMER' } } } 
      }
    },
    orderBy: [
      { urgencyLevel: 'desc' }, 
      { lastMessageAt: 'desc' }
    ],
  });

  // 🔥 4. FORMATAÇÃO INTELIGENTE (O SEGREDO ESTÁ AQUI)
  // Preparamos os dados para o visual não ter trabalho
  const chats = chatsRaw.map(chat => {
    const lastMsg = chat.messages[0];
    let preview = "Sem mensagens";
    
    // Lógica do Preview (Texto, Imagem ou Arquivo)
    if (lastMsg) {
        if (lastMsg.type === 'IMAGE') preview = '📷 Imagem';
        else if (lastMsg.type === 'DOCUMENT') preview = '📎 Arquivo';
        else preview = lastMsg.content;
    }

    // Se fui EU (Agente) que mandei a última, coloco um "Você: " antes
    if (lastMsg?.sender === 'AGENT') {
        preview = `Você: ${preview}`;
    }

    return {
        ...chat,
        unreadCount: chat._count.messages, // Número da bolinha azul
        lastMessagePreview: preview,       // Texto cinza abaixo do nome
        lastMessageTime: lastMsg?.createdAt // Data para ordenar/exibir
    };
  });

  // 5. Selecionar Chat Específico
  let selectedChat = null;
  if (selectedChatId) {
    selectedChat = await prisma.chat.findFirst({
      where: { id: selectedChatId, ...whereCondition },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
  }

  // 6. Dados do Gráfico
  const chartMessages = await prisma.message.findMany({
    where: { createdAt: { gte: startDate, lte: endDate }, chat: whereCondition },
    select: { createdAt: true }
  });

  const chartDataMap = new Map();
  chartMessages.forEach(msg => {
    const dateStr = new Date(msg.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    chartDataMap.set(dateStr, (chartDataMap.get(dateStr) || 0) + 1);
  });
  const chartData = Array.from(chartDataMap).map(([date, count]) => ({ date, count }));

  // 7. Performance e KPIs
  const agentMessages = await prisma.message.findMany({
    where: { createdAt: { gte: startDate, lte: endDate }, sender: 'AGENT', chat: whereCondition },
    include: { chat: { select: { department: true } } }
  });
  const teamPerformanceMap = new Map();
  agentMessages.forEach(msg => {
      const dept = msg.chat.department || 'GERAL';
      teamPerformanceMap.set(dept, (teamPerformanceMap.get(dept) || 0) + 1);
  });
  const teamStats = Array.from(teamPerformanceMap).map(([name, count]) => ({ name, count }));

  const totalClients = chats.length;
  const totalMessages = chartMessages.length;
  // Ativos agora = quem tem mensagem não lida
  const activeNow = chats.filter(c => c.unreadCount > 0).length;

  return (
    <>
      <AutoRefresh /> 
      <DashboardClient 
        chats={chats}
        chartData={chartData}
        kpi={{ totalClients, totalMessages, activeNow }}
        selectedChat={selectedChat}
        teamStats={teamStats}
        dateFilter={{ 
            start: startDate.toISOString().split('T')[0], 
            end: endDate.toISOString().split('T')[0] 
        }}
      />
    </>
  );
}