import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api';

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
      const res = await fetch('/tenants', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Errore nel caricamento');
      const data = await res.json();
      setTenants(data);
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

  if (loading) return <div className="p-8">Caricamento...</div>;

  return (
    <div className="p-8 bg-gray-900 text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Super Admin Dashboard</h1>
      <p className="mb-4">Benvenuto, {user?.firstName} {user?.lastName}</p>
      
      {tenants.length === 0 ? (
        <p>Nessun negozio registrato.</p>
      ) : (
        <table className="w-full border border-gray-700">
          <thead className="bg-gray-800">
            <tr>
              <th className="p-2 text-left">Negozio</th>
              <th className="p-2 text-left">Codice</th>
              <th className="p-2 text-left">Stato</th>
              <th className="p-2 text-left">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant: any) => (
              <tr key={tenant.id} className="border-b border-gray-700">
                <td className="p-2">{tenant.name}</td>
                <td className="p-2">{tenant.subscriptionCode}</td>
                <td className="p-2">{tenant.isActive ? 'Attivo' : 'Disattivato'}</td>
                <td className="p-2">
                  <button 
                    onClick={() => enterTenantCRM(tenant.id)} 
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded mr-2 transition-colors"
                  >
                    Entra nel CRM
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}