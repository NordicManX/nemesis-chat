// app/chat/[id]/client-interface.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ChatInterface({ chat, initialMessages }: any) {
  const [messages, setMessages] = useState(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const router = useRouter();

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);

    // Chama nossa API para enviar
    const res = await fetch('/api/chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: chat.id,
        content: newMessage,
      }),
    });

    if (res.ok) {
      const savedMessage = await res.json();
      setMessages([...messages, savedMessage]); // Adiciona na tela na hora
      setNewMessage('');
      router.refresh(); // Atualiza os dados em background
    } else {
      alert('Erro ao enviar mensagem');
    }
    setSending(false);
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Cabeçalho */}
      <header className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">{chat.customerName || 'Cliente'}</h1>
          <span className="text-sm text-gray-400">Telegram ID: {chat.telegramId}</span>
        </div>
        <a href="/" className="text-emerald-400 hover:underline text-sm">← Voltar para Painel</a>
      </header>

      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-900">
        {messages.map((msg: any) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'AGENT' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] p-3 rounded-2xl ${
                msg.sender === 'AGENT'
                  ? 'bg-emerald-600 text-white rounded-tr-none'
                  : 'bg-gray-700 text-gray-100 rounded-tl-none'
              }`}
            >
              <p>{msg.content}</p>
              <span className="text-[10px] opacity-70 block text-right mt-1">
                {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Input de Envio */}
      <form onSubmit={handleSend} className="bg-gray-800 p-4 border-t border-gray-700 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Digite sua resposta..."
          className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={sending}
          className="bg-emerald-600 hover:bg-emerald-700 px-6 py-2 rounded-lg font-bold transition-colors disabled:opacity-50"
        >
          {sending ? '...' : 'Enviar'}
        </button>
      </form>
    </div>
  );
}