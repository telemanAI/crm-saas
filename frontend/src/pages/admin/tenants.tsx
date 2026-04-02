import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '../../components/layout/Layout'; // ✅ CORRETTO: Layout invece di SuperAdminLayout
import axios from '../../lib/axios';
import {
  MagnifyingGlass,
  CaretDown,
  CaretUp,
  Trash,
  Upload,
  Download,
  Power,
  ShieldCheck,
  Envelope,
  Key,
  IdentificationCard,
  Users as UsersIcon,
} from 'phosphor-react';

export default function TenantsManagementPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<any[]>([]); // ✅ AGGIUNTO: tipo any[]
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);
  const [tenantDetails, setTenantDetails] = useState<any>({});

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const response = await axios.get('/api/super-admin/tenants');
      setTenants(response.data.tenants);
    } catch (error) {
      console.error('Errore caricamento negozi:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTenantDetails = async (tenantId: string) => {
    if (tenantDetails[tenantId]) return; // Già caricato

    try {
      const response = await axios.get(`/api/super-admin/tenants/${tenantId}`);
      setTenantDetails({
        ...tenantDetails,
        [tenantId]: response.data.tenant,
      });
    } catch (error) {
      console.error('Errore caricamento dettagli:', error);
    }
  };

  const toggleExpand = (tenantId: string) => {
    if (expandedTenant === tenantId) {
      setExpandedTenant(null);
    } else {
      setExpandedTenant(tenantId);
      loadTenantDetails(tenantId);
    }
  };

  const handleDeleteTenant = async (tenantId: string, tenantName: string) => {
    const mode = confirm(
      `ATTENZIONE!\n\nCome vuoi eliminare "${tenantName}"?\n\nOK = Disabilita (reversibile)\nAnnulla poi conferma = Elimina TUTTO (irreversibile)`
    )
      ? 'soft'
      : confirm('SICURO di voler ELIMINARE DEFINITIVAMENTE tutti i dati?')
      ? 'hard'
      : null;

    if (!mode) return;

    try {
      await axios.delete(`/api/super-admin/tenants/${tenantId}`, {
        params: { mode },
      });
      alert(`Negozio ${mode === 'soft' ? 'disabilitato' : 'eliminato'} con successo`);
      loadTenants();
    } catch (error: any) {
      alert('Errore: ' + error.response?.data?.message);
    }
  };

  const handleToggleActive = async (tenantId: string, currentStatus: boolean) => {
    try {
      await axios.put(`/api/super-admin/tenants/${tenantId}`, {
        isActive: !currentStatus,
      });
      loadTenants();
    } catch (error: any) {
      alert('Errore: ' + error.response?.data?.message);
    }
  };

  const filteredTenants = tenants.filter(
    (t: any) =>
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.email?.toLowerCase().includes(search.toLowerCase()) ||
      t.businessCode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout> {/* ✅ CORRETTO: Layout invece di SuperAdminLayout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-indigo-600" weight="fill" />
            Gestione Negozi ({tenants.length})
          </h1>
          <p className="text-gray-600 mt-1">
            Amministra tutti i negozi della piattaforma
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl border-2 border-indigo-200 p-4 mb-6">
          <div className="relative">
            <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Cerca per nome negozio, email o codice..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg"
            />
          </div>
        </div>

        {/* Tenants List */}
        <div className="space-y-3">
          {loading ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Caricamento...</p>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-600">Nessun negozio trovato</p>
            </div>
          ) : (
            filteredTenants.map((tenant: any) => (
              <div
                key={tenant.id}
                className="bg-white rounded-lg border-2 border-gray-200 hover:border-indigo-300 transition-all"
              >
                {/* Header Row */}
                <div className="p-4 flex items-center justify-between">
                  {/* Info Base */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xl font-bold">
                      {tenant.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          {tenant.name}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            tenant.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {tenant.isActive ? 'Attivo' : 'Disabilitato'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {tenant.email || 'N/D'} • Codice: {tenant.businessCode || 'N/D'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/admin/imports?tenantId=${tenant.id}`)}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-1"
                      title="Import per questo negozio"
                    >
                      <Upload className="w-4 h-4" weight="fill" />
                      <span>Import</span>
                    </button>

                    <button
                      onClick={() => router.push(`/admin/exports?tenantId=${tenant.id}`)}
                      className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-1"
                      title="Export dati negozio"
                    >
                      <Download className="w-4 h-4" weight="fill" />
                      <span>Export</span>
                    </button>

                    <button
                      onClick={() => handleToggleActive(tenant.id, tenant.isActive)}
                      className={`px-3 py-2 ${
                        tenant.isActive
                          ? 'bg-orange-600 hover:bg-orange-700'
                          : 'bg-green-600 hover:bg-green-700'
                      } text-white rounded-lg text-sm font-medium flex items-center gap-1`}
                      title={tenant.isActive ? 'Disattiva' : 'Attiva'}
                    >
                      <Power className="w-4 h-4" weight="fill" />
                    </button>

                    <button
                      onClick={() => handleDeleteTenant(tenant.id, tenant.name)}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-1"
                      title="Elimina negozio"
                    >
                      <Trash className="w-4 h-4" weight="fill" />
                    </button>

                    <button
                      onClick={() => toggleExpand(tenant.id)}
                      className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium flex items-center gap-1"
                    >
                      {expandedTenant === tenant.id ? (
                        <>
                          <CaretUp className="w-4 h-4" weight="fill" />
                          <span>Chiudi</span>
                        </>
                      ) : (
                        <>
                          <CaretDown className="w-4 h-4" weight="fill" />
                          <span>Dettagli</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedTenant === tenant.id && tenantDetails[tenant.id] && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* Email */}
                      <div className="flex items-center gap-3">
                        <Envelope className="w-5 h-5 text-indigo-600" weight="fill" />
                        <div>
                          <p className="text-xs text-gray-600">Email Negozio</p>
                          <p className="font-medium text-gray-900">
                            {tenantDetails[tenant.id].email || 'N/D'}
                          </p>
                        </div>
                      </div>

                      {/* Codice */}
                      <div className="flex items-center gap-3">
                        <IdentificationCard className="w-5 h-5 text-indigo-600" weight="fill" />
                        <div>
                          <p className="text-xs text-gray-600">Codice Negozio</p>
                          <p className="font-medium text-gray-900">
                            {tenantDetails[tenant.id].businessCode || 'N/D'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Utenti */}
                    <div className="mt-4">
                      <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <UsersIcon className="w-5 h-5 text-indigo-600" weight="fill" />
                        Utenti ({tenantDetails[tenant.id].users?.length || 0})
                      </h4>
                      <div className="space-y-2">
                        {tenantDetails[tenant.id].users?.map((user: any) => (
                          <div
                            key={user.id}
                            className="bg-white rounded-lg p-3 border border-gray-200"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-gray-900">{user.name}</p>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                      user.role === 'FOUNDER'
                                        ? 'bg-purple-100 text-purple-800'
                                        : user.role === 'ADMIN'
                                        ? 'bg-indigo-100 text-indigo-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}
                                  >
                                    {user.role}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                                  <Envelope className="w-4 h-4" />
                                  {user.email}
                                </p>
                              </div>
                              <button
                                onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium"
                              >
                                Gestisci
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </Layout> // ✅ CHIUSURA CORRETTA
  );
}