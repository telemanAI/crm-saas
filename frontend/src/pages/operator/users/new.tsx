import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  Check,
  User,
  Envelope,
  Lock,
  Shield
} from 'phosphor-react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';
import Link from 'next/link';
import OperatorLayout from '@/components/layout/OperatorLayout';

export default function NewUser() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'OPERATOR',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Le password non coincidono');
      return;
    }

    if (formData.password.length < 6) {
      setError('La password deve avere almeno 6 caratteri');
      return;
    }

    setLoading(true);

    try {
      await api.post('/users', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      router.push('/operator/users');
    } catch (err: any) {
      console.error('Errore creazione utente:', err);
      setError(err.response?.data?.message || 'Errore durante la creazione dell\'utente');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <OperatorLayout title="Nuovo Operatore">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/operator/users">
          <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
            <ArrowLeft className="w-6 h-6" />
          </button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">Nuovo Operatore</h1>
          <p className="text-slate-400">Aggiungi un nuovo operatore al tuo negozio</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
          {error}
        </div>
      )}

      {/* Form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="max-w-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-8"
      >
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Nome <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="Mario"
              />
            </div>
          </div>

          {/* Cognome */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Cognome <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                placeholder="Rossi"
              />
            </div>
          </div>
        </div>

        {/* Email */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Email <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Envelope className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              placeholder="operatore@negozio.it"
            />
          </div>
        </div>

        {/* Ruolo */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Ruolo <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="OPERATOR">Operatore</option>
              <option value="ADMIN">Amministratore</option>
            </select>
          </div>
        </div>

        {/* Password */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Password <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="password"
              name="password"
              required
              minLength={6}
              value={formData.password}
              onChange={handleChange}
              className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              placeholder="••••••••"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">Minimo 6 caratteri</p>
        </div>

        {/* Conferma Password */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Conferma Password <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="password"
              name="confirmPassword"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              placeholder="••••••••"
            />
          </div>
        </div>

        {/* Bottoni */}
        <div className="flex gap-4">
          <Link href="/operator/users" className="flex-1">
            <button
              type="button"
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-colors"
            >
              Annulla
            </button>
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <>
                <Check className="w-5 h-5" />
                Crea Operatore
              </>
            )}
          </button>
        </div>
      </motion.form>
    </OperatorLayout>
  );
}
