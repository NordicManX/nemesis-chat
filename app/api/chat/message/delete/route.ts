// app/api/chat/message/delete/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get('id');
    const mode = searchParams.get('mode'); // 'me' (só banco) ou 'everyone' (banco + telegram)

    if (!messageId) return NextResponse.json({ error: 'ID faltando' }, { status: 400 });

    const message = await prisma.message.findUnique({ 
        where: { id: messageId },
        include: { chat: true }
    });

    if (!message) return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 });

    // Se for "Para Todos" e tivermos o ID do Telegram, tentamos apagar lá
    if (mode === 'everyone' && message.telegramMessageId && message.chat.telegramId && TELEGRAM_TOKEN) {
        try {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/deleteMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: message.chat.telegramId,
                    message_id: message.telegramMessageId
                })
            });
        } catch (e) {
            console.error("Erro ao apagar no Telegram:", e);
            // Não paramos o erro, continuamos para apagar do banco
        }
    }

    // Apaga do banco de dados
    await prisma.message.delete({ where: { id: messageId } });

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: 'Erro ao deletar' }, { status: 500 });
  }
}