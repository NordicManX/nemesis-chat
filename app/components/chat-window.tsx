// app/components/chat-window.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
// Adicionei CheckCheck na importação 👇
import { 
  Send, X, ArrowLeft, Check, CheckCheck, Briefcase, Download, Paperclip, 
  FileText, Flag, Trash2, Reply, MoreVertical, Copy, Edit2, Share2 
} from 'lucide-react';

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
  const [isDeleting, setIsDeleting] = useState(false);

  // --- ESTADOS INTERAÇÃO ---
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const [editingMessage, setEditingMessage] = useState<any | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<any | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevChatIdRef = useRef<string | null>(null);
  const prevMsgCountRef = useRef(messages.length);

  // Fecha menus ao clicar fora
  useEffect(() => {
      const clickHandler = () => setMenuOpenId(null);
      window.addEventListener('click', clickHandler);
      return () => window.removeEventListener('click', clickHandler);
  }, []);

  // --- ORDENAÇÃO ---
  const sortedMessages = [...messages].sort((a: any, b: any) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    if (timeA !== timeB) return timeA - timeB;
    const isTempA = a.id.toString().startsWith('temp-');
    const isTempB = b.id.toString().startsWith('temp-');
    if (isTempA && !isTempB) return 1;
    if (!isTempA && isTempB) return -1;
    return a.id.toString().localeCompare(b.id.toString());
  });

  // --- POLLING ---
  useEffect(() => {
    let isMounted = true;
    const fetchMessages = async () => {
      if (!chat.id) return;
      try {
        const res = await fetch(`/api/chat/messages?chatId=${chat.id}&t=${Date.now()}`, {
             cache: 'no-store', headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
        });
        if (res.ok) {
          const serverMessages = await res.json();
          if (isMounted) {
            setMessages((current) => {
               const myPending = current.filter(m => m.id.toString().startsWith('temp-'));
               const filteredPending = myPending.filter(temp => {
                   const exists = serverMessages.some((sm: any) => 
                       sm.content === temp.content && 
                       Math.abs(new Date(sm.createdAt).getTime() - new Date(temp.createdAt).getTime()) < 10000
                   );
                   return !exists;
               });
               const currentRealIds = current.filter(m => !m.id.toString().startsWith('temp-')).map(m => m.id).join(',');
               const serverIds = serverMessages.map((m: any) => m.id).join(',');
               
               if (currentRealIds === serverIds && filteredPending.length === myPending.length) return current;
               return [...serverMessages, ...filteredPending];
            });
          }
        }
      } catch (error) { console.error("Polling error:", error); }
    };
    const interval = setInterval(fetchMessages, 2000);
    return () => { isMounted = false; clearInterval(interval); };
  }, [chat.id]);

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
    setReplyingTo(null);
    setEditingMessage(null);
  }, [initialMessages, chat]);

  // --- AÇÕES ---
  const handleReply = (msg: any) => {
      setReplyingTo(msg);
      setEditingMessage(null);
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (input) input.focus();
  };

  const handleShare = (text: string) => {
      navigator.clipboard.writeText(text);
      alert("Texto copiado!"); 
      setMenuOpenId(null);
  };

  const handleEditRequest = (msg: any) => {
      setEditingMessage(msg);
      setNewMessage(msg.content);
      setReplyingTo(null);
      setMenuOpenId(null);
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (input) input.focus();
  };

  const handleDeleteMessageRequest = (msg: any) => {
      setMessageToDelete(msg);
      setMenuOpenId(null);
  };

  const confirmDeleteMessage = async (mode: 'me' | 'everyone') => {
      if (!messageToDelete) return;
      const idToDelete = messageToDelete.id;
      setMessages(prev => prev.filter(m => m.id !== idToDelete));
      setMessageToDelete(null);
      try { await fetch(`/api/chat/message/delete?id=${idToDelete}&mode=${mode}`, { method: 'DELETE' }); } 
      catch (error) { console.error("Erro ao deletar mensagem"); }
  };

  async function handleChangeUrgency(level: number) {
    setUrgency(level);
    await fetch('/api/chat/urgency', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: chat.id, urgencyLevel: level }),
    });
    router.refresh(); 
  }

  async function handleDeleteChat() {
    if (!confirm("⚠️ Tem certeza que deseja EXCLUIR esta conversa?\n\nTodo o histórico será apagado permanentemente.")) return;
    setIsDeleting(true);
    try {
        const res = await fetch(`/api/chats/delete?chatId=${chat.id}`, { method: 'DELETE' });
        if (res.ok) { if (onClose) onClose(); else router.push('/'); router.refresh(); } 
        else { alert("Erro ao excluir chat."); setIsDeleting(false); }
    } catch (error) { alert("Erro de conexão."); setIsDeleting(false); }
  }

  // --- ENVIO / EDIÇÃO ---
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;
    setSending(true);

    if (editingMessage) {
        setMessages(prev => prev.map(m => m.id === editingMessage.id ? { ...m, content: newMessage } : m));
        setNewMessage('');
        setEditingMessage(null);
        setSending(false);
        try {
            await fetch('/api/chat/message/edit', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId: editingMessage.id, newContent: newMessage })
            });
        } catch(e) { console.error(e); }
        return;
    }

    const formData = new FormData();
    formData.append('chatId', chat.id);
    if (newMessage) formData.append('content', newMessage);
    if (selectedFile) formData.append('file', selectedFile);
    if (replyingTo) formData.append('replyToId', replyingTo.id);

    let lastMsgTime = 0;
    if (sortedMessages.length > 0) lastMsgTime = new Date(sortedMessages[sortedMessages.length - 1].createdAt).getTime();
    const optimisticTime = Math.max(Date.now(), lastMsgTime + 10);
    
    const tempId = 'temp-' + Date.now();
    const tempMsg = {
      id: tempId,
      content: newMessage || (selectedFile ? (selectedFile.type.startsWith('image/') ? '📷 Imagem enviada' : '📎 Arquivo enviado') : ''),
      sender: 'AGENT',
      type: selectedFile ? (selectedFile.type.startsWith('image/') ? 'IMAGE' : 'DOCUMENT') : 'TEXT',
      mediaUrl: selectedFile && selectedFile.type.startsWith('image/') ? URL.createObjectURL(selectedFile) : null,
      createdAt: new Date(optimisticTime).toISOString(),
      replyTo: replyingTo ? { sender: replyingTo.sender, content: replyingTo.content } : null,
      isRead: false // Mensagem nasce não lida
    };
    
    setMessages((prev) => [...prev, tempMsg]);
    setNewMessage('');
    removeSelectedFile();
    setReplyingTo(null);

    try {
      const res = await fetch('/api/chat/send', { method: 'POST', body: formData });
      if (!res.ok) throw new Error("Erro no envio");
    } catch (error) {
      alert("Erro ao enviar mensagem.");
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally { setSending(false); }
  }

  const downloadResource = (e: React.MouseEvent, url: string | null) => { e.stopPropagation(); if (!url) return; const link = document.createElement('a'); link.href = `/api/chat/download?url=${encodeURIComponent(url)}`; link.setAttribute('download', ''); document.body.appendChild(link); link.click(); document.body.removeChild(link); };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { const file = e.target.files[0]; if (file.size > 4 * 1024 * 1024) return alert("⚠️ Limite de 4MB."); setSelectedFile(file); } };
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => { const items = e.clipboardData.items; for (let i = 0; i < items.length; i++) { if (items[i].type.indexOf('image') !== -1) { const file = items[i].getAsFile(); if (file) { if (file.size > 4 * 1024 * 1024) { alert("⚠️ Limite de 4MB."); return; } setSelectedFile(file); e.preventDefault(); return; } } } };
  const removeSelectedFile = () => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; };
  async function handleChangeDepartment(newDept: string) { setDepartment(newDept); await fetch('/api/chat/department', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chatId: chat.id, department: newDept }), }); router.refresh(); }
  const getFlagColor = (level: number) => { if (level === 3) return "text-red-500"; if (level === 2) return "text-yellow-500"; return "text-gray-600 hover:text-emerald-500"; };
  const handleBack = () => { if (onClose) onClose(); else router.push('/'); };
  const cancelInputMode = () => { setReplyingTo(null); setEditingMessage(null); setNewMessage(''); };

  return (
    <div className="flex flex-col h-full w-full bg-gray-950 relative overflow-hidden">
      
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

      {/* MODAL DE EXCLUSÃO */}
      {messageToDelete && (
          <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full border border-gray-700 shadow-2xl animate-fade-in">
                  <h3 className="text-lg font-bold text-white mb-2">Excluir Mensagem?</h3>
                  <p className="text-sm text-gray-400 mb-6">
                      {messageToDelete.sender === 'AGENT' 
                        ? "Escolha como deseja apagar esta mensagem." 
                        : "Você pode apagar esta mensagem apenas da sua visualização."}
                  </p>
                  
                  <div className="flex flex-col gap-2">
                      {messageToDelete.sender === 'AGENT' && (
                          <button onClick={() => confirmDeleteMessage('everyone')} className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition">
                              <Trash2 size={18} /> Apagar para Todos
                          </button>
                      )}
                      
                      <button onClick={() => confirmDeleteMessage('me')} className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition">
                          Apagar só para mim
                      </button>
                      
                      <button onClick={() => setMessageToDelete(null)} className="mt-2 text-gray-500 hover:text-white text-sm transition">
                          Cancelar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* HEADER */}
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-4 md:px-6 bg-gray-900 flex-shrink-0 relative z-50 shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white rounded-full"><ArrowLeft size={20} /></button>
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
        <div className="flex items-center gap-2">
            <button onClick={handleDeleteChat} disabled={isDeleting} className="p-2 hover:bg-red-500/10 text-gray-400 hover:text-red-500 rounded-full transition" title="Excluir Conversa">
                {isDeleting ? <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"/> : <Trash2 size={20} />}
            </button>
            <button onClick={handleBack} className="hidden md:block p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition" title="Fechar Conversa"><X size={20} /></button>
        </div>
      </div>

      {/* MENSAGENS */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 space-y-4 no-scrollbar flex flex-col w-full">
        {sortedMessages.map((msg: any, index: number) => {
            const isMe = msg.sender === 'AGENT';
            const showCaption = msg.content && msg.content !== '📷 Imagem enviada' && msg.content !== '📎 Arquivo enviado';
            const isTopMessage = index < 2;
            const menuVerticalPosition = isTopMessage ? 'top-full mt-1' : 'bottom-full mb-1';
            const menuOrigin = isTopMessage ? 'origin-top' : 'origin-bottom';

            return (
              <div 
                key={msg.id} 
                className={`flex items-end gap-2 group w-full mb-2 ${isMe ? 'flex-row-reverse justify-start self-end' : 'flex-row justify-start self-start'}`} 
                onMouseLeave={() => setMenuOpenId(null)}
              >
                
                {/* BALÃO DA MENSAGEM */}
                <div className={`max-w-[85%] md:max-w-[70%] p-3 rounded-2xl text-sm flex flex-col relative z-10
                    ${isMe ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700'}`}>
                  
                  {msg.replyTo && (
                      <div className={`mb-2 p-2 rounded border-l-4 text-xs cursor-pointer opacity-90 select-none ${isMe ? 'bg-emerald-800/40 border-emerald-300' : 'bg-gray-900/50 border-emerald-500'}`} onClick={() => {}}>
                          <p className={`font-bold mb-0.5 ${isMe ? 'text-emerald-100' : 'text-emerald-400'}`}>{msg.replyTo.sender === 'AGENT' ? 'Você' : chat.customerName}</p>
                          <p className="truncate opacity-80">{msg.replyTo.content || 'Mídia'}</p>
                      </div>
                  )}
                  {msg.type === 'IMAGE' && msg.mediaUrl && (<div className="mb-1 cursor-pointer overflow-hidden rounded-lg" onClick={() => setSelectedImage(msg.mediaUrl)}><img src={msg.mediaUrl} alt="Midia" className="max-h-[300px] w-auto border border-white/10 hover:opacity-90 transition"/></div>)}
                  {msg.type === 'DOCUMENT' && (<div className="flex items-center gap-3 bg-black/20 p-2 rounded-lg cursor-pointer hover:bg-black/30 transition" onClick={(e) => downloadResource(e, msg.mediaUrl)}><FileText size={24} /><div><p className="font-mono text-xs">Arquivo Anexado</p></div><Download size={16} /></div>)}
                  {showCaption && (<p className={`${(msg.type === 'IMAGE' || msg.type === 'DOCUMENT') ? "mt-2 pt-2 border-t border-white/20" : ""} break-words whitespace-pre-wrap`}>{msg.content}</p>)}
                  
                  {/* RODAPÉ DO BALÃO COM STATUS */}
                  <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                      <span className="text-[10px]">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      {isMe && (
                          <span title={msg.isRead ? "Visualizado" : "Enviado"}>
                              <CheckCheck size={14} className={msg.isRead ? "text-blue-200" : "text-gray-400"} />
                          </span>
                      )}
                  </div>
                </div>

                {/* BOTÕES DE AÇÃO */}
                <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pb-1 z-20 ${menuOpenId === msg.id ? 'opacity-100' : ''}`}>
                    <button onClick={() => handleReply(msg)} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-full transition" title="Responder">
                        <Reply size={16} />
                    </button>
                    
                    <div className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(msg.id); }} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-full transition">
                            <MoreVertical size={16} />
                        </button>
                        
                        {menuOpenId === msg.id && (
                            <div className={`absolute ${menuVerticalPosition} ${isMe ? 'right-0' : 'left-0'} 
                                bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 w-44 
                                overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${menuOrigin}`}>
                                
                                <button onClick={() => handleShare(msg.content)} className="w-full text-left px-4 py-3 text-xs text-gray-300 hover:bg-gray-700 flex items-center gap-3 transition">
                                    <Share2 size={14} /> Compartilhar
                                </button>
                                
                                {isMe && (
                                    <button onClick={() => handleEditRequest(msg)} className="w-full text-left px-4 py-3 text-xs text-gray-300 hover:bg-gray-700 flex items-center gap-3 transition">
                                        <Edit2 size={14} /> Editar
                                    </button>
                                )}
                                
                                <div className="h-px bg-gray-700 my-0"></div>
                                <button onClick={() => handleDeleteMessageRequest(msg)} className="w-full text-left px-4 py-3 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition font-medium">
                                    <Trash2 size={14} /> Excluir
                                </button>
                            </div>
                        )}
                    </div>
                </div>

              </div>
            );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-gray-900 border-t border-gray-800 p-3 md:p-4">
        {replyingTo && (
            <div className="flex items-center justify-between bg-gray-800 p-2 rounded-t-xl border-b border-gray-700 mb-2 animate-slide-up mx-1">
                <div className="flex items-center gap-2 border-l-4 border-emerald-500 pl-3 py-1">
                    <div className="flex flex-col justify-center"><span className="text-xs font-bold text-emerald-400 mb-0.5">Respondendo a {replyingTo.sender === 'AGENT' ? 'Você' : chat.customerName}</span><span className="text-xs text-gray-400 truncate max-w-[200px] md:max-w-[400px]">{replyingTo.content || 'Mídia'}</span></div>
                </div>
                <button onClick={cancelInputMode} className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition"><X size={18}/></button>
            </div>
        )}
        {editingMessage && (
            <div className="flex items-center justify-between bg-gray-800 p-2 rounded-t-xl border-b border-gray-700 mb-2 animate-slide-up mx-1">
                <div className="flex items-center gap-2 border-l-4 border-yellow-500 pl-3 py-1">
                    <div className="flex flex-col justify-center"><span className="text-xs font-bold text-yellow-500 mb-0.5 flex items-center gap-1"><Edit2 size={10}/> Editando Mensagem</span><span className="text-xs text-gray-400 truncate max-w-[200px] md:max-w-[400px]">{editingMessage.content}</span></div>
                </div>
                <button onClick={cancelInputMode} className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition"><X size={18}/></button>
            </div>
        )}
        {selectedFile && (
           <div className="mb-2 animate-slide-up">
              <div className="relative bg-gray-800 border border-gray-700 p-2 rounded-xl flex items-center gap-3 w-fit pr-10 shadow-lg">
                 {selectedFile.type.startsWith('image/') ? (<div className="h-12 w-12 rounded-lg overflow-hidden border border-gray-600 bg-black flex-shrink-0"><img src={URL.createObjectURL(selectedFile)} alt="Preview" className="h-full w-full object-cover" /></div>) : (<div className="h-12 w-12 bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 flex-shrink-0"><FileText size={24} /></div>)}
                 <div className="flex flex-col overflow-hidden"><span className="text-xs font-bold text-white truncate max-w-[180px]">{selectedFile.name}</span><span className="text-[10px] text-gray-400">{(selectedFile.size / 1024).toFixed(1)} KB</span></div>
                 <button onClick={removeSelectedFile} className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition transform hover:scale-110"><X size={14} /></button>
              </div>
           </div>
        )}
        <form onSubmit={handleSend} className="flex gap-2 items-end">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-400 hover:text-white bg-gray-800 rounded-xl transition hover:bg-gray-700"><Paperclip size={20} /></button>
          <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onPaste={handlePaste} placeholder={editingMessage ? "Edite sua mensagem..." : (replyingTo ? "Digite sua resposta..." : "Digite (ou cole imagem)...")} className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 text-white transition placeholder-gray-500" disabled={sending} />
          <button type="submit" disabled={sending || (!newMessage.trim() && !selectedFile)} className={`p-3 rounded-xl text-white transition ${sending || (!newMessage.trim() && !selectedFile) ? 'bg-gray-700 opacity-50 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500'}`}>{sending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (editingMessage ? <Check size={20} /> : <Send size={20} />)}</button>
        </form>
      </div>
    </div>
  );
}