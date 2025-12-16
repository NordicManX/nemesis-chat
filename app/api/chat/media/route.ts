// app/api/chat/media/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) return NextResponse.json({ error: 'Missing URL' }, { status: 400 });

  try {
    // O servidor busca a imagem (aqui o Token do Telegram é usado, mas fica invisível pro usuário)
    const response = await fetch(targetUrl);
    
    if (!response.ok) throw new Error('Falha ao buscar mídia');

    const blob = await response.blob();
    const headers = new Headers();
    headers.set("Content-Type", response.headers.get("Content-Type") || "application/octet-stream");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new NextResponse(blob, { status: 200, statusText: "OK", headers });

  } catch (error) {
    console.error("Erro no proxy de mídia:", error);
    return NextResponse.json({ error: 'Erro ao carregar arquivo' }, { status: 500 });
  }
}