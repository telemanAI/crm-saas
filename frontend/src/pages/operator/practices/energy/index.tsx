import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import {
  Lightning,
  Plus,
  Calendar,
  Search,
  Funnel,
  ArrowRight,
} from 'phosphor-react';
import Link from 'next/link';
import OperatorLayout from '@/components/layout/OperatorLayout';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';

interface Practice {
  id: string;
  type: string;
  offerName: string;
  status: string;
  currentStep: number;
  createdAt: string;
  category?: 'FIXED_LINE' | 'MOBILE' | 'ENERGY';
  customerSnapshot?: {
    firstName?: string;
    lastName?: string;
    fiscalCode?: string;
    phone?: string;
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'text-emerald-400 bg-emerald-600/10';
    case 'CANCELLED':
      return 'text-rose-400 bg-rose-600/10';
    case 'IN_PROGRESS':
      return 'text-amber-400 bg-amber-600/10';
    default:
      return 'text-slate-400 bg-slate-600/10';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return 'Completata';
    case 'CANCELLED':
      return 'Annullata';
    case 'IN_PROGRESS':
      return 'In corso';
    default:
      return 'Bozza';
  }
};

const formatDate = (d: string) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('it-IT');
};

export default function EnergyPracticesList() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchPractices = async () => {
    try {
      const response = await api.get('/practices', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPractices(response.data || []);
    } catch (err) {
      console.error('Errore caricamento pratiche:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchPractices();
  }, [token]);

  // Filtra SOLO pratiche ENERGY
  const energyPractices = practices.filter((p) => p.category === 'ENERGY');

  // Applica filtri di ricerca e stato
  const filtered = energyPractices.filter((p) => {
    const matchesSearch =
      !search ||
      p.offerName?.toLowerCase().includes(search.toLowerCase()) ||
      p.type?.toLowerCase().includes(search.toLowerCase()) ||
      p.customerSnapshot?.lastName?.toLowerCase().includes(search.toLowerCase()) ||
      p.customerSnapshot?.fiscalCode?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <OperatorLayout title="Pratiche Luce e Gas">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
              <Lightning className="w-6 h-6" weight="duotone" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Pratiche Luce e Gas</h1>
              <p className="text-slate-400 text-sm mt-1">
                {energyPractices.length} pratiche in totale
              </p>
            </div>
          </div>
          <Link href="/operator/practices/energy/new">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-5 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-amber-600/20"
            >
              <Plus className="w-5 h-5" weight="bold" />
              Nuova Pratica
            </motion.button>
          </Link>
        </div>

        {/* Filtri */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca per offerta, gestore, cliente o codice fiscale..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div className="relative">
            <Funnel className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-8 py-3 text-slate-200 focus:outline-none focus:border-amber-500 appearance-none cursor-pointer"
            >
              <option value="ALL">Tutti gli stati</option>
              <option value="IN_PROGRESS">In corso</option>
              <option value="COMPLETED">Completate</option>
              <option value="CANCELLED">Annullate</option>
              <option value="DRAFT">Bozza</option>
            </select>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-2xl"
          >
            <Lightning className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">Nessuna pratica luce/gas trovata</p>
            <p className="text-slate-500 text-sm mt-2">
              {search || statusFilter !== 'ALL'
                ? 'Prova a modificare i filtri di ricerca'
                : 'Crea una nuova pratica per iniziare'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filtered.map((practice, idx) => (
              <motion.div
                key={practice.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Link href={`/operator/practices/energy/${practice.id}`}>
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-amber-500/50 hover:bg-slate-800/80 transition-all cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-white truncate">
                            {practice.offerName || 'Pratica senza nome'}
                          </h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              practice.status
                            )}`}
                          >
                            {getStatusLabel(practice.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-400">
                          <span className="capitalize">{practice.type || 'Luce/Gas'}</span>
                          <span>•</span>
                          <span>Step {practice.currentStep || 0}/7</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(practice.createdAt)}
                          </span>
                          {practice.customerSnapshot && (
                            <>
                              <span>•</span>
                              <span className="text-slate-300">
                                {practice.customerSnapshot.firstName}{' '}
                                {practice.customerSnapshot.lastName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-amber-400 transition-colors ml-4 flex-shrink-0" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </OperatorLayout>
  );
}
