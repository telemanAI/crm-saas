import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Crown,
  CaretDown,
  CaretUp,
  EyeSlash,
  ArrowRight,
  ChartBar,
  Storefront,
  User as UserIcon,
  Buildings,
} from 'phosphor-react';
import api from '@/lib/axios';
import { useAuthStore } from '@/stores/authStore';

/**
 * UNIFIED — Widget gare + I miei pezzi + Chart multi-shop.
 *
 * Layout per ogni gara:
 *   ┌──────────────────────────────────────────────────────┐
 *   │ Titolo · 12/20 pezzi · 60% [progress bar globale]    │
 *   ├──────────────────────────────────────────────────────┤
 *   │ Operatori (top): nome · in gara · fuori gara         │
 *   ├──────────────────────────────────────────────────────┤
 *   │ Shops (solo se scope=company): Mascalucia 5 · ...    │  ← Tappa 3.2
 *   ├──────────────────────────────────────────────────────┤
 *   │ ▼ Vedi dettagli pratiche · classifica completa       │
 *   └──────────────────────────────────────────────────────┘
 *      ↓ click espandi
 *   Lista pratiche: offerta · gestore · venditore · cliente · data
 */
type Top = {
  userId: string;
  name: string;
  pieces: number; // backward compat
  inCompetitionPieces?: number;
  outOfCompetitionPieces?: number;
};
type ShopSlice = {
  shopId: string;
  shopName: string;
  pieces: number;
};
type Live = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  scopeType: 'shop' | 'company';
  selectedShopIds?: string[] | null;
  isHidden: boolean;
  totalTargetPieces: number;
  totalEntriesPieces: number;
  progressPercent: number;
  byShop?: ShopSlice[];
  top3: Top[];
};
type Overview = {
  monthLabel: string;
  practicesActivatedThisMonth: number;
  byCategory: Record<string, number>;
  activeCompetitions: Live[];
};
type MyPieces = {
  rows: Array<{
    userId: string;
    userName: string;
    breakdown: Record<string, number>;
    total: number;
  }>;
};
type PracticeRow = {
  entryId: string;
  practiceId: string | null;
  practiceCreatedAt: string;
  provider: string | null;
  offerName: string | null;
  category: string | null;
  sellerId: string | null;
  sellerName: string;
  customerId: string | null;
  customerName: string | null;
  shopId: string | null;
  shopName: string | null;
  pieces: number;
};
type Leaderboard = {
  competition: { id: string; title: string };
  operatorRanking: Array<{
    userId: string;
    pieces: number;
    displayName: string;
  }>;
  practiceBreakdown: PracticeRow[];
};
type MyPractice = {
  id: string;
  offerName: string | null;
  provider: string | null;
  category: string | null;
  createdAt: string;
  shopName: string | null;
  sellerName: string;
};

const CAT_LABEL: Record<string, string> = {
  FIXED_LINE: 'Rete fissa',
  MOBILE: 'Mobile',
  ENERGY: 'Luce/Gas',
  SKY: 'SKY',
  DEVICE: 'Dispositivi',
  UNKNOWN: 'Altro',
};

// Palette stabile per shop chart (max 8 shop, poi cicla)
const SHOP_COLORS = [
  'bg-amber-500',
  'bg-cyan-500',
  'bg-fuchsia-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-indigo-500',
  'bg-orange-500',
  'bg-teal-500',
];

export default function CompetitionsHub({
  canManageCompetitions,
}: {
  canManageCompetitions?: boolean;
}) {
  const { user } = useAuthStore();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [myPieces, setMyPieces] = useState<MyPieces | null>(null);
  const [myPracticesExpanded, setMyPracticesExpanded] = useState(false);
  const [myPractices, setMyPractices] = useState<MyPractice[]>([]);
  const [myPracticesLoading, setMyPracticesLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [extendedRanking, setExtendedRanking] = useState<Record<string, Top[]>>({});
  const [leaderboards, setLeaderboards] = useState<Record<string, Leaderboard>>({});
  const [leaderboardLoading, setLeaderboardLoading] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ovRes, myRes] = await Promise.all([
          api.get('/competitions/monthly-overview'),
          api.get('/reports/pieces/me').catch(() => ({ data: { rows: [] } })),
        ]);
        if (cancelled) return;
        setOverview(ovRes.data);
        setMyPieces(myRes.data);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[CompetitionsHub] overview non caricabile', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggleMyPractices = async () => {
    const next = !myPracticesExpanded;
    setMyPracticesExpanded(next);
    if (next && myPractices.length === 0) {
      setMyPracticesLoading(true);
      try {
        const res = await api.get('/reports/pieces/me?includePractices=true');
        setMyPractices(res.data.practices || []);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[CompetitionsHub] my practices fetch failed', err);
      } finally {
        setMyPracticesLoading(false);
      }
    }
  };

  const handleExpand = async (compId: string) => {
    if (expandedId === compId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(compId);

    if (!extendedRanking[compId]) {
      try {
        const res = await api.get('/competitions/monthly-overview?top=20');
        const target = (res.data as Overview).activeCompetitions.find((c) => c.id === compId);
        if (target) {
          setExtendedRanking((s) => ({ ...s, [compId]: target.top3 }));
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[CompetitionsHub] expand top failed', err);
      }
    }

    if (!leaderboards[compId]) {
      setLeaderboardLoading((s) => ({ ...s, [compId]: true }));
      try {
        const res = await api.get(`/competitions/${compId}/leaderboard`);
        setLeaderboards((s) => ({ ...s, [compId]: res.data }));
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[CompetitionsHub] leaderboard fetch failed', err);
      } finally {
        setLeaderboardLoading((s) => ({ ...s, [compId]: false }));
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 dark:bg-slate-900 dark:border-slate-800 rounded-2xl p-6 animate-pulse h-56" />
    );
  }

  const me = myPieces?.rows[0];
  const myTotal = me?.total || 0;
  const myByCat: Record<string, number> = {};
  if (me) {
    for (const [k, v] of Object.entries(me.breakdown)) {
      const cat = k.split('|')[0];
      myByCat[cat] = (myByCat[cat] || 0) + v;
    }
  }
  const monthLabel = overview?.monthLabel || '';
  const comps = overview?.activeCompetitions || [];

  return (
    <div
      className="bg-white border border-amber-300 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900 dark:to-amber-900/10 dark:border-amber-500/30 rounded-2xl overflow-hidden shadow-sm dark:shadow-none"
      data-testid="dashboard-competitions-hub"
    >
      {/* Header personale */}
      <div className="p-6 border-b border-amber-200/70 dark:border-slate-800/80 bg-amber-50 dark:bg-amber-500/5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-amber-700 dark:text-amber-400/80 mb-1">
              {monthLabel}
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500 dark:text-amber-400" weight="fill" />
              I miei pezzi
            </h2>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-black text-amber-600 dark:text-amber-400">{myTotal}</span>
              <span className="text-sm text-gray-500 dark:text-slate-400">pezzi del mese</span>
            </div>
          </div>
          <Link
            href="/operator/reports/pieces"
            className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 inline-flex items-center gap-1 self-start mt-1"
            data-testid="hub-link-report"
          >
            Report completo <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {Object.keys(myByCat).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {Object.entries(myByCat)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, n]) => (
                <span
                  key={cat}
                  className="bg-white dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded px-2 py-0.5 text-xs text-gray-700 dark:text-slate-300"
                >
                  {CAT_LABEL[cat] || cat}: <strong className="text-amber-600 dark:text-amber-300">{n}</strong>
                </span>
              ))}
          </div>
        )}

        {/* Le mie pratiche del mese — espandibile */}
        <button
          onClick={handleToggleMyPractices}
          className="mt-3 w-full text-xs text-gray-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-300 py-1.5 border-t border-amber-200/70 dark:border-slate-800 flex items-center justify-center gap-1 transition"
        >
          {myPracticesExpanded ? (
            <>
              <CaretUp className="w-3 h-3" /> Chiudi le mie pratiche
            </>
          ) : (
            <>
              <CaretDown className="w-3 h-3" /> Vedi le mie pratiche del mese
            </>
          )}
        </button>

        {myPracticesExpanded && (
          <div className="border-t border-amber-200/70 dark:border-slate-800 bg-amber-50/60 dark:bg-slate-950/40 px-3 py-2.5">
            {myPracticesLoading && (
              <div className="text-xs text-gray-500 dark:text-slate-500 italic text-center py-2">
                Caricamento pratiche…
              </div>
            )}
            {!myPracticesLoading && myPractices.length === 0 && (
              <div className="text-xs text-gray-500 dark:text-slate-500 italic text-center py-2">
                Nessuna pratica completata questo mese.
              </div>
            )}
            {!myPracticesLoading && myPractices.length > 0 && (
              <div className="space-y-1.5 max-h-72 overflow-auto pr-1">
                <div className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-slate-500 mb-1">
                  {myPractices.length} pratiche · click per aprire
                </div>
                {myPractices.map((p) => (
                  <Link
                    key={p.id}
                    href={`/operator/practices/${p.id}`}
                    className="block bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded px-2.5 py-2 text-[11px] hover:border-amber-400 dark:hover:border-amber-500/50 hover:bg-amber-50 dark:hover:bg-slate-900 transition cursor-pointer"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-gray-900 dark:text-slate-200 font-semibold flex-1 min-w-[140px] truncate">
                        {p.offerName || '— offerta —'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-gray-500 dark:text-slate-400">
                        <Storefront className="w-3 h-3" />
                        {p.provider || 'n/d'}
                      </span>
                      <span className="text-gray-400 dark:text-slate-500">
                        {p.createdAt
                          ? new Date(p.createdAt).toLocaleDateString('it-IT')
                          : ''}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-gray-500 dark:text-slate-400">
                      <span className="text-cyan-700 dark:text-cyan-300">
                        Venduto da: <strong>{p.sellerName}</strong>
                      </span>
                      {p.shopName && (
                        <span className="text-fuchsia-700 dark:text-fuchsia-300">{p.shopName}</span>
                      )}
                      <span className="text-amber-600 dark:text-amber-400 ml-auto opacity-70">Apri →</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lista gare */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm uppercase tracking-widest text-gray-500 dark:text-slate-500 flex items-center gap-2">
            <ChartBar className="w-3.5 h-3.5" />
            Gare in corso · live
          </h3>
          <Link
            href="/operator/competitions"
            className="text-xs text-gray-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-300"
            data-testid="hub-link-all-competitions"
          >
            Vedi tutte →
          </Link>
        </div>

        {comps.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-slate-500 text-sm">
            <p className="mb-1">Nessuna gara attiva al momento.</p>
            {canManageCompetitions && (
              <Link
                href="/operator/competitions"
                className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                data-testid="hub-cta-create-competition"
              >
                Crea la prima gara
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {comps.map((c) => {
              const isExpanded = expandedId === c.id;
              const ranking =
                isExpanded && extendedRanking[c.id] ? extendedRanking[c.id] : c.top3;
              const lb = leaderboards[c.id];
              const lbLoading = leaderboardLoading[c.id];
              const showShops =
                c.scopeType === 'company' && Array.isArray(c.byShop) && c.byShop.length > 1;
              const totalShopPieces = showShops
                ? Math.max(1, c.byShop!.reduce((s, x) => s + x.pieces, 0))
                : 1;

              return (
                <div
                  key={c.id}
                  className="border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950/50 overflow-hidden"
                  data-testid={`hub-comp-${c.id}`}
                >
                  {/* Header card */}
                  <Link
                    href={`/operator/competitions/${c.id}`}
                    className="block p-3 hover:bg-amber-50/60 dark:hover:bg-slate-900/60 transition"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-900 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-300 truncate flex items-center gap-1.5">
                          {c.title}
                          {c.scopeType === 'company' && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest bg-cyan-100 text-cyan-700 border border-cyan-300 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30 px-1.5 py-0.5 rounded"
                              title={
                                c.selectedShopIds && c.selectedShopIds.length
                                  ? `${c.selectedShopIds.length} negozi selezionati`
                                  : 'Tutti i negozi della company'
                              }
                            >
                              <Buildings className="w-3 h-3" /> Company
                            </span>
                          )}
                          {c.isHidden && canManageCompetitions && (
                            <EyeSlash className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                          )}
                        </h4>
                        <p className="text-[11px] text-gray-500 dark:text-slate-500 mt-0.5">
                          {String(c.startDate).slice(0, 10)} → {String(c.endDate).slice(0, 10)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xl font-black text-amber-600 dark:text-amber-400">
                          {c.totalEntriesPieces}
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-slate-500">
                          / {c.totalTargetPieces || '—'} pezzi
                        </div>
                      </div>
                    </div>

                    {c.totalTargetPieces > 0 && (
                      <div>
                        <div className="h-1.5 bg-gray-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all"
                            style={{ width: `${c.progressPercent}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-gray-500 dark:text-slate-500 mt-0.5 text-right">
                          {c.progressPercent}%
                        </div>
                      </div>
                    )}
                  </Link>

                  {/* Operatori → in gara / fuori gara */}
                  {ranking.length > 0 && (
                    <div className="px-3 pb-3 space-y-1.5">
                      {ranking.map((u, i) => {
                        const isMe = u.userId === user?.id;
                        const inG = u.inCompetitionPieces ?? u.pieces;
                        const outG = u.outOfCompetitionPieces ?? 0;
                        const colors =
                          i === 0
                            ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-500/15 dark:border-amber-500/40 dark:text-amber-200'
                            : i === 1
                            ? 'bg-gray-100 border-gray-300 text-gray-800 dark:bg-slate-700/40 dark:border-slate-600 dark:text-slate-200'
                            : i === 2
                            ? 'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/30 dark:border-orange-700/50 dark:text-orange-200'
                            : 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-slate-800/40 dark:border-slate-700 dark:text-slate-300';
                        const meRing = isMe ? 'ring-1 ring-cyan-400/50' : '';
                        return (
                          <div
                            key={u.userId}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded border text-xs ${colors} ${meRing}`}
                            data-testid={`hub-op-${c.id}-${u.userId}`}
                          >
                            {i === 0 ? (
                              <Crown className="w-3.5 h-3.5" weight="fill" />
                            ) : (
                              <span className="w-3.5 text-center font-bold">{i + 1}</span>
                            )}
                            <span className="flex-1 truncate font-semibold">
                              {u.name}
                              {isMe && (
                                <span className="text-cyan-700 dark:text-cyan-300 ml-1 font-semibold">(tu)</span>
                              )}
                            </span>
                            <span className="font-bold text-amber-700 dark:text-amber-300" title="Pezzi in gara">
                              {inG} <span className="font-normal opacity-70">in gara</span>
                            </span>
                            <span className="text-gray-500 dark:text-slate-400" title="Pezzi fuori gara nel periodo">
                              · {outG} <span className="opacity-70">fuori</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Tappa 3.2 — Chart per shop (solo gare company multi-negozio) */}
                  {showShops && (
                    <div
                      className="px-3 pb-3 border-t border-gray-200 dark:border-slate-800 pt-2.5"
                      data-testid={`hub-shop-chart-${c.id}`}
                    >
                      <div className="text-[10px] uppercase tracking-widest text-cyan-700 dark:text-cyan-400/80 mb-1.5 flex items-center gap-1">
                        <Buildings className="w-3 h-3" /> Avanzamento per negozio
                      </div>
                      {/* Barra impilata */}
                      <div className="flex h-2 rounded overflow-hidden bg-gray-200 dark:bg-slate-800 mb-2">
                        {c.byShop!.map((s, i) => (
                          <div
                            key={s.shopId}
                            className={`${SHOP_COLORS[i % SHOP_COLORS.length]} transition-all`}
                            style={{ width: `${(s.pieces / totalShopPieces) * 100}%` }}
                            title={`${s.shopName}: ${s.pieces} pezzi`}
                          />
                        ))}
                      </div>
                      {/* Legenda + numeri */}
                      <div className="grid grid-cols-2 gap-1">
                        {c.byShop!.map((s, i) => (
                          <div
                            key={s.shopId}
                            className="flex items-center gap-1.5 text-[11px] text-gray-700 dark:text-slate-300"
                          >
                            <span
                              className={`inline-block w-2 h-2 rounded-sm ${SHOP_COLORS[i % SHOP_COLORS.length]}`}
                            />
                            <span className="truncate flex-1">{s.shopName}</span>
                            <span className="font-bold tabular-nums">{s.pieces}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bottone espandi */}
                  <button
                    onClick={() => handleExpand(c.id)}
                    className="w-full text-xs text-gray-500 hover:text-amber-600 dark:text-slate-400 dark:hover:text-amber-300 py-1.5 border-t border-gray-200 dark:border-slate-800 flex items-center justify-center gap-1 transition"
                    data-testid={`hub-comp-expand-${c.id}`}
                  >
                    {isExpanded ? (
                      <>
                        <CaretUp className="w-3 h-3" /> Chiudi dettagli
                      </>
                    ) : (
                      <>
                        <CaretDown className="w-3 h-3" /> Vedi dettagli pratiche · classifica completa
                      </>
                    )}
                  </button>

                  {/* Dropdown: dettaglio pratiche con CLIENTE */}
                  {isExpanded && (
                    <div
                      className="border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/40 px-3 py-3"
                      data-testid={`hub-comp-details-${c.id}`}
                    >
                      {lbLoading && (
                        <div className="text-xs text-gray-500 dark:text-slate-500 italic text-center py-2">
                          Caricamento dettaglio…
                        </div>
                      )}
                      {!lbLoading && lb && lb.practiceBreakdown.length === 0 && (
                        <div className="text-xs text-gray-500 dark:text-slate-500 italic text-center py-2">
                          Nessuna pratica registrata per questa gara.
                        </div>
                      )}
                      {!lbLoading && lb && lb.practiceBreakdown.length > 0 && (
                        <div>
                          <div className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-slate-500 mb-2">
                            Pratiche · {lb.practiceBreakdown.length}
                          </div>
                          <div className="space-y-1.5 max-h-80 overflow-auto pr-1">
                            {lb.practiceBreakdown.map((p) => (
                              <Link
                                key={p.entryId}
                                href={p.practiceId ? `/operator/practices/${p.practiceId}` : '#'}
                                className="block bg-white dark:bg-slate-950/60 border border-gray-200 dark:border-slate-800 rounded px-2.5 py-2 text-[11px] hover:border-amber-400 dark:hover:border-amber-500/50 hover:bg-amber-50 dark:hover:bg-slate-900 transition cursor-pointer"
                                data-testid={`hub-practice-${p.entryId}`}
                              >
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <span className="text-gray-900 dark:text-slate-200 font-semibold flex-1 min-w-[140px] truncate">
                                    {p.offerName || '— offerta —'}
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-gray-500 dark:text-slate-400">
                                    <Storefront className="w-3 h-3" />
                                    {p.provider || 'n/d'}
                                  </span>
                                  <span className="text-gray-400 dark:text-slate-500">
                                    {p.practiceCreatedAt
                                      ? new Date(p.practiceCreatedAt).toLocaleDateString('it-IT')
                                      : ''}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-gray-500 dark:text-slate-400">
                                  <span className="inline-flex items-center gap-1 text-cyan-700 dark:text-cyan-300">
                                    <UserIcon className="w-3 h-3" /> Venduto da:{' '}
                                    <strong>{p.sellerName}</strong>
                                  </span>
                                  {p.customerName && (
                                    <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                                      Cliente: <strong>{p.customerName}</strong>
                                    </span>
                                  )}
                                  {p.shopName && c.scopeType === 'company' && (
                                    <span className="inline-flex items-center gap-1 text-fuchsia-700 dark:text-fuchsia-300">
                                      <Buildings className="w-3 h-3" /> {p.shopName}
                                    </span>
                                  )}
                                  <span className="text-amber-600 dark:text-amber-400 ml-auto opacity-70">Apri →</span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
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
