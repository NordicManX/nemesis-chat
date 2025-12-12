// app/api/chat/send/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(req: Request) {
  try {
    // Agora lemos FormData (para aceitar arquivos)
    const formData = await req.formData();
    const chatId = formData.get('chatId') as string;
    const content = formData.get('content') as string;
    const file = formData.get('file') as File | null;

    if (!chatId) return NextResponse.json({ error: 'Chat ID faltando' }, { status: 400 });

    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) return NextResponse.json({ error: 'Chat não encontrado' }, { status: 404 });

    let telegramMsgId;
    let savedMediaUrl = null;
    let messageType = 'TEXT';

    // --- CENÁRIO A: TEM ARQUIVO ---
    if (file) {
      const telegramFormData = new FormData();
      telegramFormData.append('chat_id', chat.telegramId);
      
      // Anexa o arquivo
      telegramFormData.append(
        file.type.startsWith('image/') ? 'photo' : 'document', 
        file, 
        file.name
      );

      // Se tiver legenda (texto junto com foto)
      if (content) telegramFormData.append('caption', content);

      // Decide qual endpoint usar (Foto ou Documento Genérico)
      const endpoint = file.type.startsWith('image/') ? 'sendPhoto' : 'sendDocument';
      messageType = file.type.startsWith('image/') ? 'IMAGE' : 'DOCUMENT';

      // Envia para o Telegram
      const resTelegram = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${endpoint}`, {
        method: 'POST',
        body: telegramFormData,
      });
      const dataTelegram = await resTelegram.json();

      if (!dataTelegram.ok) {
        throw new Error('Erro ao enviar arquivo para o Telegram');
      }

      // --- RECUPERAR URL DO ARQUIVO PARA SALVAR NO BANCO ---
      // O Telegram retorna o ID do arquivo, precisamos pegar o caminho (path) para montar a URL
      let fileId;
      if (endpoint === 'sendPhoto') {
        // Pega a maior resolução
        fileId = dataTelegram.result.photo[dataTelegram.result.photo.length - 1].file_id;
      } else {
        fileId = dataTelegram.result.document.file_id;
      }

      // Pergunta o caminho
      const resPath = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
      const dataPath = await resPath.json();
      
      if (dataPath.ok) {
        savedMediaUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${dataPath.result.file_path}`;
      }
    } 
    
    // --- CENÁRIO B: SÓ TEXTO ---
    else if (content) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat.telegramId, text: content }),
      });
    }

    // --- SALVAR NO BANCO DE DADOS ---
    await prisma.message.create({
      data: {
        content: content || (messageType === 'IMAGE' ? '📷 Imagem enviada' : '📎 Arquivo enviado'),
        sender: 'AGENT',
        chatId: chatId,
        isRead: true, // Msg do agente já nasce lida
        type: messageType,
        mediaUrl: savedMediaUrl
      },
    });

    // Atualiza data do chat
    await prisma.chat.update({
      where: { id: chatId },
      data: { lastMessageAt: new Date() }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro no envio:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}