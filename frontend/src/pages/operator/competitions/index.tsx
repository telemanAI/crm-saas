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
} from 'phosphor-react';
import {
  Competition,
  CompetitionModal,
  CopyModal,
  formatDate,
  getStatus,
} from '@/components/competitions/CompetitionModals';

export default function CompetitionsListPage() {
  const router = useRouter();
  const { isAuthenticated, shops, activeShopId } = useAuthStore();
  const canView = usePermission('canViewCompetitions');
  const canManage = usePermission('canManageCompetitions');

  const [comps, setComps] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, canView, includeInactive]);

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
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400" weight="duotone" />
              Gare e premi
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Sistema "pezzi" multi-target. Le pratiche e le vendite vengono assegnate
              automaticamente alle gare in corso.
            </p>
          </div>
          {canManage && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleRunMonthly}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-white text-sm font-medium"
                data-testid="run-monthly-btn"
                title="Genera gara mensile automatica"
              >
                <Calendar className="w-4 h-4 inline mr-1" weight="bold" />
                Genera gara mensile
              </button>
              <button
                onClick={() => {
                  setEditing(null);
                  setModalOpen(true);
                }}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-500 rounded text-white text-sm font-medium"
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
