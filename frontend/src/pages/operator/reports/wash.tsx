import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';
import OperatorLayout from '@/components/layout/OperatorLayout';
import { motion } from 'framer-motion';
import { TelevisionSimple, Warning, CheckCircle, TrendingUp, BarChart3, Lock } from 'phosphor-react';

interface WashStats {
  total: number;
  suspect: number;
  none: number;
  suspectPercentage: number;
  nonePercentage: number;
}

interface TenantConfig {
  enableWashStep: boolean;
  enableAdditionalPackages: boolean;
}

export default function WashReport() {
  const { token, user } = useAuthStore();
  const [config, setConfig] = useState<TenantConfig>({ 
    enableWashStep: false, 
    enableAdditionalPackages: true 
  });
  const [stats, setStats] = useState<WashStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadConfigAndData = async () => {
      try {
        // 1. Carica configurazione tenant
        if (user?.tenantId) {
          const configRes = await api.get(`/tenants/${user.tenantId}/config`);
          setConfig(configRes.data);
          
          // 2. Se WASH abilitato, carica dati statistici
          if (configRes.data.enableWashStep) {
            try {
              const statsRes = await api.get('/reports/wash-stats', {
                headers: { Authorization: `Bearer ${token}` }
              });
              setStats(statsRes.data);
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

  if (loading) {
    return (
      <OperatorLayout title="Report WASH">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      </OperatorLayout>
    );
  }

  // 🚫 BLOCCO: Se il toggle WASH è OFF, mostra pagina bloccata
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
            
            <p className="text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
              La funzionalità <strong className="text-amber-400">WASH</strong> è attualmente disabilitata a livello di sistema. 
              Questo report è accessibile solo quando il Super Admin abilita il toggle "WASH Step" 
              nelle configurazioni del tenant.
            </p>
            
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="bg-slate-800/50 rounded-xl px-6 py-3 border border-slate-700">
                <span className="text-slate-500 text-sm block mb-1">Stato WASH</span>
                <span className="text-rose-400 font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  DISATTIVATO
                </span>
              </div>
              
              <div className="bg-slate-800/50 rounded-xl px-6 py-3 border border-slate-700">
                <span className="text-slate-500 text-sm block mb-1">Accesso Report</span>
                <span className="text-slate-400 font-medium">Negato</span>
              </div>
            </div>

            <div className="text-sm text-slate-500 bg-slate-950/50 rounded-xl p-4 border border-slate-800 max-w-md mx-auto">
              <span className="text-indigo-400 font-medium">💡 Nota:</span> Contatta il Super Admin per abilitare questa funzionalità se necessario per le pratiche SKY.
            </div>
          </motion.div>
        </div>
      </OperatorLayout>
    );
  }

  // ✅ CONTENUTO: Solo se WASH abilitato
  if (error || !stats) {
    return (
      <OperatorLayout title="Report WASH">
        <div className="text-center py-12">
          <div className="text-rose-400 text-xl mb-2">⚠️ {error || 'Dati non disponibili'}</div>
          <p className="text-slate-500">Assicurati che esistano pratiche SKY con configurazione WASH</p>
        </div>
      </OperatorLayout>
    );
  }

  return (
    <OperatorLayout title="Report WASH / NO WASH">
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center">
              <TelevisionSimple className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Report Gestione WASH</h1>
              <p className="text-slate-400">
                Analisi comparativa Suspect WASH vs NO WASH per pratiche SKY
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-4">
            <span className="px-3 py-1 rounded-full bg-emerald-600/20 text-emerald-400 text-sm border border-emerald-600/30 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              WASH Abilitato
            </span>
            <span className="text-slate-500 text-sm">
              Dati aggiornati in tempo reale
            </span>
          </div>
        </div>

        {/* Cards Riepilogo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-400 text-sm font-medium">Totale Pratiche SKY</span>
              <BarChart3 className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="text-5xl font-bold text-white mb-2">{stats.total}</div>
            <div className="text-sm text-slate-500">Pratiche con WASH configurato</div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-amber-900/20 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-600/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-amber-400 text-sm font-medium flex items-center gap-2">
                  <Warning className="w-4 h-4" />
                  Suspect WASH
                </span>
                <span className="text-2xl font-bold text-amber-400">{stats.suspectPercentage}%</span>
              </div>
              <div className="text-5xl font-bold text-white mb-2">{stats.suspect}</div>
              <div className="text-sm text-slate-400">Clienti con abbonamento attivo</div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-emerald-900/20 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/10 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-emerald-400 text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  NO WASH
                </span>
                <span className="text-2xl font-bold text-emerald-400">{stats.nonePercentage}%</span>
              </div>
              <div className="text-5xl font-bold text-white mb-2">{stats.none}</div>
              <div className="text-sm text-slate-400">Nuovi clienti</div>
            </div>
          </motion.div>
        </div>

        {/* Grafico Percentuale */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-indigo-400" />
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
            {/* Barra Suspect */}
            <div>
              <div className="flex justify-between items-end mb-3">
                <div>
                  <span className="text-amber-400 font-semibold text-lg flex items-center gap-2">
                    <Warning className="w-5 h-5" />
                    Suspect WASH
                  </span>
                  <span className="text-slate-500 text-sm block mt-1">
                    Clienti con abbonamento SKY esistente da gestire
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-white block">{stats.suspectPercentage}%</span>
                  <span className="text-amber-400 text-sm">{stats.suspect} pratiche</span>
                </div>
              </div>
              <div className="h-6 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.suspectPercentage}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-amber-700 via-amber-500 to-amber-400 relative"
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </motion.div>
              </div>
            </div>

            {/* Barra No Wash */}
            <div>
              <div className="flex justify-between items-end mb-3">
                <div>
                  <span className="text-emerald-400 font-semibold text-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    NO WASH
                  </span>
                  <span className="text-slate-500 text-sm block mt-1">
                    Nuove attivazioni senza abbonamento precedente
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-white block">{stats.nonePercentage}%</span>
                  <span className="text-emerald-400 text-sm">{stats.none} pratiche</span>
                </div>
              </div>
              <div className="h-6 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.nonePercentage}%` }}
                  transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                  className="h-full bg-gradient-to-r from-emerald-700 via-emerald-500 to-emerald-400 relative"
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </motion.div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-amber-950/30 border border-amber-600/20 rounded-xl p-4">
              <h4 className="text-amber-400 font-medium mb-2 flex items-center gap-2">
                <Warning className="w-4 h-4" />
                Azione Richiesta per Suspect
              </h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Le pratiche Suspect WASH richiedono attenzione: verifica se disattivare il vecchio abbonamento o mantenerlo attivo per il cliente.
              </p>
            </div>
            
            <div className="bg-emerald-950/30 border border-emerald-600/20 rounded-xl p-4">
              <h4 className="text-emerald-400 font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                NO WASH - Flusso Diretto
              </h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Pratiche standard senza vincoli. Procedere con l'attivazione normale seguendo il flusso configurato.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </OperatorLayout>
  );
}