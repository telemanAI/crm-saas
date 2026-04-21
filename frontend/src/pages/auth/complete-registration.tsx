import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Buildings, Storefront, UserCircle, ArrowRight, CircleNotch, Envelope } from 'phosphor-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

type Role = 'shop_owner' | 'operator';

interface InputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  testid?: string;
  placeholder?: string;
}

function Input({ label, value, onChange, required, testid, placeholder }: InputProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1 ml-1">{label}</label>
      <input
        type="text"
        data-testid={testid}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
      />
    </div>
  );
}

export default function CompleteRegistration() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const [pendingToken, setPendingToken] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<Role | null>(null);
  const [shopName, setShopName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [inviteToken, setInviteToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;
    const pending = String(router.query.pending || '');
    if (!pending) {
      router.replace('/login');
      return;
    }
    // 🔒 SICUREZZA: pulisci qualsiasi sessione precedente.
    clearAuth();
    setPendingToken(pending);
    setEmail(String(router.query.email || ''));
    setFirstName(String(router.query.firstName || ''));
    setLastName(String(router.query.lastName || ''));
    // Se Google/Facebook ha propagato un invite via state → accettiamolo automaticamente
    const invite = String(router.query.invite || '');
    if (invite) {
      setInviteToken(invite);
      (async () => {
        setLoading(true);
        try {
          const res: any = await authApi.completeRegistration({
            pendingToken: pending,
            role: 'operator',
            inviteToken: invite,
          });
          setAuth(res.user, res.token, res.shops || []);
          if ((res.shops || []).length > 1) return router.replace('/select-shop');
          return router.replace('/operator/dashboard');
        } catch (err: any) {
          setError(err?.message || 'Invito non valido o scaduto');
          setLoading(false);
        }
      })();
    }
  }, [router, router.isReady, clearAuth, setAuth]);

  useEffect(() => {
    const handler = () => clearAuth();
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, [clearAuth]);

  const submitShopOwner = async () => {
    if (!shopName.trim()) return setError('Nome negozio obbligatorio');
    if (!legalName.trim() && !vatNumber.trim()) {
      return setError('Ragione sociale o P.IVA obbligatori');
    }
    setLoading(true);
    setError('');
    try {
      const res: any = await authApi.completeRegistration({
        pendingToken,
        role: 'shop_owner',
        shopName: shopName.trim(),
        legalName: legalName.trim() || shopName.trim(),
        vatNumber: vatNumber.trim() || undefined,
      });
      setAuth(res.user, res.token, res.shops || []);
      if ((res.shops || []).length > 1) return router.replace('/select-shop');
      return router.replace('/operator/dashboard');
    } catch (err: any) {
      setError(err.message || 'Errore nel completamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[520px]">
        <div className="bg-slate-900/70 backdrop-blur-2xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-cyan-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <Buildings className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">Completa la registrazione</h1>
            <p className="text-slate-400 text-sm mt-1">
              Ciao <span className="text-cyan-400">{email}</span>, ancora pochi dati
            </p>
          </div>

          {/* Loading overlay per auto-accept invite via Google/FB */}
          {inviteToken && loading && !role && (
            <div className="flex flex-col items-center justify-center py-6 gap-3" data-testid="invite-auto-accept">
              <CircleNotch className="w-9 h-9 text-cyan-400 animate-spin" />
              <p className="text-slate-400 text-sm">Accettazione invito in corso...</p>
            </div>
          )}

          {/* Errore auto-accept invite */}
          {inviteToken && error && !role && (
            <div className="text-center py-3">
              <p className="text-rose-400 text-sm mb-3" data-testid="invite-auto-error">{error}</p>
              <button onClick={() => { clearAuth(); router.replace('/login'); }} className="text-cyan-400 text-sm hover:underline">
                Torna al login
              </button>
            </div>
          )}

          {!inviteToken && !role && (
            <div className="grid gap-3">
              <button onClick={() => setRole('shop_owner')} data-testid="complete-role-owner" className="flex items-center gap-4 p-5 bg-slate-950/50 hover:bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl text-left transition-all group">
                <Storefront weight="duotone" className="w-8 h-8 text-indigo-400" />
                <div className="flex-1">
                  <h3 className="text-white font-semibold">Sono un negoziante</h3>
                  <p className="text-slate-400 text-sm">Apro un nuovo negozio</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400" />
              </button>
              <button onClick={() => setRole('operator')} data-testid="complete-role-operator" className="flex items-center gap-4 p-5 bg-slate-950/50 hover:bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 rounded-2xl text-left transition-all group">
                <UserCircle weight="duotone" className="w-8 h-8 text-cyan-400" />
                <div className="flex-1">
                  <h3 className="text-white font-semibold">Sono un operatore</h3>
                  <p className="text-slate-400 text-sm">Sono stato invitato in un negozio</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-cyan-400" />
              </button>
            </div>
          )}

          {role === 'shop_owner' && (
            <div className="space-y-3">
              <Input label="Nome negozio" value={shopName} onChange={setShopName} required testid="complete-shopname" />
              <Input label="Ragione sociale" value={legalName} onChange={setLegalName} testid="complete-legalname" />
              <Input label="P.IVA (se ragione sociale già esistente)" value={vatNumber} onChange={setVatNumber} testid="complete-vat" />
              {error && <div className="text-rose-400 text-sm" data-testid="complete-error">{error}</div>}
              <button onClick={submitShopOwner} disabled={loading} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50" data-testid="complete-submit">
                {loading ? <CircleNotch className="w-5 h-5 animate-spin" /> : <>Crea negozio <ArrowRight className="w-4 h-4" /></>}
              </button>
              <button type="button" onClick={() => { setRole(null); setError(''); }} className="w-full text-slate-500 text-xs hover:text-slate-300 py-1">
                ← Torna alla scelta ruolo
              </button>
            </div>
          )}

          {role === 'operator' && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4 py-2">
              <div className="w-14 h-14 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl mx-auto flex items-center justify-center">
                <Envelope weight="duotone" className="w-7 h-7 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-base mb-1">Hai bisogno di un invito</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Gli operatori possono registrarsi <b>solo tramite il link di invito</b> che riceverai via email dal tuo Founder o Admin.
                </p>
                <p className="text-slate-500 text-xs mt-3">
                  Se hai già ricevuto l'email, apri il link per accedere direttamente.
                </p>
              </div>
              <div className="pt-2 space-y-2">
                <button onClick={() => { clearAuth(); router.replace('/login'); }} data-testid="back-to-login-btn" className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold py-3 rounded-xl text-sm">
                  Torna al login
                </button>
                <button type="button" onClick={() => { setRole(null); setError(''); }} className="w-full text-slate-500 text-xs hover:text-slate-300 py-1">
                  ← Torna alla scelta ruolo
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}