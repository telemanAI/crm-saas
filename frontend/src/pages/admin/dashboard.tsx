import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api';
import api from '@/lib/axios';
import Link from 'next/link';

export default function AdminDashboard() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user, token, isAuthenticated, setImpersonate } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN')) {
      router.push('/login');
      return;
    }
    fetchTenants();
  }, [isAuthenticated, user, router]);

  const fetchTenants = async () => {
    if (!token) return;
    try {
      const response = await api.get('/tenants');
      setTenants(response.data);
    } catch (error) {
      console.error('Errore:', error);
    } finally {
      setLoading(false);
    }
  };

  const enterTenantCRM = async (tenantId: string) => {
    try {
      const response = await authApi.impersonate(tenantId);
      if (response.access_token) {
        setImpersonate(response.user, response.access_token);
        router.push('/operator/dashboard');
      } else {
        alert('Errore durante l\'accesso al CRM');
      }
    } catch (error: any) {
      console.error('Errore impersonate:', error);
      alert(error.message || 'Errore durante l\'accesso al CRM');
    }
  };

  const deleteTenant = async (tenantId: string, tenantName: string) => {
    if (!confirm(`Sei sicuro di voler eliminare "${tenantName}"? Questa azione è irreversibile.`)) {
      return;
    }
    
    try {
      await api.delete(`/admin/tenants/${tenantId}`);
      alert('Negozio eliminato con successo');
      fetchTenants();
    } catch (error: any) {
      console.error('Errore eliminazione:', error);
      alert(error.response?.data?.message || 'Errore durante l\'eliminazione');
    }
  };

  if (loading) return <div className="p-8 text-white text-lg">Caricamento...</div>;

  return (
    <div className="p-8 bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-white">Super Admin Dashboard</h1>
      
      <div className="flex gap-4 mb-6">
        <Link href="/admin/offers" className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded text-white font-medium transition-colors">
          📋 Gestione Offerte
        </Link>
      </div>

      <p className="mb-6 text-gray-200 text-lg">
        Benvenuto, <span className="text-white font-semibold">{user?.firstName} {user?.lastName}</span>
      </p>
      
      {tenants.length === 0 ? (
        <p className="text-gray-300 text-lg">Nessun negozio registrato.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-700 bg-gray-800 shadow-xl">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-700 border-b border-gray-600">
                <th className="p-4 text-left text-white font-bold uppercase text-sm tracking-wide">Negozio</th>
                <th className="p-4 text-left text-white font-bold uppercase text-sm tracking-wide">Codice</th>
                <th className="p-4 text-left text-white font-bold uppercase text-sm tracking-wide">Stato</th>
                <th className="p-4 text-left text-white font-bold uppercase text-sm tracking-wide">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {tenants.map((tenant: any) => (
                <tr key={tenant.id} className="hover:bg-gray-700/50 transition-colors bg-gray-800">
                  <td className="p-4 text-white font-medium text-base">{tenant.name}</td>
                  <td className="p-4 text-gray-300 font-mono text-sm">{tenant.subscriptionCode}</td>
                  <td className="p-4">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                      tenant.isActive 
                        ? 'bg-green-600 text-white' 
                        : 'bg-red-600 text-white'
                    }`}>
                      {tenant.isActive ? 'Attivo' : 'Disattivato'}
                    </span>
                  </td>
                  <td className="p-4 flex gap-3">
                    <button 
                      onClick={() => enterTenantCRM(tenant.id)} 
                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded transition-colors font-medium text-sm shadow-lg"
                    >
                      Entra nel CRM
                    </button>
                    <button 
                      onClick={() => deleteTenant(tenant.id, tenant.name)} 
                      className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded transition-colors font-medium text-sm shadow-lg"
                    >
                      Elimina
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}