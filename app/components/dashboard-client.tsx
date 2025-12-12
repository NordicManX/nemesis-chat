// app/components/dashboard-client.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import LogoutButton from './logout-button';
import MetricsChart from './metrics-chart';
import AutoRefresh from './auto-refresh';
import ChatWindow from './chat-window'; // <--- IMPORTAMOS O CHAT
import { MessageSquare, Users, Activity, Clock, Search, ChevronRight, Settings } from 'lucide-react';

interface DashboardProps {
  chats: any[];
  kpi: any;
  chartData: any[];
  selectedChat?: any; // <--- PROPRIEDADE NOVA (Chat Selecionado)
}

export default function DashboardClient({ chats, kpi, chartData, selectedChat }: DashboardProps) {
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing) {
      const newWidth = mouseMoveEvent.clientX;
      if (newWidth > 200 && newWidth < 600) setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  return (
    <div className={`flex h-screen bg-gray-900 text-white overflow-hidden ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
      {/* Se estiver com chat aberto, paramos o refresh automático para não atrapalhar a digitação */}
      {!selectedChat && <AutoRefresh />}

      {/* --- SIDEBAR FIXA --- */}
      <aside 
        ref={sidebarRef}
        className="flex flex-col border-r border-gray-800 bg-gray-900 relative flex-shrink-0"
        style={{ width: sidebarWidth }}
      >
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold text-emerald-400 mb-4 truncate">Nemesis Chat</h1>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
            <input type="text" placeholder="Buscar..." className="w-full bg-gray-800 text-sm text-white rounded-lg pl-10 pr-4 py-2 border border-gray-700 focus:outline-none focus:border-emerald-500"/>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {chats.map((chat) => (
            <Link 
              key={chat.id} 
              // O TRUQUE: Agora o link é para a mesma página, só muda o parametro ?chatId
              href={`/?chatId=${chat.id}`} 
              className={`block p-4 transition border-b border-gray-800/50 group ${
                selectedChat?.id === chat.id ? 'bg-gray-800 border-l-4 border-l-emerald-500' : 'hover:bg-gray-800/50'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className={`font-semibold text-sm truncate pr-2 flex-1 ${selectedChat?.id === chat.id ? 'text-white' : 'text-gray-200'}`}>
                  {chat.customerName || 'Cliente'}
                </h3>
                <span className="text-[10px] text-gray-500 whitespace-nowrap ml-2">
                  {chat.messages[0] ? new Date(chat.messages[0].createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                </span>
              </div>
              <div className="flex justify-between items-end">
                <p className="text-xs text-gray-400 truncate w-full pr-2">
                  {chat.messages[0]?.sender === 'AGENT' && <span className="text-emerald-500 mr-1">Você:</span>}
                  {chat.messages[0]?.content || 'Nenhuma mensagem'}
                </p>
                {chat._count.messages > 0 && (
                  <span className="bg-gray-700 text-gray-300 text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center flex-shrink-0">
                    {chat._count.messages}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>

        <div className="p-4 border-t border-gray-800 bg-gray-900">
           <Link href="/profile" className="flex items-center gap-3 hover:bg-gray-800 p-2 rounded-lg transition overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex-shrink-0 flex items-center justify-center text-xs font-bold">AD</div>
              <div className="flex-1 truncate">
                 <p className="text-sm font-medium">Admin</p>
                 <p className="text-xs text-gray-500">Online</p>
              </div>
              <ChevronRight size={16} className="text-gray-600 flex-shrink-0" />
           </Link>
        </div>

        <div onMouseDown={startResizing} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-emerald-500 transition-colors z-50 flex items-center justify-center group">
            <div className="h-8 w-1 bg-gray-600 rounded-full group-hover:bg-white transition-colors opacity-0 group-hover:opacity-100" />
        </div>
      </aside>


      {/* --- ÁREA PRINCIPAL (DINÂMICA) --- */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-950 min-w-[400px]">
        
        {/* LÓGICA DE EXIBIÇÃO: CHAT OU DASHBOARD? */}
        {selectedChat ? (
          // SE TIVER CHAT SELECIONADO: MOSTRA A CONVERSA
          <ChatWindow chat={selectedChat} initialMessages={selectedChat.messages} />
        ) : (
          // SE NÃO: MOSTRA A DASHBOARD PADRÃO
          <>
            <header className="h-16 border-b border-gray-800 flex items-center justify-between px-8 bg-gray-900 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-200">Visão Geral</h2>
              <div className="flex items-center gap-3">
                <Link href="/profile" className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition text-sm font-medium border border-transparent hover:border-gray-700">
                  <Settings size={18} /> Config
                </Link>
                <div className="h-6 w-px bg-gray-800 mx-1"></div>
                <LogoutButton />
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8">
              {/* KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex items-center gap-4">
                   <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg"><Users size={20} /></div>
                   <div><p className="text-gray-500 text-[10px] uppercase font-bold">Clientes</p><h3 className="text-xl font-bold">{kpi.totalClients}</h3></div>
                </div>
                <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex items-center gap-4">
                   <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg"><MessageSquare size={20} /></div>
                   <div><p className="text-gray-500 text-[10px] uppercase font-bold">Mensagens</p><h3 className="text-xl font-bold">{kpi.totalMessages}</h3></div>
                </div>
                {/* ... Outros KPIs iguais ... */}
              </div>

              {/* Gráfico */}
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-8">
                 <MetricsChart data={chartData} />
              </div>

              <div className="text-center py-20 opacity-30">
                <MessageSquare size={64} className="mx-auto mb-6 text-gray-600"/>
                <p className="text-xl font-medium text-gray-500">Pronto para atender!</p>
                <p className="text-sm text-gray-600 mt-2">Selecione uma conversa na lateral esquerda.</p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}