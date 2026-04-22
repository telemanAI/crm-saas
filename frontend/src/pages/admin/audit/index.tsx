import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/stores/authStore';
import { Layout } from '../../../components/layout/Layout';
import { Card } from '../../../components/ui/Card';
import { auditApi } from '@/lib/api';
import {
  Warning,
  Info,
  MagnifyingGlass,
  Calendar,
  FunnelSimple,
  ArrowClockwise,
  User,
  Buildings,
} from 'phosphor-react';

interface AuditItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  tenantId: string | null;
  userId: string | null;
  user: { id: string; email: string; firstName?: string; lastName?: string } | null;
  tenant: { id: string; name: string; subscriptionCode?: string } | null;
  oldValues: any;
  newValues: any;
  metadata: any;
  createdAt: string;
}

export default function AuditLogsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [items, setItems] = useState<AuditItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    entityType: '',
    action: '',
    dateFrom: '',
    dateTo: '',
    tenantId: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    // Solo SUPER_ADMIN e FOUNDER hanno accesso (enforcement anche server side).
    if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'FOUNDER') {
      router.push('/operator/dashboard');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await auditApi.list({
        entityType: filters.entityType || undefined,
        action: filters.action || undefined,
        tenantId: filters.tenantId || undefined,
        from: filters.dateFrom ? new Date(filters.dateFrom).toISOString() : undefined,
        to: filters.dateTo ? new Date(filters.dateTo).toISOString() : undefined,
        limit: 200,
      });
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('[audit] load failed:', err);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    const q = filters.search.toLowerCase();
    if (!q) return items;
    return items.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.entityType.toLowerCase().includes(q) ||
        l.entityId?.toLowerCase().includes(q) ||
        l.user?.email?.toLowerCase().includes(q),
    );
  }, [items, filters.search]);

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

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Warning className="w-8 h-8 text-purple-600" weight="fill" />
              Audit logs
            </h1>
            <p className="text-gray-600 mt-1">
              Tracciamento attività utenti su pratiche, clienti e team.
              {isSuperAdmin ? ' (Vista globale, tutti i negozi)' : ' (Solo il tuo negozio attivo)'}
            </p>
          </div>
          <button
            onClick={load}
            data-testid="audit-refresh-btn"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
          >
            <ArrowClockwise className="w-5 h-5" weight="bold" />
            Aggiorna
          </button>
        </div>

        <Card className="p-6 mb-6">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FunnelSimple className="w-5 h-5 text-indigo-600" weight="fill" />
            Filtri
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <MagnifyingGlass className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cerca (azione, utente, id)..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                data-testid="audit-search"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={filters.entityType}
              onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
              data-testid="audit-entity-type"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Tutti i tipi</option>
              <option value="practice">Pratiche</option>
              <option value="customer">Clienti</option>
              <option value="membership">Team</option>
              <option value="invite">Inviti</option>
            </select>

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

            <div className="relative">
              <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="A data"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-4 text-sm justify-between items-center">
            <div className="text-gray-600">
              <strong className="text-gray-900">{filteredItems.length}</strong> di <strong>{total}</strong> eventi caricati
            </div>
            <button
              onClick={load}
              className="text-xs text-indigo-600 hover:text-indigo-700 underline"
            >
              Applica filtri server-side
            </button>
          </div>
        </Card>

        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <Card className="p-12 text-center">
              <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {total === 0 ? 'Nessun evento di audit presente.' : 'Nessun evento corrisponde ai filtri.'}
              </p>
            </Card>
          ) : (
            filteredItems.map((log) => (
              <Card key={log.id} className="p-4 border-l-4 border-l-indigo-500">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <Info className="w-5 h-5 text-indigo-600" weight="fill" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold border bg-indigo-100 text-indigo-800 border-indigo-300">
                        {log.action}
                      </span>
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {log.entityType}
                      </span>
                      <span className="text-sm text-gray-600">
                        {new Date(log.createdAt).toLocaleString('it-IT')}
                      </span>
                      {log.tenant && (
                        <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          <Buildings className="w-3 h-3" /> {log.tenant.name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {log.action} · {log.entityType}
                      {log.entityId ? <span className="text-gray-500 font-mono text-xs ml-2">#{log.entityId.slice(0, 8)}</span> : null}
                    </p>
                    {log.user && (
                      <p className="text-xs text-gray-600 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span className="font-medium">
                          {log.user.firstName} {log.user.lastName}
                        </span>
                        <span className="text-gray-400">({log.user.email})</span>
                      </p>
                    )}
                    {(log.newValues || log.oldValues || log.metadata) && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                          Dettagli tecnici
                        </summary>
                        <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                          {JSON.stringify({ old: log.oldValues, new: log.newValues, meta: log.metadata }, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="mt-6 bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
          <h3 className="font-bold text-purple-900 mb-2">Come funziona l&apos;audit trail</h3>
          <ul className="text-sm text-purple-800 space-y-1">
            <li>• Ogni azione critica su pratiche, clienti e team viene registrata automaticamente</li>
            <li>• Dati sensibili (password, token) vengono redatti</li>
            <li>• I FOUNDER vedono solo il negozio attivo, i SUPER_ADMIN vedono tutto</li>
            <li>• I log sono immutabili: non possono essere modificati o cancellati dal pannello</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
