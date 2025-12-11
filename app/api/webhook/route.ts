// app/api/webhook/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Evita criar múltiplas instâncias do Prisma no hot-reload
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Verifica se é uma mensagem de texto válida
    if (body.message && body.message.text) {
      const { chat, from, text } = body.message;
      const telegramId = chat.id.toString();
      const customerName = from.first_name || "Sem Nome";

      console.log(`📩 Mensagem de ${customerName}: ${text}`);

      // 1. Procura se esse cliente já existe no banco
      let chatRecord = await prisma.chat.findUnique({
        where: { telegramId },
      });

      // Se não existir, cria um novo
      if (!chatRecord) {
        console.log("🆕 Novo cliente detectado! Criando registro...");
        chatRecord = await prisma.chat.create({
          data: { 
            telegramId, 
            customerName 
          },
        });
      }

      // 2. Salva a mensagem na tabela Message
      await prisma.message.create({
        data: {
          content: text,
          sender: 'CUSTOMER', // Marcamos que foi o cliente que mandou
          chatId: chatRecord.id,
        },
      });
      
      console.log("💾 Mensagem salva no banco!");

      // 3. (Opcional) Manda um "recebido" de volta pro Telegram
      // Isso ajuda a saber se funcionou sem olhar o banco
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramId,
          text: "🤖 Bot: Recebi sua mensagem e salvei no sistema!",
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// O Telegram as vezes manda um GET para testar se a URL existe
export async function GET() {
  return NextResponse.json({ status: "Webhook Online 🚀" });
}