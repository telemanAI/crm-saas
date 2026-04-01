import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api';
import api from '@/lib/axios';
import Link from 'next/link';
import SuperAdminLayout from '../../components/layout/Layout';
import {
  Building,
  Users,
  FileText,
  ChartBar,
  Warning,
  TrendUp,
  Clock,
  CheckCircle,
} from 'phosphor-react';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, token, isAuthenticated, setImpersonate } = useAuthStore();
  
  // Stats globali
  const [stats, setStats] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState([]);
  
  // Gestione tenants
  const [tenants, setTenants] = useState([]);
  const [configModal, setConfigModal] = useState<{ open: boolean; tenant: any | null }>({ 
    open: false, 
    tenant: null 
  });
  const [tenantConfig, setTenantConfig] = useState({ 
    enableWashStep: false, 
    enableAdditionalPackages: true 
  });
  
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || (user?.role !== 'SUPER_ADMIN' && user?.role !== 'ADMIN')) {
      router.push('/login');
      return;
    }
    loadDashboardData();
  }, [isAuthenticated, user, router]);

  const loadDashboardData = async () => {
    if (!token) return;
    setLoading(true);
    
    try {
      // Carica stats globali e tenants in parallelo
      const [statsRes, tenantsRes, activityRes] = await Promise.all([
        api.get('/api/super-admin/stats').catch(() => null),
        api.get('/tenants'),
        api.get('/api/super-admin/activity/recent').catch(() => null)
      ]);

      setStats(statsRes?.data || {
        totalTenants: 0,
        activeTenants: 0,
        totalUsers: 0,
        totalPractices: 0,
        totalCustomers: 0,
        recentImports: 0,
      });
      
      setTenants(tenantsRes.data || []);
      setRecentActivity(activityRes?.data?.activities || []);
    } catch (error) {
      console.error('Errore caricamento dashboard:', error);
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

  const toggleTenantStatus = async (tenantId: string, tenantName: string, isActive: boolean) => {
    const action = isActive ? 'disattivare' : 'riattivare';
    if (!confirm(`Sei sicuro di voler ${action} "${tenantName}"?`)) return;
    
    try {
      if (isActive) {
        await api.delete(`/admin/tenants/${tenantId}`);
      } else {
        await api.put(`/admin/tenants/${tenantId}/reactivate`);
      }
      loadDashboardData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Errore durante l\'operazione');
    }
  };

  const hardDeleteTenant = async (tenantId: string, tenantName: string) => {
    if (!confirm(`⚠️ ATTENZIONE: Stai per ELIMINARE DEFINITIVAMENTE "${tenantName}".\n\nTutti i dati verranno persi!\n\nSei sicuro?`)) return;
    if (!confirm(`CONFERMA FINALE: Scrivi SI per eliminare definitivamente "${tenantName}"`)) return;
    
    try {
      await api.delete(`/admin/tenants/${tenantId}/permanent`);
      alert('Negozio eliminato definitivamente');
      loadDashboardData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Errore durante l\'eliminazione');
    }
  };

  const openConfigModal = async (tenant: any) => {
    setConfigModal({ open: true, tenant });
    try {
      const response = await api.get(`/tenants/${tenant.id}/config`);
      setTenantConfig(response.data);
    } catch (error) {
      setTenantConfig({ enableWashStep: false, enableAdditionalPackages: true });
    }
  };

  const saveConfig = async () => {
    if (!configModal.tenant) return;
    setSavingConfig(true);
    try {
      await api.put(`/tenants/${configModal.tenant.id}/config`, tenantConfig);
      alert('Configurazione salvata!');
      setConfigModal({ open: false, tenant: null });
    } catch (error: any) {
      alert(error.response?.data?.message || 'Errore durante il salvataggio');
    } finally {
      setSavingConfig(false);
    }
  };

  if (loading) {
    return (
      <SuperAdminLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Caricamento dashboard...</p>
          </div>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Super Admin</h1>
          <p className="text-gray-600">
            Benvenuto, <span className="font-semibold">{user?.firstName} {user?.lastName}</span> - 
            Panoramica generale della piattaforma
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Building className="w-10 h-10" weight="fill" />
              <TrendUp className="w-6 h-6" weight="bold" />
            </div>
            <p className="text-indigo-200 text-sm font-medium mb-1">Negozi Totali</p>
            <p className="text-4xl font-bold">{stats?.totalTenants || 0}</p>
            <p className="text-indigo-200 text-sm mt-2">{stats?.activeTenants || 0} attivi</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-10 h-10" weight="fill" />
              <TrendUp className="w-6 h-6" weight="bold" />
            </div>
            <p className="text-blue-200 text-sm font-medium mb-1">Utenti Totali</p>
            <p className="text-4xl font-bold">{stats?.totalUsers || 0}</p>
            <p className="text-blue-200 text-sm mt-2">Su tutti i negozi</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <FileText className="w-10 h-10" weight="fill" />
              <TrendUp className="w-6 h-6" weight="bold" />
            </div>
            <p className="text-green-200 text-sm font-medium mb-1">Pratiche Totali</p>
            <p className="text-4xl font-bold">{stats?.totalPractices || 0}</p>
            <p className="text-green-200 text-sm mt-2">Su tutta la piattaforma</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <ChartBar className="w-10 h-10" weight="fill" />
              <TrendUp className="w-6 h-6" weight="bold" />
            </div>
            <p className="text-purple-200 text-sm font-medium mb-1">Import Recenti</p>
            <p className="text-4xl font-bold">{stats?.recentImports || 0}</p>
            <p className="text-purple-200 text-sm mt-2">Ultimi 7 giorni</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/admin/imports">
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer">
              <ChartBar className="w-12 h-12 text-blue-600 mb-4" weight="fill" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Import Control</h3>
              <p className="text-gray-600 text-sm">
                Monitora importazioni Excel/CSV di tutti i negozi in tempo reale
              </p>
            </div>
          </Link>

          <Link href="/admin/offers">
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-indigo-500 hover:shadow-lg transition-all cursor-pointer">
              <Building className="w-12 h-12 text-indigo-600 mb-4" weight="fill" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Gestione Offerte</h3>
              <p className="text-gray-600 text-sm">
                Gestisci offerte e pacchetti disponibili per i negozi
              </p>
            </div>
          </Link>

          <button
            onClick={() => router.push('/admin/audit')}
            className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-purple-500 hover:shadow-lg transition-all text-left"
          >
            <Warning className="w-12 h-12 text-purple-600 mb-4" weight="fill" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Logs & Audit</h3>
            <p className="text-gray-600 text-sm">
              Visualizza log di sistema e attività degli utenti
            </p>
          </button>
        </div>

        {/* Tabella Tenants */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Building className="w-6 h-6 text-indigo-600" weight="fill" />
              Gestione Negozi ({tenants.length})
            </h2>
          </div>
          
          {tenants.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              Nessun negozio registrato.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase">Negozio</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase">Codice</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase">Stato</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 uppercase">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tenants.map((tenant: any) => (
                    <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">{tenant.name}</div>
                        <div className="text-xs text-gray-500">{tenant.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {tenant.subscriptionCode}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                          tenant.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {tenant.isActive ? 'Attivo' : 'Disattivato'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 flex-wrap">
                          <button 
                            onClick={() => enterTenantCRM(tenant.id)} 
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                          >
                            Entra nel CRM
                          </button>
                          <button 
                            onClick={() => openConfigModal(tenant)} 
                            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                          >
                            ⚙️ Configura
                          </button>
                          <button 
                            onClick={() => toggleTenantStatus(tenant.id, tenant.name, tenant.isActive)} 
                            className={`${tenant.isActive 
                              ? 'bg-yellow-500 hover:bg-yellow-600' 
                              : 'bg-green-500 hover:bg-green-600'} text-white px-3 py-1.5 rounded text-sm font-medium transition-colors`}
                          >
                            {tenant.isActive ? 'Disattiva' : 'Riattiva'}
                          </button>
                          <button 
                            onClick={() => hardDeleteTenant(tenant.id, tenant.name)} 
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                          >
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

        {/* Attività Recente */}
        {recentActivity.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6 text-indigo-600" weight="fill" />
              Attività Recente
            </h2>
            <div className="space-y-3">
              {recentActivity.map((activity: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" weight="fill" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleString('it-IT')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal Configurazione Negozio */}
      {configModal.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">⚙️ Configura Negozio</h2>
            <p className="text-gray-400 mb-6">{configModal.tenant?.name}</p>

            <div className="space-y-4">
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
    </SuperAdminLayout>
  );
}
