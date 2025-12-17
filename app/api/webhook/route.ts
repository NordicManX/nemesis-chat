// app/api/webhook/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Função auxiliar agora pede o TOKEN dinâmico
async function getTelegramFileUrl(fileId: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
    const data = await res.json();
    
    if (data.ok && data.result.file_path) {
      return `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;
    }
  } catch (e) {
    console.error('Erro ao buscar arquivo do Telegram:', e);
  }
  return null;
}

export async function POST(req: Request) {
  try {
    // 1. Identificar a Organização via URL (Ex: /api/webhook?orgId=123)
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
        console.error('Webhook: orgId não fornecido na URL');
        return NextResponse.json({ error: 'Org ID Missing' }, { status: 400 });
    }

    // 2. Buscar o Token da Organização no Banco
    const organization = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { telegramToken: true }
    });

    if (!organization || !organization.telegramToken) {
        console.error(`Webhook: Organização ${orgId} não encontrada ou sem token.`);
        return NextResponse.json({ error: 'Configuração inválida' }, { status: 404 });
    }

    const TELEGRAM_TOKEN = organization.telegramToken;

    // 3. Processar o Update
    const update = await req.json();
    const { message } = update;

    if (!message) return NextResponse.json({ ok: true });

    // Dados do remetente
    const { from, chat } = message;
    const telegramId = chat.id.toString();
    const customerName = from.first_name + (from.last_name ? ` ${from.last_name}` : '');

    // 4. Garante/Atualiza o Chat (Upsert COM organizationId)
    // Nota: O schema deve ter @@unique([telegramId, organizationId])
    const chatRecord = await prisma.chat.upsert({
      where: { 
        telegramId_organizationId: { // Chave composta do Prisma
            telegramId, 
            organizationId: orgId 
        }
      },
      update: { 
        customerName,
        lastMessageAt: new Date()
      }, 
      create: {
        telegramId,
        organizationId: orgId, // Vincula à empresa correta
        customerName,
        lastMessageAt: new Date(),
        status: 'OPEN'
      },
    });

    let msgContent = '';
    let msgType = 'TEXT'; 
    let msgMediaUrl = null;

    // --- LÓGICA DE CONTEÚDO (Passando o Token Dinâmico) ---

    // A. Texto
    if (message.text) {
      msgContent = message.text;
    } 
    // B. Foto
    else if (message.photo) {
      msgType = 'IMAGE';
      msgContent = '📷 Foto'; 
      const photo = message.photo[message.photo.length - 1];
      msgMediaUrl = await getTelegramFileUrl(photo.file_id, TELEGRAM_TOKEN);
    }
    // C. Documento
    else if (message.document) {
      msgType = 'DOCUMENT'; 
      msgContent = `📎 Arquivo: ${message.document.file_name || 'Sem nome'}`;
      msgMediaUrl = await getTelegramFileUrl(message.document.file_id, TELEGRAM_TOKEN);
    }
    // D. Áudio/Voz
    else if (message.voice || message.audio) {
      msgType = 'AUDIO'; 
      msgContent = '🎤 Áudio';
      const fileId = message.voice ? message.voice.file_id : message.audio.file_id;
      msgMediaUrl = await getTelegramFileUrl(fileId, TELEGRAM_TOKEN);
    }

    if (!msgContent && !msgMediaUrl) {
        return NextResponse.json({ ok: true });
    }

    // 5. Salva a Mensagem
    await prisma.message.create({
      data: {
        content: msgContent,
        type: msgType as any,
        mediaUrl: msgMediaUrl,
        sender: 'CUSTOMER',
        chatId: chatRecord.id,
        isRead: false,
        telegramMessageId: message.message_id.toString() 
      },
    });

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Erro Webhook:', error);
    return NextResponse.json({ ok: true }); 
  }
}