// app/api/chats/list/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // Configura datas (igual ao page.tsx)
    const now = new Date();
    const defaultStart = new Date(); 
    defaultStart.setDate(now.getDate() - 30);
    
    const startDate = startDateParam ? new Date(startDateParam) : defaultStart;
    const endDate = endDateParam ? new Date(endDateParam) : now;
    startDate.setHours(0,0,0,0);
    endDate.setHours(23,59,59,999);

    // Filtros de Permissão
    const userRole = (session.user as any)?.role || 'AGENT';
    const userDept = (session.user as any)?.department || 'GERAL';
    let whereCondition: any = {};
    if (userRole !== 'ADMIN') {
        whereCondition = { OR: [{ department: userDept }, { department: 'GERAL' }] };
    }

    // Busca no Banco
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

    // Formata o JSON para o Frontend (Preview + Bolinha Azul)
    const chats = chatsRaw.map(chat => {
        const lastMsg = chat.messages[0];
        let preview = "Sem mensagens";
        
        if (lastMsg) {
            if (lastMsg.type === 'IMAGE') preview = '📷 Imagem';
            else if (lastMsg.type === 'DOCUMENT') preview = '📎 Arquivo';
            else preview = lastMsg.content || '';
        }

        if (lastMsg?.sender === 'AGENT') {
            preview = `Você: ${preview}`;
        }

        return {
            ...chat,
            unreadCount: chat._count.messages,
            lastMessagePreview: preview,
            lastMessageTime: lastMsg?.createdAt
        };
    });

    // Headers anti-cache violentos
    return NextResponse.json(chats, {
        headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache'
        }
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}