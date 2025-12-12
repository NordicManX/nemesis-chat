// app/components/chat-window.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Send, X } from 'lucide-react';
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

  // Rola para baixo sempre que chega mensagem nova
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Atualiza as mensagens se trocar de chat
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    // Envio Otimista (Mostra na tela antes de confirmar no servidor)
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

      if (res.ok) {
        router.refresh(); // Atualiza sidebar e dados
      }
    } catch (error) {
      console.error("Erro ao enviar", error);
    }
    setSending(false);
  }

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Cabeçalho do Chat */}
      <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900 flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white">{chat.customerName}</h2>
          <p className="text-xs text-emerald-400">Telegram ID: {chat.telegramId}</p>
        </div>
        <Link href="/" className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white" title="Fechar Conversa">
           <X size={20} />
        </Link>
      </div>

      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        {messages.map((msg: any) => (
          <div key={msg.id} className={`flex ${msg.sender === 'AGENT' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${
                msg.sender === 'AGENT' 
                  ? 'bg-emerald-600 text-white rounded-tr-none' 
                  : 'bg-gray-800 text-gray-200 rounded-tl-none border border-gray-700'
              }`}
            >
              <p>{msg.content}</p>
              <span className="text-[10px] opacity-60 block text-right mt-1">
                {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de Envio */}
      <div className="p-4 bg-gray-900 border-t border-gray-800">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua resposta..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 text-white"
            disabled={sending}
          />
          <button 
            type="submit" 
            disabled={sending || !newMessage.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 p-3 rounded-xl text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}