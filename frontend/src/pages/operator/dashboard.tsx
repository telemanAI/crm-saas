import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import {
  Plus,
  MagnifyingGlass,
  Users,
  ShoppingCart,
  Clock,
  ChartLine,
  TrendUp,
  Calendar
} from 'phosphor-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import OperatorLayout from '@/components/layout/OperatorLayout';
import { useApi } from '@/hooks/useApi';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DashboardStats {
  customers: number;
  practices: number;
  pending: number;
  commissions: string;
}

interface TrendPoint {
  label: string;
  count: number;
}

interface StatusCount {
  status: string;
  count: number;
}

interface RecentPractice {
  id: string;
  number: string;
  customerName: string;
  type: string;
  status: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  Bozza: '#64748b',
  Completata: '#10b981',
  Annullata: '#f43f5e',
  // Operational Status colors
  PENDING: '#f59e0b',
  IN_PROGRESS: '#3b82f6',
  ACTIVATED: '#10b981',
  REJECTED: '#ef4444',
};

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#64748b'];

export default function OperatorDashboard() {
  const router = useRouter();
  const { isAuthenticated, token } = useAuthStore();
  const { request } = useApi();
  
  const [stats, setStats] = useState<DashboardStats>({
    customers: 0,
    practices: 0,
    pending: 0,
    commissions: '0',
  });
  
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [statusData, setStatusData] = useState<StatusCount[]>([]);
  const [recentPractices, setRecentPractices] = useState<RecentPractice[]>([]);
  const [trendPeriod, setTrendPeriod] = useState<'month' | 'day'>('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await request('/stats/dashboard');
        
        setStats({
          customers: data.customers,
          practices: data.practices,
          pending: data.practicesByStatus?.find((s: any) => s.rawStatus === 'draft')?.count || 0,
          commissions: 'Coming Soon',
        });
        
        setStatusData(data.practicesByStatus || []);
        setRecentPractices(data.recentPractices || []);
        setTrends(data.trends || []);
      } catch (error) {
        console.error('Errore caricamento dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [isAuthenticated, request]);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const fetchTrends = async () => {
      try {
        const data = await request(`/stats/trends?period=${trendPeriod}`);
        setTrends(data);
      } catch (error) {
        console.error('Errore caricamento trend:', error);
      }
    };
    
    fetchTrends();
  }, [trendPeriod, isAuthenticated, request]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <OperatorLayout title="Dashboard">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-2">
          Benvenuto! 👋
        </h1>
        <p className="text-gray-500 dark:text-slate-400">
          Ecco il riepilogo delle attività oggi
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Clienti" value={stats.customers} icon={Users} color="indigo" trend="+0" loading={loading} />
        <StatCard title="Pratiche" value={stats.practices} icon={ShoppingCart} color="violet" trend="+0" loading={loading} />
        <StatCard title="In Attesa" value={stats.pending} icon={Clock} color="amber" trend="+0" loading={loading} />
        <StatCard title="Provvigioni" value={stats.commissions} icon={ChartLine} color="emerald" trend="Coming Soon" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendUp className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Andamento Pratiche</h3>
            </div>
            <div className="flex bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
              <button onClick={() => setTrendPeriod('month')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${trendPeriod === 'month' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-slate-400'}`}>6 Mesi</button>
              <button onClick={() => setTrendPeriod('day')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${trendPeriod === 'day' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-slate-400'}`}>30 Giorni</button>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="label" stroke="#6b7280" fontSize={12} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }} formatter={(value: number) => [value, 'Pratiche']} />
                <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <ChartLine className="w-5 h-5 text-violet-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Stato Pratiche</h3>
          </div>
          <div className="h-64 flex items-center justify-center">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="count">
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }} formatter={(value: number, name: string, props: any) => [value, props.payload.status]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 dark:text-slate-400">Nessun dato disponibile</p>
            )}
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {statusData.map((item, idx) => (
              <div key={item.status} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[item.status] || CHART_COLORS[idx % CHART_COLORS.length] }} />
                <span className="text-sm text-gray-600 dark:text-slate-400">{item.status}: {item.count}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Azioni Rapide</h3>
        <div className="flex flex-wrap gap-4">
          <QuickActionButton href="/operator/customers/new" icon={Plus} label="Nuovo Cliente" color="indigo" />
          <QuickActionButton href="/operator/practices/new" icon={Plus} label="Nuova Pratica" color="violet" />
          <QuickActionButton href="/operator/practices" icon={MagnifyingGlass} label="Cerca Pratica" color="slate" />
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Pratiche Recenti</h3>
          </div>
          <Link href="/operator/practices" className="text-sm text-indigo-400 hover:text-indigo-300">Vedi tutte</Link>
        </div>
        <div className="space-y-3">
          {loading ? (
            <p className="text-gray-500 dark:text-slate-400 text-center py-8">Caricamento...</p>
          ) : recentPractices.length > 0 ? (
            recentPractices.map((practice) => (
              <div key={practice.id} onClick={() => router.push(`/operator/practices/${practice.id}`)} className="cursor-pointer">
                <PracticeItem
                  number={practice.number}
                  customer={practice.customerName}
                  type={practice.type}
                  status={practice.status}
                  date={new Date(practice.createdAt).toLocaleDateString('it-IT')}
                />
              </div>
            ))
          ) : (
            <p className="text-gray-500 dark:text-slate-400 text-center py-8">Nessuna pratica trovata</p>
          )}
        </div>
      </motion.div>
    </OperatorLayout>
  );
}

function StatCard({ title, value, icon: Icon, color, trend, loading }: { title: string; value: string | number; icon: React.ElementType; color: 'indigo' | 'violet' | 'amber' | 'emerald' | 'slate'; trend: string; loading?: boolean }) {
  const colorClasses = {
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    slate: 'bg-slate-500/10 text-gray-500 dark:text-slate-400 border-slate-500/20',
  };
  const trendPositive = !trend.startsWith('-') && trend !== 'Coming Soon';
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.02 }} className="bg-white dark:bg-slate-900/50 backdrop-blur-sm border border-gray-200 dark:border-slate-800 rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" weight="fill" />
        </div>
        <span className={`text-sm font-medium ${trend === 'Coming Soon' ? 'text-slate-400' : trendPositive ? 'text-emerald-400' : 'text-rose-400'}`}>{trend}</span>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">{loading ? '-' : value}</h3>
      <p className="text-sm text-gray-500 dark:text-slate-500">{title}</p>
    </motion.div>
  );
}

function QuickActionButton({ href, icon: Icon, label, color }: { href: string; icon: React.ElementType; label: string; color: 'indigo' | 'violet' | 'slate' }) {
  const colorClasses = {
    indigo: 'bg-indigo-500 hover:bg-indigo-400',
    violet: 'bg-violet-500 hover:bg-violet-400',
    slate: 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600',
  };
  return (
    <Link href={href}>
      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className={`flex items-center gap-2 px-4 py-2 ${colorClasses[color]} text-white text-sm font-medium rounded-lg transition-colors`}>
        <Icon className="w-4 h-4" weight="bold" />
        {label}
      </motion.button>
    </Link>
  );
}

function PracticeItem({ number, customer, type, status, date }: { number: string; customer: string; type: string; status: string; date: string }) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    Bozza: { label: 'Bozza', color: 'bg-slate-500' },
    Inviata: { label: 'Inviata', color: 'bg-indigo-500' },
    'In Lavorazione': { label: 'In Lavorazione', color: 'bg-amber-500' },
    'In Attesa Doc.': { label: 'In Attesa Doc.', color: 'bg-orange-500' },
    Approvata: { label: 'Approvata', color: 'bg-emerald-500' },
    Rifiutata: { label: 'Rifiutata', color: 'bg-rose-500' },
    Completata: { label: 'Completata', color: 'bg-violet-500' },
    Annullata: { label: 'Annullata', color: 'bg-slate-600' },
  };
  const config = statusConfig[status] || { label: status, color: 'bg-slate-500' };
  return (
    <div className="flex items-center gap-4 p-4 bg-gray-100 dark:bg-slate-800/30 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-800/50 transition-colors">
      <div className={`w-3 h-3 rounded-full ${config.color}`} />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-gray-800 dark:text-slate-200">{number}</h4>
          <span className="text-xs text-gray-500 dark:text-slate-500">{type}</span>
        </div>
        <p className="text-sm text-gray-500 dark:text-slate-400">{customer}</p>
      </div>
      <div className="text-right">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-opacity-20 ${config.color.replace('bg-', 'bg-')} ${config.color.replace('bg-', 'text-')}`}>{config.label}</span>
        <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">{date}</p>
      </div>
    </div>
  );
}
