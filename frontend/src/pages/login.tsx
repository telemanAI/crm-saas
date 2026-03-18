import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { 
  Envelope, 
  Lock, 
  Buildings, 
  Crown,
  ArrowRight,
  Eye,
  EyeSlash,
  Warning
} from 'phosphor-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api';

interface LoginForm {
  email: string;
  password: string;
  subscriptionCode?: string;
}

export default function Login() {
  const router = useRouter();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    clearErrors
  } = useForm<LoginForm>();

  const toggleSuperAdmin = () => {
    const newValue = !isSuperAdmin;
    setIsSuperAdmin(newValue);
    setError(null);
    clearErrors();
    if (newValue) {
      reset({ subscriptionCode: '' });
    }
  };

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!data.email || !data.password) {
        setError('Email e password sono obbligatorie');
        setIsLoading(false);
        return;
      }

      if (!isSuperAdmin && !data.subscriptionCode) {
        setError('Il codice negozio è obbligatorio');
        setIsLoading(false);
        return;
      }

      let result;
      
      if (isSuperAdmin) {
        result = await authApi.superAdminLogin(data.email, data.password);
      } else {
        result = await authApi.login(data.email, data.password, data.subscriptionCode);
      }

      // FIX: result contiene direttamente access_token e user
      const { user, access_token } = result;

      if (!user || !access_token) {
        throw new Error('Risposta del server non valida');
      }

      // Store auth data
      setAuth(user, access_token);

      // Redirect based on role
    if (user.role === 'SUPER_ADMIN') {
  router.push('/admin/dashboard');
} else {
  router.push('/operator/dashboard');
}
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Errore durante il login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 mb-4">
            <Buildings weight="fill" className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mb-2">CRM Telecom</h1>
          <p className="text-slate-400">Accedi alla piattaforma</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6"
        >
          <div className="flex justify-center mb-6">
            <button
              type="button"
              onClick={toggleSuperAdmin}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                isSuperAdmin
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Crown weight={isSuperAdmin ? 'fill' : 'regular'} className="w-4 h-4" />
              SuperAdmin
            </button>
          </div>

          <div className="text-center mb-6">
            <span className={`text-sm ${isSuperAdmin ? 'text-amber-400' : 'text-slate-400'}`}>
              {isSuperAdmin 
                ? 'Modalità SuperAdmin - Nessun codice negozio richiesto' 
                : 'Bentornato'}
            </span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <div className="relative">
                <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  {...register('email', { 
                    required: 'Email obbligatoria',
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: 'Email non valida'
                    }
                  })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  placeholder={isSuperAdmin ? 'superadmin@crm.com' : 'nome@email.com'}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', { 
                    required: 'Password obbligatoria',
                    minLength: {
                      value: 6,
                      message: 'Minimo 6 caratteri'
                    }
                  })}
                  className="w-full pl-10 pr-12 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>

            <AnimatePresence mode="wait">
              {!isSuperAdmin && (
                <motion.div
                  key="subscription-code"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Codice Negozio <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Buildings className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="text"
                      {...register('subscriptionCode', { 
                        required: !isSuperAdmin ? 'Codice negozio obbligatorio' : false
                      })}
                      className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                      placeholder="ES: 12345"
                    />
                  </div>
                  {errors.subscriptionCode && (
                    <p className="mt-1 text-sm text-red-400">{errors.subscriptionCode.message}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2"
                >
                  <Warning className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                <>
                  Accedi
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-sm text-slate-500">o</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <p className="text-center text-slate-400 text-sm">
            Non hai un account?{' '}
            <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Registra il tuo negozio
            </Link>
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-slate-500 text-sm mt-8"
        >
          TELEMANAI © 2026 - Tutti i diritti riservati
        </motion.p>
      </div>
    </div>
  );
}
