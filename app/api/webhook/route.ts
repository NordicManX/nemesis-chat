// app/api/webhook/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const update = await req.json();

    if (update.message && update.message.text) {
      const { from, chat, text } = update.message;
      const telegramId = chat.id.toString();
      const customerName = from.first_name + (from.last_name ? ` ${from.last_name}` : '');

      // 1. Garante que o Chat existe E atualiza a data da última mensagem
      const chatRecord = await prisma.chat.upsert({
        where: { telegramId },
        update: { 
          customerName,
          lastMessageAt: new Date() // <--- ATUALIZA A HORA SEMPRE QUE CHEGAR MSG
        }, 
        create: {
          telegramId,
          customerName,
          lastMessageAt: new Date()
        },
      });

      // 2. Salva a mensagem
      await prisma.message.create({
        data: {
          content: text,
          sender: 'CUSTOMER',
          chatId: chatRecord.id,
          isRead: false,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro' }, { status: 500 });
  }
}