// app/dashboard/settings/page.tsx
'use client';

import { useState } from 'react';
import { Save, CheckCircle, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');

    try {
      const res = await fetch('/api/settings/telegram/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (res.ok) {
        setStatus('success');
        setToken(''); // Limpa por segurança ou mantém, você decide
        alert("Bot Conectado! Agora as mensagens chegarão aqui.");
      } else {
        setStatus('error');
        alert("Erro: Token inválido ou falha na conexão.");
      }
    } catch (error) {
      setStatus('error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 bg-gray-950 min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-6">Configurações de Canais</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-2xl">✈️</div>
            <div>
                <h2 className="text-lg font-bold">Conectar Telegram</h2>
                <p className="text-sm text-gray-400">Insira o token do seu bot criado no @BotFather.</p>
            </div>
        </div>

        <form onSubmit={handleConnect} className="space-y-4">
            <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">Bot Token</label>
                <input 
                    type="text" 
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Ex: 123456789:AAFwgh..." 
                    className="w-full bg-gray-950 border border-gray-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none font-mono"
                />
            </div>

            <div className="flex items-center gap-4">
                <button 
                    type="submit" 
                    disabled={loading || !token}
                    className={`px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition
                        ${loading ? 'bg-gray-700 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                >
                    {loading ? 'Conectando...' : <><Save size={18} /> Salvar e Conectar</>}
                </button>

                {status === 'success' && <span className="text-emerald-400 flex items-center gap-1 text-sm"><CheckCircle size={16}/> Conectado!</span>}
                {status === 'error' && <span className="text-red-400 flex items-center gap-1 text-sm"><AlertCircle size={16}/> Falha ao conectar.</span>}
            </div>
        </form>

        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800/50 rounded-lg text-sm text-blue-200">
            <p className="font-bold mb-1">Como obter o token?</p>
            <ol className="list-decimal list-inside space-y-1 opacity-80">
                <li>Abra o Telegram e busque por <strong>@BotFather</strong>.</li>
                <li>Envie o comando <code>/newbot</code>.</li>
                <li>Dê um nome e um username para o seu bot.</li>
                <li>Copie o <strong>HTTP API Token</strong> gerado e cole acima.</li>
            </ol>
        </div>
      </div>
    </div>
  );
}