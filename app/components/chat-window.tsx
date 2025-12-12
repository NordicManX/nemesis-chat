// app/components/chat-window.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Send, X, ArrowLeft, Check } from 'lucide-react'; // <--- Import ArrowLeft e Check
import Link from 'next/link';

interface ChatWindowProps {
  chat: any;
  initialMessages: any[];
}

export default function ChatWindow({ chat, initialMessages }: ChatWindowProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    const tempMsg = {
      id: 'temp-' + Date.now(),
      content: newMessage,
      sender: 'AGENT',
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
    <div className="flex flex-col h-full bg-gray-950 w-full"> {/* w-full garante largura total no mobile */}
      
      {/* Cabeçalho do Chat */}
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-4 md:px-6 bg-gray-900 flex-shrink-0">
        <div className="flex items-center gap-3">
          
          {/* BOTÃO VOLTAR (Só aparece no mobile 'md:hidden') */}
          <Link href="/" className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white">
            <ArrowLeft size={20} />
          </Link>

          <div>
            <h2 className="text-lg font-bold text-white truncate max-w-[200px]">{chat.customerName}</h2>
            <p className="text-xs text-emerald-400">ID: {chat.telegramId}</p>
          </div>
        </div>

        {/* Botão Fechar (Só Desktop) */}
        <Link href="/" className="hidden md:block p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white" title="Fechar Conversa">
           <X size={20} />
        </Link>
      </div>

      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
        {messages.map((msg: any) => (
          <div key={msg.id} className={`flex ${msg.sender === 'AGENT' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] md:max-w-[70%] p-3 rounded-2xl text-sm ${
                msg.sender === 'AGENT' 
                  ? 'bg-emerald-600 text-white rounded-tr-none' 
                  : 'bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700'
              }`}
            >
              <p>{msg.content}</p>
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
          <button 
            type="submit" 
            disabled={sending || !newMessage.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 p-3 rounded-xl text-white transition disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}