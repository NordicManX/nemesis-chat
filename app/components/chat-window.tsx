// app/components/chat-window.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
// Importei o ícone Maximize2 para indicar que dá pra ampliar (opcional)
import { Send, X, ArrowLeft, Check, Briefcase, Maximize2 } from 'lucide-react';
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
  
  // --- NOVO ESTADO: Guarda a URL da imagem que está aberta em tela cheia ---
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setMessages(initialMessages);
    setDepartment(chat.department || "GERAL");
  }, [initialMessages, chat]);

  async function handleChangeDepartment(newDept: string) {
    setDepartment(newDept);
    await fetch('/api/chat/department', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: chat.id, department: newDept }),
    });
    router.refresh();
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    const tempMsg = {
      id: 'temp-' + Date.now(),
      content: newMessage,
      sender: 'AGENT',
      type: 'TEXT',
      createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, tempMsg]);
    const msgToSend = newMessage;
    setNewMessage('');

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: chat.id, content: msgToSend }),
      });
      if (res.ok) router.refresh();
    } catch (error) {
      console.error("Erro ao enviar", error);
    }
    setSending(false);
  }

  return (
    // Adicionei 'relative' aqui para o modal se posicionar corretamente
    <div className="flex flex-col h-full bg-gray-950 w-full relative">
      
      {/* --- NOVO: O MODAL DE TELA CHEIA --- */}
      {/* Só aparece se 'selectedImage' tiver um link */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)} // Fecha ao clicar no fundo preto
        >
          {/* Botão Fechar (X) */}
          <button 
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-gray-800/50 rounded-full p-2 transition"
            onClick={() => setSelectedImage(null)}
          >
            <X size={32} />
          </button>

          {/* A Imagem Grande */}
          <img 
            src={selectedImage} 
            alt="Visualização em tela cheia" 
            className="max-h-full max-w-full object-contain rounded-lg shadow-2xl cursor-default"
            onClick={(e) => e.stopPropagation()} // Impede que clicar na imagem feche o modal
          />
        </div>
      )}

      {/* Cabeçalho do Chat */}
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-4 md:px-6 bg-gray-900 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h2 className="text-lg font-bold text-white truncate max-w-[150px] md:max-w-[300px]">{chat.customerName}</h2>
            <div className="flex items-center gap-1 text-xs text-emerald-400 cursor-pointer group relative mt-0.5">
                <Briefcase size={12} />
                <select 
                    value={department}
                    onChange={(e) => handleChangeDepartment(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 p-0 text-xs font-medium cursor-pointer uppercase hover:text-white transition outline-none appearance-none pr-4"
                >
                    {DEPARTMENTS.map(dept => <option key={dept} value={dept} className="bg-gray-800 text-white">{dept}</option>)}
                </select>
                <span className="pointer-events-none absolute right-0 top-0.5 text-[8px] opacity-70">▼</span>
            </div>
          </div>
        </div>
        <Link href="/" className="hidden md:block p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white">
           <X size={20} />
        </Link>
      </div>

      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
        <div className="text-center py-2 opacity-50">
           <span className="text-[10px] uppercase tracking-wider border border-gray-700 px-2 py-1 rounded-full">
             Setor Atual: {department}
           </span>
        </div>

        {messages.map((msg: any) => (
          <div key={msg.id} className={`flex ${msg.sender === 'AGENT' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] md:max-w-[70%] p-3 rounded-2xl text-sm ${
                msg.sender === 'AGENT' 
                  ? 'bg-emerald-600 text-white rounded-tr-none' 
                  : 'bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700'
              }`}
            >
              
              {/* --- ATUALIZAÇÃO NA RENDERIZAÇÃO DA IMAGEM --- */}
              {msg.type === 'IMAGE' && msg.mediaUrl ? (
                <div className="mb-1 relative group cursor-pointer" onClick={() => setSelectedImage(msg.mediaUrl)}>
                    <img 
                        src={msg.mediaUrl} 
                        alt="Enviada pelo cliente" 
                        // Adicionei hover:opacity-90 e transition
                        className="rounded-lg max-h-[300px] w-auto border border-gray-600 transition hover:opacity-90"
                        loading="lazy"
                    />
                    {/* Ícone de ampliar que aparece ao passar o mouse (opcional) */}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-lg">
                      <Maximize2 className="text-white drop-shadow-lg" size={24} />
                    </div>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
              
              <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                <span className="text-[10px]">
                  {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
                {msg.sender === 'AGENT' && <Check size={12} />}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de Envio */}
      <div className="p-3 md:p-4 bg-gray-900 border-t border-gray-800">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 text-white"
            disabled={sending}
          />
          <button type="submit" disabled={sending || !newMessage.trim()} className="bg-emerald-600 hover:bg-emerald-500 p-3 rounded-xl text-white transition disabled:opacity-50">
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}