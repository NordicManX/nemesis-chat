// app/components/chat-window.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Send, X, ArrowLeft, Check, Briefcase, Maximize2, ZoomIn, ZoomOut, Download, Paperclip, FileText } from 'lucide-react';
import Link from 'next/link';

interface ChatWindowProps {
  chat: any;
  initialMessages: any[];
}

const DEPARTMENTS = ["GERAL", "FINANCEIRO", "SUPORTE", "VENDAS"];

export default function ChatWindow({ chat, initialMessages }: ChatWindowProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [department, setDepartment] = useState(chat.department || "GERAL");
  
  // --- ESTADOS DE ARQUIVO ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- ESTADOS DO MODAL DE IMAGEM ---
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setMessages(initialMessages);
    setDepartment(chat.department || "GERAL");
  }, [initialMessages, chat]);

  // --- FUNÇÕES DE IMAGEM (Modal) ---
  const openImageModal = (url: string) => { setSelectedImage(url); setZoomLevel(1); }
  const closeImageModal = () => { setSelectedImage(null); setZoomLevel(1); }
  const handleZoomIn = (e: React.MouseEvent) => { e.stopPropagation(); setZoomLevel(prev => Math.min(prev + 0.5, 3)); }
  const handleZoomOut = (e: React.MouseEvent) => { e.stopPropagation(); setZoomLevel(prev => Math.max(prev - 0.5, 0.5)); }
  
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedImage) return;
    try {
        const link = document.createElement('a');
        link.href = `/api/chat/download?url=${encodeURIComponent(selectedImage)}`;
        link.setAttribute('download', '');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) { console.error(error); }
  };

  // --- FUNÇÕES DE ARQUIVO ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // 🚨 VALIDAÇÃO DE TAMANHO (Limite Vercel: 4.5MB, colocamos 4MB por segurança)
      if (file.size > 4 * 1024 * 1024) {
        alert("⚠️ O arquivo é muito grande! O limite para envio é de 4MB.");
        e.target.value = ''; // Limpa o input
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- ENVIO ---
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;

    setSending(true);

    // Preparando o FormData
    const formData = new FormData();
    formData.append('chatId', chat.id);
    if (newMessage) formData.append('content', newMessage);
    if (selectedFile) formData.append('file', selectedFile);

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        body: formData, 
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro no envio");
      }

      // SUCESSO: Agora sim limpamos a tela e adicionamos a mensagem visualmente
      // Envio Otimista (Visual)
      const tempMsg = {
        id: 'temp-' + Date.now(),
        content: newMessage || (selectedFile ? (selectedFile.type.startsWith('image/') ? '📷 Imagem enviada' : '📎 Arquivo enviado') : ''),
        sender: 'AGENT',
        type: selectedFile ? (selectedFile.type.startsWith('image/') ? 'IMAGE' : 'DOCUMENT') : 'TEXT',
        mediaUrl: selectedFile && selectedFile.type.startsWith('image/') ? URL.createObjectURL(selectedFile) : null,
        createdAt: new Date().toISOString()
      };
      
      setMessages((prev) => [...prev, tempMsg]);

      // Limpa os inputs
      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      router.refresh();

   } catch (error: any) {
      console.error("Erro ao enviar:", error);
      // Mostra a mensagem exata do erro (ex: "Telegram recusou...")
      alert(`❌ Erro: ${error.message || "Falha desconhecida ao enviar."}`);
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

  return (
    <div className="flex flex-col h-full bg-gray-950 w-full relative">
      
      {/* MODAL DE IMAGEM */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col backdrop-blur-sm animate-fade-in" onClick={closeImageModal}>
          <div className="flex justify-end items-center p-4 gap-2 bg-gradient-to-b from-black/50 to-transparent z-[110]" onClick={e => e.stopPropagation()}>
             <button onClick={handleZoomOut} className="text-white/70 hover:text-white bg-gray-800/80 rounded-full p-2" disabled={zoomLevel <= 0.5}><ZoomOut size={24} /></button>
             <span className="text-white/50 text-xs font-mono min-w-[40px] text-center">{Math.round(zoomLevel * 100)}%</span>
             <button onClick={handleZoomIn} className="text-white/70 hover:text-white bg-gray-800/80 rounded-full p-2" disabled={zoomLevel >= 3}><ZoomIn size={24} /></button>
             <div className="h-6 w-px bg-white/20 mx-2"></div>
             <button onClick={handleDownload} className="text-white/70 hover:text-emerald-400 bg-gray-800/80 rounded-full p-2"><Download size={24} /></button>
             <div className="h-6 w-px bg-white/20 mx-2"></div>
             <button onClick={closeImageModal} className="text-white/70 hover:text-red-400 bg-gray-800/80 rounded-full p-2"><X size={24} /></button>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative">
            <img src={selectedImage} alt="Full screen" style={{ transform: `scale(${zoomLevel})` }} className="max-h-full max-w-full object-contain transition-transform duration-200 ease-out cursor-grab active:cursor-grabbing shadow-2xl" onClick={(e) => e.stopPropagation()} onDragStart={(e) => e.preventDefault()} />
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-4 md:px-6 bg-gray-900 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white"><ArrowLeft size={20} /></Link>
          <div>
            <h2 className="text-lg font-bold text-white truncate max-w-[150px] md:max-w-[300px]">{chat.customerName}</h2>
            <div className="flex items-center gap-1 text-xs text-emerald-400 cursor-pointer group relative mt-0.5">
                <Briefcase size={12} />
                <select value={department} onChange={(e) => handleChangeDepartment(e.target.value)} className="bg-transparent border-none focus:ring-0 p-0 text-xs font-medium cursor-pointer uppercase hover:text-white transition outline-none appearance-none pr-4">
                    {DEPARTMENTS.map(dept => <option key={dept} value={dept} className="bg-gray-800 text-white">{dept}</option>)}
                </select>
                <span className="pointer-events-none absolute right-0 top-0.5 text-[8px] opacity-70">▼</span>
            </div>
          </div>
        </div>
        <Link href="/" className="hidden md:block p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white"><X size={20} /></Link>
      </div>

      {/* MENSAGENS */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
        <div className="text-center py-2 opacity-50"><span className="text-[10px] uppercase tracking-wider border border-gray-700 px-2 py-1 rounded-full">Setor Atual: {department}</span></div>
        {messages.map((msg: any) => (
          <div key={msg.id} className={`flex ${msg.sender === 'AGENT' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] md:max-w-[70%] p-3 rounded-2xl text-sm ${msg.sender === 'AGENT' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700'}`}>
              
              {msg.type === 'IMAGE' && msg.mediaUrl ? (
                <div className="mb-1 relative group cursor-pointer" onClick={() => openImageModal(msg.mediaUrl)}>
                    <img src={msg.mediaUrl} alt="Midia" className="rounded-lg max-h-[300px] w-auto border border-gray-600 transition hover:opacity-90" loading="lazy"/>
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-lg"><Maximize2 className="text-white drop-shadow-lg" size={24} /></div>
                </div>
              ) : msg.type === 'DOCUMENT' ? (
                <div className="flex items-center gap-3 bg-black/20 p-2 rounded-lg border border-white/10 mb-1">
                    <div className="p-2 bg-white/10 rounded-lg"><FileText size={24} /></div>
                    <div className="flex-1 overflow-hidden">
                        <p className="font-mono text-xs truncate">Arquivo Anexado</p>
                        <a href={`/api/chat/download?url=${encodeURIComponent(msg.mediaUrl || '')}`} target="_blank" className="text-[10px] text-emerald-200 hover:underline">Baixar Arquivo</a>
                    </div>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
              
              <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                <span className="text-[10px]">{new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                {msg.sender === 'AGENT' && <Check size={12} />}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* ÁREA DE INPUT DE ARQUIVO (VISUALIZAÇÃO DE UPLOAD) */}
      {selectedFile && (
        <div className="px-4 py-2 bg-gray-900 border-t border-gray-800 flex items-center gap-3 animate-fade-in">
            <div className="relative">
                {selectedFile.type.startsWith('image/') ? (
                    <img src={URL.createObjectURL(selectedFile)} alt="Preview" className="h-12 w-12 object-cover rounded-lg border border-gray-600" />
                ) : (
                    <div className="h-12 w-12 bg-gray-800 rounded-lg border border-gray-600 flex items-center justify-center"><FileText className="text-gray-400" /></div>
                )}
                <button onClick={removeSelectedFile} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"><X size={12} /></button>
            </div>
            <div className="flex-1 overflow-hidden">
                <p className="text-xs text-white truncate font-medium">{selectedFile.name}</p>
                <p className="text-[10px] text-gray-400">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
        </div>
      )}

      {/* FORMULÁRIO DE ENVIO */}
      <div className="p-3 md:p-4 bg-gray-900 border-t border-gray-800">
        <form onSubmit={handleSend} className="flex gap-2 items-end">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
          
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition mb-[1px]" title="Anexar arquivo (Máx 4MB)">
            <Paperclip size={20} />
          </button>

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={selectedFile ? "Adicionar legenda..." : "Digite..."}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 text-white"
            disabled={sending}
          />
          <button 
            type="submit" 
            disabled={sending || (!newMessage.trim() && !selectedFile)} 
            className={`bg-emerald-600 hover:bg-emerald-500 p-3 rounded-xl text-white transition mb-[1px] ${sending ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {sending ? <span className="animate-spin">⌛</span> : <Send size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
}