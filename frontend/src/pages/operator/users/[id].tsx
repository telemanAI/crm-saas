import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  FloppyDisk, 
  Shield, 
  User,
  CheckCircle,
  Warning,
  Eye,
  EyeSlash
} from 'phosphor-react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/stores/authStore';
import axios from 'axios';
import OperatorLayout from '@/components/layout/OperatorLayout';

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'ADMIN' | 'OPERATOR';
  isActive: boolean;
}

export default function EditUser() {
  const router = useRouter();
  const { id } = router.query;
  const { token, user: currentUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'OPERATOR' as 'ADMIN' | 'OPERATOR',
    isActive: true,
    password: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (id && token) {
      fetchUser();
    }
  }, [id, token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`http://localhost:3001/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data;
      setUser(data);
      setFormData({
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        email: data.email || '',
        role: data.role || 'OPERATOR',
        isActive: data.isActive ?? true,
        password: '',
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore caricamento utente');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const updateData: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
        isActive: formData.isActive,
      };

      if (formData.password.trim()) {
        updateData.password = formData.password;
      }

      await axios.put(`http://localhost:3001/api/users/${id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      router.push('/operator/users');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore durante il salvataggio');
      setSaving(false);
    }
  };

  if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
    return (
      <OperatorLayout title="Modifica Operatore">
        <div className="text-center py-12">
          <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Accesso Negato</h3>
          <p className="text-slate-400">Solo gli amministratori possono modificare gli operatori.</p>
        </div>
      </OperatorLayout>
    );
  }

  if (loading) {
    return (
      <OperatorLayout title="Modifica Operatore">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      </OperatorLayout>
    );
  }

  if (!user && !loading) {
    return (
      <OperatorLayout title="Operatore non trovato">
        <div className="text-center py-12">
          <Warning className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Operatore non trovato</h3>
          <button
            onClick={() => router.push('/operator/users')}
            className="mt-4 text-indigo-400 hover:text-indigo-300"
          >
            Torna alla lista
          </button>
        </div>
      </OperatorLayout>
    );
  }

  return (
    <OperatorLayout title={`Modifica: ${user?.firstName} ${user?.lastName}`}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/operator/users')}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">Modifica Operatore</h1>
            <p className="text-slate-400">Gestisci i dati e i permessi</p>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 mb-6 flex items-center gap-3 text-rose-400"
          >
            <Warning className="w-5 h-5" />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-400" />
              Dati Anagrafici
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Nome</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Cognome</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Credenziali</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nuova Password <span className="text-slate-500 text-xs">(lascia vuoto per non modificare)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              Permessi e Stato
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Ruolo</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'OPERATOR' })}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                      formData.role === 'OPERATOR' 
                        ? 'border-violet-500 bg-violet-600/10 text-violet-400' 
                        : 'border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <User className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-semibold">Operatore</div>
                    <div className="text-xs opacity-70">Accesso standard</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'ADMIN' })}
                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                      formData.role === 'ADMIN' 
                        ? 'border-amber-500 bg-amber-600/10 text-amber-400' 
                        : 'border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <Shield className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-semibold">Amministratore</div>
                    <div className="text-xs opacity-70">Controllo completo</div>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isActive" className="text-slate-300">
                  Account attivo
                </label>
                {!formData.isActive && (
                  <span className="text-xs text-rose-400 bg-rose-500/10 px-2 py-1 rounded">
                    L'utente non potrà accedere
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.push('/operator/users')}
              className="flex-1 px-6 py-3 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold px-6 py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <FloppyDisk className="w-5 h-5" />
                  Salva Modifiche
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </OperatorLayout>
  );
}