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
  const [configModal, setConfigModal] = useState<{ open: boolean; tenant: any | null }>({ open: false, tenant: null });
  const [tenantConfig, setTenantConfig] = useState({ enableWashStep: false, enableAdditionalPackages: true });
  const [savingConfig, setSavingConfig] = useState(false);
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

  // Disattiva/Riattiva negozio (soft)
  const toggleTenantStatus = async (tenantId: string, tenantName: string, isActive: boolean) => {
    const action = isActive ? 'disattivare' : 'riattivare';
    if (!confirm(`Sei sicuro di voler ${action} "${tenantName}"?`)) {
      return;
    }
    
    try {
      if (isActive) {
        await api.delete(`/admin/tenants/${tenantId}`);
      } else {
        await api.put(`/admin/tenants/${tenantId}/reactivate`);
      }
      fetchTenants();
    } catch (error: any) {
      console.error('Errore:', error);
      alert(error.response?.data?.message || 'Errore durante l\'operazione');
    }
  };

  // Elimina definitivamente (hard delete)
  const hardDeleteTenant = async (tenantId: string, tenantName: string) => {
    if (!confirm(`⚠️ ATTENZIONE: Stai per ELIMINARE DEFINITIVAMENTE "${tenantName}".\n\nTutti i dati verranno persi!\n\nSei sicuro?`)) {
      return;
    }
    if (!confirm(`CONFERMA FINALE: Scrivi SI per eliminare definitivamente "${tenantName}"`)) {
      return;
    }
    
    try {
      await api.delete(`/admin/tenants/${tenantId}/permanent`);
      alert('Negozio eliminato definitivamente');
      fetchTenants();
    } catch (error: any) {
      console.error('Errore eliminazione:', error);
      alert(error.response?.data?.message || 'Errore durante l\'eliminazione');
    }
  };

  // Apri modal configurazione
  const openConfigModal = async (tenant: any) => {
    setConfigModal({ open: true, tenant });
    try {
      const response = await api.get(`/tenants/${tenant.id}/config`);
      setTenantConfig(response.data);
    } catch (error) {
      console.error('Errore caricamento config:', error);
      setTenantConfig({ enableWashStep: false, enableAdditionalPackages: true });
    }
  };

  // Salva configurazione
  const saveConfig = async () => {
    if (!configModal.tenant) return;
    setSavingConfig(true);
    try {
      await api.put(`/tenants/${configModal.tenant.id}/config`, tenantConfig);
      alert('Configurazione salvata!');
      setConfigModal({ open: false, tenant: null });
    } catch (error: any) {
      console.error('Errore salvataggio:', error);
      alert(error.response?.data?.message || 'Errore durante il salvataggio');
    } finally {
      setSavingConfig(false);
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
        <Link href="/admin/imports" className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded text-white font-medium transition-colors">
          📥 Import Control Center
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
                  <td className="p-4 flex gap-3 flex-wrap">
                    <button 
                      onClick={() => enterTenantCRM(tenant.id)} 
                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded transition-colors font-medium text-sm shadow-lg"
                    >
                      Entra nel CRM
                    </button>
                    <button 
                      onClick={() => openConfigModal(tenant)} 
                      className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded transition-colors font-medium text-sm shadow-lg"
                    >
                      ⚙️ Configura
                    </button>
                    <button 
                      onClick={() => toggleTenantStatus(tenant.id, tenant.name, tenant.isActive)} 
                      className={`${tenant.isActive ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-green-600 hover:bg-green-500'} text-white px-4 py-2 rounded transition-colors font-medium text-sm shadow-lg`}
                    >
                      {tenant.isActive ? 'Disattiva' : 'Riattiva'}
                    </button>
                    <button 
                      onClick={() => hardDeleteTenant(tenant.id, tenant.name)} 
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
	  
      {/* Modal Configurazione Negozio */}
      {configModal.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">
              ⚙️ Configura Negozio
            </h2>
            <p className="text-gray-400 mb-6">{configModal.tenant?.name}</p>

            <div className="space-y-4">
              {/* Toggle Pacchetti Aggiuntivi */}
              <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-white font-medium">Pacchetti Aggiuntivi SKY</p>
                  <p className="text-gray-400 text-sm">Mostra step pacchetti per offerte SKY TV</p>
                </div>
                <button
                  onClick={() => setTenantConfig(prev => ({ ...prev, enableAdditionalPackages: !prev.enableAdditionalPackages }))}
                  className={`w-14 h-8 rounded-full transition-colors ${
                    tenantConfig.enableAdditionalPackages ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full transition-transform ${
                    tenantConfig.enableAdditionalPackages ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Toggle WASH */}
              <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-white font-medium">Step WASH</p>
                  <p className="text-gray-400 text-sm">Abilita gestione WASH per offerte SKY TV</p>
                </div>
                <button
                  onClick={() => setTenantConfig(prev => ({ ...prev, enableWashStep: !prev.enableWashStep }))}
                  className={`w-14 h-8 rounded-full transition-colors ${
                    tenantConfig.enableWashStep ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  <div className={`w-6 h-6 bg-white rounded-full transition-transform ${
                    tenantConfig.enableWashStep ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setConfigModal({ open: false, tenant: null })}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={saveConfig}
                disabled={savingConfig}
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors disabled:opacity-50"
              >
                {savingConfig ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}