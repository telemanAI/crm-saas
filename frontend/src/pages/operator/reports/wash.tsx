import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';
import OperatorLayout from '@/components/layout/OperatorLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TelevisionSimple, 
  Warning, 
  CheckCircle, 
  TrendUp, 
  ChartBar, 
  Lock, 
  WarningCircle, 
  X,
  MagnifyingGlass,
  User,
  Calendar,
  ArrowRight
} from 'phosphor-react';
import { useRouter } from 'next/router';

interface WashStats {
  total: number;
  suspect: number;
  none: number;
  suspectPercentage: number;
  nonePercentage: number;
  suspectVsNoneRatio?: number;
}

interface TenantConfig {
  enableWashStep: boolean;
  enableAdditionalPackages: boolean;
}

interface WashPractice {
  id: string;
  practiceNumber: string;
  customerName: string;
  offerName: string;
  createdAt: string;
  washType: 'suspect' | 'none';
  washData?: any;
}

export default function WashReport() {
  const { token, user } = useAuthStore();
  const router = useRouter();
  const [config, setConfig] = useState<TenantConfig>({ 
    enableWashStep: false, 
    enableAdditionalPackages: true 
  });
  const [stats, setStats] = useState<WashStats | null>(null);
  const [practices, setPractices] = useState<WashPractice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtri
  const [filterType, setFilterType] = useState<'all' | 'suspect' | 'none'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Stati per i due pop-up separati
  const [showAlert25, setShowAlert25] = useState(false);
  const [showAlert30, setShowAlert30] = useState(false);

  useEffect(() => {
    const loadConfigAndData = async () => {
      try {
        if (user?.tenantId) {
          const configRes = await api.get(`/tenants/${user.tenantId}/config`);
          setConfig(configRes.data);
          
          if (configRes.data.enableWashStep) {
            try {
              // Carica statistiche
              const statsRes = await api.get('/reports/wash-stats', {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              const data = statsRes.data;
              const total = data.totalSkyTvPractices || 0;
              const suspect = data.suspectWashCount || 0;
              const none = data.noWashCount || 0;
              const suspectPercentage = data.suspectWashPercentage || 0;
              const nonePercentage = total > 0 ? Math.round((none / total) * 100 * 100) / 100 : 0;
              const ratio = none > 0 ? (suspect / none) * 100 : 0;
              
              const mappedStats: WashStats = {
                total,
                suspect,
                none,
                suspectPercentage,
                nonePercentage,
                suspectVsNoneRatio: Math.round(ratio * 100) / 100
              };
              
              setStats(mappedStats);
              
              // Mostra i pop-up in base alle soglie
              if (suspectPercentage >= 30) {
                setShowAlert30(true);
                setShowAlert25(true);
              } else if (suspectPercentage >= 25) {
                setShowAlert25(true);
              }
              
              // Carica dettaglio pratiche
              const detailsRes = await api.get('/reports/wash-details', {
                headers: { Authorization: `Bearer ${token}` }
              });
              setPractices(detailsRes.data || []);
              
            } catch (err) {
              console.error('Errore caricamento statistiche:', err);
              setError('Errore caricamento dati statistiche');
            }
          }
        }
      } catch (err) {
        console.error('Errore caricamento config:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (token) loadConfigAndData();
  }, [token, user]);

  // Filtra pratiche
  const filteredPractices = practices.filter(p => {
    // Filtro per tipo
    if (filterType !== 'all' && p.washType !== filterType) return false;
    
    // Filtro per ricerca (nome cliente)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return p.customerName.toLowerCase().includes(query) ||
             p.practiceNumber.toLowerCase().includes(query);
    }
    
    return true;
  });

  // Click su grafico per filtrare
  const handleChartClick = (type: 'suspect' | 'none') => {
    setFilterType(type);
    // Scrolla alla lista
    document.getElementById('practices-list')?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <OperatorLayout title="Report WASH">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      </OperatorLayout>
    );
  }

  if (!config.enableWashStep) {
    return (
      <OperatorLayout title="Report WASH - Non Disponibile">
        <div className="max-w-4xl mx-auto p-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-12 text-center"
          >
            <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-slate-700">
              <Lock className="w-12 h-12 text-slate-500" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Report WASH Disabilitato</h2>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">
              Contatta il Super Admin per abilitare questa funzionalità.
            </p>
          </motion.div>
        </div>
      </OperatorLayout>
    );
  }

  if (error || !stats) {
    return (
      <OperatorLayout title="Report WASH">
        <div className="text-center py-12">
          <div className="text-rose-400 text-xl mb-2">⚠️ {error || 'Dati non disponibili'}</div>
        </div>
      </OperatorLayout>
    );
  }

  return (
    <OperatorLayout title="Report WASH / NO WASH">
      <div className="p-8 max-w-6xl mx-auto">
        
        {/* POP-UP ALERT 30% - Critico */}
        <AnimatePresence>
          {showAlert30 && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="bg-slate-900 border-2 border-rose-500 rounded-2xl p-8 max-w-lg mx-4 shadow-2xl shadow-rose-500/20"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-16 h-16 bg-rose-600/20 rounded-full flex items-center justify-center">
                    <WarningCircle className="w-10 h-10 text-rose-500" weight="fill" />
                  </div>
                  <button 
                    onClick={() => setShowAlert30(false)}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <h3 className="text-2xl font-bold text-rose-400 mb-3">
                  🚨 CRITICO: Soglia 30% Superata!
                </h3>
                <p className="text-slate-300 mb-4">
                  Le pratiche <strong>Suspect WASH</strong> hanno raggiunto il <strong className="text-rose-400">{stats.suspectPercentage}%</strong> del totale.
                </p>
                <p className="text-slate-400 text-sm mb-6">
                  Questa è una soglia critica che richiede attenzione immediata. 
                  Si consiglia di verificare le pratiche e prendere provvedimenti.
                </p>
                <button 
                  onClick={() => setShowAlert30(false)}
                  className="w-full px-4 py-3 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-xl transition-colors"
                >
                  Ho capito
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* POP-UP ALERT 25% - Avviso */}
        <AnimatePresence>
          {showAlert25 && !showAlert30 && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="bg-slate-900 border-2 border-amber-500 rounded-2xl p-8 max-w-lg mx-4 shadow-2xl shadow-amber-500/20"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-16 h-16 bg-amber-600/20 rounded-full flex items-center justify-center">
                    <Warning className="w-10 h-10 text-amber-500" weight="fill" />
                  </div>
                  <button 
                    onClick={() => setShowAlert25(false)}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
                <h3 className="text-2xl font-bold text-amber-400 mb-3">
                  ⚠️ Avviso: Soglia 25% Raggiunta
                </h3>
                <p className="text-slate-300 mb-4">
                  Le pratiche <strong>Suspect WASH</strong> hanno raggiunto il <strong className="text-amber-400">{stats.suspectPercentage}%</strong> del totale.
                </p>
                <p className="text-slate-400 text-sm mb-6">
                  Si consiglia di monitorare attentamente l'andamento delle pratiche WASH.
                </p>
                <button 
                  onClick={() => setShowAlert25(false)}
                  className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl transition-colors"
                >
                  Ho capito
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BANNER ALERT PERSISTENTE */}
        {stats.suspectPercentage >= 25 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 rounded-2xl p-6 flex items-center gap-4 ${
              stats.suspectPercentage >= 30 
                ? 'bg-rose-900/30 border border-rose-500/50' 
                : 'bg-amber-900/30 border border-amber-500/50'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
              stats.suspectPercentage >= 30 ? 'bg-rose-600/20' : 'bg-amber-600/20'
            }`}>
              {stats.suspectPercentage >= 30 
                ? <WarningCircle className="w-6 h-6 text-rose-400" />
                : <Warning className="w-6 h-6 text-amber-400" />
              }
            </div>
            <div className="flex-1">
              <h3 className={`font-bold text-lg mb-1 ${
                stats.suspectPercentage >= 30 ? 'text-rose-400' : 'text-amber-400'
              }`}>
                {stats.suspectPercentage >= 30 
                  ? `🚨 CRITICO: Soglia 30% Superata (${stats.suspectPercentage}%)`
                  : `⚠️ Attenzione: Soglia 25% Raggiunta (${stats.suspectPercentage}%)`
                }
              </h3>
              <p className={`text-sm ${
                stats.suspectPercentage >= 30 ? 'text-rose-300/80' : 'text-amber-300/80'
              }`}>
                Rapporto Suspect/No-Wash: <strong>{stats.suspectVsNoneRatio}%</strong>
              </p>
            </div>
            <div className="text-right">
              <span className={`text-3xl font-bold ${
                stats.suspectPercentage >= 30 ? 'text-rose-400' : 'text-amber-400'
              }`}>{stats.suspect}</span>
              <span className={`text-sm block ${
                stats.suspectPercentage >= 30 ? 'text-rose-500' : 'text-amber-500'
              }`}>Suspect</span>
            </div>
          </motion.div>
        )}

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center">
              <TelevisionSimple className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Report Gestione WASH</h1>
              <p className="text-slate-400">
                Clicca sulle card per filtrare le pratiche
              </p>
            </div>
          </div>
        </div>

        {/* Cards Riepilogo - CLICCABILI */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card Totale */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setFilterType('all')}
            className={`cursor-pointer bg-slate-900/80 backdrop-blur-xl border rounded-2xl p-6 transition-all hover:scale-105 ${
              filterType === 'all' ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium">Totale Pratiche SKY</span>
              <ChartBar className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="text-5xl font-bold text-white mb-2">{stats.total}</div>
            <div className="text-sm text-slate-500">Clicca per vedere tutte</div>
          </motion.div>

          {/* Card Suspect WASH - CLICCABILE */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => handleChartClick('suspect')}
            className={`cursor-pointer backdrop-blur-xl border rounded-2xl p-6 relative overflow-hidden transition-all hover:scale-105 ${
              filterType === 'suspect' 
                ? 'border-amber-500 ring-2 ring-amber-500/20' 
                : stats.suspectPercentage >= 30 
                  ? 'bg-rose-900/20 border-rose-500/50' 
                  : 'bg-amber-900/20 border-amber-500/30'
            }`}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className={`text-sm font-medium flex items-center gap-2 ${
                  stats.suspectPercentage >= 30 ? 'text-rose-400' : 'text-amber-400'
                }`}>
                  <Warning className="w-4 h-4" />
                  Suspect WASH
                </span>
                <span className={`text-2xl font-bold ${
                  stats.suspectPercentage >= 30 ? 'text-rose-400' : 'text-amber-400'
                }`}>{stats.suspectPercentage}%</span>
              </div>
              <div className={`text-5xl font-bold mb-2 ${
                stats.suspectPercentage >= 30 ? 'text-rose-400' : 'text-white'
              }`}>{stats.suspect}</div>
              <div className="text-sm text-slate-400">Clicca per filtrare</div>
            </div>
          </motion.div>

          {/* Card NO WASH - CLICCABILE */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => handleChartClick('none')}
            className={`cursor-pointer bg-emerald-900/20 backdrop-blur-xl border rounded-2xl p-6 relative overflow-hidden transition-all hover:scale-105 ${
              filterType === 'none' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-emerald-500/30'
            }`}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-emerald-400 text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  NO WASH
                </span>
                <span className="text-2xl font-bold text-emerald-400">{stats.nonePercentage}%</span>
              </div>
              <div className="text-5xl font-bold text-white mb-2">{stats.none}</div>
              <div className="text-sm text-slate-400">Clicca per filtrare</div>
            </div>
          </motion.div>
        </div>

        {/* Grafico Percentuale con barre cliccabili */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 mb-8"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <TrendUp className="w-6 h-6 text-indigo-400" />
              Distribuzione Percentuale
            </h3>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-slate-400">Suspect</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-slate-400">No Wash</span>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Barra Suspect - CLICCABILE */}
            <div 
              onClick={() => handleChartClick('suspect')}
              className="cursor-pointer group"
            >
              <div className="flex justify-between items-end mb-3">
                <div>
                  <span className="text-amber-400 font-semibold text-lg flex items-center gap-2 group-hover:text-amber-300 transition-colors">
                    <Warning className="w-5 h-5" />
                    Suspect WASH
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-white block">{stats.suspectPercentage}%</span>
                  <span className="text-amber-400 text-sm">{stats.suspect} pratiche</span>
                </div>
              </div>
              <div className="h-6 bg-slate-800 rounded-full overflow-hidden shadow-inner relative group-hover:ring-2 ring-amber-500/30 transition-all">
                <div className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-20" style={{ left: '25%' }}>
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-amber-400 font-medium">25%</span>
                </div>
                <div className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-20" style={{ left: '30%' }}>
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-rose-400 font-medium">30%</span>
                </div>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(stats.suspectPercentage, 100)}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className={`h-full relative ${
                    stats.suspectPercentage >= 30 
                      ? 'bg-gradient-to-r from-rose-700 via-rose-500 to-rose-400' 
                      : 'bg-gradient-to-r from-amber-700 via-amber-500 to-amber-400'
                  }`}
                />
              </div>
            </div>

            {/* Barra No Wash - CLICCABILE */}
            <div 
              onClick={() => handleChartClick('none')}
              className="cursor-pointer group"
            >
              <div className="flex justify-between items-end mb-3">
                <div>
                  <span className="text-emerald-400 font-semibold text-lg flex items-center gap-2 group-hover:text-emerald-300 transition-colors">
                    <CheckCircle className="w-5 h-5" />
                    NO WASH
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-white block">{stats.nonePercentage}%</span>
                  <span className="text-emerald-400 text-sm">{stats.none} pratiche</span>
                </div>
              </div>
              <div className="h-6 bg-slate-800 rounded-full overflow-hidden shadow-inner group-hover:ring-2 ring-emerald-500/30 transition-all">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.nonePercentage}%` }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                  className="h-full bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-400 relative"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* LISTA PRATICHE con RICERCA */}
        <motion.div 
          id="practices-list"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-indigo-400" />
              Pratiche {filterType === 'suspect' ? 'WASH' : filterType === 'none' ? 'NO WASH' : 'Tutte'}
              <span className="text-sm font-normal text-slate-400 ml-2">
                ({filteredPractices.length} risultati)
              </span>
            </h3>
            
            {/* Filtri */}
            <div className="flex items-center gap-3">
              <div className="flex bg-slate-800 rounded-lg p-1">
                <button 
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    filterType === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tutte
                </button>
                <button 
                  onClick={() => setFilterType('suspect')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    filterType === 'suspect' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  WASH
                </button>
                <button 
                  onClick={() => setFilterType('none')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    filterType === 'none' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  NO WASH
                </button>
              </div>
            </div>
          </div>

          {/* Barra di ricerca */}
          <div className="relative mb-6">
            <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cerca per nome cliente o numero pratica..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>

          {/* Lista pratiche */}
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {filteredPractices.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <MagnifyingGlass className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nessuna pratica trovata</p>
              </div>
            ) : (
              filteredPractices.map((practice) => (
                <motion.div
                  key={practice.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => router.push(`/operator/practices/${practice.id}`)}
                  className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01] ${
                    practice.washType === 'suspect' 
                      ? 'bg-amber-900/20 border border-amber-500/30 hover:border-amber-500/50' 
                      : 'bg-emerald-900/20 border border-emerald-500/30 hover:border-emerald-500/50'
                  }`}
                >
                  {/* Indicatore tipo */}
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    practice.washType === 'suspect' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`} />
                  
                  {/* Info pratica */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-white font-semibold">{practice.practiceNumber}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        practice.washType === 'suspect' 
                          ? 'bg-amber-600/30 text-amber-400' 
                          : 'bg-emerald-600/30 text-emerald-400'
                      }`}>
                        {practice.washType === 'suspect' ? 'WASH' : 'NO WASH'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {practice.customerName || 'N/D'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(practice.createdAt).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                  </div>
                  
                  {/* Offerta */}
                  <div className="text-right">
                    <span className="text-slate-300 text-sm">{practice.offerName}</span>
                  </div>
                  
                  <ArrowRight className="w-5 h-5 text-slate-500" />
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </OperatorLayout>
  );
}

// Import mancante
import { ShoppingCart } from 'phosphor-react';
