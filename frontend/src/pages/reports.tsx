import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChartBar, 
  TrendUp, 
  Users, 
  FileText,
  Calendar
} from 'phosphor-react';
import { Layout } from '@/components/layout/Layout';

export default function Reports() {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  // Dati reali verranno caricati dalle API
  const [stats, setStats] = useState([
    { label: 'Pratiche Totali', value: '-', change: '', positive: true, icon: FileText },
    { label: 'Pratiche Completate', value: '-', change: '', positive: true, icon: TrendUp },
    { label: 'Nuovi Clienti', value: '-', change: '', positive: true, icon: Users },
    { label: 'Conversione', value: '-', change: '', positive: true, icon: ChartBar },
  ]);
  const [hasData, setHasData] = useState(false);

  return (
    <Layout>
      <div className="p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Report</h1>
            <p className="text-slate-400">Statistiche e analisi del tuo negozio</p>
          </div>
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-xl p-1">
            {(['week', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  period === p 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p === 'week' ? 'Settimana' : p === 'month' ? 'Mese' : 'Anno'}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        {!hasData ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center mb-8">
            <ChartBar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Nessun dato disponibile</h3>
            <p className="text-slate-400 mb-4">Inizia a creare pratiche per vedere le statistiche</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                      <Icon className="w-6 h-6 text-indigo-400" />
                    </div>
                    <span className={`text-sm font-medium ${
                      stat.positive ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-slate-400 text-sm">{stat.label}</div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Placeholder Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Pratiche per Mese</h3>
            <div className="h-64 flex items-center justify-center bg-slate-800/50 rounded-xl">
              <p className="text-slate-500">Grafico in sviluppo</p>
            </div>
          </div>
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Conversione per Operatore</h3>
            <div className="h-64 flex items-center justify-center bg-slate-800/50 rounded-xl">
              <p className="text-slate-500">Grafico in sviluppo</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}