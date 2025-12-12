// app/components/chat-window.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
// --- NOVOS ÍCONES IMPORTADOS AQUI ---
import { Send, X, ArrowLeft, Check, Briefcase, Maximize2, ZoomIn, ZoomOut, Download } from 'lucide-react';
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
  
  // --- ESTADOS DO MODAL DE IMAGEM ---
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1); // Começa em 1x (100%)

  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setMessages(initialMessages);
    setDepartment(chat.department || "GERAL");
  }, [initialMessages, chat]);

  // --- FUNÇÕES DE CONTROLE DO MODAL ---

  // Abre o modal e reseta o zoom
  const openImageModal = (url: string) => {
      setSelectedImage(url);
      setZoomLevel(1);
  }

  // Fecha o modal
  const closeImageModal = () => {
      setSelectedImage(null);
      setZoomLevel(1);
  }

  // Aumenta Zoom (Máximo 3x)
  const handleZoomIn = (e: React.MouseEvent) => {
      e.stopPropagation(); // Impede fechar o modal
      setZoomLevel(prev => Math.min(prev + 0.5, 3));
  }

  // Diminui Zoom (Mínimo 0.5x)
  const handleZoomOut = (e: React.MouseEvent) => {
      e.stopPropagation();
      setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
  }

  // Função de Download
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedImage) return;
    try {
        // Busca a imagem como um "blob" (arquivo bruto)
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        // Cria um link temporário no navegador
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        // Define o nome do arquivo (usando timestamp para ser único)
        link.download = `nemesis-img-${Date.now()}.jpg`; 
        document.body.appendChild(link);
        link.click(); // Clica no link virtualmente
        document.body.removeChild(link); // Limpa a bagunça
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Erro ao baixar imagem:', error);
        alert("Erro ao tentar baixar a imagem.");
    }
  };


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
    <div className="flex flex-col h-full bg-gray-950 w-full relative">
      
      {/* --- O NOVO MODAL TURBINADO --- */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col backdrop-blur-sm animate-fade-in"
          onClick={closeImageModal} // Fecha ao clicar no fundo
        >
          {/* Barra de Ferramentas (Topo) */}
          <div className="flex justify-end items-center p-4 gap-2 bg-gradient-to-b from-black/50 to-transparent z-[110]" onClick={e => e.stopPropagation()}>
             {/* Botão Zoom Out */}
             <button onClick={handleZoomOut} className="text-white/70 hover:text-white bg-gray-800/80 rounded-full p-2 transition disabled:opacity-30" disabled={zoomLevel <= 0.5} title="Diminuir Zoom">
               <ZoomOut size={24} />
             </button>
             {/* Indicador de Zoom */}
             <span className="text-white/50 text-xs font-mono min-w-[40px] text-center">{Math.round(zoomLevel * 100)}%</span>
             {/* Botão Zoom In */}
             <button onClick={handleZoomIn} className="text-white/70 hover:text-white bg-gray-800/80 rounded-full p-2 transition disabled:opacity-30" disabled={zoomLevel >= 3} title="Aumentar Zoom">
               <ZoomIn size={24} />
             </button>
             
             <div className="h-6 w-px bg-white/20 mx-2"></div> {/* Separador */}

             {/* Botão Download */}
             <button onClick={handleDownload} className="text-white/70 hover:text-emerald-400 bg-gray-800/80 rounded-full p-2 transition" title="Baixar Imagem">
               <Download size={24} />
             </button>
             
             <div className="h-6 w-px bg-white/20 mx-2"></div> {/* Separador */}

             {/* Botão Fechar */}
             <button onClick={closeImageModal} className="text-white/70 hover:text-red-400 bg-gray-800/80 rounded-full p-2 transition" title="Fechar">
               <X size={24} />
             </button>
          </div>

          {/* Área da Imagem (Com Scroll se estiver com zoom) */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4 relative">
            <img 
                src={selectedImage} 
                alt="Full screen" 
                // APLICAMOS O ZOOM AQUI VIA CSS TRANSFORM
                style={{ transform: `scale(${zoomLevel})` }}
                className="max-h-full max-w-full object-contain transition-transform duration-200 ease-out cursor-grab active:cursor-grabbing shadow-2xl"
                onClick={(e) => e.stopPropagation()} // Clicar na imagem não fecha
                onDragStart={(e) => e.preventDefault()} // Evita arrastar o "fantasma" da imagem
            />
          </div>
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
              
              {/* --- MINIATURA QUE ABRE O MODAL --- */}
              {msg.type === 'IMAGE' && msg.mediaUrl ? (
                // Usamos a nova função openImageModal
                <div className="mb-1 relative group cursor-pointer" onClick={() => openImageModal(msg.mediaUrl)}>
                    <img 
                        src={msg.mediaUrl} 
                        alt="Enviada pelo cliente" 
                        className="rounded-lg max-h-[300px] w-auto border border-gray-600 transition hover:opacity-90"
                        loading="lazy"
                    />
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