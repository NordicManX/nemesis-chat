// app/profile/page.tsx
'use client';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import Link from 'next/link';

export default function ProfilePage() {
  const { data: session } = useSession();
  
  // Estados para troca de senha
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [msg, setMsg] = useState('');

  // Estados para criar novo usuário
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'AGENT' });
  const [userMsg, setUserMsg] = useState('');

  // Função de mudar senha
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg('Processando...');
    const res = await fetch('/api/profile/password', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        email: session?.user?.email,
        currentPassword: currentPass,
        newPassword: newPass
      })
    });
    const data = await res.json();
    if (data.error) setMsg(`❌ ${data.error}`);
    else {
      setMsg('✅ Senha alterada! Faça login novamente.');
      setTimeout(() => signOut(), 2000); // Desloga para forçar login novo
    }
  }

  // Função de criar usuário
  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setUserMsg('Criando...');
    const res = await fetch('/api/users/create', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(newUser)
    });
    const data = await res.json();
    if (data.error) setUserMsg(`❌ ${data.error}`);
    else {
      setUserMsg('✅ Usuário criado com sucesso!');
      setNewUser({ name: '', email: '', password: '', role: 'AGENT' }); // Limpa form
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <header className="flex justify-between items-center mb-8 pb-4 border-b border-gray-800">
        <h1 className="text-3xl font-bold text-emerald-400">Meu Perfil</h1>
        <Link href="/" className="text-gray-400 hover:text-white">← Voltar ao Dashboard</Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Cartão 1: Mudar Senha */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-xl font-bold mb-4">🔐 Alterar Minha Senha</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400">Senha Atual</label>
              <input type="password" required className="w-full bg-gray-900 border border-gray-600 rounded p-2 mt-1"
                value={currentPass} onChange={e => setCurrentPass(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-400">Nova Senha</label>
              <input type="password" required className="w-full bg-gray-900 border border-gray-600 rounded p-2 mt-1"
                value={newPass} onChange={e => setNewPass(e.target.value)} />
            </div>
            {msg && <p className="text-sm font-bold">{msg}</p>}
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 py-2 rounded font-bold">
              Salvar Nova Senha
            </button>
          </form>
          
          <button onClick={() => signOut()} className="w-full mt-4 border border-red-500 text-red-400 hover:bg-red-500/10 py-2 rounded">
            Sair do Sistema (Logout)
          </button>
        </div>

        {/* Cartão 2: Criar Usuários (Só aparece se você souber a senha, brincadeira, tá aberto pra admin) */}
        {/* Idealmente checaríamos role, mas vamos deixar liberado visualmente e o admin controla */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-xl font-bold mb-4">👥 Cadastrar Novo Agente</h2>
          <p className="text-xs text-gray-500 mb-4">Adicione membros à sua equipe.</p>
          
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400">Nome</label>
              <input type="text" required className="w-full bg-gray-900 border border-gray-600 rounded p-2 mt-1"
                value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm text-gray-400">Email</label>
              <input type="email" required className="w-full bg-gray-900 border border-gray-600 rounded p-2 mt-1"
                value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm text-gray-400">Senha Inicial</label>
                <input type="text" required className="w-full bg-gray-900 border border-gray-600 rounded p-2 mt-1"
                  value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
              </div>
              <div className="w-1/3">
                <label className="block text-sm text-gray-400">Cargo</label>
                <select className="w-full bg-gray-900 border border-gray-600 rounded p-2 mt-1 h-[42px]"
                  value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                  <option value="AGENT">Agente</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>

            {userMsg && <p className="text-sm font-bold">{userMsg}</p>}
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded font-bold">
              Criar Usuário
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}