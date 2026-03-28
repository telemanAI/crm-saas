import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { 
  Envelope, 
  Lock, 
  Buildings, 
  ArrowRight,
  Eye,
  EyeSlash,
  Warning,
  ShieldCheck,
  WifiHigh
} from 'phosphor-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api';

interface LoginForm {
  email: string;
  password: string;
  subscriptionCode: string;
}

export default function Login() {
  const router = useRouter();
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError(null);

    try {
      // Il backend riconosce automaticamente il super admin dal codice (9 cifre vs 5 cifre)
      const result = await authApi.login(data.email, data.password, data.subscriptionCode);

      const { user, access_token } = result;

      if (!user || !access_token) {
        throw new Error('Risposta del server non valida');
      }

      // Store auth data
      setAuth(user, access_token);

      // Redirect based on role - gestito automaticamente dal backend
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
    <div className="relative min-h-screen w-full bg-slate-950 flex items-center justify-center overflow-hidden p-4">
      {/* Background Mesh Gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-[spin_120s_linear_infinite] opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[128px]" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-600/20 rounded-full blur-[96px]" />
        </div>
        
        {/* Tech Grid Overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, rgb(99 102 241) 1px, transparent 1px),
                              linear-gradient(to bottom, rgb(99 102 241) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Main Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[440px]"
      >
        {/* Glass Card */}
        <div className="relative bg-slate-900/40 backdrop-blur-2xl border border-slate-800/60 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
          
          {/* Top Gradient Line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-indigo-500 opacity-80" />

          <div className="p-8 md:p-10">
            {/* Header */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mb-8"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-cyan-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
                <Buildings weight="duotone" className="w-8 h-8 text-white" />
              </div>
              
              <h1 className="text-2xl font-semibold text-white tracking-tight mb-2">
                Accedi alla piattaforma
              </h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                Gestione integrata per operatori telecom. <br className="hidden sm:block" />
                Accedi con le credenziali del tuo negozio.
              </p>
            </motion.div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">
                  Indirizzo Email
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Envelope className="w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                  </div>
                  <input
                    type="email"
                    {...register('email', { 
                      required: 'Email obbligatoria',
                      pattern: {
                        value: /^\S+@\S+$/i,
                        message: 'Email non valida'
                      }
                    })}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-slate-200 placeholder:text-slate-600
                             focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 
                             transition-all duration-200"
                    placeholder="nome@azienda.it"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-red-400 ml-1">{errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password', { 
                      required: 'Password obbligatoria',
                      minLength: {
                        value: 6,
                        message: 'Minimo 6 caratteri'
                      }
                    })}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-12 pr-12 py-3.5 text-slate-200 placeholder:text-slate-600
                             focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 
                             transition-all duration-200"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-400 ml-1">{errors.password.message}</p>
                )}
              </div>

              {/* Subscription Code Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 ml-1">
                  Codice Negozio <span className="text-red-400">*</span>
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <WifiHigh className="w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    {...register('subscriptionCode', { 
                      required: 'Codice negozio obbligatorio'
                    })}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-slate-200 placeholder:text-slate-600
                             focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 
                             transition-all duration-200 font-mono text-sm tracking-wider"
                    placeholder="ES: 12345"
                  />
                </div>
                {errors.subscriptionCode && (
                  <p className="text-sm text-red-400 ml-1">{errors.subscriptionCode.message}</p>
                )}
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3"
                  >
                    <Warning className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 
                         text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 
                         shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200"
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
                    <ArrowRight className="w-5 h-5" weight="bold" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-slate-800/50 space-y-4">
              <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4" weight="fill" />
                <span>Connessione crittografata SSL</span>
              </div>
              
              <p className="text-center text-sm text-slate-400">
                Non hai un account?{' '}
                <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                  Registra il tuo negozio
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Tagline */}
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-6 text-xs text-slate-600 font-medium tracking-wide uppercase"
        >
          Piattaforma per la gestione pratiche telecom
        </motion.p>
      </motion.div>
    </div>
  );
}