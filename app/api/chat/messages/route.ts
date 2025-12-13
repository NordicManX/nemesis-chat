// app/api/chat/messages/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // 1. Verificar quem está tentando acessar
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const userRole = (session.user as any)?.role || 'AGENT';
    const userDept = (session.user as any)?.department;

    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) return NextResponse.json({ error: 'Chat ID faltando' }, { status: 400 });

    // 2. Buscar informações do Chat (apenas para checar o departamento)
    const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        select: { department: true } // Só precisamos saber o departamento
    });

    if (!chat) return NextResponse.json({ error: 'Chat não encontrado' }, { status: 404 });

    // 3. REGRA DE OURO: Bloqueio de Acesso
    if (userRole !== 'ADMIN') {
        // Se o departamento do chat for diferente do departamento do usuário
        if (chat.department !== userDept) {
            return NextResponse.json(
                { error: 'Você não tem permissão para ver conversas deste setor.' }, 
                { status: 403 } // 403 Forbidden
            );
        }
    }

    // 4. Se passou, busca as mensagens
    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json(messages, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

  } catch (error) {
    console.error("Erro API Mensagens:", error);
    return NextResponse.json({ error: 'Erro ao buscar mensagens' }, { status: 500 });
  }
}