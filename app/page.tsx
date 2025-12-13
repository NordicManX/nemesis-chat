// app/page.tsx
import { prisma } from '@/lib/prisma';
import DashboardClient from './components/dashboard-client';
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";

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
      // AQUI ESTÁ O FILTRO DE DATA
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


  // 6. NOVO: Performance da Equipe (Quem atendeu mais?)
  // Como não temos "assignedTo" no chat ainda, contamos quantas mensagens cada agente enviou no período
  // Isso requer uma query mais avançada, vamos fazer uma aproximação:
  // Buscamos todas as mensagens de AGENTE nesse período e agrupamos manualmente aqui (já que prisma group by tem limitações em alguns dbs serverless)
  
  const agentMessages = await prisma.message.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
      sender: 'AGENT',
      chat: whereCondition
    },
    include: {
        // Precisamos saber quem mandou. Atualmente nosso modelo Message não tem userId, só 'sender=AGENT'.
        // *Nota:* Para saber EXATAMENTE qual funcionário, precisaríamos adicionar 'userId' na Message.
        // Como paliativo, vamos mostrar o volume total por DEPARTAMENTO dos chats.
        chat: {
            select: { department: true }
        }
    }
  });

  // Agrupando produtividade por Departamento (já que não temos ID do usuário na mensagem ainda)
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
    <DashboardClient 
      chats={chats}
      chartData={chartData}
      kpi={{ totalClients, totalMessages, activeNow }}
      selectedChat={selectedChat}
      teamStats={teamStats} // <--- Passamos os dados da equipe
      dateFilter={{ 
          start: startDate.toISOString().split('T')[0], 
          end: endDate.toISOString().split('T')[0] 
      }}
    />
  );
}