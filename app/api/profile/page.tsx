// app/profile/page.tsx
'use client';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function ProfilePage() {
  const { data: session, update } = useSession(); // 'update' serve para atualizar a sessão sem relogar
  
  // Dados do Perfil
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [profileMsg, setProfileMsg] = useState('');

  // Dados da Senha
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passMsg, setPassMsg] = useState('');

  // Carrega dados iniciais quando a sessão estiver pronta
  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || '');
      // @ts-ignore
      setAvatar(session.user.avatar || ''); // O TS pode reclamar do avatar, mas vai funcionar
    }
  }, [session]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg('Salvando...');
    
    const res = await fetch('/api/profile/update', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email: session?.user?.email, name, avatar })
    });

    if (res.ok) {
      setProfileMsg('✅ Perfil atualizado!');
      // Atualiza a sessão localmente para refletir o nome novo na hora
      await update({ ...session, user: { ...session?.user, name, avatar } });
    } else {
      setProfileMsg('❌ Erro ao salvar.');
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPassMsg('Processando...');
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
    if (data.error) setPassMsg(`❌ ${data.error}`);
    else {
      setPassMsg('✅ Senha alterada! Faça login novamente.');
      setTimeout(() => signOut(), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <header className="flex justify-between items-center mb-8 pb-4 border-b border-gray-800">
        <h1 className="text-3xl font-bold text-emerald-400">Meu Perfil</h1>
        <Link href="/" className="text-gray-400 hover:text-white">← Voltar ao Dashboard</Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Cartão 1: Dados Pessoais */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-xl font-bold mb-4">👤 Dados Pessoais</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="flex justify-center mb-4">
               {/* Preview da Foto */}
               <img 
                 src={avatar || "https://ui-avatars.com/api/?background=random&name=" + name} 
                 alt="Avatar" 
                 className="w-20 h-20 rounded-full border-2 border-emerald-500 object-cover"
               />
            </div>

            <div>
              <label className="block text-sm text-gray-400">Nome de Exibição</label>
              <input type="text" className="w-full bg-gray-900 border border-gray-600 rounded p-2 mt-1"
                value={name} onChange={e => setName(e.target.value)} />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400">URL da Foto (Link)</label>
              <input type="text" placeholder="https://..." className="w-full bg-gray-900 border border-gray-600 rounded p-2 mt-1 text-xs"
                value={avatar} onChange={e => setAvatar(e.target.value)} />
              <p className="text-[10px] text-gray-500 mt-1">Cole um link de imagem do Google ou LinkedIn aqui.</p>
            </div>

            {profileMsg && <p className="text-sm font-bold text-emerald-400">{profileMsg}</p>}
            
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded font-bold transition">
              Salvar Alterações
            </button>
          </form>
        </div>

        {/* Cartão 2: Segurança */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h2 className="text-xl font-bold mb-4">🔐 Segurança</h2>
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
            {passMsg && <p className="text-sm font-bold">{passMsg}</p>}
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 py-2 rounded font-bold transition">
              Atualizar Senha
            </button>
          </form>

          <div className="mt-8 border-t border-gray-700 pt-4">
             <button onClick={() => signOut()} className="w-full border border-red-500 text-red-400 hover:bg-red-500/10 py-2 rounded transition">
                Sair do Sistema
             </button>
          </div>
        </div>

      </div>
    </div>
  );
}