'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Building2, Users, Calendar, Search, Ban, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';

export default function TenantManagementPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Busca os dados ao carregar a página
  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    try {
      const res = await fetch('/api/admin/tenants');
      const data = await res.json();
      if (Array.isArray(data)) setTenants(data);
    } catch (error) {
      console.error("Erro ao buscar clientes");
    } finally {
      setLoading(false);
    }
  }

  // Função para Bloquear/Desbloquear
  async function toggleStatus(id: string, currentStatus: boolean) {
    const action = currentStatus ? "BLOQUEAR" : "DESBLOQUEAR";
    if (!confirm(`Tem certeza que deseja ${action} o acesso desta empresa?`)) return;

    // Atualização Otimista (Muda na tela antes de confirmar no banco pra ficar rápido)
    setTenants(prev => prev.map(t => t.id === id ? { ...t, isActive: !currentStatus } : t));

    try {
      await fetch('/api/admin/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !currentStatus })
      });
    } catch (error) {
      alert("Erro ao atualizar. Recarregue a página.");
      fetchTenants(); // Reverte em caso de erro
    }
  }

  // Filtro de busca
  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
                <Link href="/" className="p-3 bg-gray-900 rounded-full hover:bg-gray-800 transition">
                    <ArrowLeft size={20} className="text-gray-400" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Building2 className="text-emerald-500" /> Gestão de Assinantes
                    </h1>
                    <p className="text-gray-400 text-sm">Controle de acesso e inadimplência do SaaS.</p>
                </div>
            </div>
            
            <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-500" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar empresa..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2.5 focus:border-emerald-500 outline-none w-full md:w-64 transition"
                />
            </div>
        </div>

        {/* Tabela */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-950 text-gray-400 uppercase text-xs font-bold">
                        <tr>
                            <th className="p-4">Empresa</th>
                            <th className="p-4">Identificador (Slug)</th>
                            <th className="p-4">Usuários</th>
                            <th className="p-4">Cadastro</th>
                            <th className="p-4">Status</th>
                            <th className="p-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {loading ? (
                            <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500" /></td></tr>
                        ) : filteredTenants.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500">Nenhum cliente encontrado.</td></tr>
                        ) : (
                            filteredTenants.map((tenant) => (
                                <tr key={tenant.id} className="hover:bg-gray-800/50 transition">
                                    <td className="p-4 font-medium text-white">{tenant.name}</td>
                                    <td className="p-4 font-mono text-sm text-gray-400">{tenant.slug}</td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1 text-gray-300 text-sm">
                                            <Users size={14} /> {tenant._count?.users || 0}
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-500 text-sm">
                                        {new Date(tenant.createdAt).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="p-4">
                                        {tenant.isActive ? (
                                            <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-xs font-bold border border-emerald-500/20">
                                                <CheckCircle size={12} /> ATIVO
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 bg-red-500/10 text-red-400 px-2 py-1 rounded text-xs font-bold border border-red-500/20">
                                                <Ban size={12} /> BLOQUEADO
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button 
                                            onClick={() => toggleStatus(tenant.id, tenant.isActive)}
                                            className={`text-xs font-bold px-3 py-1.5 rounded transition border ${
                                                tenant.isActive 
                                                ? 'bg-transparent border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white' 
                                                : 'bg-emerald-600 border-transparent text-white hover:bg-emerald-500'
                                            }`}
                                        >
                                            {tenant.isActive ? 'Bloquear Acesso' : 'Reativar Acesso'}
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  );
}