import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion } from 'framer-motion';
// 🟢 v12.1 — Mobile responsive header (deploy marker: 2026-05-11-v12.1-mobile-list)
import {
  Plus,
  MagnifyingGlass,
  Funnel,
  DeviceMobile,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
} from 'phosphor-react';
import OperatorLayout from '@/components/layout/OperatorLayout';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/axios';
import type { OperationalStatus } from '@/types/practice';

interface MobilePractice {
  id: string;
  category: string;
  status: string;
  operationalStatus?: OperationalStatus;
  type?: string;
  offerName?: string;
  currentStep?: number;
  customer?: { firstName?: string; lastName?: string; fiscalCode?: string };
  customerSnapshot?: any;
  mobileData?: any;
  createdAt: string;
}

const getOperationalStatusBadge = (status?: OperationalStatus) => {
  switch (status) {
    case 'ACTIVATED':
      return { label: 'Attivo', class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
    case 'REJECTED':
      return { label: 'KO', class: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
    case 'IN_PROGRESS':
      return { label: 'In Lavorazione', class: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' };
    case 'PENDING':
      return { label: 'In Attesa', class: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
    case 'KO_CREDITO':
      return { label: 'KO Credito', class: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
    case 'KO_COPERTURA':
      return { label: 'KO Copertura', class: 'bg-rose-500/20 text-rose-400 border-rose-500/30' };
    default:
      return { label: '—', class: 'bg-slate-700/20 text-slate-400 border-slate-700/30' };
  }
};

export default function MobilePracticesList() {
  const router = useRouter();
  // Phase B — Permessi granulari
  const canCreatePractices = usePermission('canCreatePractices');
  const [practices, setPractices] = useState<MobilePractice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [opStatusFilter, setOpStatusFilter] = useState<'ALL' | OperationalStatus>('ALL');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/practices?category=MOBILE');
      setPractices(res.data || []);
    } catch (err) {
      console.error('[mobile-list] load failed', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(
    () =>
      practices.filter((p) => {
        const name = `${p.customer?.firstName || p.customerSnapshot?.firstName || ''} ${p.customer?.lastName || p.customerSnapshot?.lastName || ''}`.toLowerCase();
        const cf = (p.customer?.fiscalCode || p.customerSnapshot?.fiscalCode || '').toLowerCase();
        const off = (p.offerName || '').toLowerCase();
        const q = search.toLowerCase();
        const matchSearch = !q || name.includes(q) || cf.includes(q) || off.includes(q);
        const matchStatus = opStatusFilter === 'ALL' || p.operationalStatus === opStatusFilter;
        const matchCategory = p.category === 'MOBILE';
        return matchSearch && matchStatus && matchCategory;
      }),
    [practices, search, opStatusFilter],
  );

  const getStatusIcon = (s?: string) => {
    const x = s?.toLowerCase();
    if (x === 'completed') return <CheckCircle className="w-5 h-5 text-emerald-400" />;
    if (x === 'in_progress') return <Clock className="w-5 h-5 text-amber-400" />;
    if (x === 'cancelled') return <XCircle className="w-5 h-5 text-rose-400" />;
    return <FileText className="w-5 h-5 text-slate-400" />;
  };

  const getStatusLabel = (s?: string) => {
    const x = s?.toLowerCase();
    if (x === 'completed') return 'Inserita';
    if (x === 'in_progress') return 'In corso';
    if (x === 'cancelled') return 'Annullata';
    return 'Bozza';
  };

  const borderByOp = (s?: string) => {
    switch (s) {
      case 'ACTIVATED': return 'border-emerald-400 ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-500/30 bg-emerald-950/20';
      case 'REJECTED': return 'border-rose-400 ring-2 ring-rose-400/50 shadow-lg shadow-rose-500/30 bg-rose-950/20';
      case 'KO_CREDITO': return 'border-rose-400 ring-2 ring-rose-400/50 shadow-lg shadow-rose-500/30 bg-rose-950/20';
      case 'KO_COPERTURA': return 'border-rose-400 ring-2 ring-rose-400/50 shadow-lg shadow-rose-500/30 bg-rose-950/20';
      case 'IN_PROGRESS': return 'border-cyan-400 ring-2 ring-cyan-400/50 shadow-lg shadow-cyan-500/30 bg-cyan-950/20';
      case 'PENDING': return 'border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/30 bg-amber-950/20';
      default: return 'border-slate-800';
    }
  };

  if (loading) {
    return (
      <OperatorLayout title="Pratiche Rete Mobile">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      </OperatorLayout>
    );
  }

  return (
    <OperatorLayout title="Pratiche Mobile">
      <div className="flex items-start justify-between mb-4 md:mb-8 gap-2 md:gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl md:text-3xl font-bold text-white mb-1 md:mb-2 flex items-center gap-1.5 md:gap-3 leading-tight">
            <DeviceMobile className="w-5 h-5 md:w-7 md:h-7 text-indigo-400 flex-shrink-0" weight="duotone" />
            <span className="truncate">Pratiche Mobile</span>
          </h1>
          <p className="text-slate-400 text-[11px] sm:text-xs md:text-base truncate">MNP, attivazioni SIM, TIM Unica</p>
        </div>
        {canCreatePractices && (
          <Link href="/operator/practices/mobile/new" className="flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold px-2.5 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl flex items-center gap-1 md:gap-2 shadow-lg shadow-indigo-600/25 text-xs md:text-base whitespace-nowrap"
              data-testid="mobile-new-practice-btn"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5" weight="bold" />
              <span className="hidden sm:inline">Nuova</span>
            </motion.button>
          </Link>
        )}
      </div>

      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-3 md:p-4 mb-4 md:mb-6 grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-3 sm:gap-4">
        <div className="relative w-full sm:flex-1 sm:min-w-[260px] sm:max-w-md">
          <MagnifyingGlass className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Cerca per cliente, CF o offerta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 md:pl-12 pr-3 md:pr-4 py-2.5 md:py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm md:text-base"
          />
        </div>
        <div className="flex items-center gap-2">
          <Funnel className="w-4 h-4 md:w-5 md:h-5 text-slate-500 flex-shrink-0" />
          <select
            value={opStatusFilter}
            onChange={(e) => setOpStatusFilter(e.target.value as any)}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-2 md:px-4 py-2.5 md:py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-xs md:text-base"
          >
            <option value="ALL">Tutti gli stati</option>
            <option value="PENDING">In Attesa</option>
            <option value="IN_PROGRESS">In Lavorazione</option>
            <option value="ACTIVATED">Attivata</option>
            <option value="REJECTED">KO</option>
            <option value="KO_CREDITO">KO Credito</option>
            <option value="KO_COPERTURA">KO Copertura</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-2xl">
          <DeviceMobile className="w-16 h-16 text-slate-600 mx-auto mb-4" weight="duotone" />
          <p className="text-slate-400 mb-2">Nessuna pratica mobile trovata</p>
          {canCreatePractices && (
            <Link href="/operator/practices/mobile/new" className="text-indigo-400 hover:text-indigo-300">
              Crea la prima pratica mobile
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((p, idx) => {
            const opBadge = getOperationalStatusBadge(p.operationalStatus);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                onClick={() => router.push(`/operator/practices/mobile/${p.id}`)}
                className={`bg-slate-900/80 backdrop-blur-xl border ${borderByOp(p.operationalStatus)} rounded-2xl p-3 md:p-5 cursor-pointer hover:border-slate-600 transition-all group shadow-lg overflow-hidden`}
                data-testid="mobile-practice-card"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="w-11 h-11 md:w-12 md:h-12 shrink-0 rounded-xl flex items-center justify-center bg-indigo-500/10 border border-indigo-500/30">
                      <DeviceMobile className="w-5 h-5 md:w-6 md:h-6 text-indigo-400" weight="duotone" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate text-sm md:text-base group-hover:text-indigo-400 transition-colors">
                        {p.offerName || 'Offerta non selezionata'}
                      </h3>
                      <div className="text-xs md:text-sm text-slate-400 mt-1">
                        <p className="truncate">
                          {p.customerSnapshot?.firstName || p.customer?.firstName} {' '}
                          {p.customerSnapshot?.lastName || p.customer?.lastName}
                        </p>
                        {(p.customerSnapshot?.fiscalCode || p.customer?.fiscalCode) && (
                          <p className="text-[10px] md:text-xs text-slate-500 font-mono mt-0.5 truncate">
                            CF: {p.customerSnapshot?.fiscalCode || p.customer?.fiscalCode}
                          </p>
                        )}
                        {p.mobileData?.numeroDaPortare && p.mobileData.numeroDaPortare !== '0' && (
                          <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 truncate">N° da portare: {p.mobileData.numeroDaPortare}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] md:text-xs font-medium border ${opBadge.class}`}>
                          {opBadge.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2 sm:gap-4 justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-0 border-slate-800/50 min-w-0">
                    {(p.status?.toLowerCase() === 'draft' || p.status?.toLowerCase() === 'in_progress') && canCreatePractices ? (
                      <Link href={`/operator/practices/mobile/new?edit=${p.id}`} className="shrink-0">
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 md:px-4 py-1.5 md:py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs md:text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                        >
                          Continua
                        </button>
                      </Link>
                    ) : null}
                    <div className="text-right min-w-0">
                      <div className="flex items-center justify-end gap-1.5 md:gap-2 text-xs md:text-sm text-slate-400 mb-0.5 md:mb-1">
                        {getStatusIcon(p.status)}
                        <span>{getStatusLabel(p.status)}</span>
                      </div>
                      <div className="text-[10px] md:text-xs text-slate-500">Step {p.currentStep || 1}/6</div>
                    </div>
                    <div className="text-right text-[10px] md:text-sm text-slate-500 whitespace-nowrap shrink-0">
                      {new Date(p.createdAt).toLocaleDateString('it-IT')}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </OperatorLayout>
  );
}
