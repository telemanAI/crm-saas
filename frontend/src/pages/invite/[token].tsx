import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Buildings, CircleNotch, CheckCircle, Envelope, Lock, User, ArrowRight, GoogleLogo, FacebookLogo } from 'phosphor-react';
import { authApi, invitesApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

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

export default function InviteAccept() {
  const router = useRouter();
  const token = router.query.token as string | undefined;
  const { user, token: authToken, setAuth } = useAuthStore();

  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [mode, setMode] = useState<Mode>('choose');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

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
      // Backend ora restituisce access_token fresco con tenantId = shop invitato
      if (res?.access_token && res?.user) {
        setAuth(res.user, res.access_token, res.shops || []);
        // Se l'utente ha più di un negozio lo mandiamo al selettore così
        // sa di poter switchare, altrimenti dritto in dashboard.
        if ((res.shops || []).length > 1) {
          router.push('/select-shop');
        } else {
          router.push('/operator/dashboard');
        }
      } else {
        // Fallback legacy (vecchio backend senza access_token nel response)
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
    window.location.href = `${API_BASE}/auth/${provider}?invite=${token}`;
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
              <p className="text-amber-300 text-xs">
                Sei attualmente loggato come <b>{user.email}</b>. Questo invito è per <b>{invite.email}</b>.
                <br />Completa la registrazione con l'email dell'invito per accettare.
              </p>
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