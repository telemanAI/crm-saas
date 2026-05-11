import { useEffect, useMemo, useState, Fragment } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
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
  CaretDown,
  CaretRight,
  ArrowSquareOut,
} from 'phosphor-react';

/**
 * /operator/reports/pezzi
 *
 * Mostra TUTTI i pezzi del periodo (default mese corrente) con il loro stato reale:
 *  - 1 riga = 1 pratica non importata, con venditore assegnato
 *  - filtri: scope, categoria, provider, intervallo date, stati
 *  - breakdown per stato (completed / in_progress / draft / cancelled)
 *  - lista espandibile delle pratiche con link al dettaglio
 *  - export CSV + PDF strutturato per stato
 */

interface BreakdownRow {
  userId: string;
  userName: string;
  userEmail: string | null;
  shopId: string;
  breakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  total: number;
}
interface PracticeRaw {
  id: string;
  offerName: string | null;
  provider: string | null;
  category: string | null;
  type: string | null;
  status: string | null;
  operationalStatus: string | null;
  skyTvStatus: string | null;
  customerId: string | null;
  customerName: string | null;
  createdAt: string;
  shopId: string;
  shopName: string;
  sellerId: string | null;
  sellerName: string;
}
interface ReportData {
  from: string;
  to: string;
  scope: 'shop' | 'company';
  filters: { category: string | null; provider: string | null; operatorId: string | null; statuses: string[] };
  grandTotal: number;
  statusBreakdown: Record<string, number>;
  categoryBreakdown: Record<string, number>;
  providerBreakdown: Record<string, number>;
  rows: BreakdownRow[];
  practices?: PracticeRaw[];
}

const CATEGORIES = [
  { v: '', l: 'Tutte' },
  { v: 'FIXED_LINE', l: 'Rete fissa' },
  { v: 'MOBILE', l: 'Mobile' },
  { v: 'ENERGY', l: 'Luce/Gas' },
];

const STATUSES: Array<{ v: string; l: string; cls: string }> = [
  { v: 'completed', l: 'Completata', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' },
  { v: 'in_progress', l: 'In lavorazione', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/40' },
  { v: 'draft', l: 'Bozza', cls: 'bg-slate-500/15 text-slate-300 border-slate-500/40' },
  { v: 'cancelled', l: 'Annullata', cls: 'bg-rose-500/15 text-rose-300 border-rose-500/40' },
];

const OP_STATUS_LABEL: Record<string, string> = {
  PENDING: 'In attesa',
  IN_PROGRESS: 'In lavorazione',
  ACTIVATED: 'Attivata',
  REJECTED: 'Rifiutata',
  KO_CREDITO: 'KO Credito',
  KO_COPERTURA: 'KO Copertura',
  IN_LAVORAZIONE: 'In lavorazione',
  IN_VERIFICA_WM: 'In verifica WM',
  NON_SALITA_ARCADIA: 'Non salita Arcadia',
  ATTIVO: 'Attivo',
  KO_GENERICO: 'KO generico',
  KO_RINUNCIA_CLIENTE: 'KO rinuncia',
};

function rankIcon(rank: number) {
  if (rank === 1) return <Crown className="w-5 h-5 text-amber-400" weight="fill" />;
  if (rank === 2) return <Crown className="w-5 h-5 text-slate-300" weight="fill" />;
  if (rank === 3) return <Crown className="w-5 h-5 text-orange-400" weight="fill" />;
  return null;
}

function statusMeta(s: string | null | undefined) {
  return STATUSES.find((x) => x.v === s) || { v: s || '', l: s || '—', cls: 'bg-slate-700/40 text-slate-400 border-slate-600/40' };
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
  const [statusesSel, setStatusesSel] = useState<string[]>([]);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (!canViewReports) { router.push('/operator/dashboard'); return; }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, canViewReports, scope, from, to, category, provider, statusesSel.join(',')]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        scope, from, to,
        includePractices: 'true',
        ...(category ? { category } : {}),
        ...(provider ? { provider } : {}),
        ...(statusesSel.length ? { statuses: statusesSel.join(',') } : {}),
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

  const toggleStatus = (v: string) => {
    setStatusesSel((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  };

  const breakdownKeys = useMemo(() => {
    const set = new Set<string>();
    (data?.rows || []).forEach((r) => Object.keys(r.breakdown).forEach((k) => set.add(k)));
    return Array.from(set).sort();
  }, [data]);

  const practicesByOperator = useMemo(() => {
    const m = new Map<string, PracticeRaw[]>();
    (data?.practices || []).forEach((p) => {
      if (!p.sellerId) return;
      const key = `${p.sellerId}|${p.shopId}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(p);
    });
    return m;
  }, [data]);

  const exportCsv = () => {
    if (!data) return;
    const headers = ['Data', 'Cliente', 'Operatore', 'Negozio', 'Stato', 'St. operativo', 'Categoria', 'Provider', 'Offerta'];
    const lines = [headers.join(';')];
    for (const p of data.practices || []) {
      const cols = [
        new Date(p.createdAt).toLocaleDateString('it-IT'),
        p.customerName || '',
        p.sellerName,
        p.shopName,
        statusMeta(p.status).l,
        OP_STATUS_LABEL[p.operationalStatus || ''] || p.operationalStatus || '',
        p.category || '',
        p.provider || '',
        p.offerName || '',
      ];
      lines.push(cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'));
    }
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-pezzi-${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const res = await api.post('/exports/monthly-pieces-pdf', {
        from,
        to,
        ...(statusesSel.length ? { statuses: statusesSel.join(',') } : {}),
        ...(category ? { category } : {}),
        ...(provider ? { provider } : {}),
      }, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-pezzi-${from}_${to}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || 'Errore generazione PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const toggleExpand = (key: string) => setExpanded((e) => ({ ...e, [key]: !e[key] }));

  return (
    <OperatorLayout>
      <div className="max-w-6xl mx-auto pb-12" data-testid="pieces-report-page">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ChartBar className="w-6 h-6 text-amber-400" weight="duotone" />
              Report pezzi
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Tutti i pezzi del periodo con stato reale (escluse le pratiche importate).
              Filtra per stato per affinare la vista.
            </p>
          </div>
          {data && data.rows.length > 0 && (
            <div className="flex items-center gap-2">
              <button onClick={exportPdf} disabled={pdfLoading}
                className="px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 border border-amber-500 rounded text-white text-sm font-medium inline-flex items-center gap-1"
                data-testid="export-pdf">
                <FileArrowDown className="w-4 h-4" /> {pdfLoading ? 'Generazione...' : 'Scarica PDF'}
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
                data-testid="filter-from"
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">A</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                data-testid="filter-to"
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Categoria</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                data-testid="filter-category"
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm">
                {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Provider</label>
              <input type="text" value={provider} onChange={(e) => setProvider(e.target.value)}
                placeholder="TIM, SKY, VODAFONE..."
                data-testid="filter-provider"
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-white text-sm" />
            </div>
          </div>

          {/* Stato (chips) */}
          <div className="mt-3 pt-3 border-t border-slate-800">
            <label className="text-xs text-slate-400 mb-1 block">Stato pratica</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setStatusesSel([])}
                data-testid="filter-status-all"
                className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                  statusesSel.length === 0
                    ? 'bg-amber-500/10 text-amber-200 border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
                }`}
              >
                Tutti
              </button>
              {STATUSES.map((st) => {
                const on = statusesSel.includes(st.v);
                return (
                  <button
                    key={st.v}
                    onClick={() => toggleStatus(st.v)}
                    data-testid={`filter-status-${st.v}`}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                      on
                        ? st.cls
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {st.l}
                    {data?.statusBreakdown?.[st.v] != null && (
                      <span className="ml-1 opacity-70">({data.statusBreakdown[st.v]})</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Totale */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
              <div className="text-xs text-slate-500 flex items-center gap-1"><Trophy className="w-3 h-3" /> Pezzi totali</div>
              <div className="text-3xl font-bold text-white mt-1" data-testid="kpi-grand-total">{data.grandTotal}</div>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
              <div className="text-xs text-slate-500">Operatori coinvolti</div>
              <div className="text-3xl font-bold text-white mt-1">{data.rows.length}</div>
            </div>
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 col-span-2">
              <div className="text-xs text-slate-500 mb-1">Periodo</div>
              <div className="text-base font-bold text-white">
                {new Date(data.from).toLocaleDateString('it-IT')} → {new Date(data.to).toLocaleDateString('it-IT')}
              </div>
              {/* Status badges riepilogo */}
              <div className="flex flex-wrap gap-1 mt-2">
                {STATUSES.filter((s) => data.statusBreakdown?.[s.v]).map((s) => (
                  <span key={s.v} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${s.cls}`}>
                    {s.l}: {data.statusBreakdown[s.v]}
                  </span>
                ))}
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
          <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-slate-800/60 text-xs text-slate-400 uppercase">
                <tr>
                  <th className="px-3 py-2 text-left w-10"></th>
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Operatore</th>
                  <th className="px-3 py-2 text-left">Negozio</th>
                  <th className="px-3 py-2 text-left">Stati</th>
                  {breakdownKeys.map((k) => (
                    <th key={k} className="px-3 py-2 text-right whitespace-nowrap">{k.replace('|', ' · ')}</th>
                  ))}
                  <th className="px-3 py-2 text-right">
                    <ArrowDown className="w-3 h-3 inline" /> Totale
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => {
                  const rank = i + 1;
                  const key = `${r.userId}|${r.shopId}`;
                  const isOpen = !!expanded[key];
                  const ops = practicesByOperator.get(key) || [];
                  const shopName = shops.find((s: any) => s.shopId === r.shopId)?.name
                    || ops[0]?.shopName
                    || r.shopId.slice(0, 8);
                  return (
                    <Fragment key={key}>
                      <tr
                        className={`border-t border-slate-800 hover:bg-slate-800/40 cursor-pointer ${rank <= 3 ? 'bg-amber-500/5' : ''}`}
                        onClick={() => toggleExpand(key)}
                        data-testid={`row-${r.userId}`}>
                        <td className="px-3 py-2 text-slate-400">
                          {isOpen ? <CaretDown className="w-4 h-4" /> : <CaretRight className="w-4 h-4" />}
                        </td>
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
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {STATUSES.filter((s) => r.statusBreakdown?.[s.v]).map((s) => (
                              <span key={s.v} className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${s.cls}`}>
                                {s.l.split(' ')[0]}: {r.statusBreakdown[s.v]}
                              </span>
                            ))}
                          </div>
                        </td>
                        {breakdownKeys.map((k) => (
                          <td key={k} className="px-3 py-2 text-right text-slate-300">
                            {r.breakdown[k] || ''}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right">
                          <span className="text-white font-bold text-lg">{r.total}</span>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="border-t border-slate-800 bg-slate-950/60">
                          <td colSpan={6 + breakdownKeys.length} className="px-3 py-3">
                            {ops.length === 0 ? (
                              <div className="text-xs text-slate-500 italic">Nessun dettaglio disponibile.</div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs min-w-[640px]">
                                  <thead className="text-slate-500 uppercase text-[10px]">
                                    <tr>
                                      <th className="px-2 py-1.5 text-left">Data</th>
                                      <th className="px-2 py-1.5 text-left">Cliente</th>
                                      <th className="px-2 py-1.5 text-left">Offerta / Tipo</th>
                                      <th className="px-2 py-1.5 text-left">Stato</th>
                                      <th className="px-2 py-1.5 text-left">St. operativo</th>
                                      <th className="px-2 py-1.5 text-right">Apri</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {ops.map((p) => {
                                      const stm = statusMeta(p.status);
                                      return (
                                        <tr key={p.id} className="border-t border-slate-800/50">
                                          <td className="px-2 py-1.5 text-slate-400 whitespace-nowrap">
                                            {new Date(p.createdAt).toLocaleDateString('it-IT')}
                                          </td>
                                          <td className="px-2 py-1.5 text-slate-200">{p.customerName || '—'}</td>
                                          <td className="px-2 py-1.5 text-slate-300">
                                            <div>{p.offerName || p.type || '—'}</div>
                                            <div className="text-[10px] text-slate-500">
                                              {[p.category, p.provider].filter(Boolean).join(' · ')}
                                            </div>
                                          </td>
                                          <td className="px-2 py-1.5">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${stm.cls}`}>
                                              {stm.l}
                                            </span>
                                          </td>
                                          <td className="px-2 py-1.5 text-slate-400">
                                            {OP_STATUS_LABEL[p.operationalStatus || ''] || p.operationalStatus || '—'}
                                          </td>
                                          <td className="px-2 py-1.5 text-right">
                                            <Link
                                              href={`/operator/practices/${p.id}`}
                                              className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-medium"
                                              data-testid={`practice-link-${p.id}`}
                                            >
                                              Apri <ArrowSquareOut className="w-3 h-3" />
                                            </Link>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
