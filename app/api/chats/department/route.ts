// app/api/chat/department/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(req: Request) {
  try {
    const { chatId, department } = await req.json();

    // 1. Busca dados do Chat (precisamos do ID do Telegram)
    const chat = await prisma.chat.findUnique({
      where: { id: chatId }
    });

    if (!chat) {
        return NextResponse.json({ error: 'Chat não encontrado' }, { status: 404 });
    }

    // 2. Atualiza o Setor no Banco
    await prisma.chat.update({
      where: { id: chatId },
      data: { department }
    });

    // 3. Prepara a mensagem de aviso
    const messageText = `🔄 Você está sendo redirecionado para o setor: ${department}. Um atendente irá te ajudar em breve.`;

    // 4. Envia para o Telegram do Cliente
    if (TELEGRAM_TOKEN && chat.telegramId) {
        try {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    chat_id: chat.telegramId, 
                    text: messageText 
                })
            });
        } catch (err) {
            console.error("Erro ao enviar msg Telegram:", err);
            // Não bloqueia o fluxo se o telegram falhar
        }
    }

    // 5. Salva a mensagem no Histórico (Como se fosse o Agente falando)
    await prisma.message.create({
        data: {
            content: messageText,
            sender: 'AGENT',
            chatId: chatId,
            isRead: true 
        }
    });

    // Atualiza a data da última mensagem para o chat subir na lista
    await prisma.chat.update({
        where: { id: chatId },
        data: { lastMessageAt: new Date() }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}