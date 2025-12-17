// app/api/users/create/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    // 1. SEGURANÇA: Identifica quem está criando o usuário
    const session = await getServerSession(authOptions);
    
    if (!session) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Pega o ID da empresa do Admin logado
    const adminOrgId = (session.user as any)?.organizationId;

    if (!adminOrgId) {
        return NextResponse.json({ error: 'Você não pertence a uma organização.' }, { status: 403 });
    }

    const { name, email, password, role, department } = await req.json();

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: 'Este email já está cadastrado.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 2. CRIAÇÃO VINCULADA: O novo usuário entra na MESMA empresa do Admin
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'AGENT',
        department: department || 'GERAL',
        
        // --- O PULO DO GATO ---
        organizationId: adminOrgId // Vincula obrigatóriamente à empresa atual
      }
    });

    return NextResponse.json({ success: true, user: newUser });

  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 });
  }
}