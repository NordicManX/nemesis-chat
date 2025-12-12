// app/api/profile/update/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { email, name, avatar } = await req.json();

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { 
        name,
        avatar 
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 });
  }
}