import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Crown, CaretDown, CaretUp, EyeSlash } from 'phosphor-react';
import api from '@/lib/axios';

/**
 * Phase H — Widget gare live per la dashboard del founder/operatore.
 *
 * Mostra:
 *  - Per ogni gara IN CORSO che include lo shop attivo:
 *    titolo, periodo, progress bar (entries / target totale), top venditori
 *    (default 3, espandibile a tutta la classifica)
 *  - Click sul titolo → dettaglio gara
 *  - Stato vuoto: link "crea la prima gara" (visibile solo a chi ha permessi)
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

export default function LiveCompetitionsWidget({
  canManageCompetitions,
}: {
  canManageCompetitions?: boolean;
}) {
  const [data, setData] = useState<Overview | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<Record<string, Top[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/competitions/monthly-overview');
        if (!cancelled) setData(res.data);
      } catch (err) {
        // best-effort: il widget non blocca la dashboard
        console.warn('[LiveCompetitionsWidget]', err);
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
    if (expandedData[compId]) return; // già caricato
    try {
      const res = await api.get(`/competitions/monthly-overview?top=20`);
      const target = (res.data as Overview).activeCompetitions.find((c) => c.id === compId);
      if (target) {
        setExpandedData((s) => ({ ...s, [compId]: target.top3 }));
      }
    } catch (err) {
      console.warn('[LiveCompetitionsWidget] expand failed', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 animate-pulse h-40" />
    );
  }

  const comps = data?.activeCompetitions || [];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5" data-testid="dashboard-live-competitions">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" weight="fill" />
            Gare in corso · live
          </h3>
          {data?.monthLabel && (
            <p className="text-xs text-slate-500 mt-0.5">{data.monthLabel}</p>
          )}
        </div>
        <Link
          href="/operator/competitions"
          className="text-xs text-amber-400 hover:text-amber-300"
          data-testid="dashboard-live-comps-all"
        >
          Vedi tutte →
        </Link>
      </div>

      {comps.length === 0 ? (
        <div className="text-center py-6 text-slate-500 text-sm">
          {canManageCompetitions ? (
            <>
              Nessuna gara attiva.
              <br />
              <Link href="/operator/competitions" className="text-amber-400 hover:text-amber-300">
                Crea la prima gara
              </Link>
            </>
          ) : (
            'Nessuna gara attiva al momento.'
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {comps.map((c) => {
            const isExpanded = expandedId === c.id;
            const fullTop = isExpanded && expandedData[c.id] ? expandedData[c.id] : c.top3;
            return (
              <div
                key={c.id}
                className="border border-slate-800 rounded-xl bg-slate-950/50"
                data-testid={`dashboard-live-comp-${c.id}`}
              >
                <div className="p-3">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <Link
                      href={`/operator/competitions/${c.id}`}
                      className="flex-1 min-w-0 group"
                    >
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-200 group-hover:text-amber-300 truncate">
                          {c.title}
                        </h4>
                        {c.isHidden && canManageCompetitions && (
                          <EyeSlash className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {String(c.startDate).slice(0, 10)} → {String(c.endDate).slice(0, 10)}
                      </p>
                    </Link>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xl font-black text-amber-400">{c.totalEntriesPieces}</div>
                      <div className="text-[10px] text-slate-500">/ {c.totalTargetPieces || '—'} pezzi</div>
                    </div>
                  </div>

                  {c.totalTargetPieces > 0 && (
                    <div className="mb-2">
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

                  {fullTop.length > 0 ? (
                    <div className="space-y-1">
                      {fullTop.map((u, i) => {
                        const colors =
                          i === 0
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                            : i === 1
                            ? 'bg-slate-700/40 border-slate-600 text-slate-200'
                            : i === 2
                            ? 'bg-orange-900/30 border-orange-700/50 text-orange-200'
                            : 'bg-slate-800/40 border-slate-700 text-slate-300';
                        return (
                          <div
                            key={u.userId}
                            className={`flex items-center gap-2 px-2 py-1 rounded border text-xs ${colors}`}
                          >
                            {i === 0 ? (
                              <Crown className="w-3.5 h-3.5" weight="fill" />
                            ) : (
                              <span className="w-3.5 text-center font-bold">{i + 1}</span>
                            )}
                            <span className="flex-1 truncate">{u.name}</span>
                            <span className="font-bold">{u.pieces}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 italic py-1">
                      Nessuno in classifica ancora.
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleExpand(c.id)}
                  className="w-full text-xs text-slate-400 hover:text-amber-300 py-1.5 border-t border-slate-800 flex items-center justify-center gap-1"
                  data-testid={`dashboard-live-comp-expand-${c.id}`}
                >
                  {isExpanded ? (
                    <>
                      <CaretUp className="w-3 h-3" /> Mostra meno
                    </>
                  ) : (
                    <>
                      <CaretDown className="w-3 h-3" /> Estendi · vedi tutti gli operatori
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
