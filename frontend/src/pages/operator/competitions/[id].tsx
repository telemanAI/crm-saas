import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import OperatorLayout from '@/components/layout/OperatorLayout';
import api from '@/lib/axios';
import { useAuthStore } from '@/stores/authStore';
import { usePermission } from '@/hooks/usePermission';
import {
  ArrowLeft,
  Trophy,
  Calendar,
  Target as TargetIcon,
  Gift,
  PencilSimple,
  Copy,
  Storefront,
  Crown,
  ChartBar,
  CurrencyEur,
  ArrowsClockwise,
} from 'phosphor-react';
import {
  Competition,
  CompetitionModal,
  CopyModal,
  CATEGORY_LABEL,
  PRIZE_SCOPE_LABEL,
  PRIZE_CATEGORY_LABEL,
  formatDate,
  getStatus,
} from '@/components/competitions/CompetitionModals';

// ============ Tipi della response leaderboard ============
interface LeaderboardTarget {
  id: string;
  label: string;
  category: string;
  targetPieces: number;
  currentPieces: number;
  progressPercent: number | null;
}
interface LeaderboardPrize {
  id: string;
  label: string;
  scope: 'OPERATOR' | 'SHOP' | 'COMPANY';
  category: string;
  threshold: number;
  prizeValue: number | null;
  targetId: string | null;
}
interface OperatorRow {
  userId: string;
  pieces: number;
  revenue: number;
  rank: number;
}
interface CompanyAggregate {
  siblingCompetitionIds: string[];
  totalPieces: number;
  totalRevenue: number;
  byShop: Array<{ tenantId: string; pieces: number; revenue: number }>;
}
interface LeaderboardData {
  competition: {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    templateKey: string | null;
  };
  targets: LeaderboardTarget[];
  prizes: LeaderboardPrize[];
  operatorRanking: OperatorRow[];
  totals: { pieces: number; revenue: number; entriesCount: number };
  companyAggregate: CompanyAggregate | null;
}

interface UserLite {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

// ============ Helpers UI ============
function progressBar(percent: number, color = 'bg-amber-500'): JSX.Element {
  const safe = Math.min(100, Math.max(0, percent));
  return (
    <div className="w-full h-2 bg-slate-800 rounded overflow-hidden">
      <div
        className={`${color} h-full transition-all`}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}

function rankIcon(rank: number): JSX.Element | null {
  if (rank === 1) return <Crown className="w-5 h-5 text-amber-400" weight="fill" />;
  if (rank === 2) return <Crown className="w-5 h-5 text-slate-300" weight="fill" />;
  if (rank === 3) return <Crown className="w-5 h-5 text-orange-400" weight="fill" />;
  return null;
}

function userLabel(u: UserLite | undefined, fallback: string): string {
  if (!u) return fallback;
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return name || u.email || fallback;
}

function shopLabel(shopId: string, shops: any[]): string {
  return shops.find((s) => s.shopId === shopId)?.name || shopId.slice(0, 8);
}

// ============ Page ============
export default function CompetitionDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated, shops, activeShopId } = useAuthStore();
  const canView = usePermission('canViewCompetitions');
  const canManage = usePermission('canManageCompetitions');

  const [comp, setComp] = useState<Competition | null>(null);
  const [board, setBoard] = useState<LeaderboardData | null>(null);
  const [users, setUsers] = useState<Record<string, UserLite>>({});
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);

  const handleRecompute = async () => {
    if (!id || typeof id !== 'string') return;
    if (!confirm('Ricalcolare le entries di questa gara? Tutte le entries esistenti verranno cancellate e ricreate scansionando le pratiche del periodo (esclusi gli import).')) return;
    setRecomputing(true);
    try {
      const res = await api.post(`/competitions/${id}/recompute`);
      alert(`Ricalcolo completato: ${res.data.deleted} cancellate, ${res.data.inserted} inserite.`);
      fetchAll(id);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Errore ricalcolo');
    } finally {
      setRecomputing(false);
    }
  };

  /**
   * Phase G — Diagnosi completa: spiega perché una gara non avanza.
   * Mostra in alert un riepilogo human-readable, e logga l'oggetto completo in console
   * per debug avanzato (utile da incollare nel chat con il supporto).
   */
  const handleDiagnose = async () => {
    if (!id || typeof id !== 'string') return;
    setDiagnosing(true);
    try {
      const res = await api.get(`/competitions/${id}/diagnose`);
      const d = res.data;
      // eslint-disable-next-line no-console
      console.log('🔬 [Diagnosi gara]', d);

      const lines: string[] = [];
      lines.push(`📊 Diagnosi gara "${d.competition.title}"`);
      lines.push(`Periodo: ${String(d.competition.startDate).slice(0, 10)} → ${String(d.competition.endDate).slice(0, 10)}`);
      lines.push(`Scope: ${d.competition.scopeType} (${d.scopeShopIds.length} shop)`);
      lines.push('');
      lines.push(`Pratiche nel periodo: ${d.totalPracticesInPeriod}`);
      lines.push(`  → idonee (ACTIVATED, non importate, con venditore): ${d.eligiblePractices}`);
      lines.push(`  → escluse: ${d.excludedPractices}`);
      lines.push(`Entries esistenti: ${d.totalEntriesExisting}`);
      lines.push('');
      lines.push('Per target:');
      for (const t of d.perTarget) {
        lines.push(`  • ${t.label} (${t.targetType}) — pratiche candidate: ${t.candidatePractices}, entries: ${t.existingEntries}`);
      }
      lines.push('');
      const excluded = (d.practicesAnalysis || []).filter((p: any) => p.excluded);
      if (excluded.length > 0) {
        lines.push(`⚠️ Prime ${Math.min(5, excluded.length)} pratiche escluse:`);
        for (const p of excluded.slice(0, 5)) {
          lines.push(`  - ${p.offerName || p.id.slice(0, 8)} → ${p.reasons.join('; ')}`);
        }
      }
      lines.push('');
      lines.push('(Dettaglio completo in console del browser → F12)');
      alert(lines.join('\n'));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Errore diagnosi');
    } finally {
      setDiagnosing(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!canView) {
      router.push('/operator/dashboard');
      return;
    }
    if (typeof id === 'string') fetchAll(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, canView, id]);

  const fetchAll = async (compId: string) => {
    setLoading(true);
    try {
      const [compRes, boardRes] = await Promise.all([
        api.get(`/competitions/${compId}`),
        api.get(`/competitions/${compId}/leaderboard`),
      ]);
      setComp(compRes.data);
      setBoard(boardRes.data);

      // Best-effort: carica nomi utenti del ranking. Se l'endpoint fallisce
      // (membri team non visibili), mostriamo l'ID truncato come fallback.
      const ids = (boardRes.data.operatorRanking || []).map((o: OperatorRow) => o.userId);
      if (ids.length) {
        try {
          const teamRes = await api.get('/users/team');
          const map: Record<string, UserLite> = {};
          (teamRes.data || []).forEach((u: UserLite) => {
            map[u.id] = u;
          });
          setUsers(map);
        } catch {
          /* ignore */
        }
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Errore caricamento gara');
      router.push('/operator/competitions');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !comp || !board) {
    return (
      <OperatorLayout>
        <div className="p-8 text-slate-400">Caricamento classifica...</div>
      </OperatorLayout>
    );
  }

  const status = getStatus(comp);
  const StatusIcon = status.icon as any;
  const otherShopsCount = (shops || []).filter((s: any) => s.shopId !== activeShopId).length;

  // Premi raggruppati per scope
  const prizesByScope: Record<'OPERATOR' | 'SHOP' | 'COMPANY', LeaderboardPrize[]> = {
    OPERATOR: [],
    SHOP: [],
    COMPANY: [],
  };
  for (const p of board.prizes) prizesByScope[p.scope].push(p);

  // Per i premi OPERATOR: il "valore corrente" che fa scaglione è il TOP operator
  const topOperatorPieces = board.operatorRanking[0]?.pieces || 0;
  const topOperatorRevenue = board.operatorRanking[0]?.revenue || 0;
  // Per SHOP/COMPANY usiamo i totali della gara (companyAggregate se presente)
  const shopPieces = board.totals.pieces;
  const shopRevenue = board.totals.revenue;
  const companyPieces = board.companyAggregate?.totalPieces ?? shopPieces;
  const companyRevenue = board.companyAggregate?.totalRevenue ?? shopRevenue;

  const computePrizeProgress = (p: LeaderboardPrize): { current: number; max: number } => {
    // kind di "default" è PIECES; non abbiamo il kind nel response leaderboard,
    // quindi mostriamo i pezzi (consistente con UI builder).
    let current = 0;
    if (p.scope === 'OPERATOR') current = topOperatorPieces;
    else if (p.scope === 'SHOP') current = shopPieces;
    else current = companyPieces;
    return { current, max: p.threshold };
  };

  return (
    <OperatorLayout>
      <div className="max-w-6xl mx-auto" data-testid="comp-detail-page">
        {/* ====== Header ====== */}
        <div className="mb-5">
          <Link
            href="/operator/competitions"
            className="text-sm text-slate-400 hover:text-amber-300 inline-flex items-center gap-1 mb-3"
            data-testid="back-to-list"
          >
            <ArrowLeft className="w-4 h-4" /> Torna a tutte le gare
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-400" weight="duotone" />
                {comp.title}
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded inline-flex items-center gap-1 ${status.color}`}
                >
                  <StatusIcon className="w-3 h-3" weight="fill" />
                  {status.label}
                </span>
              </h1>
              {comp.description && (
                <p className="text-slate-400 text-sm mt-1">{comp.description}</p>
              )}
              <div className="text-xs text-slate-500 mt-2 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(comp.startDate)} → {formatDate(comp.endDate)}
                </span>
                {comp.templateKey && (
                  <span className="font-mono bg-slate-800 px-2 py-0.5 rounded">
                    {comp.templateKey}
                  </span>
                )}
                {comp.isAutoMonthly && (
                  <span className="text-blue-300 bg-blue-500/10 rounded px-2 py-0.5">
                    ⚡ Auto-generata
                  </span>
                )}
              </div>
            </div>

            {canManage && (
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={handleDiagnose}
                  disabled={diagnosing}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-cyan-300 text-sm font-medium inline-flex items-center gap-1 disabled:opacity-50"
                  data-testid="detail-diagnose-btn"
                  title="Diagnosi: perché la gara non avanza? Mostra pratiche escluse e motivazioni"
                >
                  🔬 {diagnosing ? 'Analisi...' : 'Diagnosi'}
                </button>
                <button
                  onClick={handleRecompute}
                  disabled={recomputing}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-amber-300 text-sm font-medium inline-flex items-center gap-1 disabled:opacity-50"
                  data-testid="detail-recompute-btn"
                  title="Ricalcola entries scansionando le pratiche del periodo"
                >
                  <ArrowsClockwise className={`w-4 h-4 ${recomputing ? 'animate-spin' : ''}`} />
                  {recomputing ? 'Ricalcolo...' : 'Ricalcola'}
                </button>
                {otherShopsCount > 0 && (
                  <button
                    onClick={() => setCopyOpen(true)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-blue-300 text-sm font-medium inline-flex items-center gap-1"
                    data-testid="detail-copy-btn"
                  >
                    <Copy className="w-4 h-4" /> Copia gara
                  </button>
                )}
                <button
                  onClick={() => setEditOpen(true)}
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-500 rounded text-white text-sm font-medium inline-flex items-center gap-1"
                  data-testid="detail-edit-btn"
                >
                  <PencilSimple className="w-4 h-4" /> Modifica
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ====== Totali ====== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-3" data-testid="totals-pieces">
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <ChartBar className="w-3 h-3" /> Pezzi totali
            </div>
            <div className="text-2xl font-bold text-white mt-1">{board.totals.pieces}</div>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-3" data-testid="totals-revenue">
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <CurrencyEur className="w-3 h-3" /> Ricavo
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              € {board.totals.revenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <TargetIcon className="w-3 h-3" /> Target attivi
            </div>
            <div className="text-2xl font-bold text-white mt-1">{board.targets.length}</div>
          </div>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <Gift className="w-3 h-3" /> Premi configurati
            </div>
            <div className="text-2xl font-bold text-white mt-1">{board.prizes.length}</div>
          </div>
        </div>

        {/* ====== Aggregato multi-shop ====== */}
        {board.companyAggregate && board.companyAggregate.byShop.length > 1 && (
          <div className="mb-6 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4" data-testid="company-aggregate">
            <h3 className="text-emerald-300 font-bold flex items-center gap-2 mb-3">
              <Storefront className="w-5 h-5" weight="duotone" />
              Aggregato azienda · gare gemelle (templateKey {comp.templateKey})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-slate-900/50 rounded p-2">
                <div className="text-xs text-slate-500">Pezzi azienda</div>
                <div className="text-white font-bold text-lg">{board.companyAggregate.totalPieces}</div>
              </div>
              <div className="bg-slate-900/50 rounded p-2">
                <div className="text-xs text-slate-500">Ricavo azienda</div>
                <div className="text-white font-bold text-lg">
                  € {board.companyAggregate.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              {board.companyAggregate.byShop
                .slice()
                .sort((a, b) => b.pieces - a.pieces)
                .map((sh) => (
                  <div
                    key={sh.tenantId}
                    className="flex items-center justify-between bg-slate-900/50 rounded px-3 py-1.5 text-sm"
                    data-testid={`shop-row-${sh.tenantId}`}
                  >
                    <span className="text-slate-200">
                      {shopLabel(sh.tenantId, shops)}
                      {sh.tenantId === activeShopId && (
                        <span className="ml-2 text-xs text-amber-300">(questo shop)</span>
                      )}
                    </span>
                    <span className="text-slate-400 text-xs">
                      <span className="text-white font-bold">{sh.pieces}</span> pezzi · €{' '}
                      {sh.revenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ====== Targets ====== */}
        <section className="mb-6">
          <h2 className="text-sm uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-1">
            <TargetIcon className="w-4 h-4" /> Target ({board.targets.length})
          </h2>
          {board.targets.length === 0 ? (
            <div className="text-slate-500 text-sm border border-dashed border-slate-700 rounded p-4">
              Nessun target. La gara conta tutte le pratiche di tutte le categorie.
            </div>
          ) : (
            <div className="space-y-2">
              {board.targets.map((t) => {
                const pct = t.progressPercent ?? 0;
                const reached = t.targetPieces > 0 && t.currentPieces >= t.targetPieces;
                return (
                  <div
                    key={t.id}
                    className={`bg-slate-900 border rounded-lg p-3 ${
                      reached ? 'border-emerald-500/40' : 'border-slate-700'
                    }`}
                    data-testid={`target-${t.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {CATEGORY_LABEL[t.category as keyof typeof CATEGORY_LABEL] || t.category}
                        </span>
                        <span className="text-white font-medium truncate">{t.label}</span>
                        {reached && (
                          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                            ✓ Target raggiunto
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-white flex-shrink-0 ml-2">
                        {t.currentPieces}
                        <span className="text-slate-500 font-normal"> / {t.targetPieces}</span>
                      </div>
                    </div>
                    {progressBar(pct, reached ? 'bg-emerald-500' : 'bg-amber-500')}
                    {t.progressPercent !== null && (
                      <div className="text-xs text-slate-500 text-right mt-1">{pct}%</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ====== Premi a scaglioni ====== */}
        {board.prizes.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-1">
              <Gift className="w-4 h-4" /> Premi ({board.prizes.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['OPERATOR', 'SHOP', 'COMPANY'] as const).map((scope) => {
                const list = prizesByScope[scope];
                if (!list.length) return null;
                const accentMap = {
                  OPERATOR: 'border-amber-500/30 bg-amber-500/5',
                  SHOP: 'border-blue-500/30 bg-blue-500/5',
                  COMPANY: 'border-emerald-500/30 bg-emerald-500/5',
                } as const;
                const labelColor = {
                  OPERATOR: 'text-amber-300',
                  SHOP: 'text-blue-300',
                  COMPANY: 'text-emerald-300',
                } as const;
                return (
                  <div
                    key={scope}
                    className={`rounded-xl p-4 border ${accentMap[scope]}`}
                    data-testid={`prize-scope-${scope}`}
                  >
                    <h3 className={`font-bold ${labelColor[scope]} text-sm mb-3`}>
                      {PRIZE_SCOPE_LABEL[scope]}
                    </h3>
                    <div className="space-y-2">
                      {list
                        .slice()
                        .sort((a, b) => a.threshold - b.threshold)
                        .map((p) => {
                          const { current, max } = computePrizeProgress(p);
                          const reached = max > 0 && current >= max;
                          const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
                          return (
                            <div
                              key={p.id}
                              className={`bg-slate-900/60 rounded p-2.5 ${
                                reached ? 'ring-1 ring-emerald-400' : ''
                              }`}
                              data-testid={`prize-${p.id}`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-white truncate">
                                    {p.label}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    {PRIZE_CATEGORY_LABEL[p.category as keyof typeof PRIZE_CATEGORY_LABEL] || p.category}
                                    {' · soglia '}
                                    {p.threshold}
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  {p.prizeValue !== null && (
                                    <div className="text-sm font-bold text-amber-300">
                                      € {p.prizeValue.toLocaleString('it-IT')}
                                    </div>
                                  )}
                                  {reached && (
                                    <div className="text-[11px] text-emerald-400 font-bold">✓ Raggiunto</div>
                                  )}
                                </div>
                              </div>
                              {progressBar(pct, reached ? 'bg-emerald-500' : 'bg-slate-600')}
                              <div className="text-[11px] text-slate-500 text-right mt-1">
                                {current} / {max}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ====== Classifica operatori ====== */}
        <section className="mb-6">
          <h2 className="text-sm uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-1">
            <Trophy className="w-4 h-4" /> Classifica operatori
          </h2>
          {board.operatorRanking.length === 0 ? (
            <div className="text-slate-500 text-sm border border-dashed border-slate-700 rounded p-4">
              Nessuna pratica/vendita ancora assegnata a un operatore.
            </div>
          ) : (
            <div className="space-y-1.5">
              {board.operatorRanking.map((row) => {
                const u = users[row.userId];
                const name = userLabel(u, `Utente ${row.userId.slice(0, 8)}`);
                const isPodium = row.rank <= 3;
                return (
                  <div
                    key={row.userId}
                    className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 border ${
                      isPodium
                        ? 'bg-amber-500/5 border-amber-500/30'
                        : 'bg-slate-900 border-slate-700'
                    }`}
                    data-testid={`rank-row-${row.userId}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                        {rankIcon(row.rank) || (
                          <span className="text-xs font-bold text-slate-400">#{row.rank}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-white font-medium truncate">{name}</div>
                        {u?.email && (
                          <div className="text-xs text-slate-500 truncate">{u.email}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-white font-bold">{row.pieces}</div>
                      <div className="text-xs text-slate-500">pezzi</div>
                      {row.revenue > 0 && (
                        <div className="text-xs text-slate-400">
                          € {row.revenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ====== Modali ====== */}
      <CompetitionModal
        open={editOpen}
        initial={comp}
        onClose={() => setEditOpen(false)}
        onSaved={() => typeof id === 'string' && fetchAll(id)}
      />
      <CopyModal
        open={copyOpen}
        competition={comp}
        shops={shops}
        currentShopId={activeShopId}
        onClose={() => setCopyOpen(false)}
        onCopied={() => {
          setCopyOpen(false);
          alert('Gara copiata sull\'altro shop con successo.');
        }}
      />
    </OperatorLayout>
  );
}
