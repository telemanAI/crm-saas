import { useEffect, useState, Component, type ReactNode, type ErrorInfo } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Buildings, CircleNotch, CheckCircle, Envelope, Lock, User, ArrowRight, GoogleLogo, FacebookLogo, Warning, SignOut, ArrowCounterClockwise } from 'phosphor-react';
import { authApi, invitesApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Error Boundary — cattura crash nel render e mostra una pagina di recovery
 * invece di una pagina vuota (fondamentale per WebView in-app su mobile).
 */
class InviteErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; errorMessage: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log silenzioso — in produzione si può inviare a un servizio di tracking
    console.error('[InviteErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div className="bg-slate-900/90 backdrop-blur-xl border border-rose-500/20 rounded-2xl p-6 md:p-8 shadow-2xl">
              <div className="w-14 h-14 bg-rose-500/20 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <Warning className="w-7 h-7 text-rose-400" weight="fill" />
              </div>
              <h1 className="text-xl font-bold text-white text-center mb-2">
                Si è verificato un errore
              </h1>
              <p className="text-slate-400 text-sm text-center mb-6">
                Qualcosa è andato storto nel caricamento dell&apos;invito.
                Prova a ricaricare la pagina o usa il link diretto sotto.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors mb-3"
              >
                <ArrowCounterClockwise className="w-5 h-5" />
                Ricarica pagina
              </button>
              <button
                onClick={() => {
                  const url = window.location.href;
                  window.open(url, '_blank');
                }}
                className="flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 rounded-xl transition-colors"
              >
                Apri in una nuova scheda
              </button>
            </div>
          </motion.div>
        </div>
      );
    }
    return this.props.children;
  }
}

type Mode = 'choose' | 'password' | 'loading' | 'existing';

interface InputProps {
  icon?: React.ReactNode;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  testid?: string;
}

function Input({ icon, type = 'text', placeholder, value, onChange, required, testid }: InputProps) {
  return (
    <div className="relative">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">{icon}</div>
      <input
        data-testid={testid}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
      />
    </div>
  );
}

function InviteAcceptInner() {
  const router = useRouter();
  const token = router.query.token as string | undefined;
  const { user, token: authToken, setAuth, clearAuth } = useAuthStore();

  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [mode, setMode] = useState<Mode>('choose');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // FIX: salva il token in sessionStorage per recovery se OAuth cambia browser (mobile)
  useEffect(() => {
    if (token && typeof window !== 'undefined') {
      sessionStorage.setItem('pendingInviteToken', token);
    }
  }, [token]);

  // FIX: se l'utente torna loggato con lo stesso email dell'invito, propone accettazione diretta
  useEffect(() => {
    if (!router.isReady || !token) return;
    (async () => {
      try {
        const data = await authApi.getInvite(token);
        setInvite(data);
        const userEmail = user?.email?.toLowerCase();
        const inviteEmail = data?.email?.toLowerCase();
        if (userEmail && authToken && userEmail === inviteEmail) {
          setMode('existing');
        } else if (userEmail && userEmail !== inviteEmail) {
          setMode('choose');
        } else {
          setMode('choose');
        }
      } catch (e: any) {
        console.error('[invite] Errore caricamento invito:', e);
        setError(e?.message || 'Invito non valido o scaduto');
      }
    })();
  }, [router.isReady, token, user, authToken]);

  const acceptAuthenticated = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const res: any = await invitesApi.acceptAuthenticated(token);
      if (res?.access_token && res?.user) {
        setAuth(res.user, res.access_token, res.shops || []);
        if ((res.shops || []).length > 1) {
          router.push('/select-shop');
        } else {
          router.push('/operator/dashboard');
        }
      } else {
        const shops: any = await authApi.myShops();
        if (user && authToken) setAuth(user, authToken, shops);
        router.push('/select-shop');
      }
    } catch (e: any) {
      setError(e.message || 'Errore');
    } finally {
      setSubmitting(false);
    }
  };

  const acceptWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      await invitesApi.acceptWithPassword(token, { password, firstName, lastName });
      router.push(`/login?invited=1&email=${encodeURIComponent(invite.email)}`);
    } catch (e: any) {
      setError(e.message || 'Errore');
    } finally {
      setSubmitting(false);
    }
  };

  const openSocial = (provider: 'google' | 'facebook') => {
    if (token && typeof window !== 'undefined') {
      // Backup anche in localStorage con timestamp per cross-browser recovery
      localStorage.setItem('pendingInviteToken', token);
      localStorage.setItem('pendingInviteTimestamp', Date.now().toString());
      // FIX: salva anche l'email per recovery in complete-registration se il browser cambia
      if (invite?.email) {
        sessionStorage.setItem('pendingRegistrationEmail', invite.email);
      }
    }
    window.location.href = `${API_BASE}/auth/${provider}?invite=${token}`;
  };

  const handleLogoutAndRetry = () => {
    clearAuth();
    setMode('choose');
  };

  if (error && !invite) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-8 text-center max-w-md">
          <h1 className="text-xl font-bold text-white mb-2">Invito non valido</h1>
          <p className="text-slate-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <CircleNotch className="w-10 h-10 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[520px]">
        <div className="bg-slate-900/70 backdrop-blur-2xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-5">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <Buildings className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Sei stato invitato!</h1>
            <p className="text-slate-400 text-sm mt-1">Ti stanno dando accesso a:</p>
          </div>

          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-5 mb-5 text-center">
            <p className="text-indigo-300 text-xs uppercase font-semibold tracking-wider mb-1">Negozio</p>
            <p className="text-white font-bold text-lg">{invite.shopName}</p>
            <p className="text-indigo-400 text-xs font-mono mt-2">Codice {invite.shopCode}</p>
            <p className="text-slate-300 text-sm mt-3">Ruolo: <span className="font-semibold">{invite.role}</span></p>
            <p className="text-slate-400 text-xs mt-3">Email invito: <span className="text-cyan-400">{invite.email}</span></p>
          </div>

          {invite.adminNote && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-5">
              <p className="text-amber-400 text-xs uppercase font-semibold mb-1">Messaggio dell'admin</p>
              <p className="text-amber-200 text-sm italic">"{invite.adminNote}"</p>
            </div>
          )}

          {mode !== 'existing' && user?.email && user.email.toLowerCase() !== invite.email?.toLowerCase() && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4 text-center">
              <p className="text-amber-300 text-xs mb-2">
                Sei attualmente loggato come <b>{user.email}</b>. Questo invito è per <b>{invite.email}</b>.
              </p>
              <button
                onClick={handleLogoutAndRetry}
                className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-medium"
              >
                <SignOut className="w-3.5 h-3.5" /> Esci e accedi con l'email dell'invito
              </button>
            </div>
          )}

          {mode === 'existing' && user && (
            <button
              onClick={acceptAuthenticated}
              disabled={submitting}
              data-testid="invite-accept-auth"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? <CircleNotch className="w-5 h-5 animate-spin" /> : <><CheckCircle className="w-5 h-5" /> Accetta invito come {user.email}</>}
            </button>
          )}

          {mode === 'choose' && (
            <div className="space-y-3">
              <p className="text-slate-400 text-sm text-center mb-2">Come vuoi accedere?</p>
              <button onClick={() => openSocial('google')} className="w-full flex items-center justify-center gap-3 bg-[#ffffff] hover:bg-[#f8fafc] text-[#0f172a] font-medium py-3 rounded-xl border border-slate-300" data-testid="invite-google-btn">
                <GoogleLogo weight="bold" className="w-5 h-5" /> Continua con Google
              </button>
              <button onClick={() => openSocial('facebook')} className="w-full flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#166fe5] text-white font-medium py-3 rounded-xl" data-testid="invite-facebook-btn">
                <FacebookLogo weight="fill" className="w-5 h-5" /> Continua con Facebook
              </button>
              
              {/* FIX: avviso mobile per problemi OAuth su browser in-app */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-center">
                <p className="text-slate-400 text-xs flex items-center justify-center gap-1.5">
                  <Warning className="w-3.5 h-3.5 text-amber-400" />
                  Se i bottoni sopra non funzionano sul tuo telefono, usa l'opzione qui sotto.
                </p>
              </div>

              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-xs text-slate-500">o</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>
              <button onClick={() => setMode('password')} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl" data-testid="invite-password-btn">
                Crea un account con email e password
              </button>
            </div>
          )}

          {mode === 'password' && (
            <form onSubmit={acceptWithPassword} className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                <Envelope className="w-4 h-4" /> <span>{invite.email}</span>
              </div>
              <Input icon={<User className="w-4 h-4" />} placeholder="Nome" value={firstName} onChange={setFirstName} required testid="invite-firstname" />
              <Input icon={<User className="w-4 h-4" />} placeholder="Cognome" value={lastName} onChange={setLastName} required testid="invite-lastname" />
              <Input icon={<Lock className="w-4 h-4" />} type="password" placeholder="Password (min 6)" value={password} onChange={setPassword} required testid="invite-password-input" />
              {error && <div className="text-rose-400 text-sm">{error}</div>}
              <button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50" data-testid="invite-submit-btn">
                {submitting ? <CircleNotch className="w-5 h-5 animate-spin" /> : <>Crea account <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          <p className="text-center text-xs text-slate-500 mt-5">
            Invito valido fino al{' '}
            <span className="text-slate-400">{new Date(invite.expiresAt).toLocaleString('it-IT')}</span>
          </p>

        </div>
      </motion.div>
    </div>
  );
}

// Export wrappato con Error Boundary per catturare crash silenziosi su WebView mobile
export default function InviteAccept() {
  return (
    <InviteErrorBoundary>
      <InviteAcceptInner />
    </InviteErrorBoundary>
  );
}