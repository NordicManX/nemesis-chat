// app/api/settings/telegram/connect/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { prisma } from '@/lib/prisma';
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: Request) {
  try {
    console.log("--- INICIANDO CONEXÃO TELEGRAM ---");

    // 1. Segurança: Quem é o usuário?
    const session = await getServerSession(authOptions);
    
    // Log para verificar se a sessão chegou corretamente
    console.log("Sessão encontrada para:", session?.user?.email);

    if (!session || !session.user) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // 2. Pega o ID da Organização (agora vindo do NextAuth corrigido)
    const userOrgId = (session.user as any).organizationId; 
    
    console.log("Organization ID extraído:", userOrgId);

    // --- TRAVA DE SEGURANÇA CRÍTICA ---
    // Se o ID for undefined ou null, paramos aqui para não quebrar o Prisma
    if (!userOrgId) {
        console.error("ERRO: Usuário logado mas sem Organization ID.");
        return NextResponse.json({ 
            error: 'Sessão desatualizada. Por favor, faça Logout e Login novamente.' 
        }, { status: 400 });
    }

    const { token } = await req.json();

    if (!token) return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 });

    // 3. Montar a URL do Webhook
    // Usa a variável de ambiente ou tenta pegar a URL da Vercel automaticamente
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.VERCEL_URL}`;
    
    if (!baseUrl) {
        console.warn("AVISO: Nenhuma URL base encontrada. O Webhook pode falhar.");
    }

    const webhookUrl = `${baseUrl}/api/webhook?orgId=${userOrgId}`;
    console.log("Configurando Webhook para:", webhookUrl);

    // 4. Avisar o Telegram (SetWebhook)
    const telegramRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`);
    const telegramData = await telegramRes.json();

    console.log("Resposta do Telegram:", telegramData);

    if (!telegramData.ok) {
        return NextResponse.json({ error: 'Token inválido ou erro no Telegram', details: telegramData }, { status: 400 });
    }

    // 5. Salvar no Banco de Dados
    // Como já validamos o userOrgId acima, o 'where' do Prisma não vai falhar
    await prisma.organization.update({
        where: { id: userOrgId },
        data: { telegramToken: token }
    });

    console.log("--- CONEXÃO REALIZADA COM SUCESSO ---");
    return NextResponse.json({ success: true, message: 'Conectado com sucesso!' });

  } catch (error: any) {
    // Retorna o erro detalhado para facilitar o debug no frontend
    console.error("❌ ERRO FATAL AO CONECTAR:", error);
    return NextResponse.json({ 
        error: 'Erro interno no servidor', 
        details: error.message 
    }, { status: 500 });
  }
}