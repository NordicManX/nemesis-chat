'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Save, CheckCircle, AlertTriangle, ArrowLeft, Send, HelpCircle } from 'lucide-react';

export default function SettingsPage() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings/telegram/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Bot Conectado! Agora as mensagens chegarão aqui.' });
        setToken(''); // Limpa o campo por segurança
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro: Token inválido ou falha na conexão.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão com o servidor.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-4 animate-fade-in bg-gray-950 text-white">
      
      <div className="w-full max-w-2xl">
        
        {/* --- CABEÇALHO COM BOTÃO VOLTAR --- */}
        <div className="flex items-center gap-4 mb-8">
            <Link 
                href="/" 
                className="p-3 rounded-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white transition shadow-sm"
                title="Voltar ao Dashboard"
            >
                <ArrowLeft size={24} />
            </Link>
            <div>
                <h1 className="text-3xl font-bold text-white">Configurações de Canais</h1>
                <p className="text-gray-400 text-sm mt-1">Gerencie a conexão dos seus bots de atendimento.</p>
            </div>
        </div>

        {/* --- CARD PRINCIPAL --- */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-2xl">
            
            <div className="flex items-start gap-4 mb-6">
                <div className="p-4 bg-blue-500/10 rounded-xl">
                    <Send className="text-blue-400" size={32} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Conectar Telegram</h2>
                    <p className="text-gray-400 text-sm">Insira o token do seu bot criado no @BotFather.</p>
                </div>
            </div>

            <form onSubmit={handleConnect} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Bot Token</label>
                    <input 
                        type="text" 
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="Ex: 123456789:AAFwgh..."
                        className="w-full bg-gray-950 border border-gray-700 rounded-lg p-4 text-white focus:border-emerald-500 outline-none transition font-mono text-sm"
                    />
                </div>

                {message && (
                    <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                        {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                        <p className="font-medium text-sm">{message.text}</p>
                    </div>
                )}

                <button 
                    type="submit"
                    disabled={loading || !token}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2 mt-2"
                >
                    {loading ? 'Conectando...' : <><Save size={20} /> Salvar e Conectar</>}
                </button>
            </form>

            {/* --- ÁREA DE AJUDA --- */}
            <div className="mt-8 pt-6 border-t border-gray-800">
                <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2 mb-3">
                    <HelpCircle size={16} /> Como obter o token?
                </h3>
                <ol className="text-sm text-gray-500 space-y-2 list-decimal list-inside bg-gray-950/50 p-4 rounded-lg border border-gray-800">
                    <li>Abra o Telegram e busque por <strong className="text-blue-400">@BotFather</strong>.</li>
                    <li>Envie o comando <code className="bg-gray-800 px-1 rounded text-gray-300">/newbot</code>.</li>
                    <li>Dê um nome e um username para o seu bot.</li>
                    <li>Copie o <strong className="text-emerald-400">HTTP API Token</strong> gerado e cole acima.</li>
                </ol>
            </div>

        </div>
      </div>
    </div>
  );
}