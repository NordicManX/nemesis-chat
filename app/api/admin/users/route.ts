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
    if (!session || (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, department: true },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao listar usuários' }, { status: 500 });
  }
}

// --- CRIAR (POST) ---
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
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

    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword, role, department: department || 'GERAL' }
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

// --- EDITAR (PUT) ---
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, email, password, role, department } = body;

    if (!id) return NextResponse.json({ error: 'ID do usuário faltando.' }, { status: 400 });

    // Prepara objeto de atualização
    const updateData: any = { name, email, role, department };

    // Só atualiza a senha se o admin digitou uma nova
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
    if (!session || (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const { id } = await req.json();

    if (!id) {
        return NextResponse.json({ error: 'ID do usuário faltando.' }, { status: 400 });
    }

    // Opcional: Impedir que o admin delete a si mesmo para não se trancar para fora
    // const myId = (session.user as any).id;
    // if (id === myId) return NextResponse.json({ error: 'Você não pode deletar a si mesmo.' }, { status: 400 });

    await prisma.user.delete({
        where: { id }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Erro ao deletar:", error);
    return NextResponse.json({ error: 'Erro ao deletar usuário.' }, { status: 500 });
  }
}