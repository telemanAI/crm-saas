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
  /** Backend (enrichOperatorRanking) — nome reale risolto dal DB */
  displayName?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}
interface PracticeBreakdownRow {
  entryId: string;
  targetId: string | null;
  pieces: number;
  practiceId: string | null;
  practiceCreatedAt: string | null;
  provider: string | null;
  offerName: string | null;
  category: string | null;
  sellerId: string | null;
  sellerName: string;
  customerId: string | null;
  customerName: string | null;
  shopId: string | null;
  shopName: string | null;
  // FIX bug device sale — campi extra presenti SOLO sulle entries DEVICE_SALE
  sourceType?: 'DEVICE_SALE' | string;
  linkedPracticeId?: string | null;
  linkedPracticeLabel?: string | null;
  productId?: string | null;
  productName?: string | null;
  productSku?: string | null;
  quantity?: number | null;
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
  /** Tappa 3.2 — dettaglio per dropdown UI */
  practiceBreakdown?: PracticeBreakdownRow[];
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
  // Tappa 3.2 — riga operatore espansa nel dropdown classifica
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  // fix-final5 — target espanso nella sezione Target (mostra le pratiche)
  const [expandedTarget, setExpandedTarget] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [recomputing, setRecomputing] = useState(false);

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
                const isExpanded = expandedTarget === t.id;
                // fix-final5 — pratiche di QUESTO target dal practiceBreakdown
                const targetPractices = (board.practiceBreakdown || []).filter(
                  (p) => p.targetId === t.id,
                );
                return (
                  <div
                    key={t.id}
                    className={`bg-slate-900 border rounded-lg overflow-hidden ${
                      reached ? 'border-emerald-500/40' : 'border-slate-700'
                    }`}
                    data-testid={`target-${t.id}`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedTarget(isExpanded ? null : t.id)}
                      className="w-full text-left p-3 hover:bg-slate-800/40 transition"
                      data-testid={`target-toggle-${t.id}`}
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
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <div className="text-sm font-bold text-white">
                            {t.currentPieces}
                            <span className="text-slate-500 font-normal"> / {t.targetPieces}</span>
                          </div>
                          <span className="text-slate-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </div>
                      {progressBar(pct, reached ? 'bg-emerald-500' : 'bg-amber-500')}
                      {t.progressPercent !== null && (
                        <div className="text-xs text-slate-500 text-right mt-1">{pct}%</div>
                      )}
                    </button>

                    {/* fix-final5 — Dropdown: pratiche che hanno riempito QUESTO target.
                        Ogni riga è cliccabile → naviga a /operator/practices/[id] */}
                    {isExpanded && (
                      <div
                        className="border-t border-slate-700 bg-slate-950/40 px-3 py-2.5"
                        data-testid={`target-details-${t.id}`}
                      >
                        {targetPractices.length === 0 ? (
                          <div className="text-xs text-slate-500 italic py-1">
                            Nessuna pratica registrata per questo target.
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-72 overflow-auto pr-1">
                            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
                              {targetPractices.length} pratiche · click per aprire
                            </div>
                            {targetPractices.map((p) => {
                              // FIX bug device sale — render diverso per DEVICE_SALE.
                              // Le entries di vendita dispositivi non hanno una "pratica"
                              // ma un movimento. Mostriamo prodotto/quantità + link a
                              // cliente e pratica eventualmente collegati al movimento.
                              const isDeviceSale = p.sourceType === 'DEVICE_SALE';
                              const mainHref = isDeviceSale
                                ? '#'
                                : p.practiceId
                                ? `/operator/practices/${p.practiceId}`
                                : '#';
                              const RowWrapper: any = isDeviceSale ? 'div' : Link;
                              const rowProps = isDeviceSale ? {} : { href: mainHref };
                              return (
                                <RowWrapper
                                  key={p.entryId}
                                  {...rowProps}
                                  className={`block bg-slate-900/60 border border-slate-800 rounded px-2.5 py-2 text-[11px] hover:border-amber-500/50 hover:bg-slate-900 transition ${
                                    isDeviceSale ? '' : 'cursor-pointer'
                                  }`}
                                  data-testid={`target-practice-${p.entryId}`}
                                >
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    {isDeviceSale && (
                                      <span className="text-[9px] font-bold uppercase tracking-wide bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">
                                        📦 Dispositivo
                                      </span>
                                    )}
                                    <span className="text-slate-200 font-semibold flex-1 min-w-[140px] truncate">
                                      {isDeviceSale
                                        ? `${p.productName ?? '— prodotto —'}${p.productSku ? ` (${p.productSku})` : ''}`
                                        : p.offerName || '— offerta —'}
                                    </span>
                                    {isDeviceSale && p.quantity ? (
                                      <span className="text-amber-400 font-semibold">
                                        ×{p.quantity}
                                      </span>
                                    ) : null}
                                    <span className="inline-flex items-center gap-1 text-slate-400">
                                      {!isDeviceSale && (p.provider || 'n/d')}
                                    </span>
                                    <span className="text-slate-500">
                                      {p.practiceCreatedAt
                                        ? new Date(p.practiceCreatedAt).toLocaleDateString('it-IT')
                                        : ''}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 text-slate-400">
                                    <span className="text-cyan-300">
                                      Venduto da: <strong>{p.sellerName}</strong>
                                    </span>
                                    {p.customerName && (
                                      isDeviceSale && p.customerId ? (
                                        <Link
                                          href={`/operator/customers/${p.customerId}`}
                                          onClick={(e) => e.stopPropagation()}
                                          className="text-emerald-300 hover:text-emerald-200 hover:underline"
                                        >
                                          Cliente: <strong>{p.customerName}</strong>
                                        </Link>
                                      ) : (
                                        <span className="text-emerald-300">
                                          Cliente: <strong>{p.customerName}</strong>
                                        </span>
                                      )
                                    )}
                                    {isDeviceSale && p.linkedPracticeId && p.linkedPracticeLabel && (
                                      <Link
                                        href={`/operator/practices/${p.linkedPracticeId}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-violet-300 hover:text-violet-200 hover:underline"
                                      >
                                        Pratica: <strong>{p.linkedPracticeLabel}</strong>
                                      </Link>
                                    )}
                                    {p.shopName && (
                                      <span className="text-fuchsia-300">{p.shopName}</span>
                                    )}
                                    {!isDeviceSale && (
                                      <span className="text-amber-400 ml-auto opacity-70">
                                        Apri →
                                      </span>
                                    )}
                                  </div>
                                </RowWrapper>
                              );
                            })}
                          </div>
                        )}
                      </div>
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
                // Tappa 3.2 — preferisci displayName fornito dal backend
                // (enrichOperatorRanking) → niente più "Utente xxx"
                const name = row.displayName || userLabel(u, `Utente ${row.userId.slice(0, 8)}`);
                const isPodium = row.rank <= 3;
                const isMe = row.userId === useAuthStore.getState().user?.id;
                const myPracticesForRow = (board.practiceBreakdown || []).filter(
                  (pb) => pb.sellerId === row.userId,
                );
                const isExpanded = expandedRow === row.userId;
                return (
                  <div
                    key={row.userId}
                    className={`rounded-lg border overflow-hidden ${
                      isPodium
                        ? 'bg-amber-500/5 border-amber-500/30'
                        : 'bg-slate-900 border-slate-700'
                    }`}
                    data-testid={`rank-row-${row.userId}`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedRow(isExpanded ? null : row.userId)
                      }
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-800/40 transition"
                      data-testid={`rank-row-toggle-${row.userId}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                          {rankIcon(row.rank) || (
                            <span className="text-xs font-bold text-slate-400">#{row.rank}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-white font-medium truncate flex items-center gap-2">
                            {name}
                            {isMe && (
                              <span className="text-[10px] uppercase tracking-widest text-cyan-300 font-semibold">
                                tu
                              </span>
                            )}
                          </div>
                          {(row.email || u?.email) && (
                            <div className="text-xs text-slate-500 truncate">
                              {row.email || u?.email}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 flex items-center gap-3">
                        <div>
                          <div className="text-white font-bold">{row.pieces}</div>
                          <div className="text-xs text-slate-500">pezzi</div>
                          {row.revenue > 0 && (
                            <div className="text-xs text-slate-400">
                              € {row.revenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </div>
                          )}
                        </div>
                        <span className="text-slate-500 text-xs">
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </button>

                    {/* Tappa 3.2 — Espansione: pratiche di questo operatore con cliente */}
                    {isExpanded && (
                      <div
                        className="border-t border-slate-700 bg-slate-950/40 px-3 py-2.5"
                        data-testid={`rank-row-details-${row.userId}`}
                      >
                        {myPracticesForRow.length === 0 ? (
                          <div className="text-xs text-slate-500 italic py-1">
                            Nessuna pratica disponibile per questo operatore.
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-80 overflow-auto pr-1">
                            <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
                              {myPracticesForRow.length} pratiche
                            </div>
                            {myPracticesForRow.map((p) => (
                              <div
                                key={p.entryId}
                                className="bg-slate-900/60 border border-slate-800 rounded px-2.5 py-2 text-[11px]"
                              >
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <span className="text-slate-200 font-semibold flex-1 min-w-[140px] truncate">
                                    {p.offerName || '— offerta —'}
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-slate-400">
                                    <Storefront className="w-3 h-3" />
                                    {p.provider || 'n/d'}
                                  </span>
                                  <span className="text-slate-500">
                                    {p.practiceCreatedAt
                                      ? new Date(p.practiceCreatedAt).toLocaleDateString('it-IT')
                                      : ''}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-slate-400">
                                  {p.customerName && (
                                    <span className="text-emerald-300">
                                      Cliente: <strong>{p.customerName}</strong>
                                    </span>
                                  )}
                                  {p.shopName && (
                                    <span className="text-fuchsia-300">{p.shopName}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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
