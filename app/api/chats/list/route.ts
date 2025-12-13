// app/api/chats/list/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json([], { status: 401 });

    // Pega os dados do usuário logado
    const userRole = (session.user as any)?.role || 'AGENT';
    const userDept = (session.user as any)?.department; // Ex: 'SUPORTE', 'FINANCEIRO'

    // --- LÓGICA DE SEGURANÇA ---
    let whereCondition: any = {};

    if (userRole !== 'ADMIN') {
        // Se não for ADMIN, filtra ESTRITAMENTE pelo departamento do usuário.
        // Se o usuário for do "GERAL", ele verá "GERAL" (Triagem).
        // Se for "SUPORTE", verá apenas "SUPORTE".
        whereCondition = { department: userDept };
    }
    // (Se for ADMIN, o whereCondition fica vazio e traz tudo)
    // ---------------------------

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const now = new Date();
    const defaultStart = new Date(); 
    defaultStart.setDate(now.getDate() - 30);
    
    const startDate = startDateParam ? new Date(startDateParam) : defaultStart;
    const endDate = endDateParam ? new Date(endDateParam) : now;
    startDate.setHours(0,0,0,0);
    endDate.setHours(23,59,59,999);

    const chatsRaw = await prisma.chat.findMany({
      where: {
        ...whereCondition, // Aplica o filtro aqui
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

    // Formatação (igual ao anterior)
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

  } catch (error) {
    console.error("Erro API Chats:", error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}