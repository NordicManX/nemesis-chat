// app/api/settings/telegram/connect/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { prisma } from '@/lib/prisma';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    // 1. Segurança: Quem é o usuário?
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Assumindo que você já ajustou o NextAuth para ter o organizationId na sessão
    const userOrgId = (session.user as any).organizationId; 
    
    const { token } = await req.json();

    if (!token) return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 });

    // 2. Montar a URL do seu Webhook com o ID da Empresa
    // IMPORTANTE: Em produção, use sua URL real (ex: https://meu-saas.com)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seu-dominio-ngrok.com'; 
    const webhookUrl = `${baseUrl}/api/webhook?orgId=${userOrgId}`;

    // 3. Avisar o Telegram (SetWebhook)
    const telegramRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`);
    const telegramData = await telegramRes.json();

    if (!telegramData.ok) {
        return NextResponse.json({ error: 'Token inválido ou erro no Telegram', details: telegramData }, { status: 400 });
    }

    // 4. Salvar no Banco de Dados
    await prisma.organization.update({
        where: { id: userOrgId },
        data: { telegramToken: token }
    });

    return NextResponse.json({ success: true, message: 'Conectado com sucesso!' });

  } catch (error) {
    console.error("Erro ao conectar Telegram:", error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}