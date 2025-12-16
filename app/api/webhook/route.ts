// app/api/webhook/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'; // Adicione isso para garantir que não faça cache

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// Função auxiliar para pegar o link do arquivo
async function getTelegramFileUrl(fileId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
    const data = await res.json();
    
    if (data.ok && data.result.file_path) {
      return `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${data.result.file_path}`;
    }
  } catch (e) {
    console.error('Erro ao buscar arquivo do Telegram:', e);
  }
  return null;
}

export async function POST(req: Request) {
  try {
    // 1. Validação de Segurança Básica
    if (!TELEGRAM_TOKEN) {
      console.error('TELEGRAM_BOT_TOKEN não definido');
      return NextResponse.json({ error: 'Configuração interna inválida' }, { status: 500 });
    }

    const update = await req.json();
    const { message } = update;

    // Se não for uma mensagem (ex: status de 'digitando...' ou edição), ignora
    if (!message) return NextResponse.json({ ok: true });

    // Dados do remetente
    const { from, chat } = message;
    const telegramId = chat.id.toString();
    const customerName = from.first_name + (from.last_name ? ` ${from.last_name}` : '');

    // 2. Garante/Atualiza o Chat (Upsert)
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

    // --- LÓGICA DE CONTEÚDO ---

    // A. Texto
    if (message.text) {
      msgContent = message.text;
    } 
    // B. Foto (Comprimida)
    else if (message.photo) {
      msgType = 'IMAGE';
      msgContent = '📷 Foto'; 
      const photo = message.photo[message.photo.length - 1];
      msgMediaUrl = await getTelegramFileUrl(photo.file_id);
    }
    // C. Documento (Prints enviados como arquivo)
    else if (message.document) {
      msgType = 'DOCUMENT'; 
      msgContent = `📎 Arquivo: ${message.document.file_name || 'Sem nome'}`;
      msgMediaUrl = await getTelegramFileUrl(message.document.file_id);
    }
    // D. Áudio/Voz
    else if (message.voice || message.audio) {
      msgType = 'AUDIO'; // Se não tiver AUDIO no schema, use DOCUMENT ou TEXT
      msgContent = '🎤 Áudio';
      const fileId = message.voice ? message.voice.file_id : message.audio.file_id;
      msgMediaUrl = await getTelegramFileUrl(fileId);
    }

    // Se não identificou conteúdo suportado, apenas confirma recebimento
    if (!msgContent && !msgMediaUrl) {
        return NextResponse.json({ ok: true });
    }

    // 3. Salva a Mensagem
    await prisma.message.create({
      data: {
        content: msgContent,
        type: msgType as any,
        mediaUrl: msgMediaUrl,
        sender: 'CUSTOMER',
        chatId: chatRecord.id,
        isRead: false,
        
        // --- O PREGO QUE FALTAVA ---
        // Salvamos o ID do Telegram. Sem isso, não dá pra responder citando a mensagem.
        telegramMessageId: message.message_id.toString() 
        // ---------------------------
      },
    });

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Erro Webhook:', error);
    return NextResponse.json({ ok: true }); 
  }
}