import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Buildings, Envelope, Lock, Eye, EyeSlash, ArrowRight, ArrowLeft,
  CircleNotch, CheckCircle, UserCircle, Storefront, GoogleLogo, FacebookLogo, User,
} from 'phosphor-react';
import { authApi } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

type Step = 'role' | 'owner-form' | 'operator-info' | 'success';

interface RoleCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  testid?: string;
}

function RoleCard({ icon, title, subtitle, onClick, testid }: RoleCardProps) {
  return (
    <button
      data-testid={testid}
      onClick={onClick}
      className="group flex items-start gap-4 p-5 bg-slate-950/50 hover:bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl text-left transition-all"
    >
      <div className="p-3 bg-slate-900/60 rounded-xl group-hover:scale-110 transition-transform">{icon}</div>
      <div className="flex-1">
        <h3 className="text-white font-semibold mb-0.5">{title}</h3>
        <p className="text-slate-400 text-sm">{subtitle}</p>
      </div>
      <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 self-center transition-colors" />
    </button>
  );
}

interface FieldProps {
  icon: React.ReactNode;
  type?: React.HTMLInputTypeAttribute;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  trailing?: React.ReactNode;
  testid?: string;
}

function Field({ icon, type = 'text', placeholder, value, onChange, required, trailing, testid }: FieldProps) {
  return (
    <div className="relative">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">{icon}</div>
      <input
        data-testid={testid}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={!!required}
        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-11 pr-10 py-3 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
      />
      {trailing ? <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{trailing}</div> : null}
    </div>
  );
}

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('role');
  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    firstName: '', lastName: '',
    shopName: '', legalName: '', vatNumber: '',
  });
  const [showPwd, setShowPwd] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<any>(null);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const openSocial = (provider: 'google' | 'facebook') => {
    window.location.href = `${API_BASE}/auth/${provider}`;
  };

  const submitOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) return setError('Password: minimo 6 caratteri');
    if (form.password !== form.confirmPassword) return setError('Le password non coincidono');
    if (!form.shopName) return setError('Inserisci il nome del negozio');
    if (!form.legalName && !form.vatNumber) return setError('Inserisci ragione sociale o P.IVA');
    setLoading(true);
    try {
      const res: any = await authApi.registerShopOwner({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        shopName: form.shopName,
        legalName: form.legalName || form.shopName,
        vatNumber: form.vatNumber || undefined,
      });
      setSuccess(res);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Errore nella registrazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[520px] relative z-10"
      >
        <div className="bg-slate-900/70 backdrop-blur-2xl border border-slate-800 rounded-2xl p-7 md:p-9 shadow-2xl">
          {step !== 'role' && step !== 'success' ? (
            <button onClick={() => setStep('role')} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-5">
              <ArrowLeft className="w-4 h-4" /> Torna indietro
            </button>
          ) : null}

          {step === 'role' ? (
            <>
              <div className="text-center mb-7">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <Buildings className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-1.5">Crea il tuo account</h1>
                <p className="text-slate-400 text-sm">Dimmi chi sei per iniziare</p>
              </div>

              <div className="grid gap-3">
                <RoleCard
                  testid="role-owner-btn"
                  icon={<Storefront weight="duotone" className="w-8 h-8 text-indigo-400" />}
                  title="Sono un negoziante"
                  subtitle="Voglio creare e gestire il mio negozio"
                  onClick={() => setStep('owner-form')}
                />
                <RoleCard
                  testid="role-operator-btn"
                  icon={<UserCircle weight="duotone" className="w-8 h-8 text-cyan-400" />}
                  title="Sono un operatore"
                  subtitle="Lavoro per un negozio già registrato"
                  onClick={() => setStep('operator-info')}
                />
              </div>

              <div className="mt-7 pt-5 border-t border-slate-800/50 text-center text-sm text-slate-400">
                Hai già un account?{' '}
                <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium">Accedi</Link>
              </div>
            </>
          ) : null}

          {step === 'owner-form' ? (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-bold text-white">Registra il tuo negozio</h1>
                <p className="text-slate-400 text-sm mt-1">Compila i dati — il codice negozio verrà generato automaticamente</p>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-5">
                <button type="button" onClick={() => openSocial('google')} className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-900 font-medium py-2.5 rounded-lg text-sm" data-testid="register-google-btn">
                  <GoogleLogo weight="bold" className="w-4 h-4" /> Google
                </button>
                <button type="button" onClick={() => openSocial('facebook')} className="flex items-center justify-center gap-2 bg-[#1877F2] hover:bg-[#166fe5] text-white font-medium py-2.5 rounded-lg text-sm" data-testid="register-facebook-btn">
                  <FacebookLogo weight="fill" className="w-4 h-4" /> Facebook
                </button>
              </div>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-xs text-slate-500">o con email</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              <form onSubmit={submitOwner} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field icon={<User className="w-4 h-4" />} placeholder="Nome" value={form.firstName} onChange={(v) => set('firstName', v)} required testid="owner-firstname" />
                  <Field icon={<User className="w-4 h-4" />} placeholder="Cognome" value={form.lastName} onChange={(v) => set('lastName', v)} required testid="owner-lastname" />
                </div>
                <Field icon={<Envelope className="w-4 h-4" />} type="email" placeholder="Email" value={form.email} onChange={(v) => set('email', v)} required testid="owner-email" />
                <Field icon={<Storefront className="w-4 h-4" />} placeholder="Nome del negozio (es. Teleman Milano Centro)" value={form.shopName} onChange={(v) => set('shopName', v)} required testid="owner-shopname" />
                <Field icon={<Buildings className="w-4 h-4" />} placeholder="Ragione sociale (es. Rossi SRL)" value={form.legalName} onChange={(v) => set('legalName', v)} testid="owner-legalname" />
                <Field icon={<Buildings className="w-4 h-4" />} placeholder="P.IVA (obbligatoria se ragione sociale omonima esiste)" value={form.vatNumber} onChange={(v) => set('vatNumber', v)} testid="owner-vat" />
                <Field icon={<Lock className="w-4 h-4" />} type={showPwd ? 'text' : 'password'} placeholder="Password (min 6)" value={form.password} onChange={(v) => set('password', v)} required testid="owner-password"
                  trailing={<button type="button" onClick={() => setShowPwd(!showPwd)} className="text-slate-500 hover:text-slate-300">{showPwd ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>}
                />
                <Field icon={<Lock className="w-4 h-4" />} type={showPwd ? 'text' : 'password'} placeholder="Conferma password" value={form.confirmPassword} onChange={(v) => set('confirmPassword', v)} required testid="owner-confirm-password" />

                {error ? (
                  <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-3 py-2.5 rounded-xl text-sm" data-testid="register-error">{error}</div>
                ) : null}

                <motion.button whileTap={{ scale: 0.98 }} disabled={loading} type="submit" className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50" data-testid="owner-submit-btn">
                  {loading ? <CircleNotch className="w-5 h-5 animate-spin" /> : <>Crea negozio <ArrowRight className="w-4 h-4" /></>}
                </motion.button>
              </form>
            </>
          ) : null}

          {step === 'operator-info' ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                <UserCircle className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">Benvenuto, operatore!</h1>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Per ragioni di sicurezza, gli operatori possono registrarsi solo su invito del negozio.
                <br />Chiedi al tuo amministratore di inviarti un <strong className="text-cyan-400">link di invito</strong> via email. Il link scade in 72 ore.
              </p>
              <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-left text-sm text-slate-400 mb-6">
                <p className="font-semibold text-slate-200 mb-2">Come funziona:</p>
                <ol className="space-y-1.5 list-decimal list-inside">
                  <li>L'admin del negozio clicca su "Invita operatore"</li>
                  <li>Inserisce la tua email e clicca Invia</li>
                  <li>Ricevi un'email con il link di invito</li>
                  <li>Clicchi, scegli come accedere (password/social/codice) e sei dentro!</li>
                </ol>
              </div>
              <Link href="/login" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-medium">
                <ArrowLeft className="w-4 h-4" /> Torna al login
              </Link>
            </div>
          ) : null}

          {step === 'success' && success ? (
            <div className="text-center">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl mx-auto mb-5 flex items-center justify-center">
                <CheckCircle className="w-9 h-9 text-white" />
              </motion.div>
              <h2 className="text-xl font-bold text-white mb-3">Negozio creato!</h2>
              <p className="text-slate-400 text-sm mb-5">Il tuo <strong className="text-white">codice negozio</strong>:</p>
              <div className="bg-slate-950 border border-indigo-600/30 text-indigo-400 text-3xl font-mono font-bold p-5 rounded-xl mb-5" data-testid="shop-code-display">
                {success.subscriptionCode}
              </div>
              <p className="text-xs text-slate-500 mb-5">
                Ti abbiamo inviato un'email di conferma. <br />
                Clicca sul link per attivare l'account e accedere.
              </p>
              <Link href="/login" className="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3.5 rounded-xl" data-testid="go-login-btn">
                Vai al login
              </Link>
            </div>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}