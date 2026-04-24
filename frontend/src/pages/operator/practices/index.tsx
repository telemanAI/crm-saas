import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  MagnifyingGlass, 
  Funnel,
  FileText,
  CheckCircle,
  Clock,
  XCircle
} from 'phosphor-react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';
import Link from 'next/link';
import OperatorLayout from '@/components/layout/OperatorLayout';
import type { PracticeListItem, PracticeType, PracticeStatus } from '@/types/practice';

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

type FilterType = 'ALL' | PracticeType;

export default function PracticesList() {
  const router = useRouter();
  const { token, isAuthenticated } = useAuthStore();
  const [practices, setPractices] = useState<PracticeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [operationalStatusFilter, setOperationalStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'ACTIVATED' | 'REJECTED'>('ALL');
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
    const matchesCategory = (p as any).category === 'FIXED_LINE' || !(p as any).category;
    
    // FILTRO STATO GLOBALE
    let matchesStatoGlobale = true;
    if (statoGlobaleFilter !== 'ALL') {
      if (statoGlobaleFilter === 'daChiudere') {
        matchesStatoGlobale = p.convergenza?.attiva === true && p.convergenza?.tipo === 'daChiudere';
      } else {
        matchesStatoGlobale = p.statoGlobale === statoGlobaleFilter;
      }
    }
    
    return matchesSearch && matchesFilter && matchesOperationalStatus && matchesCategory && matchesStatoGlobale;
  });

  const getStatusIcon = (status: PracticeStatus | string) => {
    const s = status?.toLowerCase();
    if (s === 'completed') return <CheckCircle className="w-5 h-5 text-emerald-400" />;
    if (s === 'in_progress') return <Clock className="w-5 h-5 text-amber-400" />;
    if (s === 'cancelled') return <XCircle className="w-5 h-5 text-rose-400" />;
    return <FileText className="w-5 h-5 text-slate-400" />;
  };

  const getStatusLabel = (status: PracticeStatus | string) => {
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Pratiche</h1>
          <p className="text-slate-400">Gestisci le pratiche TIM e SKY</p>
        </div>
        <Link href="/operator/practices/new">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/25"
          >
            <Plus className="w-5 h-5" />
            Nuova Pratica
          </motion.button>
        </Link>
      </div>

      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 mb-6 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Cerca pratica..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Funnel className="w-5 h-5 text-slate-500" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterType)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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

        <div className="flex items-center gap-2 ml-4">
          <Funnel className="w-5 h-5 text-slate-500" />
          <select
            value={operationalStatusFilter}
            onChange={(e) => setOperationalStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="ALL">Tutti gli stati</option>
            <option value="PENDING">In Attesa</option>
            <option value="IN_PROGRESS">In Lavorazione</option>
            <option value="ACTIVATED">Attivata</option>
            <option value="REJECTED">KO</option>
          </select>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <Funnel className="w-5 h-5 text-slate-500" />
          <select
            value={statoGlobaleFilter}
            onChange={(e) => setStatoGlobaleFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
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
          <Link href="/operator/practices/new" className="text-indigo-400 hover:text-indigo-300">
            Crea la prima pratica
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPractices.map((practice, index) => (
            <motion.div
              key={practice.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => router.push(`/operator/practices/${practice.id}`)}
              className={`bg-slate-900/80 backdrop-blur-xl border ${getBorderColorByOperationalStatus(practice.operationalStatus)} rounded-2xl p-6 cursor-pointer hover:border-slate-600 transition-all group shadow-lg`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-800 border border-slate-700">
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
                  <span className="font-bold">{getTypeLabel(practice.type)}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
                    {practice.offerName}
                  </h3>
                  
                  {/* BADGE CONVERGENZA */}
                  {practice.convergenza?.attiva && (
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                        practice.statoGlobale === 'completo' 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${practice.statoGlobale === 'completo' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        {practice.statoGlobale === 'completo' 
                          ? 'Convergenza Completata' 
                          : 'Convergenza da Chiudere'}
                      </span>
                    </div>
                  )}
                  
                  <div className="text-sm text-slate-400 mt-1">
                    <p>
                      {practice.customerSnapshot?.firstName || practice.customer?.firstName} {' '}
                      {practice.customerSnapshot?.lastName || practice.customer?.lastName}
                    </p>
                    {(practice.customerSnapshot?.fiscalCode || practice.customer?.fiscalCode) && (
                      <p className="text-xs text-slate-500 font-mono mt-1">
                        CF: {practice.customerSnapshot?.fiscalCode || practice.customer?.fiscalCode}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {practice.status?.toLowerCase() === 'draft' && (
                    <Link href={`/operator/practices/new?edit=${practice.id}`}>
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors mr-4"
                      >
                        Continua
                      </button>
                    </Link>
                  )}
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm text-slate-400 mb-1">
                      {getStatusIcon(practice.status)}
                      <span>{getStatusLabel(practice.status)}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Step {practice.currentStep}/8
                    </div>
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    {new Date(practice.createdAt).toLocaleDateString('it-IT')}
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