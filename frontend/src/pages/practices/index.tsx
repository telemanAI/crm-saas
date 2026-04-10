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

interface Practice {
  id: string;
  type: string; // 🔥 Cambiato da enum fisso a string per supportare tutti i gestori
  offerName: string;
  customerName: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  currentStep: number;
  createdAt: string;
}

// 🔥 FUNZIONE: Mappa tipo pratica a nome visualizzato
const getTypeLabel = (type: string): string => {
  const typeMap: Record<string, string> = {
    'TIM_FIBRA': 'TIM',
    'VODAFONE': 'VODAFONE',
    'WINDTRE': 'WINDTRE',
    'WIND': 'WIND',
    'TRE': 'TRE',
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
  return typeMap[type] || type; // Fallback al tipo originale se non mappato
};

// 🔥 FUNZIONE: Mappa tipo pratica a colore
const getTypeColor = (type: string): { bg: string; text: string } => {
  const colorMap: Record<string, { bg: string; text: string }> = {
    'TIM_FIBRA': { bg: 'bg-blue-600/20', text: 'text-blue-400' },
    'VODAFONE': { bg: 'bg-red-600/20', text: 'text-red-400' },
    'WINDTRE': { bg: 'bg-orange-600/20', text: 'text-orange-400' },
    'WIND': { bg: 'bg-orange-600/20', text: 'text-orange-400' },
    'TRE': { bg: 'bg-orange-600/20', text: 'text-orange-400' },
    'ILIAD': { bg: 'bg-pink-600/20', text: 'text-pink-400' },
    'IREN': { bg: 'bg-green-600/20', text: 'text-green-400' },
    'OPTIMA': { bg: 'bg-teal-600/20', text: 'text-teal-400' },
    'SKY': { bg: 'bg-cyan-600/20', text: 'text-cyan-400' },
    'FASTWEB': { bg: 'bg-yellow-600/20', text: 'text-yellow-400' },
    'TISCALI': { bg: 'bg-indigo-600/20', text: 'text-indigo-400' },
    'LINKEM': { bg: 'bg-purple-600/20', text: 'text-purple-400' },
    'PLENITUDE': { bg: 'bg-lime-600/20', text: 'text-lime-400' },
    'ENEL': { bg: 'bg-emerald-600/20', text: 'text-emerald-400' },
    'POSTEMOBILE': { bg: 'bg-amber-600/20', text: 'text-amber-400' },
    'COOPVOCE': { bg: 'bg-rose-600/20', text: 'text-rose-400' },
  };
  return colorMap[type] || { bg: 'bg-slate-600/20', text: 'text-slate-400' };
};

export default function PracticesList() {
  const router = useRouter();
  const { token, isAuthenticated } = useAuthStore();
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('ALL'); // 🔥 Cambiato a string per supportare tutti i filtri

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchPractices();
  }, [isAuthenticated]);

  const fetchPractices = async () => {
    try {
      const response = await api.get('/practices', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPractices(response.data);
    } catch (err) {
      console.error('Errore caricamento pratiche:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPractices = practices.filter(p => {
    const matchesSearch = p.customerName?.toLowerCase().includes(search.toLowerCase()) ||
                         p.offerName?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'ALL' || p.type === filter;
    return matchesSearch && matchesFilter;
  });

  // 🔥 Estrai tipi unici per il filtro
  const uniqueTypes = Array.from(new Set(practices.map(p => p.type)));

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'IN_PROGRESS': return <Clock className="w-5 h-5 text-amber-400" />;
      case 'CANCELLED': return <XCircle className="w-5 h-5 text-rose-400" />;
      default: return <FileText className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'Completata';
      case 'IN_PROGRESS': return 'In corso';
      case 'CANCELLED': return 'Annullata';
      default: return 'Bozza';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 ml-64 p-8 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 ml-64 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Pratiche</h1>
          <p className="text-slate-400">Gestisci tutte le pratiche</p>
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

      {/* Filtri */}
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
            onChange={(e) => setFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="ALL">Tutte</option>
            {uniqueTypes.map(type => (
              <option key={type} value={type}>{getTypeLabel(type)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista */}
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
          {filteredPractices.map((practice, index) => {
            const typeColor = getTypeColor(practice.type);
            const typeLabel = getTypeLabel(practice.type);
            
            return (
              <motion.div
                key={practice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => router.push(`/operator/practices/${practice.id}`)}
                className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 cursor-pointer hover:border-slate-700 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${typeColor.bg} ${typeColor.text}`}>
                      <span className="font-bold text-sm">{typeLabel}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
                        {practice.offerName}
                      </h3>
                      <p className="text-sm text-slate-400">{practice.customerName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
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
            );
          })}
        </div>
      )}
    </div>
  );
}