import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Plus,
  MagnifyingGlass,
  Funnel,
  Lightning,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
} from 'phosphor-react';
import OperatorLayout from '@/components/layout/OperatorLayout';
import api from '@/lib/axios';
import type { OperationalStatus } from '@/types/practice';

interface EnergyPractice {
  id: string;
  category: string;
  status: string;
  operationalStatus?: OperationalStatus;
  type?: string;
  offerName?: string;
  currentStep?: number;
  customer?: { firstName?: string; lastName?: string; fiscalCode?: string };
  customerSnapshot?: any;
  energyData?: any;
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

export default function EnergyPracticesList() {
  const router = useRouter();
  const [practices, setPractices] = useState<EnergyPractice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [opStatusFilter, setOpStatusFilter] = useState<'ALL' | OperationalStatus>('ALL');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/practices?category=ENERGY');
      setPractices(res.data || []);
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
        const matchCategory = p.category === 'ENERGY';
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
      <OperatorLayout title="Pratiche Luce e Gas">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
        </div>
      </OperatorLayout>
    );
  }

  return (
    <OperatorLayout title="Pratiche Luce e Gas">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Lightning className="w-7 h-7 text-amber-400" weight="duotone" />
            Pratiche Luce e Gas
          </h1>
          <p className="text-slate-400">Gestisci switch, volture, subentri e posa contatori</p>
        </div>
        <Link href="/operator/practices/energy/new">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-amber-600/25"
            data-testid="energy-new-practice-btn"
          >
            <Plus className="w-5 h-5" />
            Nuova Pratica Luce/Gas
          </motion.button>
        </Link>
      </div>

      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Cerca per cliente, CF o offerta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <Funnel className="w-5 h-5 text-slate-500" />
          <select
            value={opStatusFilter}
            onChange={(e) => setOpStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
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
          <Lightning className="w-16 h-16 text-slate-600 mx-auto mb-4" weight="duotone" />
          <p className="text-slate-400 mb-2">Nessuna pratica luce/gas trovata</p>
          <Link href="/operator/practices/energy/new" className="text-amber-400 hover:text-amber-300">
            Crea la prima pratica luce/gas
          </Link>
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
                onClick={() => router.push(`/operator/practices/energy/${p.id}`)}
                className={`bg-slate-900/80 backdrop-blur-xl border ${borderByOp(p.operationalStatus)} rounded-2xl p-5 cursor-pointer hover:border-slate-600 transition-all group shadow-lg`}
                data-testid="energy-practice-card"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/30">
                    <Lightning className="w-6 h-6 text-amber-400" weight="duotone" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate max-w-[260px] group-hover:text-amber-400 transition-colors">
                      {p.energyData?.tipoAttivazione || 'Attivazione'} · {p.type || 'Gestore da definire'}
                    </h3>
                    <div className="text-sm text-slate-400 mt-1">
                      <p className="truncate">
                        {p.customerSnapshot?.firstName || p.customer?.firstName} {' '}
                        {p.customerSnapshot?.lastName || p.customer?.lastName}
                      </p>
                      {(p.customerSnapshot?.fiscalCode || p.customer?.fiscalCode) && (
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          CF: {p.customerSnapshot?.fiscalCode || p.customer?.fiscalCode}
                        </p>
                      )}
                      {p.energyData?.numeroContatore && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Contatore: {p.energyData.numeroContatore} {p.energyData.potenzaContatore ? `· ${p.energyData.potenzaContatore.replace('_', ' ')}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${opBadge.class}`}>
                        {opBadge.label}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-4">
                    {(p.status?.toLowerCase() === 'draft' || p.status?.toLowerCase() === 'in_progress') && (
                      <Link href={`/operator/practices/energy/new?edit=${p.id}`}>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Continua
                        </button>
                      </Link>
                    )}
                    <div className="text-right min-w-[80px]">
                      <div className="flex items-center justify-end gap-2 text-sm text-slate-400 mb-1">
                        {getStatusIcon(p.status)}
                        <span>{getStatusLabel(p.status)}</span>
                      </div>
                      <div className="text-xs text-slate-500">Step {p.currentStep || 1}/6</div>
                    </div>
                    <div className="text-right text-sm text-slate-500 min-w-[80px]">
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
