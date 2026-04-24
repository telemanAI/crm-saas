import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
import api from '@/lib/axios';

interface MobilePractice {
  id: string;
  category: string;
  status: string;
  operationalStatus?: string;
  type?: string;
  offerName?: string;
  currentStep?: number;
  customer?: { firstName?: string; lastName?: string; fiscalCode?: string };
  customerSnapshot?: any;
  mobileData?: any;
  createdAt: string;
}

export default function MobilePracticesList() {
  const router = useRouter();
  const [practices, setPractices] = useState<MobilePractice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [opStatusFilter, setOpStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'ACTIVATED' | 'REJECTED'>('ALL');

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
    <OperatorLayout title="Pratiche Rete Mobile">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <DeviceMobile className="w-7 h-7 text-indigo-400" weight="duotone" />
            Pratiche Rete Mobile
          </h1>
          <p className="text-slate-400">Gestisci MNP, attivazioni SIM e TIM Unica</p>
        </div>
        <Link href="/operator/practices/mobile/new">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/25"
            data-testid="mobile-new-practice-btn"
          >
            <Plus className="w-5 h-5" />
            Nuova Pratica Mobile
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
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <Funnel className="w-5 h-5 text-slate-500" />
          <select
            value={opStatusFilter}
            onChange={(e) => setOpStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="ALL">Tutti gli stati</option>
            <option value="PENDING">In Attesa</option>
            <option value="IN_PROGRESS">In Lavorazione</option>
            <option value="ACTIVATED">Attivata</option>
            <option value="REJECTED">KO</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-2xl">
          <DeviceMobile className="w-16 h-16 text-slate-600 mx-auto mb-4" weight="duotone" />
          <p className="text-slate-400 mb-2">Nessuna pratica mobile trovata</p>
          <Link href="/operator/practices/mobile/new" className="text-indigo-400 hover:text-indigo-300">
            Crea la prima pratica mobile
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((p, idx) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              onClick={() => router.push(`/operator/practices/mobile/${p.id}`)}
              className={`bg-slate-900/80 backdrop-blur-xl border ${borderByOp(p.operationalStatus)} rounded-2xl p-6 cursor-pointer hover:border-slate-600 transition-all group shadow-lg`}
              data-testid="mobile-practice-card"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-indigo-500/10 border border-indigo-500/30">
                    <DeviceMobile className="w-6 h-6 text-indigo-400" weight="duotone" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
                      {p.offerName || 'Offerta non selezionata'}
                    </h3>
                    <div className="text-sm text-slate-400 mt-1">
                      <p>
                        {p.customerSnapshot?.firstName || p.customer?.firstName} {' '}
                        {p.customerSnapshot?.lastName || p.customer?.lastName}
                      </p>
                      {(p.customerSnapshot?.fiscalCode || p.customer?.fiscalCode) && (
                        <p className="text-xs text-slate-500 font-mono mt-1">
                          CF: {p.customerSnapshot?.fiscalCode || p.customer?.fiscalCode}
                        </p>
                      )}
                      {p.mobileData?.numeroDaPortare && p.mobileData.numeroDaPortare !== '0' && (
                        <p className="text-xs text-slate-500 mt-1">N° da portare: {p.mobileData.numeroDaPortare}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {p.status?.toLowerCase() === 'draft' || p.status?.toLowerCase() === 'in_progress' ? (
                    <Link href={`/operator/practices/mobile/new?edit=${p.id}`}>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Continua
                      </button>
                    </Link>
                  ) : null}
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                      {getStatusIcon(p.status)}
                      <span>{getStatusLabel(p.status)}</span>
                    </div>
                    <div className="text-xs text-slate-500">Step {p.currentStep || 1}/6</div>
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    {new Date(p.createdAt).toLocaleDateString('it-IT')}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </OperatorLayout>
  );
}
