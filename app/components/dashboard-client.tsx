// app/components/dashboard-client.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Importante para mudar a URL
import LogoutButton from './logout-button';
import MetricsChart from './metrics-chart';
import AutoRefresh from './auto-refresh';
import ChatWindow from './chat-window';
import { MessageSquare, Users, Activity, Clock, Search, ChevronRight, Settings, Calendar, Filter, BarChart3 } from 'lucide-react';

interface DashboardProps {
  chats: any[];
  kpi: {
    totalClients: number;
    totalMessages: number;
    activeNow: number;
  };
  chartData: any[];
  selectedChat?: any;
  teamStats: { name: string, count: number }[]; // <--- Novo dado
  dateFilter: { start: string, end: string };   // <--- Datas atuais
}

export default function DashboardClient({ chats, kpi, chartData, selectedChat, teamStats, dateFilter }: DashboardProps) {
  const router = useRouter();
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Estados locais para os inputs de data
  const [startDate, setStartDate] = useState(dateFilter.start);
  const [endDate, setEndDate] = useState(dateFilter.end);

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

  // Função para aplicar o filtro
  const handleFilter = () => {
      router.push(`/?startDate=${startDate}&endDate=${endDate}`);
  };

  // Helper para cor da bandeira
  const getFlagColor = (level: number) => {
    if (level === 3) return "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse";
    if (level === 2) return "bg-yellow-500";
    return "";
  };

  return (
    <div className={`flex h-screen bg-gray-900 text-white overflow-hidden ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
      <AutoRefresh />

      {/* --- SIDEBAR --- */}
      <aside 
        ref={sidebarRef}
        className={`flex-col border-r border-gray-800 bg-gray-900 relative flex-shrink-0 ${selectedChat ? 'hidden md:flex' : 'flex w-full'} md:w-auto`}
        style={{ width: typeof window !== 'undefined' && window.innerWidth >= 768 ? sidebarWidth : '100%' }}
      >
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold text-emerald-400 mb-4 truncate">Nemesis Chat</h1>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
            <input type="text" placeholder="Buscar cliente..." className="w-full bg-gray-800 text-sm text-white rounded-lg pl-10 pr-4 py-2 border border-gray-700 focus:outline-none focus:border-emerald-500"/>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {chats.map((chat) => (
            <Link key={chat.id} href={`/?chatId=${chat.id}&startDate=${startDate}&endDate=${endDate}`} className={`block p-4 transition border-b border-gray-800/50 group ${selectedChat?.id === chat.id ? 'bg-gray-800 border-l-4 border-l-emerald-500' : 'hover:bg-gray-800/50'}`}>
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2 flex-1 truncate pr-2">
                    {chat.urgencyLevel > 1 && <span className={`h-2 w-2 rounded-full shrink-0 ${getFlagColor(chat.urgencyLevel)}`}></span>}
                    <h3 className={`font-semibold text-sm truncate ${selectedChat?.id === chat.id ? 'text-white' : 'text-gray-200'}`}>{chat.customerName || 'Cliente'}</h3>
                </div>
                <span className="text-[10px] text-gray-500 whitespace-nowrap ml-2">
                  {chat.messages[0] ? new Date(chat.messages[0].createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                </span>
              </div>
              <div className="flex justify-between items-end">
                <p className="text-xs text-gray-400 truncate w-full pr-2">
                  {chat.messages[0]?.sender === 'AGENT' && <span className="text-emerald-500 mr-1">Você:</span>}
                  {chat.messages[0]?.content || 'Nenhuma mensagem'}
                </p>
                {chat._count.messages > 0 && chat.id !== selectedChat?.id && (
                  <span className="bg-sky-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center flex-shrink-0 shadow-sm shadow-sky-900/50">{chat._count.messages}</span>
                )}
              </div>
            </Link>
          ))}
          {chats.length === 0 && <div className="p-8 text-center text-gray-500 text-sm">Nenhum atendimento neste período.</div>}
        </div>

        <div className="p-4 border-t border-gray-800 bg-gray-900">
           <Link href="/profile" className="flex items-center gap-3 hover:bg-gray-800 p-2 rounded-lg transition overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-emerald-600 flex-shrink-0 flex items-center justify-center text-xs font-bold">AD</div>
              <div className="flex-1 truncate"><p className="text-sm font-medium">Admin</p><p className="text-xs text-gray-500">Online</p></div>
              <ChevronRight size={16} className="text-gray-600 flex-shrink-0" />
           </Link>
        </div>
        <div onMouseDown={startResizing} className="hidden md:flex absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-emerald-500 transition-colors z-50 items-center justify-center group">
            <div className="h-8 w-1 bg-gray-600 rounded-full group-hover:bg-white transition-colors opacity-0 group-hover:opacity-100" />
        </div>
      </aside>

      {/* --- ÁREA PRINCIPAL --- */}
      <main className={`flex-col h-screen overflow-hidden bg-gray-950 flex-1 ${selectedChat ? 'flex w-full' : 'hidden md:flex'}`}>
        {selectedChat ? (
          <ChatWindow chat={selectedChat} initialMessages={selectedChat.messages} />
        ) : (
          <>
            <header className="h-16 border-b border-gray-800 flex items-center justify-between px-4 md:px-8 bg-gray-900 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                <BarChart3 size={20} className="text-emerald-500"/> Visão Geral
              </h2>
              <div className="flex items-center gap-2 md:gap-3">
                {/* --- BARRA DE FILTRO DE DATA --- */}
                <div className="hidden md:flex items-center gap-2 bg-gray-800 p-1 rounded-lg border border-gray-700">
                    <div className="flex items-center gap-2 px-2">
                        <Calendar size={14} className="text-gray-400"/>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-xs text-white focus:outline-none" />
                        <span className="text-gray-500 text-xs">até</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-xs text-white focus:outline-none" />
                    </div>
                    <button onClick={handleFilter} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded transition font-medium flex items-center gap-1">
                        <Filter size={12}/> Filtrar
                    </button>
                </div>

                <div className="h-6 w-px bg-gray-800 mx-1"></div>
                <LogoutButton />
              </div>
            </header>
            
            {/* VERSÃO MOBILE DO FILTRO */}
            <div className="md:hidden p-4 bg-gray-900 border-b border-gray-800 flex flex-col gap-2">
                <div className="flex gap-2">
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-gray-800 border border-gray-700 rounded p-2 text-xs w-full text-white" />
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-gray-800 border border-gray-700 rounded p-2 text-xs w-full text-white" />
                </div>
                <button onClick={handleFilter} className="bg-emerald-600 w-full py-2 rounded text-xs font-bold uppercase">Aplicar Filtro</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
              
              {/* KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex items-center gap-4">
                   <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg"><Users size={20} /></div>
                   <div><p className="text-gray-500 text-[10px] uppercase font-bold">Atendimentos</p><h3 className="text-xl font-bold">{kpi.totalClients}</h3></div>
                </div>
                <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex items-center gap-4">
                   <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg"><MessageSquare size={20} /></div>
                   <div><p className="text-gray-500 text-[10px] uppercase font-bold">Interações</p><h3 className="text-xl font-bold">{kpi.totalMessages}</h3></div>
                </div>
                <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex items-center gap-4">
                  <div className="p-3 bg-orange-500/10 text-orange-400 rounded-lg"><Activity size={20} /></div>
                  <div><p className="text-gray-500 text-[10px] uppercase font-bold">Ativos 24h</p><h3 className="text-xl font-bold">{kpi.activeNow}</h3></div>
                </div>
                <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex items-center gap-4">
                  <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg"><Clock size={20} /></div>
                  <div><p className="text-gray-500 text-[10px] uppercase font-bold">Status</p><h3 className="text-lg font-bold text-emerald-500">Online</h3></div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                  {/* GRÁFICO (Ocupa 2/3) */}
                  <div className="lg:col-span-2 bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6">
                     <h3 className="text-sm font-bold text-gray-400 mb-4">Volume de Mensagens (Período Selecionado)</h3>
                     <MetricsChart data={chartData} />
                  </div>

                  {/* NOVO: RANKING DE EQUIPE (Ocupa 1/3) */}
                  <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6">
                     <h3 className="text-sm font-bold text-gray-400 mb-4">Performance por Setor</h3>
                     <div className="space-y-4">
                        {teamStats.length > 0 ? teamStats.map((stat, idx) => (
                            <div key={idx} className="flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-emerald-500 border border-gray-700">
                                        {idx + 1}
                                    </div>
                                    <span className="text-sm font-medium">{stat.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold">{stat.count}</span>
                                    <span className="text-[10px] text-gray-500">msgs</span>
                                </div>
                            </div>
                        )) : (
                            <p className="text-xs text-gray-500 text-center py-4">Sem dados de equipe.</p>
                        )}
                     </div>
                     <p className="text-[10px] text-gray-600 mt-4 text-center">Baseado no volume de mensagens enviadas.</p>
                  </div>
              </div>

            </div>
          </>
        )}
      </main>
    </div>
  );
}