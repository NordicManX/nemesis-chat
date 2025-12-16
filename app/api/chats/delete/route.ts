// app/api/chats/delete/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID faltando' }, { status: 400 });
    }

    // Transação: Apaga mensagens PRIMEIRO, depois apaga o Chat
    await prisma.$transaction([
      prisma.message.deleteMany({ where: { chatId } }),
      prisma.chat.delete({ where: { id: chatId } })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar chat:", error);
    return NextResponse.json({ error: 'Erro ao deletar' }, { status: 500 });
  }
}