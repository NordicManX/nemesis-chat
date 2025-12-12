// app/page.tsx
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import LogoutButton from './components/logout-button'; // <--- 1. IMPORT NOVO

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const chats = await prisma.chat.findMany({
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-emerald-400">Nemesis Chat</h1>
          <p className="text-gray-400">Painel de Controle em Tempo Real</p>
        </div>
        
        {/* Área de Ações do Cabeçalho */}
        <div className="flex gap-4 items-center">
          {/* Botão Configurações */}
          <Link href="/profile" className="text-gray-300 hover:text-white font-medium text-sm border border-gray-600 px-3 py-2 rounded-lg hover:bg-gray-800 transition flex items-center gap-2">
            ⚙️ Configurações
          </Link>
          
          {/* Contador de Clientes */}
          <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
            <span className="text-emerald-400 font-bold">{chats.length}</span> Clientes
          </div>

          {/* Botão Sair (Novo) */}
          <LogoutButton />  {/* <--- 2. BOTÃO AQUI */}
        </div>
      </header>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {chats.map((chat) => (
          <div key={chat.id} className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-emerald-500 transition-colors shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {chat.customerName || 'Desconhecido'}
                </h2>
                <span className="text-xs text-gray-500">ID: {chat.telegramId}</span>
              </div>
              <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded-full border border-emerald-500/20">
                Ativo
              </span>
            </div>
            
            <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 min-h-[60px]">
              <p className="text-sm text-gray-300 line-clamp-2">
                {chat.messages[0]?.content || 'Nenhuma mensagem...'}
              </p>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Link 
                href={`/chat/${chat.id}`} 
                className="text-sm text-emerald-400 hover:text-emerald-300 font-medium hover:underline"
              >
                Ver Conversa →
              </Link>
            </div>
          </div>
        ))}
        
        {chats.length === 0 && (
          <div className="col-span-full text-center py-20 bg-gray-800 rounded-xl border border-gray-700 border-dashed">
            <p className="text-gray-500 text-lg">Nenhuma conversa iniciada ainda.</p>
            <p className="text-sm text-gray-600 mt-2">Mande um "Oi" no Telegram para testar!</p>
          </div>
        )}
      </div>
    </main>
  );
}