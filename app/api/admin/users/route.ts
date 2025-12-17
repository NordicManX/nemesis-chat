// app/api/admin/users/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import bcrypt from 'bcryptjs';

// --- LISTAR (GET) ---
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // 1. Segurança: Pega o ID da Organização do Admin logado
    const userOrgId = (session?.user as any)?.organizationId;

    if (!session || (session.user as any).role !== 'ADMIN' || !userOrgId) {
        return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    // 2. Filtro: Busca APENAS usuários da mesma organização
    const users = await prisma.user.findMany({
      where: {
        organizationId: userOrgId // <--- O PULO DO GATO
      },
      select: { id: true, name: true, email: true, role: true, department: true },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao listar usuários' }, { status: 500 });
  }
}

// --- CRIAR (POST) ---
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userOrgId = (session?.user as any)?.organizationId;

    if (!session || (session.user as any).role !== 'ADMIN' || !userOrgId) {
        return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, role, department } = body;

    if (!name || !email || !password || !role) {
        return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return NextResponse.json({ error: 'Email já em uso.' }, { status: 400 });

    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Criação: Vincula o novo usuário à MESMA organização do Admin
    const newUser = await prisma.user.create({
      data: { 
          name, 
          email, 
          password: hashedPassword, 
          role, 
          department: department || 'GERAL',
          organizationId: userOrgId // <--- VINCULAÇÃO OBRIGATÓRIA
      }
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

// --- EDITAR (PUT) ---
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userOrgId = (session?.user as any)?.organizationId;

    if (!session || (session.user as any).role !== 'ADMIN' || !userOrgId) {
        return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, email, password, role, department } = body;

    if (!id) return NextResponse.json({ error: 'ID do usuário faltando.' }, { status: 400 });

    // 4. Segurança: Verifica se o usuário alvo pertence à SUA organização antes de editar
    const targetUser = await prisma.user.findFirst({
        where: { id: id, organizationId: userOrgId }
    });

    if (!targetUser) {
        return NextResponse.json({ error: 'Usuário não encontrado ou não pertence à sua equipe.' }, { status: 404 });
    }

    const updateData: any = { name, email, role, department };

    if (password && password.trim() !== '') {
        updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData
    });

    return NextResponse.json({ success: true, user: updatedUser });

  } catch (error) {
    console.error("Erro ao editar:", error);
    return NextResponse.json({ error: 'Erro ao atualizar usuário.' }, { status: 500 });
  }
}

// --- DELETAR (DELETE) ---
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userOrgId = (session?.user as any)?.organizationId;

    if (!session || (session.user as any).role !== 'ADMIN' || !userOrgId) {
        return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const { id } = await req.json();

    if (!id) return NextResponse.json({ error: 'ID faltando.' }, { status: 400 });

    // Evita deletar a si mesmo
    if (id === (session.user as any).id) {
        return NextResponse.json({ error: 'Você não pode deletar a si mesmo.' }, { status: 400 });
    }

    // 5. Segurança: Garante que só deleta da PRÓPRIA organização
    // Usamos deleteMany com filtro de ID + OrgID. Se não achar, não deleta nada (seguro).
    const result = await prisma.user.deleteMany({
        where: { 
            id: id,
            organizationId: userOrgId 
        }
    });

    if (result.count === 0) {
        return NextResponse.json({ error: 'Usuário não encontrado ou sem permissão.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erro ao deletar:", error);
    return NextResponse.json({ error: 'Erro ao deletar usuário.' }, { status: 500 });
  }
}