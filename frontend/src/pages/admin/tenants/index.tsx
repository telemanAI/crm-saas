import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';
import Link from 'next/link';
import { Layout } from '../../../components/layout/Layout';
import {
  Buildings,
  MagnifyingGlass,
  Plus,
  Eye,
  Gear,
  Power,
  Trash,
} from 'phosphor-react';

export default function TenantsListPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTenant, setSearchTenant] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'SUPER_ADMIN') {
      router.push('/login');
      return;
    }
    loadTenants();
  }, [isAuthenticated, user]);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/tenants');
      setTenants(response.data || []);
    } catch (error) {
      console.error('Errore caricamento tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTenantStatus = async (tenantId: string, tenantName: string, isActive: boolean) => {
    const action = isActive ? 'disattivare' : 'riattivare';
    if (!confirm(`Sei sicuro di voler ${action} "${tenantName}"?`)) return;
    
    try {
      if (isActive) {
        await api.delete(`/api/admin/tenants/${tenantId}`);
      } else {
        await api.put(`/api/admin/tenants/${tenantId}/reactivate`);
      }
      loadTenants();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Errore durante l\'operazione');
    }
  };

  const hardDeleteTenant = async (tenantId: string, tenantName: string) => {
    if (!confirm(`⚠️ ATTENZIONE: Stai per ELIMINARE DEFINITIVAMENTE "${tenantName}".\n\nTutti i dati verranno persi!\n\nSei sicuro?`)) return;
    const confirmText = prompt(`Scrivi "ELIMINA" in maiuscolo per confermare l'eliminazione di "${tenantName}"`);
    if (confirmText !== 'ELIMINA') {
      alert('Eliminazione annullata');
      return;
    }
    
    try {
      await api.delete(`/api/admin/tenants/${tenantId}/permanent`);
      alert('Negozio eliminato definitivamente');
      loadTenants();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Errore durante l\'eliminazione');
    }
  };

  // Filtro tenants
  const filteredTenants = tenants.filter((tenant: any) => {
    const matchesSearch = 
      tenant.name?.toLowerCase().includes(searchTenant.toLowerCase()) ||
      tenant.email?.toLowerCase().includes(searchTenant.toLowerCase()) ||
      tenant.subscriptionCode?.toLowerCase().includes(searchTenant.toLowerCase());
    
    const matchesStatus = 
      filterStatus === 'all' || 
      (filterStatus === 'active' && tenant.isActive) ||
      (filterStatus === 'inactive' && !tenant.isActive);

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Caricamento negozi...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Buildings className="w-8 h-8 text-indigo-600" weight="fill" />
              Gestione Negozi
            </h1>
            <p className="text-gray-600 mt-1">
              Visualizza e gestisci tutti i negozi della piattaforma
            </p>
          </div>
          <Link href="/admin/dashboard">
            <button className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors">
              ← Torna alla Dashboard
            </button>
          </Link>
        </div>

        {/* Filtri e Ricerca */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ricerca */}
            <div className="relative">
              <MagnifyingGlass className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cerca per nome, email o codice..."
                value={searchTenant}
                onChange={(e) => setSearchTenant(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Filtro Stato */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tutti ({tenants.length})
              </button>
              <button
                onClick={() => setFilterStatus('active')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === 'active'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Attivi ({tenants.filter((t: any) => t.isActive).length})
              </button>
              <button
                onClick={() => setFilterStatus('inactive')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === 'inactive'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Disattivi ({tenants.filter((t: any) => !t.isActive).length})
              </button>
            </div>
          </div>
        </div>

        {/* Tabella Tenants */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {filteredTenants.length === 0 ? (
            <div className="p-12 text-center text-gray-600">
              {searchTenant || filterStatus !== 'all' 
                ? 'Nessun negozio trovato con i filtri selezionati' 
                : 'Nessun negozio registrato.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase">Negozio</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase">Codice</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase">Stato</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase">Data Creazione</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTenants.map((tenant: any) => (
                    <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <Buildings className="w-6 h-6 text-indigo-600" weight="fill" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-gray-900">{tenant.name}</div>
                            <div className="text-xs text-gray-500">{tenant.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {tenant.subscriptionCode}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                          tenant.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${tenant.isActive ? 'bg-green-600' : 'bg-red-600'}`} />
                          {tenant.isActive ? 'Attivo' : 'Disattivato'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">
                          {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString('it-IT') : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 flex-wrap">
                          <Link href={`/admin/tenants/${tenant.id}`}>
                            <button 
                              className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                              title="Visualizza dettagli"
                            >
                              <Eye className="w-4 h-4" weight="fill" />
                              Dettagli
                            </button>
                          </Link>
                          <button 
                            onClick={() => toggleTenantStatus(tenant.id, tenant.name, tenant.isActive)} 
                            className={`inline-flex items-center gap-1 ${tenant.isActive 
                              ? 'bg-yellow-500 hover:bg-yellow-600' 
                              : 'bg-green-500 hover:bg-green-600'} text-white px-3 py-1.5 rounded text-sm font-medium transition-colors`}
                            title={tenant.isActive ? 'Disattiva negozio' : 'Riattiva negozio'}
                          >
                            <Power className="w-4 h-4" weight="fill" />
                            {tenant.isActive ? 'Disattiva' : 'Riattiva'}
                          </button>
                          <button 
                            onClick={() => hardDeleteTenant(tenant.id, tenant.name)} 
                            className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                            title="Elimina definitivamente"
                          >
                            <Trash className="w-4 h-4" weight="fill" />
                            Elimina
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}