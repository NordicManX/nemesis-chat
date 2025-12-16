// app/components/chat-window.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Send, X, ArrowLeft, Check, Briefcase, Download, Paperclip, FileText, Flag } from 'lucide-react';

interface ChatWindowProps {
  chat: any;
  initialMessages: any[];
  onClose?: () => void;
}

const DEPARTMENTS = ["GERAL", "FINANCEIRO", "SUPORTE", "VENDAS"];

export default function ChatWindow({ chat, initialMessages, onClose }: ChatWindowProps) {
  if (!chat) return null;

  const [messages, setMessages] = useState<any[]>(initialMessages || []);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [department, setDepartment] = useState(chat.department || "GERAL");
  const [urgency, setUrgency] = useState(chat.urgencyLevel || 1);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevChatIdRef = useRef<string | null>(null);
  const prevMsgCountRef = useRef(messages.length);

  // --- 1. ORDENAÇÃO ABSOLUTA ---
  // A lógica aqui é simples: Data menor em cima, maior em baixo.
  // Se as datas forem IGUAIS, a mensagem com ID "temp-" (sua) ganha e vai pra baixo.
  const sortedMessages = [...messages].sort((a: any, b: any) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();

    // Diferença de tempo clara
    if (timeA !== timeB) return timeA - timeB;

    // EMPATE TÉCNICO (Mesmo milissegundo):
    const isTempA = a.id.toString().startsWith('temp-');
    const isTempB = b.id.toString().startsWith('temp-');

    // Se A é temporária (nova) e B é real, A deve ir depois (em baixo)
    if (isTempA && !isTempB) return 1;
    if (!isTempA && isTempB) return -1;

    // Se não, desempata por ID padrão
    return a.id.toString().localeCompare(b.id.toString());
  });

  // --- 2. POLLING (ATUALIZAÇÃO) ---
  useEffect(() => {
    let isMounted = true;
    const fetchMessages = async () => {
      if (!chat.id) return;
      try {
        const res = await fetch(`/api/chat/messages?chatId=${chat.id}&t=${Date.now()}`, {
             cache: 'no-store',
             headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
        });
        
        if (res.ok) {
          const serverMessages = await res.json();
          if (isMounted) {
            setMessages((current) => {
               // Mantém as mensagens temporárias que ainda não foram confirmadas pelo servidor
               const myPendingMessages = current.filter(m => m.id.toString().startsWith('temp-'));
               
               // Verifica se a mensagem temporária já virou real no servidor (por conteúdo/tipo)
               // Se sim, removemos ela da lista de pendentes para não duplicar
               const filteredPending = myPendingMessages.filter(temp => {
                   const alreadyInServer = serverMessages.some((serverMsg: any) => 
                       // Uma verificação básica para ver se é a mesma mensagem
                       serverMsg.content === temp.content && 
                       serverMsg.type === temp.type &&
                       // Verifica se foi criada nos últimos 10 segundos (margem de erro)
                       Math.abs(new Date(serverMsg.createdAt).getTime() - new Date(temp.createdAt).getTime()) < 10000
                   );
                   return !alreadyInServer;
               });

               // Se o servidor trouxe exatamente o que já temos (fora as temps), não faz nada
               const currentRealIds = current.filter(m => !m.id.toString().startsWith('temp-')).map(m => m.id);
               const serverIds = serverMessages.map((m: any) => m.id);
               if (JSON.stringify(currentRealIds) === JSON.stringify(serverIds) && filteredPending.length === myPendingMessages.length) {
                   return current;
               }

               // Retorna lista do servidor + Minhas pendentes no final
               return [...serverMessages, ...filteredPending];
            });
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };
    const interval = setInterval(fetchMessages, 2000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [chat.id]);

  // Scroll Automático
  useEffect(() => {
    const isNewChat = prevChatIdRef.current !== chat.id;
    if (isNewChat || sortedMessages.length > prevMsgCountRef.current) {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: isNewChat ? "auto" : "smooth" });
        }, 100);
        prevChatIdRef.current = chat.id;
        prevMsgCountRef.current = sortedMessages.length;
    }
  }, [sortedMessages.length, chat.id]);

  useEffect(() => {
    setMessages(initialMessages || []);
    setDepartment(chat.department || "GERAL");
    setUrgency(chat.urgencyLevel || 1);
  }, [initialMessages, chat]);

  async function handleChangeUrgency(level: number) {
    setUrgency(level);
    await fetch('/api/chat/urgency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: chat.id, urgencyLevel: level }),
    });
    router.refresh(); 
  }

  const downloadResource = (e: React.MouseEvent, url: string | null) => {
    e.stopPropagation(); 
    if (!url) return;
    const link = document.createElement('a');
    link.href = `/api/chat/download?url=${encodeURIComponent(url)}`;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 4 * 1024 * 1024) return alert("⚠️ Limite de 4MB.");
      setSelectedFile(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          if (file.size > 4 * 1024 * 1024) {
             alert("⚠️ Limite de 4MB."); return;
          }
          setSelectedFile(file);
          e.preventDefault(); 
          return;
        }
      }
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;
    setSending(true);

    const formData = new FormData();
    formData.append('chatId', chat.id);
    if (newMessage) formData.append('content', newMessage);
    if (selectedFile) formData.append('file', selectedFile);

    // --- A MÁGICA DO TIMESTAMP PADDING ---
    // Pega o horário da ÚLTIMA mensagem da lista (seja cliente ou agente)
    let lastMsgTime = 0;
    if (sortedMessages.length > 0) {
        lastMsgTime = new Date(sortedMessages[sortedMessages.length - 1].createdAt).getTime();
    }

    // O horário da sua nova mensagem será O MAIOR entre: "Agora" ou "Última Mensagem + 10ms"
    // Isso garante matematicamente que ela vai ficar em baixo.
    const optimisticTime = Math.max(Date.now(), lastMsgTime + 10);
    
    const tempId = 'temp-' + Date.now();
    const tempMsg = {
      id: tempId,
      content: newMessage || (selectedFile ? (selectedFile.type.startsWith('image/') ? '📷 Imagem enviada' : '📎 Arquivo enviado') : ''),
      sender: 'AGENT',
      type: selectedFile ? (selectedFile.type.startsWith('image/') ? 'IMAGE' : 'DOCUMENT') : 'TEXT',
      mediaUrl: selectedFile && selectedFile.type.startsWith('image/') ? URL.createObjectURL(selectedFile) : null,
      createdAt: new Date(optimisticTime).toISOString() // Data forçada para o futuro imediato
    };
    
    setMessages((prev) => [...prev, tempMsg]);
    setNewMessage('');
    removeSelectedFile();

    try {
      const res = await fetch('/api/chat/send', { method: 'POST', body: formData });
      if (!res.ok) throw new Error("Erro no envio");
      // Não precisamos fazer nada aqui, o Polling vai substituir a tempMsg pela real em 2s
    } catch (error) {
      alert("Erro ao enviar mensagem.");
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSending(false);
    }
  }

  async function handleChangeDepartment(newDept: string) {
    setDepartment(newDept);
    await fetch('/api/chat/department', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: chat.id, department: newDept }),
    });
    router.refresh();
  }

  const getFlagColor = (level: number) => {
      if (level === 3) return "text-red-500";
      if (level === 2) return "text-yellow-500";
      return "text-gray-600 hover:text-emerald-500"; 
  };

  const handleBack = () => {
      if (onClose) onClose();
      else router.push('/');
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 w-full relative">
      
      {/* MODAL DE IMAGEM */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col backdrop-blur-sm" onClick={() => setSelectedImage(null)}>
          <div className="flex justify-end items-center p-4 gap-2 z-[110]" onClick={e => e.stopPropagation()}>
             <button onClick={() => setZoomLevel(1)} className="text-white/70 hover:text-red-400 bg-gray-800/80 rounded-full p-2"><X size={24} /></button>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-4">
            <img src={selectedImage} style={{ transform: `scale(${zoomLevel})` }} className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-4 md:px-6 bg-gray-900 flex-shrink-0 relative z-50 shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white rounded-full">
            <ArrowLeft size={20} />
          </button>
          
          <div>
            <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white truncate max-w-[150px] md:max-w-[300px]">{chat.customerName}</h2>
                <div className="relative group">
                    <button className={`p-1 rounded ${getFlagColor(urgency)}`}><Flag size={16} fill={urgency > 1 ? "currentColor" : "none"} /></button>
                    <div className="absolute left-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg p-1 hidden group-hover:flex flex-col gap-1 z-50">
                        <button onClick={() => handleChangeUrgency(1)} className="px-3 py-2 text-xs text-gray-300 hover:bg-gray-700">Normal</button>
                        <button onClick={() => handleChangeUrgency(2)} className="px-3 py-2 text-xs text-yellow-500 hover:bg-gray-700">Atenção</button>
                        <button onClick={() => handleChangeUrgency(3)} className="px-3 py-2 text-xs text-red-500 hover:bg-gray-700">Urgente</button>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1 text-xs text-emerald-400 cursor-pointer relative mt-0.5">
                <Briefcase size={12} />
                <select value={department} onChange={(e) => handleChangeDepartment(e.target.value)} className="bg-transparent border-none focus:ring-0 p-0 text-xs font-medium cursor-pointer uppercase hover:text-white outline-none appearance-none pr-4">
                    {DEPARTMENTS.map(dept => <option key={dept} value={dept} className="bg-gray-800 text-white">{dept}</option>)}
                </select>
            </div>
          </div>
        </div>

        <button onClick={handleBack} className="hidden md:block p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition" title="Fechar Conversa">
           <X size={20} />
        </button>
      </div>

      {/* MENSAGENS (Sorted) */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar flex flex-col">
        {sortedMessages.map((msg: any) => {
            const showCaption = msg.content && 
                                msg.content !== '📷 Imagem enviada' && 
                                msg.content !== '📎 Arquivo enviado';

            return (
              <div key={msg.id} className={`flex ${msg.sender === 'AGENT' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] md:max-w-[70%] p-3 rounded-2xl text-sm flex flex-col ${msg.sender === 'AGENT' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700'}`}>
                  
                  {msg.type === 'IMAGE' && msg.mediaUrl && (
                    <div className="mb-1 cursor-pointer overflow-hidden rounded-lg" onClick={() => setSelectedImage(msg.mediaUrl)}>
                        <img src={msg.mediaUrl} alt="Midia" className="max-h-[300px] w-auto border border-white/10 hover:opacity-90 transition"/>
                    </div>
                  )}

                  {msg.type === 'DOCUMENT' && (
                    <div className="flex items-center gap-3 bg-black/20 p-2 rounded-lg cursor-pointer hover:bg-black/30 transition" onClick={(e) => downloadResource(e, msg.mediaUrl)}>
                        <FileText size={24} />
                        <div><p className="font-mono text-xs">Arquivo Anexado</p></div>
                        <Download size={16} />
                    </div>
                  )}

                  {showCaption && (
                    <p className={`${(msg.type === 'IMAGE' || msg.type === 'DOCUMENT') ? "mt-2 pt-2 border-t border-white/20" : ""} break-words whitespace-pre-wrap`}>
                        {msg.content}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                    <span className="text-[10px]">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    {msg.sender === 'AGENT' && <Check size={12} />}
                  </div>
                </div>
              </div>
            );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <div className="bg-gray-900 border-t border-gray-800 p-3 md:p-4">
        {selectedFile && (
           <div className="mb-2 animate-slide-up">
              <div className="relative bg-gray-800 border border-gray-700 p-2 rounded-xl flex items-center gap-3 w-fit pr-10 shadow-lg">
                 {selectedFile.type.startsWith('image/') ? (
                    <div className="h-12 w-12 rounded-lg overflow-hidden border border-gray-600 bg-black flex-shrink-0">
                       <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                 ) : (
                    <div className="h-12 w-12 bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 flex-shrink-0">
                       <FileText size={24} />
                    </div>
                 )}
                 <div className="flex flex-col overflow-hidden">
                    <span className="text-xs font-bold text-white truncate max-w-[180px]">{selectedFile.name}</span>
                    <span className="text-[10px] text-gray-400">{(selectedFile.size / 1024).toFixed(1)} KB</span>
                 </div>
                 <button onClick={removeSelectedFile} className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition transform hover:scale-110">
                    <X size={14} />
                 </button>
              </div>
           </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2 items-end">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-400 hover:text-white bg-gray-800 rounded-xl transition hover:bg-gray-700">
            <Paperclip size={20} />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onPaste={handlePaste}
            placeholder={selectedFile ? "Adicionar legenda..." : "Digite (ou cole imagem)..."}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 text-white transition placeholder-gray-500"
            disabled={sending}
          />
          <button type="submit" disabled={sending || (!newMessage.trim() && !selectedFile)} className={`p-3 rounded-xl text-white transition ${sending || (!newMessage.trim() && !selectedFile) ? 'bg-gray-700 opacity-50 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
            {sending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
}