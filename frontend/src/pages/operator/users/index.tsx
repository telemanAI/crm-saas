import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Users,
  Shield,
  User,
  Trash,
  Pencil
} from 'phosphor-react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';
import Link from 'next/link';
import OperatorLayout from '@/components/layout/OperatorLayout';

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'ADMIN' | 'OPERATOR';
  isActive: boolean;
  createdAt: string;
}

export default function UsersList() {
  const router = useRouter();
  const { token, isAuthenticated, user } = useAuthStore();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUsers();
  }, [isAuthenticated]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (err) {
      console.error('Errore caricamento utenti:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo operatore? L\'azione è irreversibile.')) return;
    
    setDeleteLoading(userId);
    try {
      await api.delete(`/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUsers(); // Ricarica la lista
    } catch (err: any) {
      console.error('Errore eliminazione:', err);
      alert(err.response?.data?.message || 'Errore durante l\'eliminazione');
    } finally {
      setDeleteLoading(null);
    }
  };

  // Solo ADMIN può vedere questa pagina
  if (user?.role !== 'ADMIN') {
    return (
      <OperatorLayout title="Operatori">
        <div className="text-center py-12">
          <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Accesso Negato</h3>
          <p className="text-slate-400">Solo gli amministratori possono gestire gli operatori.</p>
        </div>
      </OperatorLayout>
    );
  }

  if (loading) {
    return (
      <OperatorLayout title="Operatori">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      </OperatorLayout>
    );
  }

  return (
    <OperatorLayout title="Operatori">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Operatori</h1>
          <p className="text-slate-400">Gestisci gli operatori del tuo negozio</p>
        </div>
        <Link href="/operator/users/new">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/25"
          >
            <Plus className="w-5 h-5" />
            Nuovo Operatore
          </motion.button>
        </Link>
      </div>

      {/* Lista */}
      {users.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-2xl">
          <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">Nessun operatore trovato</p>
          <Link href="/operator/users/new" className="text-indigo-400 hover:text-indigo-300">
            Aggiungi il primo operatore
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {users.map((u, index) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    u.role === 'ADMIN' ? 'bg-amber-600/20 text-amber-400' : 'bg-violet-600/20 text-violet-400'
                  }`}>
                    {u.role === 'ADMIN' ? <Shield className="w-6 h-6" /> : <User className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">
                      {u.firstName} {u.lastName}
                    </h3>
                    <p className="text-sm text-slate-400">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    u.role === 'ADMIN' 
                      ? 'bg-amber-500/20 text-amber-400' 
                      : 'bg-violet-500/20 text-violet-400'
                  }`}>
                    {u.role === 'ADMIN' ? 'Amministratore' : 'Operatore'}
                  </span>
                  <span className={`w-3 h-3 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  
                  {/* ✅ PULSANTE MODIFICA */}
                  <Link href={`/operator/users/${u.id}`}>
                    <button
                      className="p-2 text-indigo-400 hover:bg-indigo-600/10 rounded-lg transition-all"
                      title="Modifica operatore"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                  </Link>

                  {/* Pulsante elimina - solo se non è l'utente corrente */}
                  {user?.id !== u.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(u.id);
                      }}
                      disabled={deleteLoading === u.id}
                      className="p-2 text-rose-400 hover:bg-rose-600/10 rounded-lg transition-all disabled:opacity-50"
                      title="Elimina operatore"
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