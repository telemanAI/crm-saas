import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  ShieldWarning,
  Warning,
  Info,
  ArrowClockwise,
  Buildings,
  Clock,
  Activity,
  ArrowLeft,
  Funnel,
  MagnifyingGlass,
} from 'phosphor-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';

interface HealthSummary {
  tenantId: string;
  tenantName: string;
  subscriptionCode: string;
  total24h: number;
  total7d: number;
  errors24h: number;
  warnings24h: number;
  lastErrorAt: string | null;
  topEndpoints: Array<{ endpoint: string; count: number }>;
}

interface SystemErrorItem {
  id: string;
  statusCode: number;
  method: string;
  endpoint: string;
  errorMessage: string | null;
  errorName: string | null;
  severity: 'error' | 'warning' | 'info';
  tenantId: string | null;
  tenant: { id: string; name: string; subscriptionCode: string } | null;
  user: { id: string; email: string; firstName?: string; lastName?: string } | null;
  ipAddress: string | null;
  stackTrace: string | null;
  metadata: any;
  createdAt: string;
}

export default function ShopHealthPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [summaries, setSummaries] = useState<HealthSummary[]>([]);
  const [loadingSummaries, setLoadingSummaries] = useState(true);

  const [selected, setSelected] = useState<string | null>(null); // tenantId
  const [errors, setErrors] = useState<SystemErrorItem[]>([]);
  const [errorsTotal, setErrorsTotal] = useState(0);
  const [loadingErrors, setLoadingErrors] = useState(false);

  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'' | 'error' | 'warning' | 'info'>('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.role !== 'SUPER_ADMIN') {
      router.push('/operator/dashboard');
      return;
    }
    loadHealth();
  }, [isAuthenticated, user]);

  const loadHealth = async () => {
    setLoadingSummaries(true);
    try {
      const res = await api.get('/system-errors/health');
      setSummaries(res.data || []);
    } catch (err) {
      console.error('[shop-health] load failed', err);
      setSummaries([]);
    } finally {
      setLoadingSummaries(false);
    }
  };

  const loadErrors = async (tenantId: string) => {
    setLoadingErrors(true);
    try {
      const params = new URLSearchParams({ tenantId, limit: '200' });
      if (severityFilter) params.set('severity', severityFilter);
      const res = await api.get(`/system-errors?${params}`);
      setErrors(res.data?.items || []);
      setErrorsTotal(res.data?.total || 0);
    } catch {
      setErrors([]);
      setErrorsTotal(0);
    } finally {
      setLoadingErrors(false);
    }
  };

  const openDetail = (tenantId: string) => {
    setSelected(tenantId);
    loadErrors(tenantId);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return summaries;
    return summaries.filter(
      (s) =>
        s.tenantName?.toLowerCase().includes(q) ||
        s.subscriptionCode?.includes(q) ||
        s.tenantId?.toLowerCase().includes(q),
    );
  }, [summaries, search]);

  const filteredErrors = useMemo(() => {
    if (!severityFilter) return errors;
    return errors.filter((e) => e.severity === severityFilter);
  }, [errors, severityFilter]);

  // ==================== DETTAGLIO NEGOZIO ====================
  if (selected) {
    const summary = summaries.find((s) => s.tenantId === selected);
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => { setSelected(null); setErrors([]); }}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Torna al riepilogo negozi
          </button>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                  <ShieldWarning className="w-6 h-6 text-rose-400" weight="duotone" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{summary?.tenantName || 'Negozio'}</h1>
                  <p className="text-slate-400 text-sm">Codice {summary?.subscriptionCode} · {errorsTotal} eventi totali</p>
                </div>
              </div>
              <button
                onClick={() => loadErrors(selected)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm"
              >
                <ArrowClockwise className="w-4 h-4" /> Aggiorna
              </button>
            </div>

            {summary && (
              <div className="grid grid-cols-4 gap-4 mt-4">
                <StatBox label="Totale 24h" value={summary.total24h} accent="indigo" />
                <StatBox label="Totale 7 giorni" value={summary.total7d} accent="slate" />
                <StatBox label="Errori 24h" value={summary.errors24h} accent="rose" />
                <StatBox label="Warning 24h" value={summary.warnings24h} accent="amber" />
              </div>
            )}
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-4 flex items-center gap-4">
            <Funnel className="w-5 h-5 text-slate-500" />
            <select
              value={severityFilter}
              onChange={(e) => { setSeverityFilter(e.target.value as any); if (selected) loadErrors(selected); }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
            >
              <option value="">Tutte le severità</option>
              <option value="error">Error (5xx / eccezioni)</option>
              <option value="warning">Warning (4xx non auth)</option>
              <option value="info">Info (401/403)</option>
            </select>
          </div>

          {loadingErrors ? (
            <div className="text-center py-12 text-slate-400">Caricamento errori...</div>
          ) : filteredErrors.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-400">
              Nessun errore registrato per questo negozio con i filtri correnti
            </div>
          ) : (
            <div className="space-y-3">
              {filteredErrors.map((err) => (
                <ErrorRow key={err.id} err={err} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== RIEPILOGO NEGOZI ====================
  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        <Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-4 text-sm">
          <ArrowLeft className="w-4 h-4" /> Dashboard admin
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <ShieldWarning className="w-7 h-7 text-rose-400" weight="duotone" />
              Salute Negozi
            </h1>
            <p className="text-slate-400">Errori e problemi operativi nei negozi (ultimi 7 giorni)</p>
          </div>
          <button
            onClick={loadHealth}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm"
          >
            <ArrowClockwise className="w-4 h-4" /> Aggiorna
          </button>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-6 flex items-center gap-4">
          <MagnifyingGlass className="w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Cerca negozio (nome, codice sottoscrizione)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder-slate-500"
          />
          <span className="text-xs text-slate-500">{filtered.length} negozi con problemi</span>
        </div>

        {loadingSummaries ? (
          <div className="text-center py-12 text-slate-400">Caricamento salute negozi...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <Activity className="w-16 h-16 text-emerald-400 mx-auto mb-4" weight="duotone" />
            <p className="text-slate-200 text-lg font-semibold mb-1">Tutti i negozi sono in salute 🎉</p>
            <p className="text-slate-500 text-sm">Nessun errore registrato negli ultimi 7 giorni</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((s) => {
              const isCritical = s.errors24h >= 10;
              const isBad = s.errors24h >= 3;
              const accent = isCritical ? 'rose' : isBad ? 'amber' : 'slate';
              return (
                <div
                  key={s.tenantId}
                  onClick={() => openDetail(s.tenantId)}
                  className={`bg-slate-900/80 border rounded-2xl p-6 cursor-pointer hover:border-slate-600 transition-all ${
                    accent === 'rose' ? 'border-rose-500/50 ring-1 ring-rose-500/30' : accent === 'amber' ? 'border-amber-500/40' : 'border-slate-800'
                  }`}
                  data-testid="shop-health-card"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        accent === 'rose' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/40' :
                        accent === 'amber' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/40' :
                        'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        <Buildings className="w-6 h-6" weight="duotone" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-white truncate">{s.tenantName}</h3>
                        <p className="text-xs text-slate-500 font-mono">#{s.subscriptionCode}</p>
                        {s.lastErrorAt && (
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Ultimo errore: {new Date(s.lastErrorAt).toLocaleString('it-IT')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <StatBox label="Errori 24h" value={s.errors24h} accent="rose" compact />
                      <StatBox label="Warning 24h" value={s.warnings24h} accent="amber" compact />
                      <StatBox label="Totale 7g" value={s.total7d} accent="slate" compact />
                    </div>
                  </div>

                  {s.topEndpoints.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <p className="text-xs text-slate-500 mb-2">Endpoint con più errori</p>
                      <div className="flex flex-wrap gap-2">
                        {s.topEndpoints.map((ep, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-xs bg-slate-800 border border-slate-700 rounded-full px-3 py-1 text-slate-300">
                            <code className="font-mono">{ep.endpoint}</code>
                            <span className="text-slate-500">· {ep.count}x</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, accent, compact }: { label: string; value: number; accent: 'rose' | 'amber' | 'indigo' | 'slate'; compact?: boolean }) {
  const bg =
    accent === 'rose' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
    accent === 'amber' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
    accent === 'indigo' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' :
    'bg-slate-800 border-slate-700 text-slate-300';
  return (
    <div className={`rounded-lg border ${bg} ${compact ? 'px-3 py-2 min-w-[90px]' : 'px-4 py-3 text-center'}`}>
      <p className={`font-bold ${compact ? 'text-lg' : 'text-2xl'}`}>{value}</p>
      <p className={`text-xs opacity-70 ${compact ? '' : 'mt-1'}`}>{label}</p>
    </div>
  );
}

function ErrorRow({ err }: { err: SystemErrorItem }) {
  const sevColor =
    err.severity === 'error' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
    err.severity === 'warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
    'bg-slate-700 text-slate-300 border-slate-600';
  const sevIcon = err.severity === 'error' ? Warning : err.severity === 'warning' ? Warning : Info;
  const SevIcon = sevIcon;
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className={`rounded-lg p-2 border ${sevColor} flex items-center justify-center`}>
          <SevIcon className="w-4 h-4" weight="fill" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${sevColor}`}>
              {err.severity.toUpperCase()}
            </span>
            <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
              {err.statusCode}
            </span>
            <span className="text-xs text-slate-500 font-mono">{err.method} {err.endpoint}</span>
            <span className="text-xs text-slate-500 ml-auto">{new Date(err.createdAt).toLocaleString('it-IT')}</span>
          </div>
          <p className="text-sm text-slate-200 mb-1">{err.errorMessage || err.errorName}</p>
          {err.user && (
            <p className="text-xs text-slate-500">Utente: {err.user.firstName} {err.user.lastName} ({err.user.email})</p>
          )}
          {err.stackTrace && (
            <details className="mt-2">
              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300">Stack trace</summary>
              <pre className="mt-2 text-[11px] bg-slate-950 p-2 rounded overflow-x-auto max-h-64 text-slate-400 font-mono">
                {err.stackTrace}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
