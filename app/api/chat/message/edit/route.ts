// app/api/chat/message/edit/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function PUT(req: Request) {
  try {
    const { messageId, newContent } = await req.json();

    if (!messageId || !newContent) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // 1. Busca a mensagem original para pegar os IDs do Telegram
    const originalMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: { chat: true }
    });

    if (!originalMessage) {
      return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 });
    }

    // 2. Tenta editar no Telegram (se tiver token e IDs vinculados)
    if (TELEGRAM_TOKEN && originalMessage.telegramMessageId && originalMessage.chat.telegramId) {
      try {
        const isCaption = originalMessage.type === 'IMAGE' || originalMessage.type === 'DOCUMENT';
        const method = isCaption ? 'editMessageCaption' : 'editMessageText';
        
        const telegramBody: any = {
          chat_id: originalMessage.chat.telegramId,
          message_id: originalMessage.telegramMessageId,
        };

        if (isCaption) {
            telegramBody.caption = newContent;
        } else {
            telegramBody.text = newContent;
        }

        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${method}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(telegramBody),
        });
      } catch (error) {
        console.error("Erro ao editar no Telegram:", error);
        // Não paramos o fluxo, pois precisamos salvar no banco de qualquer jeito
      }
    }

    // 3. Atualiza no Banco de Dados (Prisma)
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: { content: newContent }
    });

    return NextResponse.json(updatedMessage);

  } catch (error) {
    console.error("Erro interno edição:", error);
    return NextResponse.json({ error: 'Erro ao editar mensagem' }, { status: 500 });
  }
}