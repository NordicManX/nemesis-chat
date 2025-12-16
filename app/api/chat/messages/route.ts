// app/api/chat/messages/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const userRole = (session.user as any)?.role || 'AGENT';
    const userDept = (session.user as any)?.department;

    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) return NextResponse.json({ error: 'Chat ID faltando' }, { status: 400 });

    // Verificação de permissão
    if (userRole !== 'ADMIN') {
       const chat = await prisma.chat.findUnique({
         where: { id: chatId },
         select: { department: true } 
       });

       if (!chat) return NextResponse.json({ error: 'Chat não encontrado' }, { status: 404 });

       if (chat.department && userDept && chat.department !== userDept) {
           return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
       }
    }

    const messages = await prisma.message.findMany({
      where: { chatId },
      
      // --- CORREÇÃO AQUI: INCLUIR A MENSAGEM RESPONDIDA ---
      include: {
        replyTo: {
            select: {
                id: true,
                content: true,
                sender: true,
                type: true,
                mediaUrl: true
            }
        }
      },
      // ----------------------------------------------------

      orderBy: [
        { createdAt: 'asc' },
        { id: 'asc' }
      ]
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