import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Envelope, Lock, Buildings, ArrowRight, Eye, EyeSlash, Warning,
  ShieldCheck, GoogleLogo, FacebookLogo, Key,
} from 'phosphor-react';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/lib/api';
import { setRefreshToken } from '@/lib/axios';

type LoginMode = 'password' | 'otp';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface FieldInputProps {
  icon: React.ReactNode;
  type?: React.HTMLInputTypeAttribute;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  trailing?: React.ReactNode;
  testid?: string;
  name?: string;
  autoComplete?: string;
}

function FieldInput({
  icon,
  type = 'text',
  label,
  value,
  onChange,
  placeholder,
  required,
  trailing,
  testid,
  name,
  autoComplete,
}: FieldInputProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-300 ml-1">{label}</label>
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-cyan-400 transition-colors">
          {icon}
        </div>
        <input
          data-testid={testid}
          type={type}
          name={name}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={!!required}
          className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-12 pr-12 py-3.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
        />
        {trailing && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">{trailing}</div>
        )}
      </div>
    </div>
  );
}

interface ErrorBoxProps {
  error: string | null;
}

function ErrorBox({ error }: ErrorBoxProps) {
  return (
    <AnimatePresence>
      {error ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5"
          data-testid="login-error-box"
        >
          <Warning className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

interface SubmitButtonProps {
  loading: boolean;
  children: React.ReactNode;
  testid?: string;
}

function SubmitButton({ loading, children, testid }: SubmitButtonProps) {
  return (
    <motion.button
      data-testid={testid}
      type="submit"
      disabled={loading}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    >
      {loading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
        />
      ) : (
        <>{children} <ArrowRight className="w-5 h-5" weight="bold" /></>
      )}
    </motion.button>
  );
}

export default function Login() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mode, setMode] = useState<LoginMode>('password');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [superAdminCode, setSuperAdminCode] = useState<string>('');
  const [showSuperAdminField, setShowSuperAdminField] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // Precompila email dall'ultimo login riuscito.
  // SPRINT — "Resta connesso": se il flag è attivo, la password viene
  // pre-compilata dal password manager del browser grazie agli attributi
  // autoComplete="current-password" e name="password" sull'input. Lo
  // useEffect carica l'email dal localStorage; la password resta in mano
  // al browser per ragioni di sicurezza (no chiaro nello storage).
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const lastEmail = window.localStorage.getItem('lastLoginEmail');
      const stayLogged = window.localStorage.getItem('authRememberMe') === 'true';
      if (lastEmail) setEmail(lastEmail);
      // Allinea l'UI col flag effettivo persistente
      if (stayLogged) setRememberMe(true);
    }
  }, []);

  const applyRememberMe = (value: boolean) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('authRememberMe', value ? 'true' : 'false');
      if (value && email) {
        window.localStorage.setItem('lastLoginEmail', email);
      }
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const result: any = await authApi.loginV2(email, password, superAdminCode || undefined);
      const { user, access_token, refresh_token, shops } = result;
      if (!user || !access_token) throw new Error('Risposta del server non valida');
      applyRememberMe(rememberMe);
      if (refresh_token) setRefreshToken(refresh_token);
      setAuth(user, access_token, shops || []);
      if (user.role === 'SUPER_ADMIN') return router.push('/admin/dashboard');
      if ((shops || []).length > 1) return router.push('/select-shop');
      return router.push('/operator/dashboard');
    } catch (err: any) {
      if (err.message?.includes('SuperAdmin')) {
        setShowSuperAdminField(true);
        setError('Inserisci il codice di sicurezza SuperAdmin');
      } else {
        setError(err.message || 'Errore durante il login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await authApi.requestOtp(email);
      setOtpSent(true);
    } catch (err: any) {
      setError(err.message || 'Errore invio codice');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const result: any = await authApi.verifyOtp(email, otpCode);
      if (result.status === 'pending') {
        return router.push(
          `/auth/complete-registration?pending=${result.pendingToken}&email=${encodeURIComponent(result.email)}`,
        );
      }
      applyRememberMe(rememberMe);
      if (result.refresh_token) setRefreshToken(result.refresh_token);
      setAuth(result.user, result.token, result.shops || []);
      if ((result.shops || []).length > 1) return router.push('/select-shop');
      return router.push('/operator/dashboard');
    } catch (err: any) {
      setError(err.message || 'Codice non valido');
    } finally {
      setIsLoading(false);
    }
  };

  const openSocialLogin = (provider: 'google' | 'facebook') => {
    window.location.href = `${API_BASE}/auth/${provider}`;
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-950 flex items-center justify-center overflow-hidden p-4">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] animate-[spin_120s_linear_infinite] opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[128px]" />
        </div>
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgb(99 102 241) 1px, transparent 1px),linear-gradient(to bottom, rgb(99 102 241) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-[460px]"
      >
        <div className="relative bg-slate-900/40 backdrop-blur-2xl border border-slate-800/60 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-indigo-500 opacity-80" />
          <div className="p-8 md:p-10">
            <div className="mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-cyan-600 rounded-xl flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/20">
                <Buildings weight="duotone" className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-2xl font-semibold text-white tracking-tight mb-1">Accedi alla piattaforma</h1>
              <p className="text-slate-400 text-sm">Gestione integrata per operatori telecom.</p>
            </div>

            {/* Social buttons */}
            <div className="space-y-2.5 mb-5">
              <button
                data-testid="google-login-btn"
                onClick={() => openSocialLogin('google')}
                className="w-full flex items-center justify-center gap-3 bg-[#ffffff] hover:bg-[#f8fafc] text-[#0f172a] font-medium py-3 rounded-xl transition-colors border border-slate-300"
              >
                <GoogleLogo weight="bold" className="w-5 h-5" /> Continua con Google
              </button>
              <button
                data-testid="facebook-login-btn"
                onClick={() => openSocialLogin('facebook')}
                className="w-full flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#166fe5] text-white font-medium py-3 rounded-xl transition-colors"
              >
                <FacebookLogo weight="fill" className="w-5 h-5" /> Continua con Facebook
              </button>
            </div>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-xs text-slate-500 uppercase tracking-wider">oppure</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {/* Mode toggle */}
            <div className="grid grid-cols-2 gap-2 mb-5 p-1 bg-slate-950/50 rounded-xl">
              <button
                type="button"
                data-testid="mode-password-btn"
                onClick={() => { setMode('password'); setError(null); }}
                className={`py-2 text-sm font-medium rounded-lg transition ${mode === 'password' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Password
              </button>
              <button
                type="button"
                data-testid="mode-otp-btn"
                onClick={() => { setMode('otp'); setError(null); setOtpSent(false); }}
                className={`py-2 text-sm font-medium rounded-lg transition ${mode === 'otp' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Codice email
              </button>
            </div>

            {mode === 'password' ? (
              <form onSubmit={handlePasswordLogin} className="space-y-4" autoComplete="on">
                <FieldInput
                  icon={<Envelope className="w-5 h-5" />}
                  type="email"
                  label="Email"
                  value={email}
                  onChange={setEmail}
                  placeholder="nome@azienda.it"
                  testid="email-input"
                  name="email"
                  autoComplete="username"
                  required
                />
                <FieldInput
                  icon={<Lock className="w-5 h-5" />}
                  type={showPassword ? 'text' : 'password'}
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                  testid="password-input"
                  name="password"
                  autoComplete="current-password"
                  required
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  }
                />
                <AnimatePresence>
                  {showSuperAdminField ? (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      <FieldInput
                        icon={<ShieldCheck className="w-5 h-5" />}
                        type="text"
                        label="Codice Sicurezza SuperAdmin"
                        value={superAdminCode}
                        onChange={setSuperAdminCode}
                        placeholder="Codice riservato"
                        testid="superadmin-code-input"
                      />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none py-1" data-testid="remember-me-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    data-testid="remember-me-checkbox"
                    className="w-4 h-4 rounded accent-indigo-500 bg-slate-950 border-slate-700"
                  />
                  <span>Resta connesso su questo dispositivo</span>
                </label>
                <ErrorBox error={error} />
                <SubmitButton loading={isLoading} testid="login-submit-btn">Accedi</SubmitButton>
              </form>
            ) : otpSent ? (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <p className="text-sm text-slate-400">
                  Codice a 6 cifre inviato a <span className="text-cyan-400 font-medium">{email}</span>.
                </p>
                <FieldInput
                  icon={<Key className="w-5 h-5" />}
                  type="text"
                  label="Codice di accesso"
                  value={otpCode}
                  onChange={setOtpCode}
                  placeholder="000000"
                  testid="otp-code-input"
                  required
                />
                <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none py-1">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    data-testid="remember-me-otp-checkbox"
                    className="w-4 h-4 rounded accent-indigo-500 bg-slate-950 border-slate-700"
                  />
                  <span>Resta connesso su questo dispositivo</span>
                </label>
                <ErrorBox error={error} />
                <SubmitButton loading={isLoading} testid="otp-verify-btn">Verifica e accedi</SubmitButton>
                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setOtpCode(''); }}
                  className="w-full text-sm text-slate-500 hover:text-slate-300"
                >
                  Usa un'altra email
                </button>
              </form>
            ) : (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <FieldInput
                  icon={<Envelope className="w-5 h-5" />}
                  type="email"
                  label="Email"
                  value={email}
                  onChange={setEmail}
                  placeholder="nome@azienda.it"
                  testid="otp-email-input"
                  required
                />
                <ErrorBox error={error} />
                <SubmitButton loading={isLoading} testid="otp-request-btn">Invia codice</SubmitButton>
              </form>
            )}

            <div className="mt-7 pt-5 border-t border-slate-800/50">
              <p className="text-center text-sm text-slate-400">
                Non hai un account?{' '}
                <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-medium">
                  Registrati
                </Link>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}