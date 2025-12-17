// app/api/chats/list/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // 1. Segurança: Verifica se está logado e pega a Organização
    if (!session) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userOrgId = (session.user as any)?.organizationId;

    if (!userOrgId) {
        // Se o usuário não tem organização, não pode ver chat nenhum
        return NextResponse.json({ error: 'Usuário sem organização vinculada' }, { status: 403 });
    }

    const userRole = (session.user as any)?.role || 'AGENT';
    const userDept = (session.user as any)?.department; 

    // 2. FILTRO DE SEGURANÇA (SaaS)
    // Começamos o filtro garantindo que só busque chats DA MESMA EMPRESA
    let whereCondition: any = {
        organizationId: userOrgId // <--- OBRIGATÓRIO: ISOLAMENTO DE DADOS
    };

    // Filtro de Departamento (apenas se não for Admin)
    if (userRole !== 'ADMIN') {
        if (userDept) {
            whereCondition.department = userDept;
        } else {
             // Opcional: Se quiser que quem não tem departamento veja tudo da empresa, deixe assim.
             // Se quiser bloquear, descomente abaixo:
             // return NextResponse.json([], { status: 200 });
        }
    }

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // 3. Tratamento de Datas
    const now = new Date();
    const defaultStart = new Date(); 
    defaultStart.setDate(now.getDate() - 30);
    
    let startDate = (startDateParam && startDateParam !== 'undefined' && startDateParam !== 'null') 
        ? new Date(startDateParam) 
        : defaultStart;
    
    let endDate = (endDateParam && endDateParam !== 'undefined' && endDateParam !== 'null') 
        ? new Date(endDateParam) 
        : now;

    if (isNaN(startDate.getTime())) startDate = defaultStart;
    if (isNaN(endDate.getTime())) endDate = now;

    startDate.setHours(0,0,0,0);
    endDate.setHours(23,59,59,999);

    // 4. Busca no Banco com o filtro da Organização
    const chatsRaw = await prisma.chat.findMany({
      where: {
        ...whereCondition, // Aqui dentro já tem o organizationId
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
    console.error("❌ ERRO API CHATS:", error);
    return NextResponse.json(
        { error: 'Erro interno', details: error.message }, 
        { status: 500 }
    );
  }
}