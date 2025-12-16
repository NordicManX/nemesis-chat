// app/api/chats/list/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Log de Debug (Verifique isso no terminal do VS Code)
    console.log("API Chats - User:", session?.user?.email);

    if (!session) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userRole = (session.user as any)?.role || 'AGENT';
    const userDept = (session.user as any)?.department; 

    // 1. CORREÇÃO DE QUERY: Evita passar undefined para o Prisma
    let whereCondition: any = {};

    if (userRole !== 'ADMIN') {
        // Se o usuário não tem departamento, ele não deve ver nada ou deve ver algo padrão?
        // Aqui assumimos que se for null, filtra por null (ou evita erro de undefined)
        if (userDept) {
            whereCondition = { department: userDept };
        } else {
            // Opcional: Se não tem departamento, talvez não deva ver chamados específicos
            // Descomente a linha abaixo se quiser bloquear usuários sem setor
            // return NextResponse.json([], { status: 200 });
        }
    }

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // 2. CORREÇÃO DE DATAS: Proteção contra "Invalid Date"
    const now = new Date();
    const defaultStart = new Date(); 
    defaultStart.setDate(now.getDate() - 30);
    
    // Verifica se a string é válida e não é "undefined" ou "null" texto
    let startDate = (startDateParam && startDateParam !== 'undefined' && startDateParam !== 'null') 
        ? new Date(startDateParam) 
        : defaultStart;
    
    let endDate = (endDateParam && endDateParam !== 'undefined' && endDateParam !== 'null') 
        ? new Date(endDateParam) 
        : now;

    // Se a data for inválida (ex: usuário digitou bobagem na URL), fallback para o padrão
    if (isNaN(startDate.getTime())) startDate = defaultStart;
    if (isNaN(endDate.getTime())) endDate = now;

    startDate.setHours(0,0,0,0);
    endDate.setHours(23,59,59,999);

    console.log("API Chats - Filtro:", { 
        dept: whereCondition.department, 
        start: startDate.toISOString(), 
        end: endDate.toISOString() 
    });

    const chatsRaw = await prisma.chat.findMany({
      where: {
        ...whereCondition,
        lastMessageAt: { gte: startDate, lte: endDate }
      },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { 
            select: { messages: { where: { isRead: false, sender: 'CUSTOMER' } } } 
        }
      },
      orderBy: [
        { urgencyLevel: 'desc' }, 
        { lastMessageAt: 'desc' }
      ],
    });

    const chats = chatsRaw.map(chat => {
        const lastMsg = chat.messages[0];
        let preview = "Sem mensagens";
        if (lastMsg) {
            if (lastMsg.type === 'IMAGE') preview = '📷 Imagem';
            else if (lastMsg.type === 'DOCUMENT') preview = '📎 Arquivo';
            else preview = lastMsg.content || '';
        }
        if (lastMsg?.sender === 'AGENT') preview = `Você: ${preview}`;

        return {
            ...chat,
            unreadCount: chat._count.messages,
            lastMessagePreview: preview,
            lastMessageTime: lastMsg?.createdAt
        };
    });

    return NextResponse.json(chats, { headers: { 'Cache-Control': 'no-store, no-cache' } });

  } catch (error: any) {
    // Log detalhado do erro real
    console.error("❌ ERRO FATAL API CHATS:", error);
    
    // Retorna o erro em JSON para vermos no Network Tab se necessário
    return NextResponse.json(
        { error: 'Erro interno ao buscar chats', details: error.message }, 
        { status: 500 }
    );
  }
}