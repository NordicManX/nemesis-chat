// app/page.tsx
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

// Isso diz ao Next.js para não guardar cache dessa página (sempre mostrar dados novos)
export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  // Busca todas as conversas e as últimas mensagens
  const chats = await prisma.chat.findMany({
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1, // Pega só a última mensagem para o resumo
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
        <div className="bg-gray-800 px-4 py-2 rounded-lg">
          <span className="text-emerald-400 font-bold">{chats.length}</span> Clientes
        </div>
      </header>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {chats.map((chat) => (
          <div key={chat.id} className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-emerald-500 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {chat.customerName || 'Desconhecido'}
                </h2>
                <span className="text-xs text-gray-500">ID: {chat.telegramId}</span>
              </div>
              <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded-full">
                Ativo
              </span>
            </div>
            
            <div className="bg-gray-900/50 p-3 rounded-lg">
              <p className="text-sm text-gray-300">
                {chat.messages[0]?.content || 'Nenhuma mensagem...'}
              </p>
            </div>
            
            <div className="mt-4 flex justify-end">
  <Link 
    href={`/chat/${chat.id}`} 
    className="text-sm text-emerald-400 hover:text-emerald-300 font-medium"
  >
    Ver Conversa →
  </Link>
</div>
          </div>
        ))}
        
        {chats.length === 0 && (
          <div className="col-span-full text-center py-20 text-gray-500">
            Nenhuma conversa iniciada ainda. Mande um "Oi" no Telegram!
          </div>
        )}
      </div>
    </main>
  );
}