// app/auth/login/page.tsx
'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react'; // Certifique-se de ter este ícone ou remova se não quiser

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Novo estado para controlar o botão
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError('Email ou senha inválidos!');
      setLoading(false); // Para o loading se der erro
    } else {
      // ✅ A ORDEM AQUI IMPORTA MUITO:
      // 1. Atualiza os dados da sessão (para o servidor saber que você logou)
      router.refresh(); 
      
      // 2. Redireciona para o dashboard
      router.push('/'); 
      
      // Nota: Não setamos setLoading(false) aqui para evitar que o form pisque antes de sair da tela
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-xl shadow-lg w-96 border border-gray-700">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Nemesis Login</h1>
        
        {error && (
            <div className="bg-red-500/20 text-red-200 p-3 rounded mb-4 text-sm border border-red-500/30 text-center">
                {error}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm font-medium">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-white mt-1 focus:border-emerald-500 focus:outline-none transition"
              placeholder="admin@nemesis.com"
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm font-medium">Senha</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2.5 text-white mt-1 focus:border-emerald-500 focus:outline-none transition"
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className={`w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? <Loader2 className="animate-spin" size={20}/> : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}