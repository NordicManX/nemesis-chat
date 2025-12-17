// app/api/admin/tenants/create/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import bcrypt from 'bcrypt';

export async function POST(req: Request) {
  try {
    // 1. Segurança: Só quem já é ADMIN pode criar novas empresas
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
        // Em um cenário ideal, você teria uma role 'SUPER_ADMIN', mas vamos usar ADMIN por enquanto
        return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await req.json();
    const { companyName, companySlug, adminName, adminEmail, adminPassword } = body;

    // 2. Validações
    if (!companyName || !companySlug || !adminEmail || !adminPassword) {
        return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 });
    }

    // Verifica duplicidade
    const existingOrg = await prisma.organization.findUnique({ where: { slug: companySlug } });
    if (existingOrg) return NextResponse.json({ error: 'URL (Slug) da empresa já existe' }, { status: 409 });

    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) return NextResponse.json({ error: 'Email de usuário já cadastrado' }, { status: 409 });

    // 3. Criptografa a senha
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // 4. Transação: Cria Empresa E Usuário Admin juntos
    const result = await prisma.$transaction(async (tx) => {
        // A. Cria a Organização
        const newOrg = await tx.organization.create({
            data: {
                name: companyName,
                slug: companySlug,
            }
        });

        // B. Cria o Usuário vinculado à Organização
        const newUser = await tx.user.create({
            data: {
                name: adminName,
                email: adminEmail,
                password: hashedPassword,
                role: 'ADMIN', // Ele será o Admin dessa nova empresa
                organizationId: newOrg.id
            }
        });

        return { newOrg, newUser };
    });

    return NextResponse.json({ 
        success: true, 
        message: `Empresa ${result.newOrg.name} criada com sucesso!` 
    });

  } catch (error) {
    console.error("Erro ao criar tenant:", error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}