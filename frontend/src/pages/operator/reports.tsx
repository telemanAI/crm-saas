import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChartLine, FileText, Download, Calendar, TrendUp } from 'phosphor-react';
import OperatorLayout from '@/components/layout/OperatorLayout';
import { useApi } from '@/hooks/useApi';
import { useAuthStore } from '@/stores/authStore';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

type RangeType = 'today' | 'week' | 'month';

interface ReportData {
  range: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    total: number;
    completed: number;
    draft: number;
    conversionRate: number;
  };
  practices: Array<{
    id: string;
    type: string;
    status: string;
    customer: string;
    createdAt: string;
  }>;
}

const RANGE_LABELS: Record<RangeType, string> = {
  today: 'Oggi',
  week: 'Questa Settimana',
  month: 'Questo Mese',
};

export default function Reports() {
  const [selectedRange, setSelectedRange] = useState<RangeType>('month');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const { request } = useApi();
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) return;
    
    const fetchReport = async () => {
      setLoading(true);
      try {
        const result = await request(`/stats/report?range=${selectedRange}`);
        setData(result);
      } catch (error) {
        console.error('Errore caricamento report:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [selectedRange, request]);

  const chartData = data ? [
    { name: 'Totali', value: data.summary.total, color: '#6366f1' },
    { name: 'Completate', value: data.summary.completed, color: '#10b981' },
    { name: 'Bozze', value: data.summary.draft, color: '#64748b' },
  ] : [];

  return (
    <OperatorLayout title="Report">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Report</h1>
          <p className="text-gray-500 dark:text-slate-400">Visualizza e analizza le attività del periodo</p>
        </div>
      </div>

      {/* Filtri Predefiniti */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-wrap gap-3">
          {(Object.keys(RANGE_LABELS) as RangeType[]).map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                selectedRange === range
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
              }`}
            >
              <Calendar className="w-4 h-4" />
              {RANGE_LABELS[range]}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Stats Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Totale Pratiche"
            value={data.summary.total}
            icon={FileText}
            color="indigo"
            loading={loading}
          />
          <StatCard
            title="Completate"
            value={data.summary.completed}
            icon={ChartLine}
            color="emerald"
            loading={loading}
          />
          <StatCard
            title="In Bozza"
            value={data.summary.draft}
            icon={FileText}
            color="slate"
            loading={loading}
          />
          <StatCard
            title="Tasso Conversione"
            value={`${data.summary.conversionRate}%`}
            icon={TrendUp}
            color="violet"
            loading={loading}
          />
        </div>
      )}

      {/* Grafico e Lista */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafico */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-2xl p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Riepilogo {RANGE_LABELS[selectedRange]}
          </h3>
          
          <div className="h-64">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-slate-400">
                Caricamento...
              </div>
            ) : data ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#6b7280" 
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#6b7280" 
                    fontSize={12}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#f8fafc',
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-slate-400">
                Nessun dato disponibile
              </div>
            )}
          </div>
        </motion.div>

        {/* Lista Pratiche */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Dettaglio Pratiche
            </h3>
            <button className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
          
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {loading ? (
              <p className="text-gray-500 dark:text-slate-400 text-center py-8">
                Caricamento...
              </p>
            ) : data?.practices && data.practices.length > 0 ? (
              data.practices.map((practice) => (
                <div
                  key={practice.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-200">
                      {practice.customer}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {practice.type === 'TIM_FIBRA' ? 'TIM Fibra' : 'SKY'}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    practice.status === 'Completata'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : practice.status === 'Bozza'
                      ? 'bg-slate-500/20 text-slate-400'
                      : 'bg-indigo-500/20 text-indigo-400'
                  }`}>
                    {practice.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-slate-400 text-center py-8">
                Nessuna pratica nel periodo selezionato
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </OperatorLayout>
  );
}

function StatCard({ title, value, icon: Icon, color, loading }: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: 'indigo' | 'violet' | 'emerald' | 'slate';
  loading?: boolean;
}) {
  const colorClasses = {
    indigo: 'bg-indigo-500/10 text-indigo-400',
    violet: 'bg-violet-500/10 text-violet-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    slate: 'bg-slate-500/10 text-slate-400',
  };

  return (
    <div className="bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-slate-800 rounded-2xl p-6">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colorClasses[color]}`}>
        <Icon className="w-6 h-6" weight="fill" />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        {loading ? '-' : value}
      </h3>
      <p className="text-sm text-gray-500 dark:text-slate-500">{title}</p>
    </div>
  );
}

