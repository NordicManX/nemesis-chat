// app/api/chat/send/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs'; 

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const chatId = formData.get('chatId') as string;
    const content = formData.get('content') as string;
    const file = formData.get('file') as File | null;

    if (!chatId) return NextResponse.json({ error: 'Chat ID faltando' }, { status: 400 });

    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    
    // Se não tiver ID do Telegram, salva como mensagem interna apenas
    if (!chat) {
        return NextResponse.json({ error: 'Chat não encontrado' }, { status: 404 });
    }

    // --- PASSO 1: SALVAR NO BANCO IMEDIATAMENTE ---
    // Isso garante que a mensagem NÃO SUMA da tela, mesmo se o Telegram der erro.
    let initialType = 'TEXT';
    let initialContent = content;

    if (file) {
        initialType = file.type.startsWith('image/') ? 'IMAGE' : 'DOCUMENT';
        // Placeholder enquanto faz upload
        if (!content) {
            initialContent = initialType === 'IMAGE' ? '📷 Enviando imagem...' : '📎 Enviando arquivo...';
        }
    }

    const savedMessage = await prisma.message.create({
      data: {
        chatId,
        content: initialContent || '...',
        sender: 'AGENT',
        isRead: true,
        type: initialType as any,
        mediaUrl: null 
      }
    });

    // Atualiza timestamp do chat
    await prisma.chat.update({
      where: { id: chatId },
      data: { lastMessageAt: new Date() }
    });

    // Se não tiver token ou ID do cliente, paramos aqui (mensagem salva apenas internamente)
    if (!TELEGRAM_TOKEN || !chat.telegramId) {
        console.warn("⚠️ Mensagem salva, mas não enviada ao Telegram (Falta Token ou ID)");
        return NextResponse.json(savedMessage);
    }

    // --- PASSO 2: ENVIAR PARA O TELEGRAM (BACKGROUND) ---
    // Usamos setImmediate ou apenas não damos 'await' no retorno final para não travar a UI
    // Mas aqui faremos sequencial rápido para atualizar a URL
    
    try {
        let telegramSuccess = false;
        let finalMediaUrl = null;

        if (file) {
            console.log(`📤 Enviando arquivo para ID: ${chat.telegramId}`);
            
            const telegramFormData = new FormData();
            telegramFormData.append('chat_id', chat.telegramId);
            if (content) telegramFormData.append('caption', content);

            const arrayBuffer = await file.arrayBuffer();
            const blob = new Blob([arrayBuffer], { type: file.type });
            
            const isImage = file.type.startsWith('image/');
            const endpoint = isImage ? 'sendPhoto' : 'sendDocument';
            const formKey = isImage ? 'photo' : 'document';

            telegramFormData.append(formKey, blob, file.name);

            const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/${endpoint}`, {
                method: 'POST',
                body: telegramFormData,
            });

            const data = await res.json();

            if (data.ok) {
                telegramSuccess = true;
                const resT = data.result;
                let fileId = endpoint === 'sendPhoto' ? resT.photo[resT.photo.length - 1].file_id : resT.document?.file_id;
                
                if (fileId) {
                    const pathRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
                    const pathData = await pathRes.json();
                    if (pathData.ok) {
                        finalMediaUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${pathData.result.file_path}`;
                    }
                }
            } else {
                console.error("❌ Erro Telegram (Arquivo):", data);
                // Se falhar arquivo, tenta mandar texto de erro
            }
        } 
        else if (content) {
            // Envio de Texto
            const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chat.telegramId, text: content }),
            });
            const data = await res.json();
            if (data.ok) telegramSuccess = true;
            else console.error("❌ Erro Telegram (Texto):", data);
        }

        // --- PASSO 3: ATUALIZAR MENSAGEM NO BANCO ---
        if (telegramSuccess) {
            // Se tinha arquivo, atualiza a URL e remove o texto de "Enviando..."
            if (file) {
                await prisma.message.update({
                    where: { id: savedMessage.id },
                    data: { 
                        mediaUrl: finalMediaUrl,
                        content: content || (initialType === 'IMAGE' ? '📷 Imagem enviada' : '📎 Arquivo enviado')
                    }
                });
            }
        } else {
            // Se falhou no Telegram (ex: chat not found), avisamos no banco
            await prisma.message.update({
                where: { id: savedMessage.id },
                data: { content: `⚠️ Erro envio (Telegram): ${content || 'Arquivo'}` }
            });
        }

    } catch (err) {
        console.error("Erro processo Telegram:", err);
    }

    return NextResponse.json(savedMessage);

  } catch (error: any) {
    console.error('❌ ERRO CRÍTICO ROUTE:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}