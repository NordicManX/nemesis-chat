// app/api/chat/send/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(req: Request) {
  try {
    const { chatId, content } = await req.json();

    // 1. Busca o chat para pegar o ID do Telegram
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat não encontrado' }, { status: 404 });
    }

    // 2. Manda para o Telegram
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat.telegramId,
        text: content,
      }),
    });

    if (!response.ok) {
        return NextResponse.json({ error: 'Erro ao enviar para o Telegram' }, { status: 500 });
    }

    // 3. Salva no Banco como "AGENT"
    const message = await prisma.message.create({
      data: {
        content,
        sender: 'AGENT',
        chatId,
      },
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}