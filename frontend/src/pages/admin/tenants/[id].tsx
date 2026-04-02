import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';
import Link from 'next/link';
import { Layout } from '../../../components/layout/Layout';
import {
  Buildings,
  Users,
  FileText,
  ArrowLeft,
  UserCircle,
  ShieldCheck,
  Pencil,
  CheckCircle,
  XCircle,
} from 'phosphor-react';

export default function TenantDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isAuthenticated } = useAuthStore();
  
  const [tenant, setTenant] = useState<any>(null);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>('');

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'SUPER_ADMIN') {
      router.push('/login');
      return;
    }
    if (id) {
      loadTenantDetails();
    }
  }, [isAuthenticated, user, id]);

  const loadTenantDetails = async () => {
    setLoading(true);
    try {
      const [tenantRes, usersRes] = await Promise.all([
        api.get(`/api/admin/tenants/${id}`),
        api.get(`/api/admin/tenants/${id}/users`),
      ]);

      setTenant(tenantRes.data.tenant || tenantRes.data);
      setStats(tenantRes.data.stats || {});
      setUsers(usersRes.data.users || usersRes.data || []);
    } catch (error) {
      console.error('Errore caricamento dettagli tenant:', error);
      alert('Errore durante il caricamento dei dettagli');
      router.push('/admin/tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (userId: string, currentRole: string) => {
    setEditingUserId(userId);
    setNewRole(currentRole);
  };

  const saveRoleChange = async (userId: string) => {
    if (!newRole) return;

    try {
      await api.put(`/api/admin/users/${userId}/role`, { role: newRole });
      alert('Ruolo aggiornato con successo!');
      setEditingUserId(null);
      loadTenantDetails();
    } catch (error: any) {
      console.error('Errore cambio ruolo:', error);
      alert(error.response?.data?.message || 'Errore durante il cambio ruolo');
    }
  };

  const cancelRoleChange = () => {
    setEditingUserId(null);
    setNewRole('');
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'FOUNDER':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'OPERATOR':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'FOUNDER':
        return '👑 Founder';
      case 'ADMIN':
        return '🛡️ Admin';
      case 'OPERATOR':
        return '👤 Operatore';
      default:
        return role;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Caricamento dettagli...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!tenant) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-gray-600">Negozio non trovato</p>
            <Link href="/admin/tenants">
              <button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg">
                Torna alla lista
              </button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/tenants">
            <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
              <ArrowLeft className="w-5 h-5" />
              Torna ai Negozi
            </button>
          </Link>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Buildings className="w-10 h-10 text-indigo-600" weight="fill" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{tenant.name}</h1>
                <p className="text-gray-600">{tenant.email}</p>
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mt-2 ${
                  tenant.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${tenant.isActive ? 'bg-green-600' : 'bg-red-600'}`} />
                  {tenant.isActive ? 'Attivo' : 'Disattivato'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <Users className="w-10 h-10 mb-4" weight="fill" />
            <p className="text-blue-100 text-sm font-medium mb-1">Utenti Totali</p>
            <p className="text-4xl font-bold">{stats?.totalUsers || users.length}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
            <FileText className="w-10 h-10 mb-4" weight="fill" />
            <p className="text-green-100 text-sm font-medium mb-1">Pratiche</p>
            <p className="text-4xl font-bold">{stats?.totalPractices || 0}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <UserCircle className="w-10 h-10 mb-4" weight="fill" />
            <p className="text-purple-100 text-sm font-medium mb-1">Clienti</p>
            <p className="text-4xl font-bold">{stats?.totalCustomers || 0}</p>
          </div>
        </div>

        {/* Gestione Utenti */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-indigo-600" weight="fill" />
              Gestione Utenti e Ruoli ({users.length})
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Come Super Admin puoi assegnare qualsiasi ruolo, incluso FOUNDER
            </p>
          </div>

          {users.length === 0 ? (
            <div className="p-12 text-center text-gray-600">
              Nessun utente trovato per questo negozio
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase">Utente</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase">Email</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase">Ruolo Attuale</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase">Stato</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((usr: any) => (
                    <tr key={usr.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {usr.firstName?.[0] || usr.email?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">
                              {usr.firstName} {usr.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">{usr.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        {editingUserId === usr.id ? (
                          <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="px-3 py-1 border-2 border-indigo-500 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-600"
                          >
                            <option value="OPERATOR">👤 Operatore</option>
                            <option value="ADMIN">🛡️ Admin</option>
                            <option value="FOUNDER">👑 Founder</option>
                          </select>
                        ) : (
                          <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold border-2 ${getRoleBadgeColor(usr.role)}`}>
                            {getRoleLabel(usr.role)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                          usr.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {usr.isActive ? 'Attivo' : 'Disattivato'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {editingUserId === usr.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveRoleChange(usr.id)}
                              className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" weight="fill" />
                              Salva
                            </button>
                            <button
                              onClick={cancelRoleChange}
                              className="inline-flex items-center gap-1 bg-gray-500 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                            >
                              <XCircle className="w-4 h-4" weight="fill" />
                              Annulla
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleChangeRole(usr.id, usr.role)}
                            className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                          >
                            <Pencil className="w-4 h-4" weight="fill" />
                            Cambia Ruolo
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
          <h3 className="font-bold text-blue-900 mb-2">ℹ️ Informazioni sui Ruoli</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li><strong>👑 FOUNDER:</strong> Può essere assegnato solo dal Super Admin. Ha accesso completo al negozio.</li>
            <li><strong>🛡️ ADMIN:</strong> Può gestire utenti, pratiche e configurazioni del negozio.</li>
            <li><strong>👤 OPERATORE:</strong> Può gestire pratiche e clienti, ma non può modificare configurazioni.</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}