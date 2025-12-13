// app/page.tsx
import { prisma } from '@/lib/prisma';
import DashboardClient from './components/dashboard-client';
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import AutoRefresh from '@/app/components/auto-refresh'; // Confirme se o caminho da pasta está certo

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

  // 3. Buscar Chats (RAW - Bruto do banco)
  const chatsRaw = await prisma.chat.findMany({
    where: {
      ...whereCondition,
      lastMessageAt: {
        gte: startDate,
        lte: endDate
      }
    },
    include: {
      messages: { orderBy: { createdAt: 'desc' }, take: 1 }, // Pega a última msg para texto
      _count: { 
        select: { 
            messages: { 
                // 🔥 FILTRO MÁGICO: Conta apenas o que não foi lido e veio do Cliente
                where: { isRead: false, sender: 'CUSTOMER' } 
            } 
        } 
      }
    },
    orderBy: [
      { urgencyLevel: 'desc' }, 
      { lastMessageAt: 'desc' }
    ],
  });

  // 🔥 3.1 TRANSFORMAÇÃO: Aqui criamos o campo 'unreadCount' para o visual ler
  const chats = chatsRaw.map(chat => ({
    ...chat,
    unreadCount: chat._count.messages // Tira de dentro do _count e coloca fácil
  }));

  // 4. Selecionar Chat Específico
  let selectedChat = null;
  if (selectedChatId) {
    selectedChat = await prisma.chat.findFirst({
      where: { id: selectedChatId, ...whereCondition },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
  }

  // 5. Dados do Gráfico
  const chartMessages = await prisma.message.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      chat: whereCondition
    },
    select: { createdAt: true }
  });

  const chartDataMap = new Map();
  chartMessages.forEach(msg => {
    const dateStr = new Date(msg.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    chartDataMap.set(dateStr, (chartDataMap.get(dateStr) || 0) + 1);
  });
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
  // Ajustado para usar o unreadCount se quiser saber quantos tem msg pendente, 
  // ou mantém a lógica de "ativos nas últimas 24h"
  const activeNow = chats.filter(c => c.messages.length > 0 && (new Date().getTime() - new Date(c.messages[0].createdAt).getTime()) < 24 * 60 * 60 * 1000).length;

  return (
    <>
      {/* Atualiza a cada 1s */}
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