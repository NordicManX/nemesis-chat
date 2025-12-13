// app/api/chat/urgency/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { chatId, urgencyLevel } = await req.json();

    await prisma.chat.update({
      where: { id: chatId },
      data: { urgencyLevel: parseInt(urgencyLevel) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar urgência' }, { status: 500 });
  }
}