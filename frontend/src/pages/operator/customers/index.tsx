import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  MagnifyingGlass, 
  Users,
  Phone,
  Envelope,
  Trash
} from 'phosphor-react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';
import Link from 'next/link';
import OperatorLayout from '@/components/layout/OperatorLayout';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phonePrimary: string;
  fiscalCode: string;
  createdAt: string;
}

export default function CustomersList() {
  const router = useRouter();
  const { token, isAuthenticated,user } = useAuthStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchCustomers();
  }, [isAuthenticated]);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(response.data);
    } catch (err) {
      console.error('Errore caricamento clienti:', err);
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = async (customerId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Evita di aprire il dettaglio
    if (!confirm('Sei sicuro di voler eliminare questo cliente? Verranno eliminate anche tutte le pratiche associate.')) return;
    
    setDeleteLoading(customerId);
    try {
      await api.delete(`/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCustomers(); // Ricarica la lista
    } catch (err: any) {
      console.error('Errore eliminazione:', err);
      alert(err.response?.data?.message || 'Errore durante l\'eliminazione');
    } finally {
      setDeleteLoading(null);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    return fullName.includes(search.toLowerCase()) ||
           c.fiscalCode?.toLowerCase().includes(search.toLowerCase()) ||
           c.email?.toLowerCase().includes(search.toLowerCase());
  });

  if (loading) {
    return (
      <OperatorLayout title="Clienti">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      </OperatorLayout>
    );
  }

  return (
    <OperatorLayout title="Clienti">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Clienti</h1>
          <p className="text-slate-400">Gestisci la tua anagrafica clienti</p>
        </div>
        <Link href="/operator/customers/new">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/25"
          >
            <Plus className="w-5 h-5" />
            Nuovo Cliente
          </motion.button>
        </Link>
      </div>

      {/* Filtri */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 mb-6">
        <div className="relative max-w-md">
          <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Cerca cliente per nome, email o CF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>
      </div>

      {/* Lista */}
      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-2xl">
          <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">Nessun cliente trovato</p>
          <Link href="/operator/customers/new" className="text-indigo-400 hover:text-indigo-300">
            Aggiungi il primo cliente
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredCustomers.map((customer, index) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => router.push(`/operator/customers/${customer.id}`)}
              className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 cursor-pointer hover:border-slate-700 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
                      {customer.firstName} {customer.lastName}
                    </h3>
                    <p className="text-sm text-slate-400">CF: {customer.fiscalCode}</p>
                  </div>
                </div>
                               <div className="flex items-center gap-6 text-sm text-slate-400">
                  {customer.phonePrimary && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{customer.phonePrimary}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <Envelope className="w-4 h-4" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  <div className="text-slate-500">
                    {new Date(customer.createdAt).toLocaleDateString('it-IT')}
                  </div>
                  {/* Pulsante elimina - solo per ADMIN */}
                  {user?.role === 'ADMIN' && (
                    <button
                      onClick={(e) => handleDelete(customer.id, e)}
                      disabled={deleteLoading === customer.id}
                      className="p-2 text-rose-400 hover:bg-rose-600/10 rounded-lg transition-all disabled:opacity-50"
                      title="Elimina cliente"
                    >
                      <Trash className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </OperatorLayout>
  );
}
