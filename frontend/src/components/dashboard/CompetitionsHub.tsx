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
} from 'phosphor-react';
import api from '@/lib/axios';
import { useAuthStore } from '@/stores/authStore';

/**
 * UNIFIED — Widget gare + I miei pezzi.
 *
 * Sostituisce sia `MyPiecesWidget` che il vecchio `LiveCompetitionsWidget`,
 * che apparivano "appiccicati" e ridondanti sulla dashboard.
 *
 * Layout in due tier:
 *   1. Header con "I miei pezzi del mese" (totale + breakdown categorie)
 *   2. Lista gare in corso con progress bar + top 3 venditori
 *      (espandibile a top 20)
 *
 * Se l'utente NON è in classifica nelle top N, mostriamo comunque
 * la sua posizione (chiamata addizionale con top=50).
 */
type Top = { userId: string; name: string; pieces: number };
type Live = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  scopeType: string;
  isHidden: boolean;
  totalTargetPieces: number;
  totalEntriesPieces: number;
  progressPercent: number;
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

const CAT_LABEL: Record<string, string> = {
  FIXED_LINE: 'Rete fissa',
  MOBILE: 'Mobile',
  ENERGY: 'Luce/Gas',
  SKY: 'SKY',
  DEVICE: 'Dispositivi',
  UNKNOWN: 'Altro',
};

export default function CompetitionsHub({
  canManageCompetitions,
}: {
  canManageCompetitions?: boolean;
}) {
  const { user } = useAuthStore();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [myPieces, setMyPieces] = useState<MyPieces | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedRanking, setExpandedRanking] = useState<Record<string, Top[]>>({});
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
        console.warn('[CompetitionsHub]', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleExpand = async (compId: string) => {
    if (expandedId === compId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(compId);
    if (expandedRanking[compId]) return;
    try {
      const res = await api.get('/competitions/monthly-overview?top=20');
      const target = (res.data as Overview).activeCompetitions.find((c) => c.id === compId);
      if (target) {
        setExpandedRanking((s) => ({ ...s, [compId]: target.top3 }));
      }
    } catch (err) {
      console.warn('[CompetitionsHub] expand failed', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 animate-pulse h-56" />
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
      className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-900/10 border border-amber-500/30 rounded-2xl overflow-hidden"
      data-testid="dashboard-competitions-hub"
    >
      {/* Header personale: I miei pezzi del mese */}
      <div className="p-6 border-b border-slate-800/80 bg-amber-500/5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-amber-400/80 mb-1">
              {monthLabel}
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" weight="fill" />
              I miei pezzi
            </h2>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-black text-amber-400">{myTotal}</span>
              <span className="text-sm text-slate-400">pezzi del mese</span>
            </div>
          </div>
          <Link
            href="/operator/reports/pieces"
            className="text-xs text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 self-start mt-1"
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
                  className="bg-slate-800/60 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-300"
                >
                  {CAT_LABEL[cat] || cat}: <strong className="text-amber-300">{n}</strong>
                </span>
              ))}
          </div>
        )}
      </div>

      {/* Lista gare */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <ChartBar className="w-3.5 h-3.5" />
            Gare in corso · live
          </h3>
          <Link
            href="/operator/competitions"
            className="text-xs text-slate-400 hover:text-amber-300"
          >
            Vedi tutte →
          </Link>
        </div>

        {comps.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            <p className="mb-1">Nessuna gara attiva al momento.</p>
            {canManageCompetitions && (
              <Link
                href="/operator/competitions"
                className="text-amber-400 hover:text-amber-300"
              >
                Crea la prima gara
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {comps.map((c) => {
              const isExpanded = expandedId === c.id;
              const ranking = isExpanded && expandedRanking[c.id] ? expandedRanking[c.id] : c.top3;
              const myEntry = ranking.find((r) => r.userId === user?.id);
              const myPosition = myEntry
                ? ranking.findIndex((r) => r.userId === user?.id) + 1
                : null;
              return (
                <div
                  key={c.id}
                  className="border border-slate-800 rounded-xl bg-slate-950/50 overflow-hidden"
                  data-testid={`hub-comp-${c.id}`}
                >
                  <Link
                    href={`/operator/competitions/${c.id}`}
                    className="block p-3 hover:bg-slate-900/60 transition"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-200 hover:text-amber-300 truncate flex items-center gap-1.5">
                          {c.title}
                          {c.isHidden && canManageCompetitions && (
                            <EyeSlash className="w-3.5 h-3.5 text-slate-500" />
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {String(c.startDate).slice(0, 10)} → {String(c.endDate).slice(0, 10)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xl font-black text-amber-400">
                          {c.totalEntriesPieces}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          / {c.totalTargetPieces || '—'} pezzi
                        </div>
                      </div>
                    </div>

                    {c.totalTargetPieces > 0 && (
                      <div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all"
                            style={{ width: `${c.progressPercent}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 text-right">
                          {c.progressPercent}%
                        </div>
                      </div>
                    )}
                  </Link>

                  {ranking.length > 0 && (
                    <div className="px-3 pb-3 space-y-1">
                      {ranking.map((u, i) => {
                        const isMe = u.userId === user?.id;
                        const colors =
                          i === 0
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                            : i === 1
                            ? 'bg-slate-700/40 border-slate-600 text-slate-200'
                            : i === 2
                            ? 'bg-orange-900/30 border-orange-700/50 text-orange-200'
                            : 'bg-slate-800/40 border-slate-700 text-slate-300';
                        const meRing = isMe ? 'ring-1 ring-cyan-400/50' : '';
                        return (
                          <div
                            key={u.userId}
                            className={`flex items-center gap-2 px-2 py-1 rounded border text-xs ${colors} ${meRing}`}
                          >
                            {i === 0 ? (
                              <Crown className="w-3.5 h-3.5" weight="fill" />
                            ) : (
                              <span className="w-3.5 text-center font-bold">{i + 1}</span>
                            )}
                            <span className="flex-1 truncate">
                              {u.name}
                              {isMe && (
                                <span className="text-cyan-300 ml-1 font-semibold">(tu)</span>
                              )}
                            </span>
                            <span className="font-bold">{u.pieces}</span>
                          </div>
                        );
                      })}

                      {/* Se non sono nei mostrati e c'è uno me piazzato più in giù */}
                      {!myEntry && user?.id && c.top3.length === 0 && (
                        <div className="text-[11px] text-slate-500 italic py-1 text-center">
                          Sii il primo a mettere a segno un pezzo.
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => handleExpand(c.id)}
                    className="w-full text-xs text-slate-400 hover:text-amber-300 py-1.5 border-t border-slate-800 flex items-center justify-center gap-1 transition"
                    data-testid={`hub-comp-expand-${c.id}`}
                  >
                    {isExpanded ? (
                      <>
                        <CaretUp className="w-3 h-3" /> Mostra meno
                      </>
                    ) : (
                      <>
                        <CaretDown className="w-3 h-3" /> Estendi · vedi tutta la classifica
                      </>
                    )}
                  </button>

                  {myPosition && myPosition > 3 && !isExpanded && (
                    <div className="px-3 pb-2 -mt-1">
                      <div className="text-[10px] text-cyan-400 text-center">
                        Sei in {myPosition}ª posizione · clicca "Estendi"
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
