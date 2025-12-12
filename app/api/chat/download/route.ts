// app/api/chat/download/route.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fileUrl = searchParams.get('url');

  if (!fileUrl) {
    return NextResponse.json({ error: 'URL da imagem faltando' }, { status: 400 });
  }

  try {
    // 1. O Servidor baixa a imagem do Telegram (sem bloqueio CORS)
    const response = await fetch(fileUrl);
    
    if (!response.ok) throw new Error('Falha ao buscar imagem no Telegram');

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. O Servidor devolve para o navegador forçando o download
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        // "attachment" força o navegador a baixar em vez de abrir
        'Content-Disposition': `attachment; filename="nemesis-img-${Date.now()}.jpg"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro interno no download' }, { status: 500 });
  }
}