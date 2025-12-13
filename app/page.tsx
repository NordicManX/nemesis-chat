// app/page.tsx
import { prisma } from '@/lib/prisma';
import DashboardClient from './components/dashboard-client';
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
// 👇 1. Importe o componente que faz o refresh automático
import AutoRefresh from '@/components/auto-refresh';

export const dynamic = 'force-dynamic';

export default async function Dashboard(props: { searchParams: Promise<{ chatId?: string, startDate?: string, endDate?: string }> }) {
  const searchParams = await props.searchParams;
  const selectedChatId = searchParams.chatId;

  // 1. Definição de Datas (Padrão: Últimos 30 dias se não selecionar nada)
  const now = new Date();
  const defaultStart = new Date();
  defaultStart.setDate(now.getDate() - 30);
  
  const startDate = searchParams.startDate ? new Date(searchParams.startDate) : defaultStart;
  const endDate = searchParams.endDate ? new Date(searchParams.endDate) : now;
  
  // Ajuste para pegar o dia inteiro (00:00 até 23:59)
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

  // 3. Buscar Chats (Filtrados por Data + Permissão)
  const chats = await prisma.chat.findMany({
    where: {
      ...whereCondition,
      lastMessageAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { messages: { where: { isRead: false, sender: 'CUSTOMER' } } } }
    },
    orderBy: [
      { urgencyLevel: 'desc' }, 
      { lastMessageAt: 'desc' }
    ],
  });

  // 4. Selecionar Chat Específico
  let selectedChat = null;
  if (selectedChatId) {
    selectedChat = await prisma.chat.findFirst({
      where: { id: selectedChatId, ...whereCondition },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
  }

  // 5. Dados do Gráfico (Baseado no intervalo selecionado)
  const chartMessages = await prisma.message.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      chat: whereCondition
    },
    select: { createdAt: true }
  });

  // Agrupa mensagens por dia
  const chartDataMap = new Map();
  chartMessages.forEach(msg => {
    const dateStr = new Date(msg.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    chartDataMap.set(dateStr, (chartDataMap.get(dateStr) || 0) + 1);
  });
  // Transforma em array para o gráfico
  const chartData = Array.from(chartDataMap).map(([date, count]) => ({ date, count }));


  // 6. Performance da Equipe
  const agentMessages = await prisma.message.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      sender: 'AGENT',
      chat: whereCondition
    },
    include: {
        chat: {
            select: { department: true }
        }
    }
  });

  const teamPerformanceMap = new Map();
  agentMessages.forEach(msg => {
      const dept = msg.chat.department || 'GERAL';
      teamPerformanceMap.set(dept, (teamPerformanceMap.get(dept) || 0) + 1);
  });

  const teamStats = Array.from(teamPerformanceMap).map(([name, count]) => ({ name, count }));

  // KPIs Gerais
  const totalClients = chats.length;
  const totalMessages = chartMessages.length;
  const activeNow = chats.filter(c => c.messages.length > 0 && (new Date().getTime() - new Date(c.messages[0].createdAt).getTime()) < 24 * 60 * 60 * 1000).length;

  return (
    <>
      {/* 👇 2. O componente invisível fica aqui e força a atualização a cada 1s */}
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