'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Shield, Users, Save, Pencil, CheckCircle, AlertCircle, X, Trash2 } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado do Formulário e Controle
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'AGENT',
    department: 'GERAL'
  });
  
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        setMsg({ type: 'error', text: 'Erro ao carregar lista.' });
      }
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
  }

  // Prepara o formulário para CRIAR
  const startCreate = () => {
      setEditingId(null);
      setFormData({ name: '', email: '', password: '', role: 'AGENT', department: 'GERAL' });
      setShowForm(true);
      setMsg(null);
  };

  // Prepara o formulário para EDITAR
  const startEdit = (user: any) => {
      setEditingId(user.id);
      setFormData({
          name: user.name,
          email: user.email,
          password: '', // Senha começa vazia
          role: user.role,
          department: user.department || 'GERAL'
      });
      setShowForm(true);
      setMsg(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- FUNÇÃO DE DELETAR ---
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${name}"?`)) return;

    setMsg(null);
    try {
        const res = await fetch('/api/admin/users', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Erro ao deletar");
        }

        setMsg({ type: 'success', text: 'Usuário removido com sucesso.' });
        fetchUsers(); // Atualiza a lista
    } catch (error: any) {
        setMsg({ type: 'error', text: error.message });
    }
  }

  const cancelForm = () => {
      setShowForm(false);
      setEditingId(null);
      setMsg(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { ...formData, id: editingId } : formData;

      const res = await fetch('/api/admin/users', {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');

      setMsg({ type: 'success', text: editingId ? 'Usuário atualizado!' : 'Usuário criado!' });
      setShowForm(false);
      fetchUsers();

    } catch (error: any) {
      setMsg({ type: 'error', text: error.message });
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
          <div className="flex items-center gap-4">
             <Link href="/" className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition"><ArrowLeft size={20}/></Link>
             <div>
                <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="text-emerald-500"/> Gestão de Usuários</h1>
                <p className="text-sm text-gray-400">Controle de acesso e departamentos</p>
             </div>
          </div>
          {!showForm && (
              <button 
                onClick={startCreate} 
                className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition"
              >
                <UserPlus size={18} /> Novo Usuário
              </button>
          )}
        </div>

        {/* Mensagens */}
        {msg && (
            <div className={`p-4 rounded-lg mb-6 flex items-center gap-2 ${msg.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'}`}>
                {msg.type === 'success' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
                {msg.text}
            </div>
        )}

        {/* Formulário */}
        {showForm && (
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl mb-8 animate-fade-in relative">
                <button onClick={cancelForm} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20}/></button>
                
                <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                    {editingId ? <Pencil size={18} className="text-yellow-500"/> : <UserPlus size={18} className="text-emerald-500"/>}
                    {editingId ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
                </h2>
                
                <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Nome Completo</label>
                        <input required type="text" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm focus:border-emerald-500 outline-none" 
                            value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Email de Acesso</label>
                        <input required type="email" className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm focus:border-emerald-500 outline-none" 
                            value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">
                            {editingId ? 'Nova Senha (deixe vazio para manter)' : 'Senha Inicial'}
                        </label>
                        <input 
                            required={!editingId} 
                            type="password" 
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm focus:border-emerald-500 outline-none placeholder-gray-600" 
                            placeholder={editingId ? "********" : ""}
                            value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Cargo (Role)</label>
                            <select className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm focus:border-emerald-500 outline-none"
                                value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}
                            >
                                <option value="AGENT">Agente</option>
                                <option value="ADMIN">Administrador</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Departamento</label>
                            <select className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm focus:border-emerald-500 outline-none"
                                value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}
                            >
                                <option value="GERAL">Geral (Triagem)</option>
                                <option value="SUPORTE">Suporte</option>
                                <option value="FINANCEIRO">Financeiro</option>
                                <option value="VENDAS">Vendas</option>
                            </select>
                        </div>
                    </div>
                    <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                        <button type="button" onClick={cancelForm} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">Cancelar</button>
                        <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition">
                            <Save size={18} /> {editingId ? 'Atualizar Dados' : 'Salvar Usuário'}
                        </button>
                    </div>
                </form>
            </div>
        )}

        {/* Lista de Usuários */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h3 className="font-bold text-gray-300 flex items-center gap-2"><Users size={18}/> Equipe Cadastrada</h3>
                <span className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400">{users.length} usuários</span>
            </div>
            
            {loading ? (
                <div className="p-8 text-center text-gray-500">Carregando equipe...</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-gray-800 text-gray-200 uppercase text-xs font-bold">
                            <tr>
                                <th className="px-6 py-3">Nome</th>
                                <th className="px-6 py-3">Email</th>
                                <th className="px-6 py-3">Cargo</th>
                                <th className="px-6 py-3">Departamento</th>
                                <th className="px-6 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-800/50 transition">
                                    <td className="px-6 py-4 font-medium text-white">{user.name}</td>
                                    <td className="px-6 py-4">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${user.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-gray-700/50 px-2 py-1 rounded text-xs border border-gray-600">
                                            {user.department || 'GERAL'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button 
                                            onClick={() => startEdit(user)}
                                            className="text-gray-400 hover:text-emerald-400 p-2 rounded-lg hover:bg-gray-700 transition"
                                            title="Editar Usuário"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(user.id, user.name)} 
                                            className="text-gray-400 hover:text-red-400 p-2 rounded-lg hover:bg-gray-700 transition" 
                                            title="Excluir Usuário"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {users.length === 0 && <div className="p-8 text-center text-gray-600">Nenhum usuário encontrado.</div>}
                </div>
            )}
        </div>

      </div>
    </div>
  );
}