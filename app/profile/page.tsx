// app/profile/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, User, Mail, Lock, Camera, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function ProfilePage() {
  const { data: session, update } = useSession(); 
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    avatar: '' 
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Tenta pegar dados da API (Dados mais frescos do banco)
  useEffect(() => {
    fetchProfile();
  }, []);

  // 2. SAFETY CHECK: Se a API demorar, pega da Sessão (Login local)
  // Isso garante que os campos nunca fiquem vazios visualmente
  useEffect(() => {
    if (session?.user) {
        setFormData(prev => ({
            ...prev,
            name: prev.name || session.user.name || '',
            email: prev.email || session.user.email || '',
            // @ts-ignore
            avatar: prev.avatar || session.user.avatar || ''
        }));
    }
  }, [session]);

  async function fetchProfile() {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({
            ...prev,
            name: data.name || prev.name || '',
            email: data.email || prev.email || '',
            password: '',
            avatar: data.avatar || prev.avatar || ''
        }));
      }
    } catch (error) {
        console.error("Erro ao carregar perfil");
    } finally {
        setLoading(false);
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 1024 * 1024) { 
              alert("A imagem deve ter no máximo 1MB.");
              return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
              setFormData(prev => ({ ...prev, avatar: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');

      setMsg({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      
      // Atualiza a sessão do navegador para refletir mudanças na hora
      await update({
          ...session,
          user: {
              ...session?.user,
              name: formData.name,
              email: formData.email,
              avatar: formData.avatar
          }
      });
      
      setFormData(prev => ({ ...prev, password: '' }));

    } catch (error: any) {
      setMsg({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="h-screen bg-gray-950 flex items-center justify-center text-emerald-500"><Loader2 className="animate-spin" size={40}/></div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        
        <div className="flex items-center gap-4 mb-8 border-b border-gray-800 pb-4">
             <Link href="/" className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition"><ArrowLeft size={20}/></Link>
             <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">Minha Conta</h1>
                <p className="text-sm text-gray-400">Gerencie suas informações pessoais</p>
             </div>
        </div>

        {msg && (
            <div className={`p-4 rounded-lg mb-6 flex items-center gap-2 animate-fade-in ${msg.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                {msg.type === 'success' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
                {msg.text}
            </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 md:p-8 shadow-2xl">
            <form onSubmit={handleSave} className="space-y-6">
                
                <div className="flex flex-col items-center gap-4 mb-6">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-gray-800 bg-gray-700 flex items-center justify-center">
                            {formData.avatar ? (
                                <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User size={64} className="text-gray-500" />
                            )}
                        </div>
                        <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute bottom-0 right-0 p-2 bg-emerald-600 hover:bg-emerald-500 rounded-full text-white shadow-lg transition transform hover:scale-110"
                            title="Alterar Foto"
                        >
                            <Camera size={20} />
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                    </div>
                    <p className="text-xs text-gray-500">Clique na câmera para alterar (Máx 1MB)</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <label className="block text-xs uppercase font-bold text-gray-500 mb-2 flex items-center gap-2"><User size={14}/> Nome Completo</label>
                        <input 
                            required 
                            type="text" 
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none transition"
                            placeholder="Digite seu nome"
                            value={formData.name} 
                            onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-xs uppercase font-bold text-gray-500 mb-2 flex items-center gap-2"><Mail size={14}/> Email de Acesso</label>
                        <input 
                            required 
                            type="email" 
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none transition"
                            placeholder="Digite seu email"
                            value={formData.email} 
                            onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                    </div>

                    <div className="md:col-span-2 pt-4 border-t border-gray-800">
                        <label className="block text-xs uppercase font-bold text-emerald-500 mb-2 flex items-center gap-2"><Lock size={14}/> Alterar Senha (Opcional)</label>
                        <input type="password" className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none transition placeholder-gray-600"
                            placeholder="Deixe em branco para manter a atual"
                            value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button type="submit" disabled={saving} className={`bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-2 transition shadow-lg shadow-emerald-900/20 ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        {saving ? <Loader2 className="animate-spin" size={20}/> : <Save size={20} />} 
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
}