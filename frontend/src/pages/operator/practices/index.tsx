import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Plus,
  MagnifyingGlass,
  Funnel,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
} from 'phosphor-react';
import { useAuthStore } from '@/stores/authStore';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/axios';
import OperatorLayout from '@/components/layout/OperatorLayout';
import type { PracticeListItem, OperationalStatus, SkyTvStatus } from '@/types/practice';

const getTypeLabel = (type: string): string => {
  const typeMap: Record<string, string> = {
    'TIM_FIBRA': 'TIM',
    'VODAFONE': 'VODAFONE',
    'WINDTRE': 'WINDTRE',
    'ILIAD': 'ILIAD',
    'IREN': 'IREN',
    'OPTIMA': 'OPTIMA',
    'SKY': 'SKY',
    'FASTWEB': 'FASTWEB',
    'TISCALI': 'TISCALI',
    'LINKEM': 'LINKEM',
    'PLENITUDE': 'PLENITUDE',
    'ENEL': 'ENEL',
    'POSTEMOBILE': 'POSTE',
    'COOPVOCE': 'COOP',
  };
  return typeMap[type] || type;
};

type FilterType = 'ALL' | string;
type OpStatusFilter = 'ALL' | OperationalStatus;
type SkyTvFilter = 'ALL' | SkyTvStatus;

const SKY_TV_STATUSES: { value: SkyTvStatus; label: string }[] = [
  { value: 'IN_LAVORAZIONE', label: 'In lavorazione' },
  { value: 'IN_VERIFICA_WM', label: 'In verifica WM' },
  { value: 'NON_SALITA_ARCADIA', label: 'Non salita su Arcadia' },
  { value: 'ATTIVO', label: 'Attivo' },
  { value: 'KO_GENERICO', label: 'KO Generico' },
  { value: 'KO_CREDITO', label: 'KO Credito' },
  { value: 'KO_COPERTURA', label: 'KO Copertura' },
  { value: 'KO_RINUNCIA_CLIENTE', label: 'KO Rinuncia Cliente' },
];

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

const getSkyTvStatusBadge = (status?: SkyTvStatus | null) => {
  if (!status) return null;
  const map: Record<SkyTvStatus, { label: string; class: string }> = {
    'IN_LAVORAZIONE': { label: 'Sky: In lavorazione', class: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    'IN_VERIFICA_WM': { label: 'Sky: In verifica WM', class: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    'NON_SALITA_ARCADIA': { label: 'Sky: Non salita Arcadia', class: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    'ATTIVO': { label: 'Sky: Attivo', class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    'KO_GENERICO': { label: 'Sky: KO Generico', class: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
    'KO_CREDITO': { label: 'Sky: KO Credito', class: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
    'KO_COPERTURA': { label: 'Sky: KO Copertura', class: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
    'KO_RINUNCIA_CLIENTE': { label: 'Sky: KO Rinuncia', class: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  };
  return map[status];
};

export default function PracticesList() {
  const router = useRouter();
  const { token, isAuthenticated } = useAuthStore();
  // Phase B — Permessi granulari
  const canCreatePractices = usePermission('canCreatePractices');
  const [practices, setPractices] = useState<PracticeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [operationalStatusFilter, setOperationalStatusFilter] = useState<OpStatusFilter>('ALL');
  const [skyTvStatusFilter, setSkyTvStatusFilter] = useState<SkyTvFilter>('ALL');
  const [statoGlobaleFilter, setStatoGlobaleFilter] = useState<'ALL' | 'completo' | 'non_completo' | 'daChiudere'>('ALL');

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchPractices();
  }, [isAuthenticated]);

  const fetchPractices = async () => {
    try {
      const response = await api.get('/practices', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const practicesData = response.data.map((p: any) => {
        let steps = p.completedSteps;
        if (typeof steps === 'string') {
          steps = steps.split(',').map(Number).filter((n: number) => !isNaN(n));
        } else if (!Array.isArray(steps)) {
          steps = [];
        }
        return { ...p, completedSteps: steps };
      });

      setPractices(practicesData);
    } catch (err) {
      console.error('Errore caricamento pratiche:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPractices = practices.filter(p => {
    const matchesSearch = (p.customer?.firstName + ' ' + p.customer?.lastName)?.toLowerCase().includes(search.toLowerCase()) ||
                     p.customer?.fiscalCode?.toLowerCase().includes(search.toLowerCase()) ||
                     p.offerName?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'ALL' || p.type === filter;
    const matchesOperationalStatus = operationalStatusFilter === 'ALL' || p.operationalStatus === operationalStatusFilter;
    const matchesSkyTv = skyTvStatusFilter === 'ALL' || p.skyTvStatus === skyTvStatusFilter;
    const matchesCategory = (p as any).category === 'FIXED_LINE' || !(p as any).category;

    let matchesStatoGlobale = true;
    if (statoGlobaleFilter !== 'ALL') {
      if (statoGlobaleFilter === 'daChiudere') {
        matchesStatoGlobale = p.convergenza?.attiva === true && p.convergenza?.tipo === 'daChiudere';
      } else {
        matchesStatoGlobale = p.statoGlobale === statoGlobaleFilter;
      }
    }

    return matchesSearch && matchesFilter && matchesOperationalStatus && matchesSkyTv && matchesCategory && matchesStatoGlobale;
  });

  const getStatusIcon = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'completed') return <CheckCircle className="w-5 h-5 text-emerald-400" />;
    if (s === 'in_progress') return <Clock className="w-5 h-5 text-amber-400" />;
    if (s === 'cancelled') return <XCircle className="w-5 h-5 text-rose-400" />;
    return <FileText className="w-5 h-5 text-slate-400" />;
  };

  const getStatusLabel = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'completed') return 'Inserita';
    if (s === 'in_progress') return 'In corso';
    if (s === 'cancelled') return 'Annullata';
    return 'Bozza';
  };

  const getBorderColorByOperationalStatus = (status?: string) => {
    switch (status) {
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
      <OperatorLayout title="Pratiche">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      </OperatorLayout>
    );
  }

  return (
    <OperatorLayout title="Pratiche">
      {/* 🟢 v12.1 — Mobile responsive header (deploy marker: 2026-05-11-v12.1-fixed-list) */}
      <div className="flex items-start justify-between mb-4 md:mb-8 gap-2 md:gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2 truncate">Pratiche Rete Fissa</h1>
          <p className="text-slate-400 text-[11px] sm:text-xs md:text-sm truncate">TIM, Vodafone, SKY e altre</p>
        </div>
        {canCreatePractices && (
          <Link href="/operator/practices/new" className="flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              data-testid="practices-new-btn"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold px-2.5 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl flex items-center gap-1 md:gap-2 shadow-lg shadow-indigo-600/25 text-xs md:text-base whitespace-nowrap"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5" weight="bold" />
              <span className="hidden sm:inline">Nuova</span>
            </motion.button>
          </Link>
        )}
      </div>

      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-3 md:p-4 mb-4 md:mb-6 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-stretch lg:items-center gap-3 lg:gap-4">
        <div className="relative col-span-full lg:flex-1 lg:min-w-[260px] lg:max-w-md">
          <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Cerca pratica..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-11 md:pl-12 pr-4 py-2.5 md:py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm md:text-base"
          />
        </div>

        <div className="flex items-center gap-2">
          <Funnel className="w-4 h-4 md:w-5 md:h-5 text-slate-500 shrink-0" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterType)}
            className="flex-1 lg:flex-none bg-slate-950 border border-slate-700 rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-xs md:text-sm"
          >
            <option value="ALL">Tutte</option>
            <option value="TIM_FIBRA">TIM</option>
            <option value="VODAFONE">Vodafone</option>
            <option value="WINDTRE">WindTre</option>
            <option value="ILIAD">Iliad</option>
            <option value="OPTIMA">Optima</option>
            <option value="IREN">Iren</option>
            <option value="SKY">SKY</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Funnel className="w-4 h-4 md:w-5 md:h-5 text-slate-500 shrink-0" />
          <select
            value={operationalStatusFilter}
            onChange={(e) => setOperationalStatusFilter(e.target.value as OpStatusFilter)}
            className="flex-1 lg:flex-none bg-slate-950 border border-slate-700 rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-xs md:text-sm"
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

        <div className="flex items-center gap-2">
          <Funnel className="w-4 h-4 md:w-5 md:h-5 text-slate-500 shrink-0" />
          <select
            value={skyTvStatusFilter}
            onChange={(e) => setSkyTvStatusFilter(e.target.value as SkyTvFilter)}
            className="flex-1 lg:flex-none bg-slate-950 border border-slate-700 rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-xs md:text-sm"
          >
            <option value="ALL">Tutti gli stati Sky TV</option>
            {SKY_TV_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Funnel className="w-4 h-4 md:w-5 md:h-5 text-slate-500 shrink-0" />
          <select
            value={statoGlobaleFilter}
            onChange={(e) => setStatoGlobaleFilter(e.target.value as any)}
            className="flex-1 lg:flex-none bg-slate-950 border border-slate-700 rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-xs md:text-sm"
          >
            <option value="ALL">Tutti gli stati globali</option>
            <option value="completo">Complete</option>
            <option value="non_completo">Non Complete</option>
            <option value="daChiudere">Convergenze da Chiudere</option>
          </select>
        </div>
      </div>

      {filteredPractices.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-2xl">
          <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">Nessuna pratica trovata</p>
          {canCreatePractices && (
            <Link href="/operator/practices/new" className="text-indigo-400 hover:text-indigo-300">
              Crea la prima pratica
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPractices.map((practice, index) => {
            const opBadge = getOperationalStatusBadge(practice.operationalStatus);
            const skyBadge = getSkyTvStatusBadge(practice.skyTvStatus);
            return (
              <motion.div
                key={practice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('button') || target.closest('a')) return;
                  router.push(`/operator/practices/${practice.id}`);
                }}
                className={`bg-slate-900/80 backdrop-blur-xl border ${getBorderColorByOperationalStatus(practice.operationalStatus)} rounded-2xl p-3 md:p-5 cursor-pointer transition-all group shadow-lg overflow-hidden`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center bg-slate-800 border border-slate-700">
                    <span className={`font-bold text-sm ${
                      practice.type === 'TIM_FIBRA' ? 'text-blue-400' : 
                      practice.type === 'VODAFONE' ? 'text-rose-400' :
                      practice.type === 'WINDTRE' ? 'text-orange-400' :
                      practice.type === 'ILIAD' ? 'text-red-400' :
                      practice.type === 'OPTIMA' ? 'text-emerald-400' :
                      practice.type === 'IREN' ? 'text-amber-400' :
                      practice.type === 'SKY' ? 'text-cyan-400' : 'text-slate-400'
                    }`}>
                      {practice.type === 'TIM_FIBRA' ? 'TIM' : 
                       practice.type === 'VODAFONE' ? 'Voda' :
                       practice.type === 'WINDTRE' ? 'W3' :
                       practice.type === 'ILIAD' ? 'Iliad' :
                       practice.type === 'OPTIMA' ? 'Opt' :
                       practice.type === 'IREN' ? 'Iren' :
                       practice.type === 'SKY' ? 'SKY' : (practice.type as string)?.substring(0,3)}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap min-w-0">
                      <span className="font-bold text-white text-sm md:text-base">{getTypeLabel(practice.type)}</span>
                      <h3 className="font-semibold text-white truncate text-sm md:text-base max-w-full sm:max-w-[260px]">
                        {practice.offerName}
                      </h3>
                    </div>

                    <div className="text-sm text-slate-400">
                      <p className="truncate">
                        {practice.customerSnapshot?.firstName || practice.customer?.firstName} {' '}
                        {practice.customerSnapshot?.lastName || practice.customer?.lastName}
                      </p>
                      {(practice.customerSnapshot?.fiscalCode || practice.customer?.fiscalCode) && (
                        <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                          CF: {practice.customerSnapshot?.fiscalCode || practice.customer?.fiscalCode}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] md:text-xs font-medium border ${opBadge.class}`}>
                        {opBadge.label}
                      </span>
                      {skyBadge && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] md:text-xs font-medium border ${skyBadge.class}`}>
                          {skyBadge.label}
                        </span>
                      )}
                      {practice.convergenza?.attiva && (
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] md:text-xs font-medium border ${
                          practice.statoGlobale === 'completo' 
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${practice.statoGlobale === 'completo' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                          {practice.statoGlobale === 'completo' ? 'Convergenza OK' : 'Conv. da Chiudere'}
                        </span>
                      )}
                    </div>
                  </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2 sm:gap-4 justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-0 border-slate-800/50 flex-wrap sm:flex-nowrap min-w-0">
                    {practice.status?.toLowerCase() === 'draft' && canCreatePractices && (
                      <Link href={`/operator/practices/new?edit=${practice.id}`} className="shrink-0">
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="px-3 md:px-4 py-1.5 md:py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs md:text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                        >
                          Continua
                        </button>
                      </Link>
                    )}
                    <div className="text-right min-w-0">
                      <div className="flex items-center justify-end gap-1.5 md:gap-2 text-xs md:text-sm text-slate-400 mb-0.5 md:mb-1">
                        {getStatusIcon(practice.status)}
                        <span>{getStatusLabel(practice.status)}</span>
                      </div>
                      <div className="text-[10px] md:text-xs text-slate-500">
                        Step {practice.currentStep}/8
                      </div>
                    </div>
                    <div className="text-right text-[10px] md:text-sm text-slate-500 whitespace-nowrap shrink-0">
                      {new Date(practice.createdAt).toLocaleDateString('it-IT')}
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
