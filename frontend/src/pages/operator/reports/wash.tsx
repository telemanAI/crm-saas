import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';
import OperatorLayout from '@/components/layout/OperatorLayout';
import { motion } from 'framer-motion';
import { TelevisionSimple, Warning, CheckCircle, TrendUp, BarChart3 } from 'phosphor-react';

interface WashStats {
  total: number;
  suspect: number;
  none: number;
  suspectPercentage: number;
  nonePercentage: number;
}

export default function WashReport() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [config, setConfig] = useState({ enableWashStep: false });
  const [stats, setStats] = useState<WashStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        if (user?.tenantId) {
          const configRes = await api.get(`/tenants/${user.tenantId}/config`);
          
          // Se WASH disabilitato, reindirizza
          if (!configRes.data.enableWashStep) {
            router.push('/operator/dashboard');
            return;
          }
          
          setConfig(configRes.data);
          
          // Carica statistiche
          const statsRes = await api.get('/reports/wash-stats', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setStats(statsRes.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    if (token) loadData();
  }, [token, user, router]);

  if (!config.enableWashStep) return null;

  if (loading) {
    return (
      <OperatorLayout title="Report WASH">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      </OperatorLayout>
    );
  }

  if (!stats) {
    return (
      <OperatorLayout title="Report WASH">
        <div className="text-center py-12 text-rose-400">Dati non disponibili</div>
      </OperatorLayout>
    );
  }

  return (
    <OperatorLayout title="Report WASH">
      <div className="p-8 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
          <TelevisionSimple className="w-8 h-8 text-indigo-400" />
          Report Gestione WASH
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6">
            <div className="text-slate-400 text-sm mb-2">Totale Pratiche SKY</div>
            <div className="text-4xl font-bold text-white">{stats.total}</div>
          </div>

          <div className="bg-amber-900/20 border border-amber-500/30 rounded-2xl p-6">
            <div className="text-amber-400 text-sm mb-2 flex items-center gap-2">
              <Warning className="w-4 h-4" /> Suspect WASH
            </div>
            <div className="text-4xl font-bold text-white">{stats.suspect} 
              <span className="text-lg text-amber-400 ml-2">({stats.suspectPercentage}%)</span>
            </div>
          </div>

          <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-6">
            <div className="text-emerald-400 text-sm mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> NO WASH
            </div>
            <div className="text-4xl font-bold text-white">{stats.none}
              <span className="text-lg text-emerald-400 ml-2">({stats.nonePercentage}%)</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <TrendUp className="w-6 h-6 text-indigo-400" />
            Distribuzione
          </h3>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-amber-400">Suspect WASH</span>
                <span className="text-white font-bold">{stats.suspectPercentage}%</span>
              </div>
              <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.suspectPercentage}%` }}
                  className="h-full bg-amber-500"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-emerald-400">NO WASH</span>
                <span className="text-white font-bold">{stats.nonePercentage}%</span>
              </div>
              <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.nonePercentage}%` }}
                  className="h-full bg-emerald-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
}