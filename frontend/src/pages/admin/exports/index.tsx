import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/stores/authStore';
import { Layout } from '../../../components/layout/Layout';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import axios from '../../../lib/axios';
import {
  Buildings,
  Download,
  FileText,
  Users,
  Calendar,
  FunnelSimple,
} from 'phosphor-react';

export default function SuperAdminExportsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [exportType, setExportType] = useState<'practices' | 'customers'>('practices');
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: [] as string[],
    type: [] as string[],
  });
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);

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
      const response = await axios.get('/api/tenants');
      setTenants(response.data || []);
    } catch (error) {
      console.error('Errore caricamento tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedTenant) {
      alert('Seleziona prima un negozio');
      return;
    }

    setExporting(true);
    try {
      const endpoint = exportType === 'practices' 
        ? `/api/admin/exports/${selectedTenant}/practices` 
        : `/api/admin/exports/${selectedTenant}/customers`;
      
      const response = await axios.post(
        endpoint,
        { filters, format },
        { responseType: 'blob' }
      );

      // Download file
      const selectedTenantData = tenants.find((t: any) => t.id === selectedTenant);
      const tenantName = selectedTenantData?.name || 'tenant';
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `export_${tenantName}_${exportType}_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      alert('Export completato con successo!');
    } catch (error) {
      console.error('Errore export:', error);
      alert('Errore durante l\'export. Verifica che il negozio abbia dati da esportare.');
    } finally {
      setExporting(false);
    }
  };

  const statusOptions = [
    { value: 'draft', label: 'Bozza' },
    { value: 'in_progress', label: 'In Lavorazione' },
    { value: 'completed', label: 'Completata' },
    { value: 'cancelled', label: 'Annullata' },
  ];

  const typeOptions = [
    { value: 'SKY', label: 'Sky' },
    { value: 'TIM_FIBRA', label: 'TIM Fibra' },
    { value: 'VODAFONE', label: 'Vodafone' },
    { value: 'WINDTRE', label: 'WindTre' },
    { value: 'ILIAD', label: 'Iliad' },
    { value: 'OPTIMA', label: 'Optima' },
    { value: 'IREN', label: 'Iren' },
  ];

  const toggleStatus = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter(s => s !== status)
        : [...prev.status, status]
    }));
  };

  const toggleType = (type: string) => {
    setFilters(prev => ({
      ...prev,
      type: prev.type.includes(type)
        ? prev.type.filter(t => t !== type)
        : [...prev.type, type]
    }));
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Caricamento...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Download className="w-8 h-8 text-green-600" weight="fill" />
            Export Dati Super Admin
          </h1>
          <p className="text-gray-600 mt-1">Esporta dati di qualsiasi negozio in Excel o CSV</p>
        </div>

        <Card className="p-8">
          <div className="space-y-6">
            {/* Selezione Tenant */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Buildings className="w-5 h-5 text-indigo-600" weight="fill" />
                Seleziona Negozio
              </label>
              <select
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-medium text-lg"
              >
                <option value="">-- Seleziona un Negozio --</option>
                {tenants.map((tenant: any) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} ({tenant.subscriptionCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Divisore */}
            {selectedTenant && (
              <>
                <div className="border-t-2 border-gray-200 my-6"></div>

                {/* Tipo Export */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Cosa vuoi esportare?
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setExportType('practices')}
                      className={`p-6 border-2 rounded-xl transition-all ${
                        exportType === 'practices'
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <FileText className="w-12 h-12 mx-auto mb-3 text-blue-600" weight="fill" />
                      <div className="font-bold text-lg">Pratiche</div>
                      <div className="text-sm text-gray-600 mt-1">Esporta tutte le pratiche</div>
                    </button>
                    <button
                      onClick={() => setExportType('customers')}
                      className={`p-6 border-2 rounded-xl transition-all ${
                        exportType === 'customers'
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <Users className="w-12 h-12 mx-auto mb-3 text-green-600" weight="fill" />
                      <div className="font-bold text-lg">Clienti</div>
                      <div className="text-sm text-gray-600 mt-1">Esporta anagrafica clienti</div>
                    </button>
                  </div>
                </div>

                {/* Formato */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Formato File
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setFormat('xlsx')}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        format === 'xlsx'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">📊</div>
                      <div className="font-semibold">Excel (.xlsx)</div>
                      <div className="text-xs text-gray-600">Formato completo con formattazione</div>
                    </button>
                    <button
                      onClick={() => setFormat('csv')}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        format === 'csv'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">📄</div>
                      <div className="font-semibold">CSV (.csv)</div>
                      <div className="text-xs text-gray-600">Formato compatibile universale</div>
                    </button>
                  </div>
                </div>

                {/* Filtri Avanzati */}
                <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FunnelSimple className="w-5 h-5 text-indigo-600" weight="fill" />
                    Filtri Avanzati (Opzionali)
                  </h3>

                  {/* Filtro Data */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" weight="fill" />
                      Periodo
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-600">Da</label>
                        <input
                          type="date"
                          value={filters.dateFrom}
                          onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">A</label>
                        <input
                          type="date"
                          value={filters.dateTo}
                          onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Filtro Stato (solo per pratiche) */}
                  {exportType === 'practices' && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stato Pratiche
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {statusOptions.map(option => (
                          <button
                            key={option.value}
                            onClick={() => toggleStatus(option.value)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              filters.status.includes(option.value)
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Filtro Tipo (solo per pratiche) */}
                  {exportType === 'practices' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo Pratica
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {typeOptions.map(option => (
                          <button
                            key={option.value}
                            onClick={() => toggleType(option.value)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                              filters.type.includes(option.value)
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Riepilogo */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <h4 className="font-bold text-blue-900 mb-2">📋 Riepilogo Export</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li><strong>Negozio:</strong> {tenants.find((t: any) => t.id === selectedTenant)?.name || '-'}</li>
                    <li><strong>Tipo:</strong> {exportType === 'practices' ? 'Pratiche' : 'Clienti'}</li>
                    <li><strong>Formato:</strong> {format.toUpperCase()}</li>
                    <li><strong>Filtri attivi:</strong> {
                      filters.status.length + filters.type.length + (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0) || 'Nessuno (export completo)'
                    }</li>
                  </ul>
                </div>

                {/* Pulsante Export */}
                <Button
                  onClick={handleExport}
                  disabled={exporting || !selectedTenant}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exporting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Generazione in corso...
                    </>
                  ) : (
                    <>
                      <Download className="w-6 h-6 mr-2" weight="fill" />
                      Scarica Export
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* Info Box */}
        <div className="mt-6 bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
          <h3 className="font-bold text-amber-900 mb-2">💡 Suggerimenti</h3>
          <ul className="text-sm text-amber-800 space-y-1">
            <li>• Seleziona prima il negozio da cui vuoi esportare i dati</li>
            <li>• Usa i filtri per esportare solo i dati che ti servono</li>
            <li>• Il formato Excel mantiene la formattazione e permette analisi avanzate</li>
            <li>• Il formato CSV è universale e importabile in qualsiasi sistema</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}