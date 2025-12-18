// app/api/chats/list/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // 1. Segurança: Verifica sessão
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // 2. Segurança SaaS: Pega o ID da Organização da sessão
    const userOrgId = (session.user as any)?.organizationId;

    if (!userOrgId) {
        console.error("ERRO CRÍTICO: Usuário sem organizationId tentou listar chats.");
        // Retorna array vazio em vez de erro 403 para não quebrar o front, mas não mostra dados
        return NextResponse.json([], { status: 200 });
    }

    const userRole = (session.user as any)?.role || 'AGENT';
    const userDept = (session.user as any)?.department; 

    // 3. FILTRO OBRIGATÓRIO (ISOLAMENTO DE DADOS)
    // Isso garante que o usuário SÓ veja chats da empresa dele
    let whereCondition: any = {
        organizationId: userOrgId 
    };

    // 4. Filtro de Departamento (Se não for Admin, vê só o dele ou Geral)
    if (userRole !== 'ADMIN' && userDept) {
        // Exemplo: Opcional, se quiser restringir agente ao departamento dele
        // whereCondition.department = userDept; 
    }

    // 5. Tratamento de Datas
    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const now = new Date();
    const defaultStart = new Date(); 
    defaultStart.setDate(now.getDate() - 30); // Padrão: últimos 30 dias
    
    let startDate = (startDateParam && startDateParam !== 'undefined' && startDateParam !== 'null') 
        ? new Date(startDateParam) 
        : defaultStart;
    
    let endDate = (endDateParam && endDateParam !== 'undefined' && endDateParam !== 'null') 
        ? new Date(endDateParam) 
        : now;

    if (isNaN(startDate.getTime())) startDate = defaultStart;
    if (isNaN(endDate.getTime())) endDate = now;

    // Ajusta para pegar o dia inteiro (00:00 até 23:59)
    startDate.setHours(0,0,0,0);
    endDate.setHours(23,59,59,999);

    // 6. Busca no Banco
    const chatsRaw = await prisma.chat.findMany({
      where: {
        ...whereCondition, // Aplica o filtro da organização + filtros extras
        lastMessageAt: { 
            gte: startDate, 
            lte: endDate 
        }
      },
      include: {
        messages: { 
            orderBy: { createdAt: 'desc' }, 
            take: 1 // Pega só a última mensagem para o preview
        },
        _count: { 
            // Conta mensagens não lidas enviadas pelo CLIENTE
            select: { messages: { where: { isRead: false, sender: 'CUSTOMER' } } } 
        }
      },
      orderBy: [
        { urgencyLevel: 'desc' }, // Prioridade alta primeiro
        { lastMessageAt: 'desc' } // Mais recentes primeiro
      ],
    });

    // 7. Formatação para o Front-end
    const chats = chatsRaw.map(chat => {
        const lastMsg = chat.messages[0];
        let preview = "Iniciar conversa";
        
        if (lastMsg) {
            if (lastMsg.type === 'IMAGE') preview = '📷 Imagem';
            else if (lastMsg.type === 'DOCUMENT') preview = '📎 Arquivo';
            else if (lastMsg.type === 'AUDIO') preview = '🎤 Áudio';
            else preview = lastMsg.content || '';
            
            // Adiciona prefixo se foi o agente que mandou a última
            if (lastMsg.sender === 'AGENT') preview = `Você: ${preview}`;
        }

        return {
            ...chat,
            unreadCount: chat._count.messages,
            lastMessagePreview: preview,
            lastMessageTime: lastMsg?.createdAt || chat.createdAt
        };
    });

    return NextResponse.json(chats, { 
        headers: { 
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' 
        } 
    });

  } catch (error: any) {
    console.error("❌ ERRO API CHATS LIST:", error);
    return NextResponse.json(
        { error: 'Erro interno ao listar chats', details: error.message }, 
        { status: 500 }
    );
  }
}