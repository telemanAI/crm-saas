import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import OperatorLayout from '@/components/layout/OperatorLayout';
import api from '@/lib/axios';
import { useAuthStore } from '@/stores/authStore';
import { usePermission } from '@/hooks/usePermission';
import {
  Receipt,
  Package,
  CurrencyEur,
  TrendUp,
  User as UserIcon,
  ClipboardText,
  Funnel,
  ArrowsCounterClockwise,
} from 'phosphor-react';

interface Sale {
  id: string;
  createdAt: string;
  itemId: string;
  itemName: string;
  itemSku: string;
  quantity: number;
  unitSalePrice: number | null;
  total: number | null;
  customerId: string | null;
  customerName: string | null;
  practiceId: string | null;
  practiceCode: string | null;
  soldByUserId: string | null;
  soldByName: string | null;
  notes: string | null;
  // Phase D minimal — metodo pagamento
  paymentMethod: string | null;
}

// Phase D minimal — helpers visualizzazione metodo pagamento
function paymentMethodLabel(pm: string): string {
  const map: Record<string, string> = {
    CASH: '💵 Contanti',
    CARD: '💳 Carta',
    POS: '🧾 POS',
    BANK_TRANSFER: '🏦 Bonifico',
    FINANCING: '📊 Finanziamento',
    OTHER: '… Altro',
  };
  return map[pm] || pm;
}
function paymentMethodColor(pm: string): string {
  if (pm === 'CASH') return 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
  if (pm === 'CARD' || pm === 'POS') return 'bg-blue-500/15 text-blue-300 border border-blue-500/30';
  if (pm === 'BANK_TRANSFER') return 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30';
  if (pm === 'FINANCING') return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
  return 'bg-slate-700/40 text-slate-300 border border-slate-600';
}

interface Summary {
  totalSales: number;
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  totalUnits: number;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT') + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function todayStart(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function thirtyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export default function SalesHistoryPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const canSellDevices = usePermission('canSellDevices');
  const canSeeMargins = usePermission('canManageProducts');
  const canViewAll = usePermission('canViewAllDeviceSales');

  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filtri
  const [from, setFrom] = useState(thirtyDaysAgo());
  const [to, setTo] = useState(todayStart());
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!canSellDevices) {
      router.push('/operator/dashboard');
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, canSellDevices, from, to]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const fromISO = from ? new Date(from + 'T00:00:00').toISOString() : '';
      const toISO = to ? new Date(to + 'T23:59:59').toISOString() : '';
      const qs = new URLSearchParams();
      if (fromISO) qs.set('from', fromISO);
      if (toISO) qs.set('to', toISO);
      const [listRes, sumRes] = await Promise.all([
        api.get(`/inventory/sales?${qs.toString()}`),
        api.get(`/inventory/sales/summary?${qs.toString()}`),
      ]);
      setSales(listRes.data);
      setSummary(sumRes.data);
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  };

  const groupedByDate = useMemo(() => {
    const map = new Map<string, Sale[]>();
    for (const s of sales) {
      const key = new Date(s.createdAt).toLocaleDateString('it-IT');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries());
  }, [sales]);

  return (
    <OperatorLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Receipt className="w-6 h-6 text-emerald-400" weight="duotone" />
              Storico vendite
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {canViewAll
                ? 'Tutte le vendite del negozio'
                : 'Le tue vendite (puoi vedere solo le tue)'}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-white text-sm font-medium"
              data-testid="toggle-filters"
            >
              <Funnel className="w-4 h-4 inline mr-1" weight="bold" /> Filtri
            </button>
            <button
              onClick={fetchData}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-white text-sm font-medium"
              data-testid="refresh-sales"
            >
              <ArrowsCounterClockwise className="w-4 h-4 inline" weight="bold" />
            </button>
          </div>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className={`grid gap-3 mb-5 ${canSeeMargins ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'}`}>
            <SummaryCard
              icon={<Receipt className="w-5 h-5 text-emerald-400" weight="duotone" />}
              label="Vendite"
              value={String(summary.totalSales)}
            />
            <SummaryCard
              icon={<Package className="w-5 h-5 text-blue-400" weight="duotone" />}
              label="Pezzi venduti"
              value={String(summary.totalUnits)}
            />
            <SummaryCard
              icon={<CurrencyEur className="w-5 h-5 text-amber-400" weight="duotone" />}
              label="Fatturato"
              value={`€${summary.totalRevenue.toFixed(2)}`}
            />
            {canSeeMargins && (
              <SummaryCard
                icon={<TrendUp className="w-5 h-5 text-emerald-400" weight="duotone" />}
                label="Margine"
                value={`€${summary.totalMargin.toFixed(2)}`}
                hint={
                  summary.totalRevenue > 0
                    ? `${Math.round((summary.totalMargin / summary.totalRevenue) * 1000) / 10}%`
                    : ''
                }
              />
            )}
          </div>
        )}

        {/* Filters panel */}
        {showFilters && (
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Da</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                  data-testid="filter-from"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">A</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                  data-testid="filter-to"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={() => {
                    setFrom('');
                    setTo('');
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-white text-sm"
                >
                  Pulisci
                </button>
                <button
                  onClick={() => {
                    setFrom(thirtyDaysAgo());
                    setTo(todayStart());
                  }}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-white text-sm"
                >
                  Ultimi 30 giorni
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sales list */}
        {loading ? (
          <div className="text-slate-400 py-8 text-center">Caricamento...</div>
        ) : sales.length === 0 ? (
          <div className="text-center py-16 text-slate-500 border border-dashed border-slate-700 rounded-xl">
            <Receipt className="w-12 h-12 mx-auto mb-3 text-slate-600" weight="duotone" />
            <p>Nessuna vendita nel periodo selezionato.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {groupedByDate.map(([date, dateSales]) => (
              <div key={date}>
                <div className="text-xs uppercase tracking-wide text-slate-500 mb-2 px-1">
                  {date} · {dateSales.length} vendite
                </div>
                <div className="space-y-2">
                  {dateSales.map((sale) => (
                    <div
                      key={sale.id}
                      className="bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-lg p-3 transition"
                      data-testid={`sale-row-${sale.id}`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="font-medium text-white truncate">
                              {sale.itemName}
                            </span>
                            <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
                              x{sale.quantity}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                            <span className="font-mono">{sale.itemSku}</span>
                            <span>{new Date(sale.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                            {sale.soldByName && (
                              <span className="flex items-center gap-1">
                                <UserIcon className="w-3 h-3" />
                                {sale.soldByName}
                              </span>
                            )}
                            {sale.customerName && (
                              <span className="flex items-center gap-1 text-emerald-300">
                                <UserIcon className="w-3 h-3" weight="fill" />
                                Cliente: {sale.customerName}
                              </span>
                            )}
                            {sale.practiceCode && (
                              <span className="flex items-center gap-1 text-violet-300">
                                <ClipboardText className="w-3 h-3" weight="fill" />
                                Pratica: {sale.practiceCode}
                              </span>
                            )}
                            {sale.paymentMethod && (
                              <span
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] ${
                                  paymentMethodColor(sale.paymentMethod)
                                }`}
                                data-testid={`sale-pm-${sale.id}`}
                              >
                                {paymentMethodLabel(sale.paymentMethod)}
                              </span>
                            )}
                          </div>
                          {sale.notes && (
                            <div className="text-xs text-slate-500 mt-1 italic">
                              "{sale.notes}"
                            </div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-emerald-300 font-bold text-lg">
                            {sale.total !== null ? `€${sale.total.toFixed(2)}` : '—'}
                          </div>
                          {sale.unitSalePrice && sale.quantity > 1 && (
                            <div className="text-xs text-slate-500">
                              €{sale.unitSalePrice.toFixed(2)} / cad.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </OperatorLayout>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-3">
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
        {icon}
        <span className="uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {hint && <div className="text-xs text-slate-500 mt-0.5">{hint}</div>}
    </div>
  );
}
