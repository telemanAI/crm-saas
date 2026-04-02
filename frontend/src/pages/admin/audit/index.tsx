import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/stores/authStore';
import { Layout } from '../../../components/layout/Layout';
import { Card } from '../../../components/ui/Card';
import axios from '../../../lib/axios';
import {
  Warning,
  Info,
  CheckCircle,
  XCircle,
  MagnifyingGlass,
  Calendar,
  FunnelSimple,
  ArrowClockwise,
} from 'phosphor-react';

export default function AuditLogsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    level: 'all', // all, info, warning, error
    dateFrom: '',
    dateTo: '',
    tenantId: '',
  });
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'SUPER_ADMIN') {
      router.push('/login');
      return;
    }
    loadInitialData();
  }, [isAuthenticated, user]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [logsRes, tenantsRes] = await Promise.all([
        axios.get('/api/super-admin/audit').catch(() => ({ data: [] })),
        axios.get('/api/tenants').catch(() => ({ data: [] })),
      ]);
      setLogs(logsRes.data || []);
      setTenants(tenantsRes.data || []);
    } catch (error) {
      console.error('Errore caricamento logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshLogs = () => {
    loadInitialData();
  };

  const getLevelIcon = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" weight="fill" />;
      case 'warning':
        return <Warning className="w-5 h-5 text-yellow-600" weight="fill" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" weight="fill" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" weight="fill" />;
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'success':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  // Filtro logs
  const filteredLogs = logs.filter((log: any) => {
    const matchesSearch = 
      !filters.search ||
      log.message?.toLowerCase().includes(filters.search.toLowerCase()) ||
      log.action?.toLowerCase().includes(filters.search.toLowerCase()) ||
      log.user?.email?.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesLevel = 
      filters.level === 'all' || 
      log.level?.toLowerCase() === filters.level;

    const matchesTenant = 
      !filters.tenantId || 
      log.tenantId === filters.tenantId;

    const matchesDateFrom = 
      !filters.dateFrom || 
      new Date(log.timestamp) >= new Date(filters.dateFrom);

    const matchesDateTo = 
      !filters.dateTo || 
      new Date(log.timestamp) <= new Date(filters.dateTo);

    return matchesSearch && matchesLevel && matchesTenant && matchesDateFrom && matchesDateTo;
  });

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Caricamento logs...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Warning className="w-8 h-8 text-purple-600" weight="fill" />
              Logs & Audit
            </h1>
            <p className="text-gray-600 mt-1">Monitoraggio attività di sistema e utenti</p>
          </div>
          <button
            onClick={refreshLogs}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            <ArrowClockwise className="w-5 h-5" weight="bold" />
            Aggiorna
          </button>
        </div>

        {/* Filtri */}
        <Card className="p-6 mb-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FunnelSimple className="w-5 h-5 text-indigo-600" weight="fill" />
            Filtri
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Ricerca */}
            <div className="relative">
              <MagnifyingGlass className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cerca..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Livello */}
            <select
              value={filters.level}
              onChange={(e) => setFilters({ ...filters, level: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tutti i livelli</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="success">Success</option>
            </select>

            {/* Tenant */}
            <select
              value={filters.tenantId}
              onChange={(e) => setFilters({ ...filters, tenantId: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Tutti i negozi</option>
              {tenants.map((tenant: any) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>

            {/* Data */}
            <div className="relative">
              <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Da data"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 flex gap-4 text-sm">
            <div className="text-gray-600">
              <strong className="text-gray-900">{filteredLogs.length}</strong> log trovati
            </div>
            <div className="text-red-600">
              <strong>{filteredLogs.filter((l: any) => l.level === 'error').length}</strong> errori
            </div>
            <div className="text-yellow-600">
              <strong>{filteredLogs.filter((l: any) => l.level === 'warning').length}</strong> warning
            </div>
            <div className="text-green-600">
              <strong>{filteredLogs.filter((l: any) => l.level === 'success').length}</strong> successi
            </div>
          </div>
        </Card>

        {/* Lista Logs */}
        <div className="space-y-3">
          {filteredLogs.length === 0 ? (
            <Card className="p-12 text-center">
              <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {logs.length === 0 
                  ? 'Nessun log disponibile al momento' 
                  : 'Nessun log trovato con i filtri selezionati'}
              </p>
            </Card>
          ) : (
            filteredLogs.map((log: any, index: number) => (
              <Card key={index} className={`p-4 border-l-4 ${
                log.level === 'error' ? 'border-l-red-500' :
                log.level === 'warning' ? 'border-l-yellow-500' :
                log.level === 'success' ? 'border-l-green-500' :
                'border-l-blue-500'
              }`}>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getLevelIcon(log.level)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${getLevelBadge(log.level)}`}>
                        {log.level?.toUpperCase() || 'INFO'}
                      </span>
                      <span className="text-sm text-gray-600">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString('it-IT') : '-'}
                      </span>
                      {log.tenantId && (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            const [tenants, setTenants] = useState<any[]>([]);
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {log.message || log.action || 'Nessun messaggio'}
                    </p>
                    {log.user && (
                      <p className="text-xs text-gray-600">
                        Utente: <span className="font-medium">{log.user.email || log.user.id}</span>
                      </p>
                    )}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                          Dettagli tecnici
                        </summary>
                        <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
          <h3 className="font-bold text-purple-900 mb-2">ℹ️ Informazioni sui Logs</h3>
          <ul className="text-sm text-purple-800 space-y-1">
            <li>• <strong>ERROR:</strong> Errori critici che richiedono intervento immediato</li>
            <li>• <strong>WARNING:</strong> Situazioni anomale che potrebbero richiedere attenzione</li>
            <li>• <strong>SUCCESS:</strong> Operazioni completate con successo</li>
            <li>• <strong>INFO:</strong> Eventi informativi di sistema</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}