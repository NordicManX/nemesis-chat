// app/api/webhook/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(req: Request) {
  try {
    const update = await req.json();
    const { message } = update;

    if (!message) return NextResponse.json({ ok: true });

    // Dados básicos
    const { from, chat } = message;
    const telegramId = chat.id.toString();
    const customerName = from.first_name + (from.last_name ? ` ${from.last_name}` : '');

    // 1. Garante/Atualiza o Chat
    const chatRecord = await prisma.chat.upsert({
      where: { telegramId },
      update: { 
        customerName,
        lastMessageAt: new Date()
      }, 
      create: {
        telegramId,
        customerName,
        lastMessageAt: new Date()
      },
    });

    let msgContent = '';
    let msgType = 'TEXT';
    let msgMediaUrl = null;

    // --- CENÁRIO A: TEXTO ---
    if (message.text) {
      msgContent = message.text;
    } 
    // --- CENÁRIO B: FOTO ---
    else if (message.photo) {
      msgType = 'IMAGE';
      msgContent = '📷 Foto'; // Texto para aparecer no resumo da lista
      
      // O Telegram manda várias resoluções. Pegamos a última (melhor qualidade)
      const photo = message.photo[message.photo.length - 1];
      const fileId = photo.file_id;

      // Pergunta ao Telegram o caminho do arquivo
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
      const data = await res.json();
      
      if (data.ok) {
        const filePath = data.result.file_path;
        // Monta o link final (Cuidado: esse link expõe o Token, mas para MVP funciona)
        msgMediaUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`;
      }
    }

    // Se não for nem texto nem foto, ignora
    if (!msgContent && !msgMediaUrl) {
        return NextResponse.json({ ok: true });
    }

    // 2. Salva no Banco
    await prisma.message.create({
      data: {
        content: msgContent,
        type: msgType,
        mediaUrl: msgMediaUrl,
        sender: 'CUSTOMER',
        chatId: chatRecord.id,
        isRead: false,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Erro Webhook:', error);
    return NextResponse.json({ error: 'Erro' }, { status: 500 });
  }
}