import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// --- LISTAR TODAS AS EMPRESAS (GET) ---
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    // Segurança: Só Admin pode ver
    if (!session || (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const tenants = await prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true } } // Conta quantos usuários a empresa tem
      }
    });

    return NextResponse.json(tenants);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao listar clientes' }, { status: 500 });
  }
}

// --- BLOQUEAR/DESBLOQUEAR EMPRESA (PATCH) ---
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { id, isActive } = await req.json();

    const updated = await prisma.organization.update({
        where: { id },
        data: { isActive }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar status' }, { status: 500 });
  }
}