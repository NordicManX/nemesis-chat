// app/api/setup/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic'; // Garante que não use cache

export async function GET() {
  try {
    console.log("Iniciando Setup Forçado...");
    
    // Cria o hash da senha '123456'
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    // UPSERT: Se existir atualiza, se não existir cria.
    const user = await prisma.user.upsert({
      where: { email: 'admin@nemesis.com' },
      update: { 
        password: hashedPassword, // Reseta a senha se já existir
        role: 'ADMIN'
      },
      create: {
        email: 'admin@nemesis.com',
        name: 'Nelson Admin',
        password: hashedPassword,
        role: 'ADMIN'
      }
    });

    console.log("Usuário Admin garantido:", user);

    return NextResponse.json({ 
      success: true, 
      message: 'Admin configurado com sucesso! Pode logar.',
      user: { email: user.email, id: user.id } 
    });

  } catch (error: any) {
    console.error('Erro no setup:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}