import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import OperatorLayout from '@/components/layout/OperatorLayout';
import api from '@/lib/axios';
import { useAuthStore } from '@/stores/authStore';
import { usePracticeWizardStore } from '@/stores/practiceWizardStore';
import { ArrowLeft, ArrowRight, Check, FloppyDisk, DesktopTower } from 'phosphor-react';

/**
 * Wizard pratica RETE FISSA versione MOBILE.
 *
 * - File 100% indipendente dal `new.tsx` desktop (zero impatto su PC).
 * - Riutilizza lo stesso `usePracticeWizardStore` e gli stessi endpoint
 *   (`POST /practices`, `PUT /practices/:id/step`), quindi il backend
 *   non cambia di una riga.
 * - Implementa i 3 step "critici da campo" (offerta, venditori, anagrafica
 *   cliente) ottimizzati per touch: campi full-width, font grandi, bottoni
 *   54px, navigazione step-by-step.
 * - Step avanzati (line-new, packages, wash, pagamento, appuntamento, gdpr)
 *   restano disponibili dal desktop: a fine flusso mobile l'utente vede una
 *   call-to-action "completa da desktop" con il link diretto.
 */

interface OfferLite { id: string; name: string; canone: string; type: string; provider?: string }

const PROVIDERS = [
  { code: 'TIM_FIBRA', label: 'TIM' },
  { code: 'VODAFONE',  label: 'Vodafone' },
  { code: 'WINDTRE',   label: 'WindTre' },
  { code: 'ILIAD',     label: 'Iliad' },
  { code: 'OPTIMA',    label: 'Optima' },
  { code: 'IREN',      label: 'Iren' },
  { code: 'SKY',       label: 'SKY' },
];

type MobileStepId = 'provider' | 'offer' | 'sellers' | 'customer' | 'done';

export default function PracticeWizardMobile() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { data, setData, practiceId, setPracticeId, reset } = usePracticeWizardStore();

  const [step, setStep] = useState<MobileStepId>('provider');
  const [dbOffers, setDbOffers] = useState<Record<string, OfferLite[]> | null>(null);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    api.get('/offers/grouped').then((r) => setDbOffers(r.data)).catch(() => setDbOffers({}));
    api.get('/users').then((r) => setUsers(r.data || [])).catch(() => {});
  }, [isAuthenticated, router]);

  const providerLabel = useMemo(
    () => PROVIDERS.find((p) => p.code === data.type)?.label,
    [data.type],
  );
  const offersForProvider: OfferLite[] = useMemo(() => {
    if (!dbOffers || !providerLabel) return [];
    return (dbOffers[providerLabel] || []) as OfferLite[];
  }, [dbOffers, providerLabel]);

  const goBack = () => {
    const order: MobileStepId[] = ['provider', 'offer', 'sellers', 'customer', 'done'];
    const idx = order.indexOf(step);
    if (idx <= 0) router.push('/operator/practices');
    else setStep(order[idx - 1]);
  };

  const saveOfferStep = async (): Promise<string | null> => {
    setSaving(true);
    try {
      const offer = offersForProvider.find((o) => o.id === (data as any).offerId);
      if (!practiceId) {
        const res = await api.post('/practices', {
          type: data.type,
          offerId: (data as any).offerId,
          offerName: offer?.name || data.offerName,
          offerCode: offer?.name || data.offerName,
          offerCanone: offer?.canone || data.offerCanone,
          offerType: offer?.type || data.offerType,
        });
        setPracticeId(res.data.id);
        return res.data.id;
      } else {
        await api.put(`/practices/${practiceId}/step`, {
          stepNumber: 1,
          data: {
            type: data.type,
            offerId: (data as any).offerId,
            offerName: offer?.name || data.offerName,
            offerCode: offer?.name || data.offerName,
            offerCanone: offer?.canone || data.offerCanone,
            offerType: offer?.type || data.offerType,
          },
        });
        return practiceId;
      }
    } catch (err: any) {
      alert('Errore salvataggio offerta: ' + (err?.response?.data?.message || err.message));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const saveSellersStep = async (): Promise<boolean> => {
    if (!practiceId) return false;
    setSaving(true);
    try {
      await api.put(`/practices/${practiceId}/step`, {
        stepNumber: 2,
        data: {
          soldById: data.soldById,
          soldBy: data.soldBy,
          enteredById: data.enteredById,
          enteredBy: data.enteredBy,
        },
      });
      return true;
    } catch (err: any) {
      alert('Errore venditori: ' + (err?.response?.data?.message || err.message));
      return false;
    } finally { setSaving(false); }
  };

  const saveCustomerStep = async (): Promise<boolean> => {
    if (!practiceId) return false;
    setSaving(true);
    try {
      await api.put(`/practices/${practiceId}/step`, {
        stepNumber: 3,
        data: {
          customerData: {
            firstName: data.firstName,
            lastName: data.lastName,
            fiscalCode: data.fiscalCode,
            phone: data.phone,
            email: data.email,
          },
        },
      });
      return true;
    } catch (err: any) {
      alert('Errore anagrafica: ' + (err?.response?.data?.message || err.message));
      return false;
    } finally { setSaving(false); }
  };

  const nextLabel = step === 'customer' ? 'Salva e completa' : 'Avanti';

  const onNext = async () => {
    if (step === 'provider') {
      if (!data.type) return alert('Seleziona un gestore');
      setStep('offer');
      return;
    }
    if (step === 'offer') {
      if (!(data as any).offerId) return alert('Seleziona un\'offerta');
      const id = await saveOfferStep();
      if (id) setStep('sellers');
      return;
    }
    if (step === 'sellers') {
      if (!data.soldById) return alert('Seleziona il venditore');
      const ok = await saveSellersStep();
      if (ok) setStep('customer');
      return;
    }
    if (step === 'customer') {
      if (!data.firstName || !data.lastName || !data.fiscalCode || data.fiscalCode.length !== 16) {
        return alert('Compila nome, cognome e codice fiscale (16 caratteri)');
      }
      const ok = await saveCustomerStep();
      if (ok) setStep('done');
      return;
    }
    if (step === 'done') {
      reset();
      setPracticeId(null);
      router.push('/operator/practices');
    }
  };

  const stepLabel: Record<MobileStepId, string> = {
    provider: 'Gestore',
    offer: 'Offerta',
    sellers: 'Venditore',
    customer: 'Cliente',
    done: 'Quasi fatto!',
  };
  const stepIndex = ['provider', 'offer', 'sellers', 'customer', 'done'].indexOf(step);

  return (
    <OperatorLayout title="Nuova pratica · Mobile">
      <div className="max-w-md mx-auto pb-40" data-testid="mobile-wizard">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? 'bg-indigo-500' : 'bg-slate-700'}`}
            />
          ))}
        </div>
        <h2 className="text-xl font-bold text-white mb-1">{stepLabel[step]}</h2>
        <p className="text-xs text-slate-500 mb-5">Step {Math.min(stepIndex + 1, 4)} di 4</p>

        {step === 'provider' && (
          <div className="grid grid-cols-2 gap-3">
            {PROVIDERS.map((p) => {
              const active = data.type === p.code;
              return (
                <button
                  key={p.code}
                  onClick={() => setData({ type: p.code as any })}
                  className={`h-20 rounded-xl border-2 font-semibold text-base transition ${
                    active
                      ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200'
                      : 'bg-slate-900 border-slate-700 text-slate-300'
                  }`}
                  data-testid={`provider-${p.code}`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        )}

        {step === 'offer' && (
          <div className="space-y-2">
            {offersForProvider.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm">
                Nessuna offerta disponibile per {providerLabel}.
              </div>
            ) : (
              offersForProvider.map((o) => {
                const active = (data as any).offerId === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => setData({
                      offerId: o.id,
                      offerName: o.name,
                      offerCode: o.name,
                      offerCanone: o.canone,
                      offerType: o.type as any,
                    })}
                    className={`w-full text-left p-4 rounded-xl border-2 transition ${
                      active
                        ? 'bg-indigo-500/15 border-indigo-400'
                        : 'bg-slate-900 border-slate-700'
                    }`}
                    data-testid={`offer-${o.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold text-sm truncate">{o.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{o.canone}/mese</div>
                      </div>
                      {active && <Check className="w-5 h-5 text-indigo-400 ml-2" weight="bold" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}

        {step === 'sellers' && (
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs text-slate-400 uppercase tracking-wider">Venditore *</span>
              <select
                value={data.soldById || ''}
                onChange={(e) => {
                  const u = users.find((x) => x.id === e.target.value);
                  setData({
                    soldById: e.target.value,
                    soldBy: u ? `${u.firstName} ${u.lastName}` : '',
                  });
                }}
                className="w-full mt-1 h-12 px-3 bg-slate-900 border-2 border-slate-700 rounded-xl text-white"
                data-testid="seller-select"
              >
                <option value="">Seleziona venditore</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-slate-400 uppercase tracking-wider">Inserito da</span>
              <select
                value={data.enteredById || user?.id || ''}
                onChange={(e) => {
                  const u = users.find((x) => x.id === e.target.value);
                  setData({
                    enteredById: e.target.value,
                    enteredBy: u ? `${u.firstName} ${u.lastName}` : '',
                  });
                }}
                className="w-full mt-1 h-12 px-3 bg-slate-900 border-2 border-slate-700 rounded-xl text-white"
              >
                <option value="">Seleziona</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
            </label>
          </div>
        )}

        {step === 'customer' && (
          <div className="space-y-3">
            <input
              type="text"
              value={data.firstName || ''}
              onChange={(e) => setData({ firstName: e.target.value })}
              placeholder="Nome *"
              className="w-full h-12 px-3 bg-slate-900 border-2 border-slate-700 rounded-xl text-white text-base"
              data-testid="customer-firstname"
            />
            <input
              type="text"
              value={data.lastName || ''}
              onChange={(e) => setData({ lastName: e.target.value })}
              placeholder="Cognome *"
              className="w-full h-12 px-3 bg-slate-900 border-2 border-slate-700 rounded-xl text-white text-base"
              data-testid="customer-lastname"
            />
            <input
              type="text"
              value={data.fiscalCode || ''}
              onChange={(e) => setData({ fiscalCode: e.target.value.toUpperCase().slice(0, 16) })}
              placeholder="Codice fiscale (16 caratteri) *"
              className="w-full h-12 px-3 bg-slate-900 border-2 border-slate-700 rounded-xl text-white text-base font-mono uppercase"
              data-testid="customer-cf"
            />
            <input
              type="tel"
              value={data.phone || ''}
              onChange={(e) => setData({ phone: e.target.value })}
              placeholder="Telefono"
              className="w-full h-12 px-3 bg-slate-900 border-2 border-slate-700 rounded-xl text-white text-base"
            />
            <input
              type="email"
              value={data.email || ''}
              onChange={(e) => setData({ email: e.target.value })}
              placeholder="Email"
              className="w-full h-12 px-3 bg-slate-900 border-2 border-slate-700 rounded-xl text-white text-base"
            />
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-emerald-400" weight="bold" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Bozza salvata</h3>
            <p className="text-sm text-slate-400 mb-6">
              I dati base sono stati salvati. Gli step avanzati (linea, pagamento, appuntamento,
              GDPR…) si compilano in modo più completo da desktop. Quando torni in negozio puoi
              riprendere da dove hai lasciato.
            </p>
            {practiceId && (
              <button
                onClick={() => router.push(`/operator/practices/${practiceId}`)}
                className="w-full h-12 mb-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-semibold inline-flex items-center justify-center gap-2"
              >
                <DesktopTower className="w-5 h-5" /> Apri dettaglio pratica
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer fisso step-bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-3 py-3 flex items-center gap-2 md:hidden">
        <button
          onClick={goBack}
          className="h-12 px-4 rounded-xl bg-slate-800 text-slate-200 inline-flex items-center gap-1 font-semibold"
          data-testid="mobile-wizard-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button
          onClick={onNext}
          disabled={saving}
          className="flex-1 h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
          data-testid="mobile-wizard-next"
        >
          {saving ? 'Salvataggio…' : nextLabel}
          {step === 'customer'
            ? <FloppyDisk className="w-5 h-5" weight="bold" />
            : <ArrowRight className="w-5 h-5" weight="bold" />}
        </button>
      </div>
    </OperatorLayout>
  );
}
