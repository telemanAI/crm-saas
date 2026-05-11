import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import OperatorLayout from '@/components/layout/OperatorLayout';
import api from '@/lib/axios';
import { useAuthStore } from '@/stores/authStore';
import { usePermission } from '@/hooks/usePermission';
import {
  Plus,
  PencilSimple,
  Trash,
  Trophy,
  Calendar,
  Target as TargetIcon,
  Gift,
  Copy,
  Crown,
  ChartBar,
  ClipboardText,
  EyeSlash,
} from 'phosphor-react';
import {
  Competition,
  CompetitionModal,
  CopyModal,
  formatDate,
  getStatus,
} from '@/components/competitions/CompetitionModals';

type MonthlyOverview = {
  monthLabel: string;
  practicesActivatedThisMonth: number;
  byCategory: Record<string, number>;
  activeCompetitions: Array<{
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    scopeType: string;
    isHidden: boolean;
    totalTargetPieces: number;
    totalEntriesPieces: number;
    progressPercent: number;
    top3: Array<{ userId: string; name: string; pieces: number }>;
  }>;
};

const CATEGORY_LABELS: Record<string, string> = {
  FIXED_LINE: 'Linea Fissa',
  MOBILE: 'Mobile',
  ENERGY: 'Luce/Gas',
  SKY: 'SKY',
  UNKNOWN: 'Altro',
};

export default function CompetitionsListPage() {
  const router = useRouter();
  const { isAuthenticated, shops, activeShopId } = useAuthStore();
  const canView = usePermission('canViewCompetitions');
  const canManage = usePermission('canManageCompetitions');

  const [comps, setComps] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);
  // Phase G.2 — monitor mensile
  const [overview, setOverview] = useState<MonthlyOverview | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Competition | null>(null);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyTarget, setCopyTarget] = useState<Competition | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!canView) {
      router.push('/operator/dashboard');
      return;
    }
    fetchAll();
    fetchOverview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, canView, includeInactive, activeShopId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/competitions?includeInactive=${includeInactive}`);
      setComps(res.data);
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  };

  const fetchOverview = async () => {
    try {
      const res = await api.get('/competitions/monthly-overview');
      setOverview(res.data);
    } catch (err) {
      // overview è best-effort, non bloccante
      console.warn('[CompetitionsListPage] overview non caricabile', err);
    }
  };

  const handleDelete = async (c: Competition) => {
    if (!confirm(`Eliminare la gara "${c.title}"? Verranno cancellate anche tutte le entries.`))
      return;
    await api.delete(`/competitions/${c.id}`);
    fetchAll();
  };

  const handleRunMonthly = async () => {
    if (!confirm('Genera la gara mensile per il mese corrente (per tutti gli shop)?')) return;
    try {
      const res = await api.post('/competitions/auto-monthly/run', {});
      alert(`Generate: ${res.data.created}, già presenti: ${res.data.skipped}`);
      fetchAll();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Errore');
    }
  };

  const grouped = useMemo(() => {
    const now = new Date();
    const active: Competition[] = [];
    const upcoming: Competition[] = [];
    const ended: Competition[] = [];
    for (const c of comps) {
      const start = new Date(c.startDate);
      const end = new Date(c.endDate);
      if (now < start) upcoming.push(c);
      else if (now > end) ended.push(c);
      else active.push(c);
    }
    return { active, upcoming, ended };
  }, [comps]);

  if (loading) {
    return (
      <OperatorLayout>
        <div className="p-8 text-slate-400">Caricamento gare...</div>
      </OperatorLayout>
    );
  }

  return (
    <OperatorLayout>
      <div className="max-w-6xl mx-auto pb-24 md:pb-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 md:w-6 md:h-6 text-amber-400" weight="duotone" />
              Gare e premi
            </h1>
            <p className="text-slate-400 text-xs md:text-sm mt-1">
              Sistema "pezzi" multi-target. Le pratiche e le vendite vengono assegnate
              automaticamente alle gare in corso.
            </p>
          </div>
          {canManage && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleRunMonthly}
                className="flex-1 sm:flex-none px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-white text-xs md:text-sm font-medium"
                data-testid="run-monthly-btn"
                title="Genera gara mensile automatica"
              >
                <Calendar className="w-4 h-4 inline mr-1" weight="bold" />
                <span className="hidden sm:inline">Genera </span>gara mensile
              </button>
              <button
                onClick={() => {
                  setEditing(null);
                  setModalOpen(true);
                }}
                className="flex-1 sm:flex-none px-3 py-2 bg-amber-600 hover:bg-amber-500 rounded text-white text-xs md:text-sm font-medium"
                data-testid="new-comp-btn"
              >
                <Plus className="w-4 h-4 inline mr-1" weight="bold" />
                Nuova gara
              </button>
            </div>
          )}
        </div>

        <div className="mb-4 flex items-center gap-3 text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-slate-300">Mostra anche gare disattivate</span>
          </label>
        </div>

        {/* Phase G.2 — Monitor mensile a colpo d'occhio */}
        {overview && (
          <MonthlyMonitor overview={overview} canManage={canManage} />
        )}

        {comps.length === 0 ? (
          <div className="text-center py-16 text-slate-500 border border-dashed border-slate-700 rounded-xl">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-slate-600" weight="duotone" />
            <p>Nessuna gara presente.</p>
            {canManage && (
              <p className="text-sm mt-2">
                Crea la prima gara o{' '}
                <button onClick={handleRunMonthly} className="text-amber-400 hover:underline">
                  genera quella mensile automatica
                </button>
                .
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {(['active', 'upcoming', 'ended'] as const).map((key) => {
              const titleMap: Record<typeof key, string> = {
                active: 'In corso',
                upcoming: 'In arrivo',
                ended: 'Concluse',
              };
              return (
                <CompetitionGroup
                  key={key}
                  title={titleMap[key]}
                  comps={grouped[key]}
                  canManage={canManage}
                  shops={shops}
                  currentShopId={activeShopId}
                  onEdit={(c) => {
                    setEditing(c);
                    setModalOpen(true);
                  }}
                  onDelete={handleDelete}
                  onCopy={(c) => {
                    setCopyTarget(c);
                    setCopyOpen(true);
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      <CompetitionModal
        open={modalOpen}
        initial={editing}
        onClose={() => setModalOpen(false)}
        onSaved={fetchAll}
      />
      <CopyModal
        open={copyOpen}
        competition={copyTarget}
        shops={shops}
        currentShopId={activeShopId}
        onClose={() => setCopyOpen(false)}
        onCopied={fetchAll}
      />
    </OperatorLayout>
  );
}

function CompetitionGroup({
  title,
  comps,
  canManage,
  shops,
  currentShopId,
  onEdit,
  onDelete,
  onCopy,
}: {
  title: string;
  comps: Competition[];
  canManage: boolean;
  shops: any[];
  currentShopId: string | null;
  onEdit: (c: Competition) => void;
  onDelete: (c: Competition) => void;
  onCopy: (c: Competition) => void;
}) {
  if (!comps.length) return null;
  return (
    <div>
      <h2 className="text-sm uppercase tracking-wide text-slate-500 mb-3">
        {title} <span className="ml-1 text-slate-600">· {comps.length}</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {comps.map((c) => {
          const status = getStatus(c);
          const StatusIcon = status.icon as any;
          const otherShopsCount = (shops || []).filter((s: any) => s.shopId !== currentShopId).length;
          return (
            <div
              key={c.id}
              className="bg-slate-900 border border-slate-700 hover:border-amber-500/40 rounded-xl p-4 transition group"
              data-testid={`comp-card-${c.id}`}
            >
              <div className="flex items-start justify-between mb-2">
                <Link
                  href={`/operator/competitions/${c.id}`}
                  className="font-bold text-white text-base hover:text-amber-300 transition flex-1 min-w-0 mr-2"
                  data-testid={`comp-link-${c.id}`}
                >
                  {c.title}
                </Link>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded inline-flex items-center gap-1 ${status.color} flex-shrink-0`}
                >
                  <StatusIcon className="w-3 h-3" weight="fill" />
                  {status.label}
                </span>
              </div>
              {c.description && (
                <p className="text-xs text-slate-400 mb-3 line-clamp-2">{c.description}</p>
              )}
              <div className="text-xs text-slate-500 flex items-center gap-1 mb-3">
                <Calendar className="w-3 h-3" />
                {formatDate(c.startDate)} → {formatDate(c.endDate)}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="bg-slate-800/50 rounded px-2 py-1.5">
                  <div className="text-slate-500 flex items-center gap-1">
                    <TargetIcon className="w-3 h-3" /> Target
                  </div>
                  <div className="text-slate-200 font-bold">{c.targets?.length || 0}</div>
                </div>
                <div className="bg-slate-800/50 rounded px-2 py-1.5">
                  <div className="text-slate-500 flex items-center gap-1">
                    <Gift className="w-3 h-3" /> Premi
                  </div>
                  <div className="text-slate-200 font-bold">{c.prizes?.length || 0}</div>
                </div>
              </div>
              {c.isAutoMonthly && (
                <div className="text-xs text-blue-300 bg-blue-500/10 rounded px-2 py-1 mb-3 inline-block">
                  ⚡ Auto-generata
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/operator/competitions/${c.id}`}
                  className="text-xs text-amber-400 hover:underline"
                  data-testid={`comp-detail-${c.id}`}
                >
                  Vedi classifica →
                </Link>
                {canManage && (
                  <div className="flex gap-1">
                    {otherShopsCount > 0 && (
                      <button
                        onClick={() => onCopy(c)}
                        title="Copia su altro negozio"
                        className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded"
                        data-testid={`comp-copy-${c.id}`}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(c)}
                      title="Modifica"
                      className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded"
                      data-testid={`comp-edit-${c.id}`}
                    >
                      <PencilSimple className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(c)}
                      title="Elimina"
                      className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded"
                      data-testid={`comp-delete-${c.id}`}
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Phase G.2 — Monitor mensile a colpo d'occhio.
 * Mostra:
 *  - totale pratiche ATTIVATE del mese (indipendente dalle gare)
 *  - breakdown per categoria
 *  - per ogni gara in corso: progress bar + top 3 venditori
 */
function MonthlyMonitor({ overview, canManage }: { overview: MonthlyOverview; canManage: boolean }) {
  const cats = Object.entries(overview.byCategory).sort((a, b) => b[1] - a[1]);

  return (
    <div className="mb-6 space-y-4" data-testid="monthly-monitor">
      {/* Header monitor: totale pratiche del mese */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-900/10 border border-amber-500/30 rounded-2xl p-5 shadow-lg shadow-amber-500/5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-widest text-amber-400/80 mb-1 flex items-center gap-1.5">
              <ClipboardText className="w-3.5 h-3.5" weight="duotone" />
              Monitor mensile · {overview.monthLabel}
            </div>
            <div className="text-4xl font-black text-white" data-testid="monthly-total-practices">
              {overview.practicesActivatedThisMonth}
              <span className="text-sm text-slate-400 font-normal ml-2">pratiche attivate</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Indipendente dalle gare — riflette tutte le ATTIVATE del mese sullo shop attivo.
            </div>
          </div>
          {cats.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              {cats.map(([cat, n]) => (
                <div
                  key={cat}
                  className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-center min-w-[88px]"
                  data-testid={`monthly-cat-${cat}`}
                >
                  <div className="text-[11px] text-slate-400 uppercase">
                    {CATEGORY_LABELS[cat] || cat}
                  </div>
                  <div className="text-lg font-bold text-white">{n}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Per ogni gara in corso, una card spotlight */}
      {overview.activeCompetitions.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
            <ChartBar className="w-3.5 h-3.5" weight="duotone" />
            Gare in corso · live
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {overview.activeCompetitions.map((c) => (
              <Link
                key={c.id}
                href={`/operator/competitions/${c.id}`}
                className="block bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-xl p-4 transition group"
                data-testid={`live-comp-${c.id}`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="w-4 h-4 text-amber-400 flex-shrink-0" weight="fill" />
                      <h3 className="font-bold text-white truncate group-hover:text-amber-300 transition">
                        {c.title}
                      </h3>
                      {c.isHidden && canManage && (
                        <span title="Nascosta agli operator" className="text-slate-500">
                          <EyeSlash className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {String(c.startDate).slice(0, 10)} → {String(c.endDate).slice(0, 10)} ·{' '}
                      {c.scopeType === 'COMPANY' ? 'Tutti i negozi' : 'Solo questo negozio'}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-2xl font-black text-amber-400">
                      {c.totalEntriesPieces}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      / {c.totalTargetPieces || '—'} pezzi
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                {c.totalTargetPieces > 0 && (
                  <div className="mb-3">
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all"
                        style={{ width: `${c.progressPercent}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 text-right">
                      {c.progressPercent}%
                    </div>
                  </div>
                )}

                {/* Top 3 venditori */}
                {c.top3.length > 0 ? (
                  <div className="space-y-1.5">
                    {c.top3.map((u, i) => {
                      const colors = ['text-amber-400', 'text-slate-300', 'text-orange-700/80'];
                      const bgs = ['bg-amber-500/10', 'bg-slate-700/30', 'bg-orange-900/20'];
                      return (
                        <div
                          key={u.userId}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded ${bgs[i]}`}
                        >
                          {i === 0 ? (
                            <Crown className={`w-4 h-4 ${colors[i]}`} weight="fill" />
                          ) : (
                            <span className={`w-4 h-4 text-center text-xs font-bold ${colors[i]}`}>
                              {i + 1}
                            </span>
                          )}
                          <span className="flex-1 text-sm text-slate-200 truncate">{u.name}</span>
                          <span className={`font-bold ${colors[i]}`}>{u.pieces}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic py-2">
                    Nessun venditore in classifica ancora.
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
