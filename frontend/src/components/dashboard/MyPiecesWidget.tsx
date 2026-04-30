/**
 * TAPPA 3.1 — Widget "I miei pezzi del mese"
 *
 * Da inserire in /operator/dashboard.tsx:
 *
 *   import MyPiecesWidget from '@/components/dashboard/MyPiecesWidget';
 *   ...
 *   <MyPiecesWidget />
 *
 * Mostra: pezzi del mese del singolo operatore loggato, breakdown per
 * categoria, link al report completo.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/axios';
import { Trophy, ArrowRight, ChartBar } from 'phosphor-react';

interface MyPieces {
  from: string;
  to: string;
  grandTotal: number;
  rows: Array<{
    userId: string;
    userName: string;
    breakdown: Record<string, number>;
    total: number;
  }>;
}

const CAT_LABEL: Record<string, string> = {
  FIXED_LINE: 'Rete fissa',
  MOBILE: 'Mobile',
  ENERGY: 'Luce/Gas',
  DEVICE: 'Dispositivi',
};

export default function MyPiecesWidget() {
  const [data, setData] = useState<MyPieces | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMine();
  }, []);

  const fetchMine = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/pieces/me');
      setData(res.data);
    } catch {
      setData({ from: '', to: '', grandTotal: 0, rows: [] });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/3 mb-3" />
        <div className="h-8 bg-slate-800 rounded w-1/4" />
      </div>
    );
  }

  const me = data?.rows[0];
  const total = data?.grandTotal || 0;
  // breakdown aggregato (in /me la response ha 1 sola riga = me)
  const byCat: Record<string, number> = {};
  if (me) {
    for (const [k, v] of Object.entries(me.breakdown)) {
      const cat = k.split('|')[0];
      byCat[cat] = (byCat[cat] || 0) + v;
    }
  }

  const monthLabel = data
    ? new Date(data.from).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    : '';

  return (
    <div
      className="bg-gradient-to-br from-amber-500/5 to-slate-900 border border-amber-500/20 rounded-xl p-4"
      data-testid="my-pieces-widget"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-bold text-amber-300 flex items-center gap-1">
            <Trophy className="w-4 h-4" weight="fill" /> I miei pezzi
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{monthLabel}</p>
        </div>
        <Link
          href="/operator/reports/pieces"
          className="text-xs text-amber-400 hover:underline inline-flex items-center gap-0.5"
        >
          Report <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="text-4xl font-bold text-white mb-2">
        {total} <span className="text-base font-normal text-slate-500">pezzi</span>
      </div>

      {Object.keys(byCat).length > 0 ? (
        <div className="grid grid-cols-2 gap-1 mt-2">
          {Object.entries(byCat)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, count]) => (
              <div key={cat} className="flex justify-between text-xs bg-slate-800/40 rounded px-2 py-1">
                <span className="text-slate-400">{CAT_LABEL[cat] || cat}</span>
                <span className="text-white font-bold">{count}</span>
              </div>
            ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500 italic">
          <ChartBar className="w-3 h-3 inline mr-1" />
          Nessun pezzo questo mese. Conferma le tue pratiche per iniziare!
        </p>
      )}
    </div>
  );
}
