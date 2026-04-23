import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import {
  Buildings,
  User,
  Gauge,
  CreditCard,
  FileText,
  Lightning,
  CheckCircle,
} from 'phosphor-react';
import OperatorLayout from '@/components/layout/OperatorLayout';
import { PracticeStepCard, WizardStepNav } from '@/components/practices/PracticeStepCard';
import { SelectWithOther } from '@/components/practices/SelectWithOther';
import { OperatorsDropdown } from '@/components/practices/OperatorsDropdown';
import { CustomerAutocomplete, CustomerLite } from '@/components/practices/CustomerAutocomplete';
import {
  GESTORI_ENERGY_PROVENIENZA,
  GESTORI_ENERGY_NUOVI,
  TIPI_ATTIVAZIONE_ENERGY,
  POTENZE_CONTATORE,
  TIPI_OFFERTA_ENERGY,
} from '@/constants/practiceCategories';
import api from '@/lib/axios';

const validateFiscalCode = (cf: string): boolean => {
  if (!cf || cf.length !== 16) return false;
  return /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/.test(cf.toUpperCase());
};

interface EnergyWizardData {
  // Step 1: tipo offerta
  tipoOfferta?: string;
  tipoOffertaAltro?: string;
  // Step 2: venditori
  soldById?: string;
  soldBy?: string;
  enteredById?: string;
  enteredBy?: string;
  // Step 3: cliente
  firstName?: string;
  lastName?: string;
  fiscalCode?: string;
  phone?: string;
  email?: string;
  codiceFiscaleVecchioContratto?: string;
  // Step 4: attivazione + contatore + gestori
  tipoAttivazione?: string;
  tipoAttivazioneAltro?: string;
  numeroContatore?: string;
  potenzaContatore?: string;
  potenzaContatoreAltro?: string;
  gestoreProvenienza?: string;
  gestoreProvenienzaAltro?: string;
  gestoreNuovoContratto?: string;
  gestoreNuovoContrattoAltro?: string;
  // Step 5: pagamento
  ibanCdc?: string;
  noteMetodoPagamento?: string;
  // Step 6: note finali
  noteGeneriche?: string;
  accordiCliente?: string;
  lavorazioniPostAttivazione?: string;
}

const STEPS = [
  { id: 1, title: 'Tipo offerta', icon: Buildings },
  { id: 2, title: 'Venditori', icon: User },
  { id: 3, title: 'Anagrafica Cliente', icon: User },
  { id: 4, title: 'Attivazione & Contatore', icon: Gauge },
  { id: 5, title: 'Pagamento', icon: CreditCard },
  { id: 6, title: 'Note & Conferma', icon: FileText },
] as const;
const TOTAL_STEPS = STEPS.length;

export default function NewEnergyPractice() {
  const router = useRouter();
  const { edit } = router.query;
  const [data, setData] = useState<EnergyWizardData>({});
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  // Offerte dinamiche caricate dal backend (gestite dal SUPER_ADMIN in /admin/offers?category=ENERGY).
  // Se vuote/errore -> fallback su TIPI_OFFERTA_ENERGY (VARIABILE/FISSA/ALTRO).
  const [offerteBackend, setOfferteBackend] = useState<Array<{ value: string; label: string }> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/offers?category=ENERGY');
        const items = (res.data || [])
          .filter((o: any) => o.name)
          .map((o: any) => ({ value: o.name, label: o.name }));
        setOfferteBackend(items.length > 0 ? items : null);
      } catch {
        setOfferteBackend(null);
      }
    })();
  }, []);

  const offerteList: any = offerteBackend && offerteBackend.length > 0 ? offerteBackend : TIPI_OFFERTA_ENERGY;

  const patch = (p: Partial<EnergyWizardData>) => setData((prev) => ({ ...prev, ...p }));

  useEffect(() => {
    if (!router.isReady) return;
    if (!edit || typeof edit !== 'string') {
      setBootstrapping(false);
      return;
    }
    (async () => {
      try {
        const res = await api.get(`/practices/${edit}`);
        const p = res.data;
        if (p.category !== 'ENERGY') {
          alert('Questa pratica non è di tipo luce/gas');
          router.replace('/operator/practices/energy');
          return;
        }
        setPracticeId(p.id);
        const cs = Array.isArray(p.completedSteps) ? p.completedSteps : [];
        setCompletedSteps(cs);
        setExpandedStep(Math.min(Math.max(...cs, 0) + 1, TOTAL_STEPS));
        setData({
          soldById: p.soldById,
          soldBy: p.soldBy,
          enteredById: p.enteredById,
          enteredBy: p.enteredBy,
          firstName: p.customerSnapshot?.firstName,
          lastName: p.customerSnapshot?.lastName,
          fiscalCode: p.customerSnapshot?.fiscalCode,
          phone: p.customerSnapshot?.phonePrimary || p.customerSnapshot?.phone,
          email: p.customerSnapshot?.email,
          ...(p.energyData || {}),
          lavorazioniPostAttivazione: p.lavorazioniPostAttivazione,
        });
      } catch {
        alert('Errore caricamento pratica');
        router.replace('/operator/practices/energy');
      } finally {
        setBootstrapping(false);
      }
    })();
  }, [router.isReady, edit]);

  const stepValid = useMemo(() => (id: number): boolean => {
    switch (id) {
      case 1:
        return !!(data.tipoOfferta && (data.tipoOfferta !== 'ALTRO' || data.tipoOffertaAltro?.trim()));
      case 2:
        return !!(data.soldById && data.enteredById);
      case 3:
        return !!(
          data.firstName?.trim() &&
          data.lastName?.trim() &&
          data.fiscalCode &&
          validateFiscalCode(data.fiscalCode) &&
          data.codiceFiscaleVecchioContratto &&
          data.phone?.trim() &&
          data.email?.trim()
        );
      case 4:
        return !!(
          data.tipoAttivazione &&
          (data.tipoAttivazione !== 'ALTRO' || data.tipoAttivazioneAltro?.trim()) &&
          data.numeroContatore?.trim() &&
          data.potenzaContatore &&
          (data.potenzaContatore !== 'ALTRO' || data.potenzaContatoreAltro?.trim()) &&
          data.gestoreProvenienza &&
          (data.gestoreProvenienza !== 'ALTRO' || data.gestoreProvenienzaAltro?.trim()) &&
          data.gestoreNuovoContratto &&
          (data.gestoreNuovoContratto !== 'ALTRO' || data.gestoreNuovoContrattoAltro?.trim())
        );
      case 5:
        return !!data.ibanCdc?.trim(); // IBAN oppure stringa "BOLLETTINO"
      case 6:
        return true;
      default:
        return false;
    }
  }, [data]);

  const saveStep = async (stepNumber: number): Promise<string | null> => {
    if (stepNumber === 1 && !practiceId) {
      const res = await api.post('/practices', {
        category: 'ENERGY',
        type: 'ENERGY', // aggiornato quando arriva gestore nuovo contratto
        offerName:
          data.tipoOfferta === 'ALTRO' ? data.tipoOffertaAltro : data.tipoOfferta,
        offerCode:
          data.tipoOfferta === 'ALTRO' ? data.tipoOffertaAltro : data.tipoOfferta,
        energyData: {
          tipoOfferta: data.tipoOfferta,
          tipoOffertaAltro: data.tipoOffertaAltro,
        },
      });
      setPracticeId(res.data.id);
      return res.data.id;
    }
    if (!practiceId) return null;

    const stepPayloads: Record<number, any> = {
      1: {
        offerName:
          data.tipoOfferta === 'ALTRO' ? data.tipoOffertaAltro : data.tipoOfferta,
        offerCode:
          data.tipoOfferta === 'ALTRO' ? data.tipoOffertaAltro : data.tipoOfferta,
        tipoOfferta: data.tipoOfferta,
        tipoOffertaAltro: data.tipoOffertaAltro,
      },
      2: {
        soldById: data.soldById,
        soldBy: data.soldBy,
        enteredById: data.enteredById,
        enteredBy: data.enteredBy,
      },
      3: {
        customerData: {
          firstName: data.firstName,
          lastName: data.lastName,
          fiscalCode: data.fiscalCode,
          phone: data.phone,
          email: data.email,
        },
        codiceFiscaleVecchioContratto: data.codiceFiscaleVecchioContratto,
      },
      4: {
        tipoAttivazione: data.tipoAttivazione,
        tipoAttivazioneAltro: data.tipoAttivazioneAltro,
        numeroContatore: data.numeroContatore,
        potenzaContatore: data.potenzaContatore,
        potenzaContatoreAltro: data.potenzaContatoreAltro,
        gestoreProvenienza: data.gestoreProvenienza,
        gestoreProvenienzaAltro: data.gestoreProvenienzaAltro,
        gestoreNuovoContratto: data.gestoreNuovoContratto,
        gestoreNuovoContrattoAltro: data.gestoreNuovoContrattoAltro,
        type:
          data.gestoreNuovoContratto === 'ALTRO'
            ? data.gestoreNuovoContrattoAltro
            : data.gestoreNuovoContratto,
      },
      5: {
        ibanCdc: data.ibanCdc,
        noteMetodoPagamento: data.noteMetodoPagamento,
      },
      6: {
        noteGeneriche: data.noteGeneriche,
        accordiCliente: data.accordiCliente,
        lavorazioniPostAttivazione: data.lavorazioniPostAttivazione,
      },
    };

    await api.put(`/practices/${practiceId}/step`, {
      stepNumber,
      data: stepPayloads[stepNumber],
    });
    return practiceId;
  };

  const advance = async (stepNumber: number) => {
    setLoading(true);
    try {
      await saveStep(stepNumber);
      if (!completedSteps.includes(stepNumber)) setCompletedSteps([...completedSteps, stepNumber]);
      if (stepNumber < TOTAL_STEPS) setExpandedStep(stepNumber + 1);
    } catch (err: any) {
      alert('Errore salvataggio step: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!practiceId) return;
    setLoading(true);
    try {
      await saveStep(TOTAL_STEPS);
      await api.put(`/practices/${practiceId}/step`, {
        stepNumber: TOTAL_STEPS,
        data: { completed: true },
      });
      await api.post(`/practices/${practiceId}/force-complete`, {});
      alert('Pratica luce/gas completata con successo!');
      router.push('/operator/practices/energy');
    } catch (err: any) {
      alert('Errore finalizzazione: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleStepClick = (id: number) => {
    const maxCompleted = Math.max(...completedSteps, 0);
    if (id === 1 || completedSteps.includes(id) || id <= maxCompleted + 1) {
      setExpandedStep(id);
    }
  };

  if (bootstrapping) {
    return (
      <OperatorLayout title="Nuova Pratica Luce/Gas">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
        </div>
      </OperatorLayout>
    );
  }

  return (
    <OperatorLayout title={practiceId ? 'Modifica Pratica Luce/Gas' : 'Nuova Pratica Luce/Gas'}>
      <div className="p-0 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Lightning className="w-7 h-7 text-amber-400" weight="duotone" />
            {practiceId ? 'Modifica Pratica Luce/Gas' : 'Nuova Pratica Luce/Gas'}
          </h1>
          <p className="text-slate-400">Compila i {TOTAL_STEPS} passaggi</p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Progresso</span>
            <span className="text-sm text-amber-400">{completedSteps.length}/{TOTAL_STEPS}</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
              initial={{ width: 0 }}
              animate={{ width: `${(completedSteps.length / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-4">
          {STEPS.map((s) => {
            const maxCompleted = Math.max(...completedSteps, 0);
            const canAccess = s.id === 1 || completedSteps.includes(s.id) || s.id <= maxCompleted + 1;
            return (
              <PracticeStepCard
                key={s.id}
                id={s.id}
                total={TOTAL_STEPS}
                title={s.title}
                icon={s.icon}
                isExpanded={expandedStep === s.id}
                isCompleted={completedSteps.includes(s.id)}
                canAccess={canAccess}
                onToggle={() => handleStepClick(s.id)}
              >
                {s.id === 1 && (
                  <div className="space-y-4">
                    <SelectWithOther
                      label="Offerta"
                      required
                      value={data.tipoOfferta}
                      otherValue={data.tipoOffertaAltro}
                      onChange={(v) => patch({ tipoOfferta: v })}
                      onOtherChange={(v) => patch({ tipoOffertaAltro: v })}
                      options={offerteList}
                      testId="energy-tipo-offerta"
                    />
                    <WizardStepNav canAdvance={stepValid(1)} isLast={false} onAdvance={() => advance(1)} loading={loading} />
                  </div>
                )}

                {s.id === 2 && (
                  <div className="space-y-4">
                    <OperatorsDropdown
                      label="Venduto da *"
                      value={data.soldById}
                      onChange={(id, name) => patch({ soldById: id, soldBy: name })}
                      testId="energy-soldby"
                    />
                    <OperatorsDropdown
                      label="Inserito da *"
                      value={data.enteredById}
                      onChange={(id, name) => patch({ enteredById: id, enteredBy: name })}
                      testId="energy-enteredby"
                    />
                    <WizardStepNav
                      canAdvance={stepValid(2)}
                      isLast={false}
                      onBack={() => setExpandedStep(1)}
                      onAdvance={() => advance(2)}
                      loading={loading}
                    />
                  </div>
                )}

                {s.id === 3 && (
                  <div className="space-y-4">
                    <CustomerAutocomplete
                      value={{
                        firstName: data.firstName,
                        lastName: data.lastName,
                        fiscalCode: data.fiscalCode,
                        phone: data.phone,
                        email: data.email,
                      }}
                      onPatch={(p) => patch(p)}
                      onPick={(c: CustomerLite) =>
                        patch({
                          firstName: c.firstName,
                          lastName: c.lastName,
                          fiscalCode: c.fiscalCode,
                          phone: c.phonePrimary || c.phone || '',
                          email: c.email || '',
                        })
                      }
                    />
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Codice fiscale vecchio contratto <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={data.codiceFiscaleVecchioContratto || ''}
                        onChange={(e) => patch({ codiceFiscaleVecchioContratto: e.target.value.toUpperCase() })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                        data-testid="energy-cf-vecchio"
                      />
                    </div>
                    {data.fiscalCode && !validateFiscalCode(data.fiscalCode) && (
                      <p className="text-rose-400 text-sm">Codice fiscale non valido</p>
                    )}
                    <WizardStepNav
                      canAdvance={stepValid(3)}
                      isLast={false}
                      onBack={() => setExpandedStep(2)}
                      onAdvance={() => advance(3)}
                      loading={loading}
                    />
                  </div>
                )}

                {s.id === 4 && (
                  <div className="space-y-4">
                    <SelectWithOther
                      label="Tipo di attivazione"
                      required
                      value={data.tipoAttivazione}
                      otherValue={data.tipoAttivazioneAltro}
                      onChange={(v) => patch({ tipoAttivazione: v })}
                      onOtherChange={(v) => patch({ tipoAttivazioneAltro: v })}
                      options={TIPI_ATTIVAZIONE_ENERGY}
                      testId="energy-tipo-attivazione"
                    />
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Numero contatore <span className="text-rose-400">*</span>
                      </label>
                      <p className="text-xs text-slate-500 mb-2">LUCE = POD, GAS = PDR</p>
                      <input
                        type="text"
                        value={data.numeroContatore || ''}
                        onChange={(e) => patch({ numeroContatore: e.target.value.toUpperCase() })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 font-mono"
                        data-testid="energy-numero-contatore"
                      />
                    </div>
                    <SelectWithOther
                      label="Potenza contatore"
                      required
                      value={data.potenzaContatore}
                      otherValue={data.potenzaContatoreAltro}
                      onChange={(v) => patch({ potenzaContatore: v })}
                      onOtherChange={(v) => patch({ potenzaContatoreAltro: v })}
                      options={POTENZE_CONTATORE}
                      testId="energy-potenza"
                    />
                    <SelectWithOther
                      label="Gestore di provenienza"
                      required
                      value={data.gestoreProvenienza}
                      otherValue={data.gestoreProvenienzaAltro}
                      onChange={(v) => patch({ gestoreProvenienza: v })}
                      onOtherChange={(v) => patch({ gestoreProvenienzaAltro: v })}
                      options={GESTORI_ENERGY_PROVENIENZA as any}
                      testId="energy-gestore-provenienza"
                    />
                    <SelectWithOther
                      label="Gestore nuovo contratto"
                      required
                      value={data.gestoreNuovoContratto}
                      otherValue={data.gestoreNuovoContrattoAltro}
                      onChange={(v) => patch({ gestoreNuovoContratto: v })}
                      onOtherChange={(v) => patch({ gestoreNuovoContrattoAltro: v })}
                      options={GESTORI_ENERGY_NUOVI as any}
                      testId="energy-gestore-nuovo"
                    />
                    <WizardStepNav
                      canAdvance={stepValid(4)}
                      isLast={false}
                      onBack={() => setExpandedStep(3)}
                      onAdvance={() => advance(4)}
                      loading={loading}
                    />
                  </div>
                )}

                {s.id === 5 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        IBAN / CDC <span className="text-rose-400">*</span>
                      </label>
                      <p className="text-xs text-slate-500 mb-2">Se bollettino scrivere "BOLLETTINO"</p>
                      <input
                        type="text"
                        value={data.ibanCdc || ''}
                        onChange={(e) => patch({ ibanCdc: e.target.value.toUpperCase() })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 font-mono"
                        data-testid="energy-iban"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Note metodo di pagamento</label>
                      <textarea
                        value={data.noteMetodoPagamento || ''}
                        onChange={(e) => patch({ noteMetodoPagamento: e.target.value })}
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                      />
                    </div>
                    <WizardStepNav
                      canAdvance={stepValid(5)}
                      isLast={false}
                      onBack={() => setExpandedStep(4)}
                      onAdvance={() => advance(5)}
                      loading={loading}
                    />
                  </div>
                )}

                {s.id === 6 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Note generiche</label>
                      <textarea
                        value={data.noteGeneriche || ''}
                        onChange={(e) => patch({ noteGeneriche: e.target.value })}
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Accordi con cliente</label>
                      <textarea
                        value={data.accordiCliente || ''}
                        onChange={(e) => patch({ accordiCliente: e.target.value })}
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Lavorazioni post-attivazione</label>
                      <textarea
                        value={data.lavorazioniPostAttivazione || ''}
                        onChange={(e) => patch({ lavorazioniPostAttivazione: e.target.value })}
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                      />
                    </div>

                    <div className="rounded-xl p-4 bg-slate-950 border border-slate-800 flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                      <div className="text-sm text-slate-300 space-y-1">
                        <p><span className="text-slate-500">Cliente:</span> {data.firstName} {data.lastName} · {data.fiscalCode}</p>
                        <p><span className="text-slate-500">Attivazione:</span> {data.tipoAttivazione === 'ALTRO' ? data.tipoAttivazioneAltro : data.tipoAttivazione}</p>
                        <p><span className="text-slate-500">Contatore:</span> {data.numeroContatore} · {data.potenzaContatore === 'ALTRO' ? data.potenzaContatoreAltro : data.potenzaContatore}</p>
                        <p><span className="text-slate-500">Gestore nuovo:</span> {data.gestoreNuovoContratto === 'ALTRO' ? data.gestoreNuovoContrattoAltro : data.gestoreNuovoContratto}</p>
                        <p><span className="text-slate-500">Pagamento:</span> {data.ibanCdc}</p>
                      </div>
                    </div>

                    <WizardStepNav
                      canAdvance={stepValid(6)}
                      isLast
                      onBack={() => setExpandedStep(5)}
                      onAdvance={submit}
                      loading={loading}
                    />
                  </div>
                )}
              </PracticeStepCard>
            );
          })}
        </div>
      </div>
    </OperatorLayout>
  );
}
