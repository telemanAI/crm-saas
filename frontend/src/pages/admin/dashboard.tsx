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

  // ? ENTRA NEL CRM DEL NEGOZIO
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

  // 🗑️ ELIMINA NEGOZIO
  const deleteTenant = async (tenantId: string, tenantName: string) => {
    if (!confirm(`Sei sicuro di voler eliminare "${tenantName}"? Questa azione è irreversibile.`)) {
      return;
    }
    
    try {
      await api.delete(`/admin/tenants/${tenantId}`);
      alert('Negozio eliminato con successo');
      fetchTenants(); // Ricarica la lista
    } catch (error: any) {
      console.error('Errore eliminazione:', error);
      alert(error.response?.data?.message || 'Errore durante l\'eliminazione');
    }
  };

  if (loading) return <div className="p-8 text-white">Caricamento...</div>;

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-white">Super Admin Dashboard</h1>
      <div className="flex gap-4 mb-6">
        <Link href="/admin/offers" className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded text-white">
          📋 Gestione Offerte
        </Link>
      </div>
      <p className="mb-4 text-gray-200">Benvenuto, {user?.firstName} {user?.lastName}</p>
      
      {tenants.length === 0 ? (
        <p className="text-gray-300">Nessun negozio registrato.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full border-collapse">
            <thead className="bg-gray-800">
              <tr>
                <th className="p-3 text-left text-gray-100 font-semibold border-b border-gray-600">Negozio</th>
                <th className="p-3 text-left text-gray-100 font-semibold border-b border-gray-600">Codice</th>
                <th className="p-3 text-left text-gray-100 font-semibold border-b border-gray-600">Stato</th>
                <th className="p-3 text-left text-gray-100 font-semibold border-b border-gray-600">Azioni</th>
              </tr>
            </thead>
            <tbody className="bg-gray-900">
              {tenants.map((tenant: any) => (
                <tr key={tenant.id} className="border-b border-gray-700 hover:bg-gray-800 transition-colors">
                  <td className="p-3 text-gray-100 font-medium">{tenant.name}</td>
                  <td className="p-3 text-gray-300 font-mono text-sm">{tenant.subscriptionCode}</td>
                  <td className="p-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      tenant.isActive 
                        ? 'bg-green-900 text-green-200 border border-green-700' 
                        : 'bg-red-900 text-red-200 border border-red-700'
                    }`}>
                      {tenant.isActive ? 'Attivo' : 'Disattivato'}
                    </span>
                  </td>
                  <td className="p-3 flex gap-2">
                    <button 
                      onClick={() => enterTenantCRM(tenant.id)} 
                      className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded transition-colors text-sm font-medium"
                    >
                      Entra nel CRM
                    </button>
                    <button 
                      onClick={() => deleteTenant(tenant.id, tenant.name)} 
                      className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded transition-colors text-sm font-medium"
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