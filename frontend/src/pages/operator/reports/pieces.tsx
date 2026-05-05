import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import OperatorLayout from '@/components/layout/OperatorLayout';
import api from '@/lib/axios';
import { useAuthStore } from '@/stores/authStore';
import { usePermission } from '@/hooks/usePermission';
import {
  ChartBar,
  Crown,
  Buildings,
  Storefront,
  ArrowDown,
  Trophy,
  FileArrowDown,
} from 'phosphor-react';

/**
 * TAPPA 3.1 — /operator/reports/pieces
 *
 * Report dei "pezzi" del periodo (default mese corrente):
 *  - 1 pezzo per ogni pratica ACTIVATED, non importata, con venditore assegnato
 *  - filtri: scope (shop/company), categoria, provider, operatore
 *  - export CSV
 *
 * Indipendente dalle gare: anche se non c'è alcuna gara attiva, qui vedi
 * SEMPRE chi ha venduto cosa nel mese.
 */

interface BreakdownRow {
  userId: string;
  userName: string;
  userEmail: string | null;
  shopId: string;
  breakdown: Record<string, number>;
  total: number;
}
interface ReportData {
  from: string;
  to: string;
  scope: 'shop' | 'company';
  filters: { category: string | null; provider: string | null; operatorId: string | null };
  grandTotal: number;
  rows: BreakdownRow[];
}

const CATEGORIES = [
  { v: '', l: 'Tutte' },
  { v: 'FIXED_LINE', l: 'Rete fissa' },
  { v: 'MOBILE', l: 'Mobile' },
  { v: 'ENERGY', l: 'Luce/Gas' },
];

function rankIcon(rank: number) {
  if (rank === 1) return <Crown className="w-5 h-5 text-amber-400" weight="fill" />;
  if (rank === 2) return <Crown className="w-5 h-5 text-slate-300" weight="fill" />;
  if (rank === 3) return <Crown className="w-5 h-5 text-orange-400" weight="fill" />;
  return null;
}

function firstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function PiecesReportPage() {
  const router = useRouter();
  const { isAuthenticated, shops } = useAuthStore();
  const canViewReports = usePermission('canViewReports');

  const [scope, setScope] = useState<'shop' | 'company'>('shop');
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayISO());
  const [category, setCategory] = useState('');
  const [provider, setProvider] = useState('');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (!canViewReports) { router.push('/operator/dashboard'); return; }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, canViewReports, scope, from, to, category, provider]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        scope, from, to,
        ...(category ? { category } : {}),
        ...(provider ? { provider } : {}),
      });
      const res = await api.get(`/reports/pieces?${params.toString()}`);
      setData(res.data);
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || 'Errore caricamento report');
    } finally {
      setLoading(false);
    }
  };

  const breakdownKeys = useMemo(() => {
    const set = new Set<string>();
    (data?.rows || []).forEach((r) => Object.keys(r.breakdown).forEach((k) => set.add(k)));
    return Array.from(set).sort();
  }, [data]);

  const exportCsv = () => {
    if (!data) return;
    const headers = ['Operatore', 'Email', 'Negozio', 'Totale', ...breakdownKeys];
    const lines = [headers.join(';')];
    for (const r of data.rows) {
      const shopName = shops.find((s: any) => s.shopId === r.shopId)?.name || r.shopId.slice(0, 8);
      const cols = [
        r.userName,
        r.userEmail || '',
        shopName,
        String(r.total),
        ...breakdownKeys.map((k) => String(r.breakdown[k] || 0)),
      ];
      lines.push(cols.map((c) => `"${c.replace(/"/g, '""')}"`).join(';'));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-pezzi-${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    try {
      const month = from.slice(0, 7); // YYYY-MM
      const res = await api.post('/exports/monthly-pieces-pdf', { month }, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-pezzi-${month}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Errore generazione PDF');
    }
  };

  return (
    <OperatorLayout>
      <div className="max-w-6xl mx-auto" data-testid="pieces-report-page">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ChartBar className="w-6 h-6 text-amber-400" weight="duotone" />
              Report pezzi
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Pezzi venduti nel periodo (1 pezzo per pratica attivata, esclusi import).
              Indipendente dalle gare.
            </p>
          </div>
          {data && data.rows.length > 0 && (
            <div className="flex items-center gap-2">
              <button onClick={exportPdf}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 border border-amber-500 rounded text-white text-sm font-medium inline-flex items-center gap-1"
                data-testid="export-pdf">
                <FileArrowDown className="w-4 h-4" /> Scarica PDF
              </button>
              <button onClick={exportCsv}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-white text-sm font-medium inline-flex items-center gap-1"
                data-testid="export-csv">
                <FileArrowDown className="w-4 h-4" /> Esporta CSV
              </button>
            </div>
          )}
        </div>

        {/* Filtri */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs text-slate-400 mb-1 block">Ambito</label>
              <div className="grid grid-cols-2 gap-1">
                <button onClick={() => setScope('shop')}
                  className={`px-2 py-1.5 rounded text-xs font-medium border ${
                    scope === 'shop'
                      ? 'border-amber-400 bg-amber-500/10 text-amber-200'
                      : 'border-slate-700 bg-slate-800 text-slate-400'}`}
                  data-testid="filter-scope-shop">
                  <Storefront className="w-3 h-3 inline mr-1" /> Shop
                </button>
                <button onClick={() => setScope('company')}
                  className={`px-2 py-1.5 rounded text-xs font-medium border ${
                    scope === 'company'
                      ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                      : 'border-slate-700 bg-slate-800 text-slate-400'}`}
                  data-testid="filter-scope-company">
                  <Buildings className="w-3 h-3 inline mr-1" /> Azienda
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Da</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">A</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Categoria</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm">
                {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Provider</label>
              <input type="text" value={provider} onChange={(e) => setProvider(e.target.value)}
                placeholder="TIM, SKY, VODAFONE..."
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm" />
            </div>
          </div>
        </div>

        {/* Totale */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
              <div className="text-xs text-slate-500 flex items-center gap-1"><Trophy className="w-3 h-3" /> Pezzi totali</div>
              <div className="text-3xl font-bold text-white mt-1">{data.grandTotal}</div>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
              <div className="text-xs text-slate-500">Operatori coinvolti</div>
              <div className="text-3xl font-bold text-white mt-1">{data.rows.length}</div>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 col-span-2">
              <div className="text-xs text-slate-500">Periodo</div>
              <div className="text-lg font-bold text-white mt-1">
                {new Date(data.from).toLocaleDateString('it-IT')} → {new Date(data.to).toLocaleDateString('it-IT')}
              </div>
            </div>
          </div>
        )}

        {/* Classifica */}
        {loading ? (
          <div className="text-slate-400 text-center py-10">Caricamento...</div>
        ) : !data || data.rows.length === 0 ? (
          <div className="text-center py-16 text-slate-500 border border-dashed border-slate-700 rounded-xl">
            <ChartBar className="w-12 h-12 mx-auto mb-3 text-slate-600" weight="duotone" />
            <p>Nessun pezzo nel periodo selezionato.</p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/60 text-xs text-slate-400 uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Operatore</th>
                  <th className="px-3 py-2 text-left">Negozio</th>
                  {breakdownKeys.map((k) => (
                    <th key={k} className="px-3 py-2 text-right">{k.replace('|', ' · ')}</th>
                  ))}
                  <th className="px-3 py-2 text-right">
                    <ArrowDown className="w-3 h-3 inline" /> Totale
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => {
                  const rank = i + 1;
                  const shopName = shops.find((s: any) => s.shopId === r.shopId)?.name || r.shopId.slice(0, 8);
                  return (
                    <tr key={`${r.userId}-${r.shopId}`}
                      className={`border-t border-slate-800 ${rank <= 3 ? 'bg-amber-500/5' : ''}`}
                      data-testid={`row-${r.userId}`}>
                      <td className="px-3 py-2 text-slate-300">
                        <div className="flex items-center gap-1">
                          {rankIcon(rank) || <span className="text-xs text-slate-500">#{rank}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-white font-medium">{r.userName}</div>
                        {r.userEmail && <div className="text-xs text-slate-500">{r.userEmail}</div>}
                      </td>
                      <td className="px-3 py-2 text-slate-400 text-xs">{shopName}</td>
                      {breakdownKeys.map((k) => (
                        <td key={k} className="px-3 py-2 text-right text-slate-300">
                          {r.breakdown[k] || ''}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right">
                        <span className="text-white font-bold text-lg">{r.total}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </OperatorLayout>
  );
}
