// app/api/chat/send/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const chatId = formData.get('chatId') as string;
    const content = formData.get('content') as string;
    const file = formData.get('file') as File | null;

    if (!chatId) return NextResponse.json({ error: 'Chat ID faltando' }, { status: 400 });

    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat) return NextResponse.json({ error: 'Chat não encontrado' }, { status: 404 });

    let savedMediaUrl = null;
    let messageType = 'TEXT';

    // --- CENÁRIO A: TEM ARQUIVO ---
    if (file) {
      const telegramFormData = new FormData();
      telegramFormData.append('chat_id', chat.telegramId);
      if (content) telegramFormData.append('caption', content);

      // Converte o arquivo para Buffer para garantir o envio correto na Vercel
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Cria um Blob a partir do Buffer para o fetch aceitar
      const fileBlob = new Blob([buffer], { type: file.type });

      // Se for imagem, usa sendPhoto, senão sendDocument
      const isImage = file.type.startsWith('image/');
      const endpoint = isImage ? 'sendPhoto' : 'sendDocument';
      const formKey = isImage ? 'photo' : 'document';
      messageType = isImage ? 'IMAGE' : 'DOCUMENT';

      // Anexa o arquivo com nome explícito
      telegramFormData.append(formKey, fileBlob, file.name);

      console.log(`Enviando ${file.name} (${file.size} bytes) para ${endpoint}...`);

      const resTelegram = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${endpoint}`, {
        method: 'POST',
        body: telegramFormData,
      });

      const dataTelegram = await resTelegram.json();

      if (!dataTelegram.ok) {
        console.error('Erro Telegram:', dataTelegram);
        throw new Error(`Telegram recusou o arquivo: ${dataTelegram.description}`);
      }

      // --- RECUPERAR URL ---
      let fileId;
      const resT = dataTelegram.result;
      
      // Tenta achar o ID do arquivo onde quer que ele esteja
      if (endpoint === 'sendPhoto') {
        fileId = resT.photo[resT.photo.length - 1].file_id;
      } else {
        // Pode vir como document, audio, video ou voice
        fileId = resT.document?.file_id || resT.audio?.file_id || resT.video?.file_id || resT.voice?.file_id;
      }

      if (fileId) {
        const resPath = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
        const dataPath = await resPath.json();
        if (dataPath.ok) {
          savedMediaUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${dataPath.result.file_path}`;
        }
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

    // --- SALVAR NO BANCO ---
    await prisma.message.create({
      data: {
        content: content || (messageType === 'IMAGE' ? '📷 Imagem enviada' : '📎 Arquivo enviado'),
        sender: 'AGENT',
        chatId: chatId,
        isRead: true,
        type: messageType,
        mediaUrl: savedMediaUrl
      },
    });

    await prisma.chat.update({
      where: { id: chatId },
      data: { lastMessageAt: new Date() }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Erro no endpoint de envio:', error);
    // Retorna a mensagem real do erro para o frontend mostrar no alerta
    return NextResponse.json({ error: error.message || 'Erro interno no servidor' }, { status: 500 });
  }
}