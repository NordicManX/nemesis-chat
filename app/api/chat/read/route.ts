// app/api/chat/read/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { chatId } = await req.json();

    // Marca todas as mensagens DO CLIENTE naquele chat como lidas
    await prisma.message.updateMany({
      where: {
        chatId: chatId,
        sender: 'CUSTOMER', // Só marcamos as do cliente, as suas já nascem lidas
        isRead: false
      },
      data: {
        isRead: true
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao marcar como lido' }, { status: 500 });
  }
}