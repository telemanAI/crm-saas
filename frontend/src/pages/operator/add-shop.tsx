import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { Storefront, Buildings, ArrowLeft, CheckCircle, CircleNotch, ArrowRight } from 'phosphor-react';
import OperatorLayout from '@/components/layout/OperatorLayout';
import { useAuthStore } from '@/stores/authStore';
import { authApi, companiesApi } from '@/lib/api';

type Mode = 'same-company' | 'new-company';

export default function AddShopPage() {
  const router = useRouter();
  const { user, shops, token, setAuth } = useAuthStore();

  const [companies, setCompanies] = useState<any[]>([]);
  const [mode, setMode] = useState<Mode>('same-company');
  const [name, setName] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [legalName, setLegalName] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);

  const isFounder = shops.some((s) => s.role === 'FOUNDER');

  useEffect(() => {
    if (!isFounder) return;
    companiesApi
      .mine()
      .then((data: any) => {
        const list = Array.isArray(data) ? data : [];
        setCompanies(list);
        if (list.length > 0) setSelectedCompanyId(list[0].id);
        else setMode('new-company');
      })
      .catch((err) => console.error(err));
  }, [isFounder]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('Inserisci il nome del negozio');
    if (mode === 'same-company' && !selectedCompanyId) return setError('Seleziona una ragione sociale');
    if (mode === 'new-company') {
      // FIX M3: P.IVA obbligatoria per nuova ragione sociale
      if (!legalName.trim()) return setError('Inserisci la ragione sociale');
      if (!vatNumber.trim()) return setError('Inserisci la Partita IVA (obbligatoria per identificare univocamente la ragione sociale)');
      if (!/^\d{11}$/.test(vatNumber.trim())) {
        return setError('Partita IVA non valida: deve essere composta da 11 cifre numeriche');
      }
    }
    setLoading(true);
    try {
      const result: any = await authApi.addShop({
        name: name.trim(),
        mode,
        companyId: mode === 'same-company' ? selectedCompanyId : undefined,
        legalName: mode === 'new-company' ? legalName.trim() || undefined : undefined,
        vatNumber: mode === 'new-company' ? vatNumber.trim() || undefined : undefined,
      });
      const freshShops: any = await authApi.myShops();
      if (user && token) setAuth(user, token, freshShops);
      setSuccess(result);
    } catch (err: any) {
      setError(err.message || 'Errore durante la creazione del negozio');
    } finally {
      setLoading(false);
    }
  };

  if (!isFounder) {
    return (
      <OperatorLayout title="Aggiungi negozio">
        <div className="max-w-lg mx-auto mt-10 bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center">
          <Buildings className="w-14 h-14 text-slate-600 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-2">Azione riservata ai Founder</h2>
          <p className="text-slate-400 text-sm">
            Solo il proprietario (Founder) di un negozio può aggiungere nuovi negozi al proprio gruppo aziendale.
          </p>
        </div>
      </OperatorLayout>
    );
  }

  if (success) {
    return (
      <OperatorLayout title="Negozio creato">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg mx-auto mt-10 bg-slate-900/60 border border-emerald-500/30 rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl mx-auto mb-5 flex items-center justify-center">
            <CheckCircle className="w-9 h-9 text-white" weight="fill" />
          </div>
          <h2 className="text-xl font-bold text-white mb-3">Nuovo negozio aggiunto</h2>
          <p className="text-slate-400 text-sm mb-4">Codice negozio:</p>
          <div className="bg-slate-950 border border-indigo-600/30 text-indigo-400 text-3xl font-mono font-bold p-5 rounded-xl mb-5" data-testid="new-shop-code">
            {success.subscriptionCode}
          </div>
          <button
            onClick={() => router.push('/select-shop')}
            data-testid="go-select-shop-btn"
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2"
          >
            Vai alla selezione negozio <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </OperatorLayout>
    );
  }

  return (
    <OperatorLayout title="Aggiungi negozio">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-4"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4" /> Torna indietro
        </button>

        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-7 md:p-9">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Storefront weight="fill" className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Aggiungi un nuovo negozio</h1>
              <p className="text-slate-400 text-sm">Crea un altro punto vendita sotto il tuo gruppo aziendale</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-5">
            {companies.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Ragione sociale del nuovo negozio</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('same-company')}
                    data-testid="mode-same-company"
                    className={`p-3 rounded-xl border text-left text-sm transition ${
                      mode === 'same-company'
                        ? 'border-indigo-500/60 bg-indigo-500/10 text-white'
                        : 'border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold">Stessa ragione sociale</div>
                    <div className="text-xs mt-0.5 opacity-75">Aggiungi un punto vendita sotto una Company esistente</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('new-company')}
                    data-testid="mode-new-company"
                    className={`p-3 rounded-xl border text-left text-sm transition ${
                      mode === 'new-company'
                        ? 'border-indigo-500/60 bg-indigo-500/10 text-white'
                        : 'border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold">Nuova ragione sociale</div>
                    <div className="text-xs mt-0.5 opacity-75">Crea un gruppo aziendale separato</div>
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Nome del negozio *</label>
              <input
                data-testid="shop-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es. Teleman Milano Centro"
                required
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30"
              />
            </div>

            {mode === 'same-company' && companies.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Seleziona ragione sociale esistente *</label>
                <select
                  data-testid="company-select"
                  value={selectedCompanyId}
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/50"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.legalName} {c.vatNumber ? `· P.IVA ${c.vatNumber}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {mode === 'new-company' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Ragione sociale *</label>
                  <input
                    data-testid="legal-name-input"
                    type="text"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="Es. Rossi SRL"
                    required
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">P.IVA *</label>
                  <input
                    data-testid="vat-input"
                    type="text"
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
                    placeholder="11 cifre — obbligatoria"
                    maxLength={11}
                    required
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-2.5 rounded-xl text-sm" data-testid="add-shop-error">
                {error}
              </div>
            )}

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              data-testid="submit-btn"
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <CircleNotch className="w-5 h-5 animate-spin" /> Creazione in corso...
                </>
              ) : (
                <>
                  Crea negozio <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>
        </div>
      </div>
    </OperatorLayout>
  );
}