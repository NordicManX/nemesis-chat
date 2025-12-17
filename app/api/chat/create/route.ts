// app/api/chats/create/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 

export async function POST(req: Request) {
  try {
    // 1. Pega a sessão para saber de qual empresa é o usuário
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const userOrgId = (session.user as any)?.organizationId;

    if (!userOrgId) {
         return NextResponse.json({ error: 'Usuário sem organização vinculada' }, { status: 400 });
    }

    const body = await req.json();
    const { name, telegramId, department } = body;

    if (!name || !telegramId) {
      return NextResponse.json({ error: 'Nome e ID são obrigatórios' }, { status: 400 });
    }

    // 2. Verifica se já existe um chat (Busca composta: ID do Telegram + ID da Empresa)
    let chat = await prisma.chat.findUnique({
      where: {
        telegramId_organizationId: {
            telegramId: telegramId,
            organizationId: userOrgId
        }
      }
    });

    if (!chat) {
      // 3. Se não existe, cria vinculando à Organização
      chat = await prisma.chat.create({
        data: {
          customerName: name,
          telegramId: telegramId,
          department: department || 'GERAL',
          status: 'OPEN',
          urgencyLevel: 1,
          lastMessageAt: new Date(),
          organizationId: userOrgId // <--- CAMPO OBRIGATÓRIO NOVO
        }
      });
    } else {
        // 4. Se já existe, atualiza nome e data
        chat = await prisma.chat.update({
            where: { id: chat.id },
            data: { 
                customerName: name,
                lastMessageAt: new Date() // Traz pro topo da lista
            }
        });
    }

    return NextResponse.json(chat);

  } catch (error) {
    console.error('Erro ao criar chat:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}