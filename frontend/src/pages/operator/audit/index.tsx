import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import {
  Warning,
  Info,
  MagnifyingGlass,
  Calendar,
  FunnelSimple,
  ArrowClockwise,
  User,
  ClipboardText,
} from 'phosphor-react';
import OperatorLayout from '@/components/layout/OperatorLayout';
import { useAuthStore } from '@/stores/authStore';
import { auditApi } from '@/lib/api';

/**
 * Pagina Audit logs per il FOUNDER/ADMIN del negozio attivo.
 * Usa OperatorLayout per rimanere nella sidebar operatore (fix del bug
 * "clicco Audit logs e mi porta nella sidebar del super admin").
 *
 * Il backend filtra automaticamente gli eventi al tenantId dell'utente
 * loggato (vedi audit.controller.ts — solo SUPER_ADMIN può passare tenantId
 * nella query), quindi qui non serve alcun filtro lato client sul tenant.
 */
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

export default function OperatorAuditLogsPage() {
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
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    // FOUNDER, ADMIN e SUPER_ADMIN possono leggere; OPERATOR no.
    if (user?.role === 'OPERATOR') {
      router.push('/operator/dashboard');
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  const load = async () => {
    setLoading(true);
    try {
      // Niente tenantId qui — il backend lo prende dal JWT per i non-SUPER_ADMIN
      const res: any = await auditApi.list({
        entityType: filters.entityType || undefined,
        action: filters.action || undefined,
        from: filters.dateFrom ? new Date(filters.dateFrom).toISOString() : undefined,
        to: filters.dateTo ? new Date(filters.dateTo).toISOString() : undefined,
        limit: 200,
      });
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('[operator-audit] load failed:', err);
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
        (l.entityId || '').toLowerCase().includes(q) ||
        (l.user?.email || '').toLowerCase().includes(q),
    );
  }, [items, filters.search]);

  return (
    <OperatorLayout title="Audit logs">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <ClipboardText className="w-7 h-7 text-violet-400" weight="duotone" />
              Audit logs
            </h1>
            <p className="text-slate-400">
              Chi ha fatto cosa nel tuo negozio · modifiche, cancellazioni, creazioni
            </p>
          </div>
          <button
            onClick={load}
            data-testid="audit-refresh-btn"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium"
          >
            <ArrowClockwise className="w-5 h-5" weight="bold" />
            Aggiorna
          </button>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 mb-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <FunnelSimple className="w-5 h-5 text-indigo-400" weight="fill" />
            Filtri
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Cerca (azione, utente, id)..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
                data-testid="audit-search"
              />
            </div>

            <select
              value={filters.entityType}
              onChange={(e) => setFilters({ ...filters, entityType: e.target.value })}
              data-testid="audit-entity-type"
              className="px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
            >
              <option value="">Tutti i tipi</option>
              <option value="practice">Pratiche</option>
              <option value="customer">Clienti</option>
              <option value="membership">Team</option>
              <option value="invite">Inviti</option>
            </select>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
              />
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-400">
              <strong className="text-slate-200">{filteredItems.length}</strong> di{' '}
              <strong className="text-slate-200">{total}</strong> eventi
            </p>
            <button
              onClick={load}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline"
            >
              Applica filtri server-side
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-slate-400">Caricamento audit logs...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <Info className="w-16 h-16 text-slate-600 mx-auto mb-4" weight="duotone" />
            <p className="text-slate-400">
              {total === 0
                ? 'Nessun evento registrato finora'
                : 'Nessun evento corrisponde ai filtri correnti'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((log) => (
              <div
                key={log.id}
                className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 border-l-4 border-l-violet-500 rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    <Info className="w-5 h-5 text-violet-400" weight="fill" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-violet-500/15 text-violet-300 border border-violet-500/30">
                        {log.action}
                      </span>
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {log.entityType}
                      </span>
                      <span className="text-xs text-slate-500 ml-auto">
                        {new Date(log.createdAt).toLocaleString('it-IT')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-200 mb-1">
                      {log.action} · {log.entityType}
                      {log.entityId && (
                        <span className="text-slate-500 font-mono text-xs ml-2">
                          #{log.entityId.slice(0, 8)}
                        </span>
                      )}
                    </p>
                    {log.user && (
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span className="font-medium text-slate-400">
                          {log.user.firstName} {log.user.lastName}
                        </span>
                        <span className="text-slate-600">({log.user.email})</span>
                      </p>
                    )}
                    {(log.newValues || log.oldValues || log.metadata) && (
                      <details className="mt-2">
                        <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300">
                          Dettagli tecnici
                        </summary>
                        <pre className="mt-2 text-xs bg-slate-950 p-3 rounded overflow-x-auto text-slate-400 font-mono">
                          {JSON.stringify(
                            { old: log.oldValues, new: log.newValues, meta: log.metadata },
                            null,
                            2,
                          )}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 bg-violet-500/5 border border-violet-500/20 rounded-xl p-4">
          <h3 className="text-violet-300 font-semibold mb-2">Come funziona</h3>
          <ul className="text-sm text-slate-400 space-y-1">
            <li>• Vedi solo gli eventi del tuo negozio (filtrato lato server)</li>
            <li>• Ogni azione critica su pratiche, clienti, team viene registrata automaticamente</li>
            <li>• Dati sensibili (password, token) vengono redatti</li>
            <li>• I log sono immutabili: non possono essere modificati o cancellati</li>
          </ul>
        </div>
      </div>
    </OperatorLayout>
  );
}
