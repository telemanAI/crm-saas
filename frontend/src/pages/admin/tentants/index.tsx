import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout';
import axios from '../../../lib/axios';
import {
  MagnifyingGlass,
  Trash,
  Eye,
  PencilSimple,
  Plus,
  Warning,
  Users,
  FileText,
  UserCircle,
  ShieldCheck,
  Power,
} from 'phosphor-react';

export default function SuperAdminTenantsPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'soft' | 'hard'>('soft');

  useEffect(() => {
    loadTenants();
  }, [search]);

  const loadTenants = async () => {
    try {
      const response = await axios.get('/api/admin/tenants', {
        params: { search },
      });
      setTenants(response.data.tenants);
    } catch (error) {
      console.error('Errore caricamento negozi:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTenant = async () => {
    if (!selectedTenant) return;

    try {
      await axios.delete(`/api/admin/tenants/${selectedTenant.id}`, {
        params: { mode: deleteMode },
      });
      alert(
        `Negozio ${deleteMode === 'soft' ? 'disabilitato' : 'eliminato definitivamente'} con successo`,
      );
      setShowDeleteModal(false);
      setSelectedTenant(null);
      loadTenants();
    } catch (error) {
      alert('Errore durante l\'eliminazione: ' + error.response?.data?.message);
    }
  };

  const filteredTenants = tenants.filter(
    (t: any) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email?.toLowerCase().includes(search.toLowerCase()) ||
      t.businessCode?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <SuperAdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-indigo-600" weight="fill" />
              Gestione Negozi
            </h1>
            <p className="text-gray-600 mt-1">
              Amministra tutti i negozi della piattaforma
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/tenants/new')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" weight="bold" />
            <span>Nuovo Negozio</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per nome, email o codice negozio..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Totale Negozi</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">
              {tenants.length}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Attivi</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {tenants.filter((t: any) => t.isActive).length}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Disabilitati</div>
            <div className="text-2xl font-bold text-red-600 mt-1">
              {tenants.filter((t: any) => !t.isActive).length}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600">Nuovi (7gg)</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {
                tenants.filter(
                  (t: any) =>
                    new Date(t.createdAt) >
                    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                ).length
              }
            </div>
          </div>
        </div>

        {/* Tenants List */}
        <div className="space-y-4">
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
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Avatar */}
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                      {tenant.name.charAt(0)}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
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

                      <div className="space-y-1 text-sm text-gray-600">
                        <p className="flex items-center gap-2">
                          <span className="font-medium">Email:</span>
                          <span>{tenant.email || 'N/D'}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <span className="font-medium">Codice:</span>
                          <span>{tenant.businessCode || 'N/D'}</span>
                        </p>
                        <p className="flex items-center gap-2">
                          <UserCircle className="w-4 h-4" />
                          <span className="font-medium">Fondatore:</span>
                          <span>
                            {tenant.createdBy?.name || tenant.createdBy?.email || 'N/D'}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500">
                          Creato il:{' '}
                          {new Date(tenant.createdAt).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" weight="fill" />
                      <span>Dettagli</span>
                    </button>

                    <button
                      onClick={() =>
                        router.push(`/admin/tenants/${tenant.id}/imports`)
                      }
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" weight="fill" />
                      <span>Import</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedTenant(tenant);
                        setShowDeleteModal(true);
                      }}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Trash className="w-4 h-4" weight="fill" />
                      <span>Elimina</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && selectedTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <Warning className="w-8 h-8 text-red-600" weight="fill" />
              <h2 className="text-xl font-bold text-gray-900">
                Elimina Negozio
              </h2>
            </div>

            <p className="text-gray-700 mb-4">
              Stai per eliminare <strong>{selectedTenant.name}</strong>. Scegli la
              modalità:
            </p>

            <div className="space-y-3 mb-6">
              <label className="flex items-start space-x-3 cursor-pointer p-3 border-2 border-gray-200 rounded-lg hover:border-yellow-500 transition-colors">
                <input
                  type="radio"
                  name="deleteMode"
                  checked={deleteMode === 'soft'}
                  onChange={() => setDeleteMode('soft')}
                  className="mt-1"
                />
                <div>
                  <p className="font-semibold text-gray-900">
                    Disabilita (Soft Delete)
                  </p>
                  <p className="text-sm text-gray-600">
                    Il negozio viene disattivato ma i dati restano. Può essere
                    riattivato.
                  </p>
                </div>
              </label>

              <label className="flex items-start space-x-3 cursor-pointer p-3 border-2 border-red-200 rounded-lg hover:border-red-500 transition-colors">
                <input
                  type="radio"
                  name="deleteMode"
                  checked={deleteMode === 'hard'}
                  onChange={() => setDeleteMode('hard')}
                  className="mt-1"
                />
                <div>
                  <p className="font-semibold text-red-900">
                    Elimina Definitivamente (Hard Delete)
                  </p>
                  <p className="text-sm text-red-600">
                    ⚠️ ATTENZIONE: Elimina TUTTI i dati (clienti, pratiche, utenti).
                    IRREVERSIBILE.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedTenant(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleDeleteTenant}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                {deleteMode === 'soft' ? 'Disabilita' : 'Elimina Definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}