// app/api/chats/create/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, telegramId, department } = body;

    if (!name || !telegramId) {
      return NextResponse.json({ error: 'Nome e ID são obrigatórios' }, { status: 400 });
    }

    // Verifica se já existe um chat com esse Telegram ID
    let chat = await prisma.chat.findFirst({
      where: { telegramId: telegramId }
    });

    if (!chat) {
      // Se não existe, cria
      chat = await prisma.chat.create({
        data: {
          customerName: name,
          telegramId: telegramId,
          department: department || 'GERAL',
          status: 'OPEN',
          urgencyLevel: 1,
          lastMessageAt: new Date(),
        }
      });
    } else {
        // Se já existe, atualiza o nome caso tenha mudado e reabre se estiver fechado
        chat = await prisma.chat.update({
            where: { id: chat.id },
            data: { 
                customerName: name,
                lastMessageAt: new Date() // Traz pro topo da lista
            }
        });
    }

    return NextResponse.json(chat);
  } catch (error) {
    console.error('Erro ao criar chat:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}