'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react'; 
import LogoutButton from './logout-button';
import MetricsChart from './metrics-chart';
import ChatWindow from './chat-window';
import { MessageSquare, Users, Activity, Clock, Search, ChevronRight, Settings, Calendar, Filter, BarChart3, ShieldCheck, UserPlus, X, MoreVertical, Trash2 } from 'lucide-react';

interface DashboardProps {
  chats: any[];
  kpi: {
    totalClients: number;
    totalMessages: number;
    activeNow: number;
  };
  chartData: any[];
  selectedChat?: any; 
  teamStats: { name: string, count: number }[];
  dateFilter: { start: string, end: string };
}

export default function DashboardClient({ chats: initialChats, kpi, chartData, selectedChat: serverSelectedChat, teamStats, dateFilter }: DashboardProps) {
  const router = useRouter();
  const { data: session } = useSession(); 
  const isAdmin = (session?.user as any)?.role === 'ADMIN';

  const [isClient, setIsClient] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<any>(serverSelectedChat || null);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const [localChats, setLocalChats] = useState(initialChats);
  const [startDate, setStartDate] = useState(dateFilter.start);
  const [endDate, setEndDate] = useState(dateFilter.end);

  // --- ESTADOS DO MODAL DE NOVO CHAT ---
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatData, setNewChatData] = useState({ name: '', telegramId: '', department: 'GERAL' });
  const [creatingChat, setCreatingChat] = useState(false);

  // --- ESTADO DO MENU DE OPÇÕES (3 PONTINHOS) ---
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => { setIsClient(true); }, []);

  useEffect(() => {
    if (serverSelectedChat) setActiveChat(serverSelectedChat);
  }, [serverSelectedChat]);

  // Fecha o menu se clicar fora
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    async function fetchUserAvatar() {
      if (!session) return;
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          if (data.avatar) setAvatarUrl(data.avatar);
        }
      } catch (error) { console.error(error); }
    }
    fetchUserAvatar();
  }, [session]);

  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);
  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing) {
      const newWidth = mouseMoveEvent.clientX;
      if (newWidth > 200 && newWidth < 600) setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  // Polling de Chats
  useEffect(() => {
    let isMounted = true;
    const fetchLatestChats = async () => {
        // Se tiver um menu aberto, evitamos atualizar a lista para não fechar o menu na cara do usuário
        if (openMenuId) return; 

        try {
            const url = `/api/chats/list?startDate=${startDate}&endDate=${endDate}&t=${Date.now()}`;
            const res = await fetch(url, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                if (isMounted) {
                    setLocalChats(prevChats => {
                        const prevIds = prevChats.map(c => c.id).join(',');
                        const newIds = data.map((c: any) => c.id).join(',');
                        const prevUnread = prevChats.map(c => c.unreadCount).join(',');
                        const newUnread = data.map((c: any) => c.unreadCount).join(',');

                        if (prevIds === newIds && prevUnread === newUnread) return prevChats;

                        return data.map((c: any) => {
                             if (activeChat && c.id === activeChat.id) return { ...c, unreadCount: 0 };
                             return c;
                        });
                    });
                }
            }
        } catch (error) { console.error(error); }
    };
    const interval = setInterval(fetchLatestChats, 4000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [startDate, endDate, activeChat, openMenuId]);

  useEffect(() => {
    if (activeChat) {
      fetch('/api/chat/read', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: activeChat.id })
      }).catch(err => console.error(err));
      setLocalChats(prev => prev.map(c => c.id === activeChat.id ? { ...c, unreadCount: 0 } : c));
    }
  }, [activeChat?.id]);

  const handleFilter = () => {
      router.push(`/?startDate=${startDate}&endDate=${endDate}`);
  };

  const handleChatClick = (chatId: string) => {
    const clickedChat = localChats.find(c => c.id === chatId);
    if (clickedChat) {
        setActiveChat({ ...clickedChat, messages: clickedChat.messages || [] });
        const params = new URLSearchParams(window.location.search);
        params.set('chatId', chatId);
        window.history.pushState(null, '', `/?${params.toString()}`);
    }
  };

  const handleCloseChat = () => {
      setActiveChat(null);
      const params = new URLSearchParams(window.location.search);
      params.delete('chatId');
      window.history.pushState(null, '', `/?${params.toString()}`);
  }

  const handleNavigation = () => {
      setActiveChat(null);
  };

  // --- NOVA FUNÇÃO: DELETAR DA SIDEBAR ---
  const handleDeleteChatFromSidebar = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation(); // Impede que abra o chat ao clicar no excluir
    setOpenMenuId(null); // Fecha o menu

    if (!confirm("⚠️ Tem certeza que deseja EXCLUIR esta conversa?\n\nTodo o histórico será apagado.")) {
        return;
    }

    try {
        const res = await fetch(`/api/chats/delete?chatId=${chatId}`, { method: 'DELETE' });
        if (res.ok) {
            setLocalChats(prev => prev.filter(c => c.id !== chatId));
            if (activeChat?.id === chatId) {
                handleCloseChat();
            }
        } else {
            alert("Erro ao excluir.");
        }
    } catch (error) {
        alert("Erro de conexão.");
    }
  };

  const toggleMenu = (e: React.MouseEvent, chatId: string) => {
      e.stopPropagation();
      setOpenMenuId(prev => prev === chatId ? null : chatId);
  };

  const handleCreateChat = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newChatData.name || !newChatData.telegramId) return;

      setCreatingChat(true);
      try {
          const res = await fetch('/api/chats/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newChatData)
          });
          
          if (res.ok) {
              const newChat = await res.json();
              setLocalChats(prev => [newChat, ...prev.filter(c => c.id !== newChat.id)]);
              handleChatClick(newChat.id);
              setIsNewChatOpen(false);
              setNewChatData({ name: '', telegramId: '', department: 'GERAL' });
          } else {
              alert("Erro ao criar contato.");
          }
      } catch (error) {
          console.error(error);
          alert("Erro de conexão.");
      } finally {
          setCreatingChat(false);
      }
  };

  const getFlagColor = (level: number) => {
    if (level === 3) return "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse";
    if (level === 2) return "bg-yellow-500";
    return "";
  };

  return (
    <div className={`flex h-screen bg-gray-900 text-white overflow-hidden ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
      
      {/* --- MODAL NOVO CHAT --- */}
      {isNewChatOpen && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl animate-fade-in">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                          <UserPlus className="text-emerald-500" /> Novo Atendimento
                      </h2>
                      <button onClick={() => setIsNewChatOpen(false)} className="text-gray-400 hover:text-white">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <form onSubmit={handleCreateChat} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nome do Cliente</label>
                          <input 
                              type="text" 
                              required
                              value={newChatData.name}
                              onChange={e => setNewChatData({...newChatData, name: e.target.value})}
                              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
                              placeholder="Ex: João da Silva"
                          />
                      </div>
                      
                      <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Telegram ID (Numérico)</label>
                          <input 
                              type="text" 
                              required
                              value={newChatData.telegramId}
                              onChange={e => setNewChatData({...newChatData, telegramId: e.target.value})}
                              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none font-mono"
                              placeholder="Ex: 123456789"
                          />
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Departamento Inicial</label>
                          <select 
                              value={newChatData.department}
                              onChange={e => setNewChatData({...newChatData, department: e.target.value})}
                              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
                          >
                              <option value="GERAL">Geral</option>
                              <option value="FINANCEIRO">Financeiro</option>
                              <option value="SUPORTE">Suporte</option>
                              <option value="VENDAS">Vendas</option>
                          </select>
                      </div>

                      <button 
                          type="submit" 
                          disabled={creatingChat}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition mt-4 disabled:opacity-50"
                      >
                          {creatingChat ? 'Criando...' : 'Iniciar Conversa'}
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* SIDEBAR */}
      <aside 
        ref={sidebarRef}
        className={`flex-col border-r border-gray-800 bg-gray-900 relative flex-shrink-0 z-20 
            ${activeChat ? 'hidden md:flex' : 'flex w-full'} 
            md:w-auto transition-all duration-75`}
        style={{ width: isClient && window.innerWidth >= 768 ? sidebarWidth : undefined }}
      >
        <div className="p-4 border-b border-gray-800 flex-shrink-0">
          <h1 className="text-xl font-bold text-emerald-400 mb-4 truncate cursor-default">Nemesis Chat</h1>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar..." 
                    className="w-full bg-gray-800 text-sm text-white rounded-lg pl-10 pr-4 py-2 border border-gray-700 focus:outline-none focus:border-emerald-500"
                />
            </div>
            
            <button 
                onClick={() => setIsNewChatOpen(true)}
                className="p-2 bg-gray-800 hover:bg-emerald-600 border border-gray-700 hover:border-emerald-500 text-gray-300 hover:text-white rounded-lg transition shadow-sm"
                title="Novo Atendimento"
            >
                <UserPlus size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {localChats.map((chat) => (
            <div 
                key={chat.id} 
                onClick={() => handleChatClick(chat.id)}
                className={`relative block p-4 transition border-b border-gray-800/50 group cursor-pointer 
                    ${activeChat?.id === chat.id ? 'bg-gray-800 border-l-4 border-l-emerald-500' : 'hover:bg-gray-800/50'}`}
            >
              <div className="flex justify-between items-start mb-1 pointer-events-none">
                <div className="flex items-center gap-2 flex-1 truncate pr-6">
                    {chat.urgencyLevel > 1 && <span className={`h-2 w-2 rounded-full shrink-0 ${getFlagColor(chat.urgencyLevel)}`}></span>}
                    <h3 className={`font-semibold text-sm truncate ${activeChat?.id === chat.id ? 'text-white' : 'text-gray-200'}`}>{chat.customerName || 'Cliente'}</h3>
                </div>

                {/* --- HORA COM EFEITO SWAP (some no hover ou menu aberto) --- */}
                <span className={`text-[10px] text-gray-500 whitespace-nowrap ml-2 transition-opacity duration-200 
                    ${openMenuId === chat.id ? 'opacity-0' : 'group-hover:opacity-0'}`}>
                  {chat.lastMessageTime ? new Date(chat.lastMessageTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                </span>
              </div>

              <div className="flex justify-between items-center mt-1 pointer-events-none">
                <p className={`text-xs truncate w-full pr-2 ${activeChat?.id === chat.id ? 'text-gray-300' : 'text-gray-400'}`}>{chat.lastMessagePreview}</p>
                {chat.unreadCount > 0 && chat.id !== activeChat?.id && (
                  <span className="bg-blue-600 text-white text-[10px] font-bold h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full shadow-lg shadow-blue-500/40 animate-pulse">{chat.unreadCount}</span>
                )}
              </div>

              {/* BOTÃO 3 PONTINHOS (MENU) - Aparece no lugar da hora */}
              <div className={`absolute right-3 top-3 z-20 transition-all duration-200
                 ${openMenuId === chat.id ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'}`}>
                 
                 <button 
                    onClick={(e) => toggleMenu(e, chat.id)}
                    className="p-1 hover:bg-gray-700 bg-gray-800 border border-gray-700 rounded text-gray-400 hover:text-white shadow-sm"
                 >
                     <MoreVertical size={14} />
                 </button>

                 {/* DROPDOWN MENU */}
                 {openMenuId === chat.id && (
                     <div className="absolute right-0 top-6 bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-32 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                         <button 
                            onClick={(e) => handleDeleteChatFromSidebar(e, chat.id)}
                            className="w-full text-left px-4 py-3 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-500 flex items-center gap-2 font-medium"
                         >
                             <Trash2 size={14} /> Excluir
                         </button>
                     </div>
                 )}
              </div>

            </div>
          ))}
          {localChats.length === 0 && <div className="p-8 text-center text-gray-500 text-sm">Nenhum atendimento neste período.</div>}
        </div>

        {/* RODAPÉ DA SIDEBAR */}
        <div className="p-4 border-t border-gray-800 bg-gray-900 space-y-2 flex-shrink-0">
           {isAdmin && (
               <Link href="/admin/users" onClick={handleNavigation} className="flex items-center gap-3 hover:bg-gray-800 p-2 rounded-lg transition text-gray-400 hover:text-emerald-400 group cursor-pointer z-30 relative">
                  <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center group-hover:border-emerald-500/50 transition">
                    <Settings size={16} />
                  </div>
                  <div className="flex-1"><p className="text-sm font-medium">Gestão de Equipe</p></div>
               </Link>
           )}
           <Link href="/profile" onClick={handleNavigation} className="flex items-center gap-3 hover:bg-gray-800 p-2 rounded-lg transition overflow-hidden cursor-pointer z-30 relative">
              <div className="w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                 {avatarUrl ? (
                    <img src={avatarUrl} alt="Perfil" className="w-full h-full object-cover" />
                 ) : (
                    <div className="w-full h-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white">
                        {session?.user?.name?.charAt(0) || 'U'}
                    </div>
                 )}
              </div>
              <div className="flex-1 truncate">
                 <p className="text-sm font-medium truncate">{session?.user?.name || 'Usuário'}</p>
                 <p className="text-xs text-gray-500">Online</p>
              </div>
              <ChevronRight size={16} className="text-gray-600 flex-shrink-0" />
           </Link>
        </div>
        
        <div onMouseDown={startResizing} className="hidden md:flex absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-emerald-500 transition-colors z-50 items-center justify-center group">
            <div className="h-8 w-1 bg-gray-600 rounded-full group-hover:bg-white transition-colors opacity-0 group-hover:opacity-100" />
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className={`flex-col h-screen overflow-hidden bg-gray-950 flex-1 relative z-10 
          ${activeChat ? 'flex w-full' : 'hidden md:flex'}`}>
        
        {activeChat ? (
            <div className="h-full w-full flex flex-col">
                 <div className="md:hidden h-14 bg-gray-900 border-b border-gray-800 flex items-center px-4">
                    <button onClick={handleCloseChat} className="text-gray-400 hover:text-white flex items-center gap-2">
                        <ChevronRight className="rotate-180" size={20} /> Voltar
                    </button>
                 </div>
                 {/* Passamos uma key para forçar remontagem se trocar de chat, limpando estados */}
                 <ChatWindow 
                    key={activeChat.id}
                    chat={activeChat} 
                    initialMessages={activeChat.messages || []} 
                    onClose={handleCloseChat} 
                 />
            </div>
        ) : (
          <>
            <header className="h-16 border-b border-gray-800 flex items-center justify-between px-4 md:px-8 bg-gray-900 flex-shrink-0 relative z-40">
              <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                <BarChart3 size={20} className="text-emerald-500"/> Visão Geral
              </h2>
              <div className="flex items-center gap-2 md:gap-3">
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
            
            <div className="md:hidden p-4 bg-gray-900 border-b border-gray-800 flex flex-col gap-2 relative z-30">
               <button onClick={handleFilter} className="bg-emerald-600 w-full py-2 rounded text-xs font-bold uppercase">Aplicar Filtro</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative z-0">
              
              {isAdmin && (
                  <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-lg">
                              <ShieldCheck size={24} />
                          </div>
                          <div>
                              <h3 className="font-bold text-white">Painel Administrativo</h3>
                              <p className="text-sm text-gray-400">Você tem acesso total para gerenciar a equipe.</p>
                          </div>
                      </div>
                      <Link href="/admin/users" onClick={handleNavigation} className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-sm font-bold transition">
                          Gerenciar Usuários
                      </Link>
                  </div>
              )}

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
                  <div className="lg:col-span-2 bg-gray-900 rounded-xl border border-gray-800 p-4 md:p-6 min-h-[350px]">
                      <h3 className="text-sm font-bold text-gray-400 mb-4">Volume de Mensagens (Período Selecionado)</h3>
                      <MetricsChart data={chartData} />
                  </div>

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
                  </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}