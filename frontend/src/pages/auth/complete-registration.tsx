import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Buildings, Storefront, UserCircle, ArrowRight, CircleNotch } from 'phosphor-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

type Role = 'shop_owner' | 'operator';

export default function CompleteRegistration() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

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
    setPendingToken(pending);
    setEmail(String(router.query.email || ''));
    setFirstName(String(router.query.firstName || ''));
    setLastName(String(router.query.lastName || ''));
    const invite = String(router.query.invite || '');
    if (invite) {
      setInviteToken(invite);
      setRole('operator');
    }
  }, [router, router.isReady]);

  const submit = async () => {
    if (!role) return;
    setLoading(true);
    setError('');
    try {
      if (role === 'shop_owner') {
        if (!shopName) return setError('Nome negozio obbligatorio');
        if (!legalName && !vatNumber) return setError('Ragione sociale o P.IVA obbligatori');
      } else {
        if (!inviteToken) return setError('Codice invito mancante');
      }
      const res: any = await authApi.completeRegistration({
        pendingToken,
        role,
        shopName: role === 'shop_owner' ? shopName : undefined,
        legalName: role === 'shop_owner' ? legalName || shopName : undefined,
        vatNumber: role === 'shop_owner' ? vatNumber || undefined : undefined,
        inviteToken: role === 'operator' ? inviteToken : undefined,
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
    <div className=\"min-h-screen bg-slate-950 flex items-center justify-center p-4\">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className=\"w-full max-w-[520px]\">
        <div className=\"bg-slate-900/70 backdrop-blur-2xl border border-slate-800 rounded-2xl p-8 shadow-2xl\">
          <div className=\"text-center mb-6\">
            <div className=\"w-14 h-14 bg-gradient-to-br from-indigo-500 to-cyan-600 rounded-2xl mx-auto mb-4 flex items-center justify-center\">
              <Buildings className=\"w-7 h-7 text-white\" />
            </div>
            <h1 className=\"text-xl font-bold text-white\">Completa la registrazione</h1>
            <p className=\"text-slate-400 text-sm mt-1\">Ciao <span className=\"text-cyan-400\">{email}</span>, ancora pochi dati</p>
          </div>

          {!role && (
            <div className=\"grid gap-3\">
              <button onClick={() => setRole('shop_owner')} data-testid=\"complete-role-owner\" className=\"flex items-center gap-4 p-5 bg-slate-950/50 hover:bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl text-left transition-all group\">
                <Storefront weight=\"duotone\" className=\"w-8 h-8 text-indigo-400\" />
                <div className=\"flex-1\">
                  <h3 className=\"text-white font-semibold\">Sono un negoziante</h3>
                  <p className=\"text-slate-400 text-sm\">Crea un nuovo negozio</p>
                </div>
                <ArrowRight className=\"w-5 h-5 text-slate-600 group-hover:text-indigo-400\" />
              </button>
              <button onClick={() => setRole('operator')} data-testid=\"complete-role-operator\" className=\"flex items-center gap-4 p-5 bg-slate-950/50 hover:bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 rounded-2xl text-left transition-all group\">
                <UserCircle weight=\"duotone\" className=\"w-8 h-8 text-cyan-400\" />
                <div className=\"flex-1\">
                  <h3 className=\"text-white font-semibold\">Sono un operatore</h3>
                  <p className=\"text-slate-400 text-sm\">Ho ricevuto un invito da un negozio</p>
                </div>
                <ArrowRight className=\"w-5 h-5 text-slate-600 group-hover:text-cyan-400\" />
              </button>
            </div>
          )}

          {role === 'shop_owner' && (
            <div className=\"space-y-3\">
              <Input label=\"Nome negozio\" value={shopName} onChange={setShopName} required testid=\"complete-shopname\" />
              <Input label=\"Ragione sociale\" value={legalName} onChange={setLegalName} testid=\"complete-legalname\" />
              <Input label=\"P.IVA (se ragione sociale già esistente)\" value={vatNumber} onChange={setVatNumber} testid=\"complete-vat\" />
              {error && <div className=\"text-rose-400 text-sm\">{error}</div>}
              <button onClick={submit} disabled={loading} className=\"w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50\" data-testid=\"complete-submit\">
                {loading ? <CircleNotch className=\"w-5 h-5 animate-spin\" /> : <>Crea negozio <ArrowRight className=\"w-4 h-4\" /></>}
              </button>
            </div>
          )}

          {role === 'operator' && (
            <div className=\"space-y-3\">
              <Input label=\"Codice invito\" value={inviteToken} onChange={setInviteToken} required testid=\"complete-invite\" placeholder=\"Incolla il codice ricevuto via email\" />
              <p className=\"text-xs text-slate-500\">Il tuo admin ti ha inviato un link del tipo <code className=\"text-indigo-400\">/invite/XYZ</code>. Incolla XYZ qui.</p>
              {error && <div className=\"text-rose-400 text-sm\">{error}</div>}
              <button onClick={submit} disabled={loading} className=\"w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50\" data-testid=\"complete-operator-submit\">
                {loading ? <CircleNotch className=\"w-5 h-5 animate-spin\" /> : <>Conferma <ArrowRight className=\"w-4 h-4\" /></>}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function Input({ label, value, onChange, required, testid, placeholder }: any) {
  return (
    <div>
      <label className=\"block text-xs font-medium text-slate-400 mb-1 ml-1\">{label}</label>
      <input
        data-testid={testid}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className=\"w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30\"
      />
    </div>
  );
}
