// app/admin/tenants/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link'; // <--- Importei o Link
import { Building2, User, Lock, Mail, Globe, CheckCircle, AlertTriangle, Plus, ArrowLeft } from 'lucide-react'; // <--- Adicionei ArrowLeft

export default function CreateTenantPage() {
  const [formData, setFormData] = useState({
    companyName: '',
    companySlug: '',
    adminName: '',
    adminEmail: '',
    adminPassword: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const name = e.target.value;
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      setFormData(prev => ({ ...prev, companyName: name, companySlug: slug }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/tenants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setFormData({ companyName: '', companySlug: '', adminName: '', adminEmail: '', adminPassword: '' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao criar' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl">
        
        {/* --- BOTÃO DE VOLTAR --- */}
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition w-fit group">
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Voltar ao Dashboard</span>
        </Link>

        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Building2 className="text-emerald-500" /> Novo Cliente (SaaS)
        </h1>
        <p className="text-gray-400 mb-8">Cadastre uma nova empresa e seu administrador principal.</p>

        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-2xl space-y-6">
            
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-wider mb-4 border-b border-gray-800 pb-2">Dados da Empresa</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Nome da Empresa</label>
                        <div className="relative">
                            <Building2 className="absolute left-3 top-3 text-gray-500" size={18} />
                            <input 
                                type="text" 
                                required
                                value={formData.companyName}
                                onChange={handleNameChange}
                                className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-10 p-3 focus:border-emerald-500 outline-none transition"
                                placeholder="Ex: Pizzaria do João"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Identificador (Slug)</label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-3 text-gray-500" size={18} />
                            <input 
                                type="text" 
                                required
                                value={formData.companySlug}
                                onChange={e => setFormData({...formData, companySlug: e.target.value})}
                                className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-10 p-3 focus:border-emerald-500 outline-none transition font-mono text-sm"
                                placeholder="pizzaria-joao"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4 pt-4">
                <h3 className="text-sm font-bold text-blue-500 uppercase tracking-wider mb-4 border-b border-gray-800 pb-2">Administrador Inicial</h3>
                
                <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1">Nome Completo</label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 text-gray-500" size={18} />
                        <input 
                            type="text" 
                            required
                            value={formData.adminName}
                            onChange={e => setFormData({...formData, adminName: e.target.value})}
                            className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-10 p-3 focus:border-emerald-500 outline-none transition"
                            placeholder="Nome do dono"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Email de Acesso</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-500" size={18} />
                            <input 
                                type="email" 
                                required
                                value={formData.adminEmail}
                                onChange={e => setFormData({...formData, adminEmail: e.target.value})}
                                className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-10 p-3 focus:border-emerald-500 outline-none transition"
                                placeholder="joao@pizzaria.com"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 mb-1">Senha Inicial</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-500" size={18} />
                            <input 
                                type="password" 
                                required
                                value={formData.adminPassword}
                                onChange={e => setFormData({...formData, adminPassword: e.target.value})}
                                className="w-full bg-gray-950 border border-gray-700 rounded-lg pl-10 p-3 focus:border-emerald-500 outline-none transition"
                                placeholder="******"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                    {message.type === 'success' ? <CheckCircle /> : <AlertTriangle />}
                    <p className="font-medium">{message.text}</p>
                </div>
            )}

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
                {loading ? 'Processando...' : <><Plus size={20} /> Cadastrar Cliente</>}
            </button>

        </form>
      </div>
    </div>
  );
}