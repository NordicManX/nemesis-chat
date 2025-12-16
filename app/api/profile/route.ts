// app/api/profile/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import bcrypt from 'bcryptjs';

// --- PEGAR DADOS DO MEU PERFIL (GET) ---
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // 🔒 Segurança: Só quem está logado pode ver
    if (!session) {
        return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    // Busca os dados do usuário logado
    const user = await prisma.user.findUnique({
        where: { id: (session.user as any).id },
        select: { 
          name: true, 
          email: true, 
          department: true, 
          role: true, 
          avatar: true // Campo correto do banco
        }
    });

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar perfil' }, { status: 500 });
  }
}

// --- ATUALIZAR MEU PERFIL (PUT) ---
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // 🔒 Segurança
    if (!session) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });

    const userId = (session.user as any).id;
    const body = await req.json();
    
    // Recebe os dados do formulário
    const { name, email, password, avatar } = body;

    // 💡 LÓGICA INTELIGENTE: 
    // Começa com objeto vazio e SÓ adiciona o que o usuário preencheu.
    // Isso evita apagar dados caso venham vazios do frontend.
    const updateData: any = {};

    if (name && name.trim() !== '') updateData.name = name;
    if (email && email.trim() !== '') updateData.email = email;

    // Só criptografa e atualiza senha se o usuário digitou algo
    if (password && password.trim() !== '') {
        updateData.password = await bcrypt.hash(password, 10);
    }

    // Só atualiza avatar se enviou uma nova imagem
    if (avatar) {
        updateData.avatar = avatar; 
    }

    // Se o objeto estiver vazio (usuário clicou salvar sem mudar nada), retorna sucesso direto
    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ success: true, message: 'Nenhum dado alterado.' });
    }

    // Atualiza no banco
    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData
    });

    return NextResponse.json({ success: true, user: updatedUser });

  } catch (error: any) {
    console.error("Erro perfil:", error);
    
    // Se tentar colocar um email que já existe (Erro P2002 do Prisma)
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Este email já está em uso.' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Erro ao atualizar perfil.' }, { status: 500 });
  }
}