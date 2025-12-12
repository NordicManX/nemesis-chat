// app/api/profile/password/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getServerSession } from "next-auth";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { email, currentPassword, newPassword } = data;

    // 1. Busca o usuário no banco
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // 2. Verifica se a senha atual está certa
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'A senha atual está incorreta.' }, { status: 400 });
    }

    // 3. Criptografa a nova senha e salva
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: 'Senha atualizada com sucesso!' });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}