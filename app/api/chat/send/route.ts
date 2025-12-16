// app/api/chat/send/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(req: Request) {
  try {
    if (!TELEGRAM_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN não configurado no .env');
    }

    const formData = await req.formData();
    const chatId = formData.get('chatId') as string;
    const content = formData.get('content') as string;
    const file = formData.get('file') as File | null;

    if (!chatId) return NextResponse.json({ error: 'Chat ID faltando' }, { status: 400 });

    // Busca o chat para pegar o ID do Telegram
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    
    // VERIFICAÇÃO: Garante que temos o chat e o ID do Telegram
    // Nota: Usei 'telegramChatId' pois é o padrão comum. Se no seu schema for 'telegramId', altere aqui.
    if (!chat || !chat.telegramChatId) {
        return NextResponse.json({ error: 'Chat ou Telegram ID não encontrado' }, { status: 404 });
    }

    let savedMediaUrl = null;
    let messageType = 'TEXT';

    // --- CENÁRIO A: TEM ARQUIVO ---
    if (file) {
      const telegramFormData = new FormData();
      // Ajustado para usar chat.telegramChatId
      telegramFormData.append('chat_id', chat.telegramChatId); 
      if (content) telegramFormData.append('caption', content);

      // Converte o arquivo para Buffer/Blob para garantir o envio no Next.js Server
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileBlob = new Blob([buffer], { type: file.type });

      // Se for imagem, usa sendPhoto, senão sendDocument
      const isImage = file.type.startsWith('image/');
      const endpoint = isImage ? 'sendPhoto' : 'sendDocument';
      const formKey = isImage ? 'photo' : 'document';
      messageType = isImage ? 'IMAGE' : 'DOCUMENT';

      // Anexa o arquivo com nome explícito
      telegramFormData.append(formKey, fileBlob, file.name);

      console.log(`📤 Enviando ${file.name} para o Telegram...`);

      const resTelegram = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${endpoint}`, {
        method: 'POST',
        body: telegramFormData,
      });

      const dataTelegram = await resTelegram.json();

      if (!dataTelegram.ok) {
        console.error('❌ Erro Telegram:', dataTelegram);
        throw new Error(`Telegram recusou o arquivo: ${dataTelegram.description}`);
      }

      // --- RECUPERAR URL DO TELEGRAM ---
      // Isso permite que você mostre a imagem no chat sem ter S3
      let fileId;
      const resT = dataTelegram.result;
      
      if (endpoint === 'sendPhoto') {
        // Pega a última foto do array (a de maior qualidade)
        fileId = resT.photo[resT.photo.length - 1].file_id;
      } else {
        fileId = resT.document?.file_id || resT.audio?.file_id || resT.video?.file_id || resT.voice?.file_id;
      }

      if (fileId) {
        // Pega o caminho do arquivo (file_path)
        const resPath = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
        const dataPath = await resPath.json();
        if (dataPath.ok) {
          // Monta a URL pública do arquivo no servidor do Telegram
          savedMediaUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${dataPath.result.file_path}`;
        }
      }
    } 
    
    // --- CENÁRIO B: SÓ TEXTO ---
    else if (content) {
      const resText = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat.telegramChatId, text: content }),
      });

      if (!resText.ok) {
          const err = await resText.json();
          throw new Error(`Erro envio texto: ${err.description}`);
      }
    }

    // --- SALVAR NO BANCO ---
    const newMessage = await prisma.message.create({
      data: {
        content: content || (messageType === 'IMAGE' ? '📷 Imagem enviada' : '📎 Arquivo enviado'),
        sender: 'AGENT',
        chatId: chatId,
        isRead: true,
        type: messageType as any, // Cast para evitar erro de TS se o enum for estrito
        mediaUrl: savedMediaUrl
      },
    });

    await prisma.chat.update({
      where: { id: chatId },
      data: { lastMessageAt: new Date() }
    });

    return NextResponse.json(newMessage);

  } catch (error: any) {
    console.error('Erro no endpoint de envio:', error);
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 });
  }
}