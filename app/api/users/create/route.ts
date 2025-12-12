// app/api/users/create/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    // Agora recebemos também o 'department'
    const { name, email, password, role, department } = await req.json();

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: 'Este email já está cadastrado.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'AGENT',
        department: department || 'GERAL', // Se não informar, cai no Geral
      }
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 });
  }
}