import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import {
  Buildings,
  User,
  Phone,
  CreditCard,
  FileText,
  DeviceMobile,
  CheckCircle,
} from 'phosphor-react';
import OperatorLayout from '@/components/layout/OperatorLayout';
import { PracticeStepCard, WizardStepNav } from '@/components/practices/PracticeStepCard';
import { SelectWithOther } from '@/components/practices/SelectWithOther';
import { OperatorsDropdown } from '@/components/practices/OperatorsDropdown';
import { CustomerAutocomplete, CustomerLite } from '@/components/practices/CustomerAutocomplete';
import {
  GESTORI_MOBILE_PROVENIENZA,
  MOBILE_PROVIDER_CARDS,
  OFFERTE_MOBILE,
  TIPI_LINEA_MOBILE,
  RICARICA_OPTIONS,
  TIM_UNICA_OPTIONS,
} from '@/constants/practiceCategories';
import api from '@/lib/axios';

// Helpers (come wizard rete fissa)
const formatDateToItalian = (d: string | undefined) => {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};
const parseItalianDate = (s: string | undefined) => {
  if (!s || !s.includes('/')) return s || '';
  const [d, m, y] = s.split('/');
  return `${y}-${m}-${d}`;
};

const validateFiscalCode = (cf: string): boolean => {
  if (!cf || cf.length !== 16) return false;
  return /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/.test(cf.toUpperCase());
};

// Helper per renderizzare l'icona del provider evitando il type narrowing TS
function ProviderIcon({ provider, isSelected }: { provider: any; isSelected: boolean }) {
  if (provider.logo && provider.logo.length > 0) {
    return (
      <img
        src={provider.logo}
        alt={provider.name}
        className="w-12 h-12 object-contain rounded-lg bg-white p-0.5"
      />
    );
  }
  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm"
      style={{ backgroundColor: provider.color, color: provider.textColor }}
    >
      {provider.initials}
    </div>
  );
}

interface MobileWizardData {
  // Step 1: gestore + offerta
  gestoreNuovaLinea?: string;
  gestoreNuovaLineaAltro?: string;
  offerName?: string;
  offertaAltro?: string;
  dataAttivazione?: string;
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
  // Step 4: numero/MNP
  codiceFiscaleVecchiaLinea?: string;
  numeroDaPortare?: string;
  tipoLinea?: string;
  gestoreProvenienza?: string;
  gestoreProvenienzaAltro?: string;
  noteMnp?: string;
  // Step 5: pagamento
  ibanCdc?: string;
  ricarica?: string;
  ricaricaAltro?: string;
  noteMetodoPagamento?: string;
  // Step 6: TIM Unica + note finali
  timUnica?: string;
  timUnicaAltro?: string;
  numeroReteFissaTimUnica?: string;
  noteGeneriche?: string;
  accordiCliente?: string;
  lavorazioniPostAttivazione?: string;
}

const STEPS = [
  { id: 1, title: 'Offerta', icon: Buildings },
  { id: 2, title: 'Venditori', icon: User },
  { id: 3, title: 'Anagrafica Cliente', icon: User },
  { id: 4, title: 'Numero & MNP', icon: Phone },
  { id: 5, title: 'Pagamento & Ricarica', icon: CreditCard },
  { id: 6, title: 'TIM Unica & Note', icon: FileText },
] as const;
const TOTAL_STEPS = STEPS.length;

export default function NewMobilePractice() {
  const router = useRouter();
  const { edit } = router.query;
  const [data, setData] = useState<MobileWizardData>({});
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<number>(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  // Offerte dinamiche caricate dal backend
  const [allOffers, setAllOffers] = useState<any[]>([]);
  const [offerteBackend, setOfferteBackend] = useState<any[] | null>(null);

  const offerteList = offerteBackend && offerteBackend.length > 0 ? offerteBackend : (OFFERTE_MOBILE as any);

  // Filtro offerte per gestore (DEVE essere DOPO offerteList)
  // Filtro offerte per gestore — match ESATTO sul provider per evitare falsi positivi
  const getFilteredOffers = useCallback((provider?: string) => {
    if (!provider) return offerteList;
    const provUpper = provider.toUpperCase();

    // 1. Offerte dal backend: match ESATTO sul campo provider (es. provider === "TIM")
    const backendNames = allOffers
      .filter((o: any) => {
        if (typeof o === 'string') return false;
        const prov = (o.provider || '').toUpperCase();
        return prov === provUpper || prov.replace(/_/g, ' ') === provUpper;
      })
      .map((o: any) => o.name || '');

    // 2. Offerte hardcoded: match preciso per nome (inizia con PROVIDER + spazio)
    const hardcodedNames = offerteList
      .filter((o: any) => {
        const name = (typeof o === 'string' ? o : o.value || o.label || o || '').toUpperCase();
        return name.startsWith(provUpper + ' ');
      })
      .map((o: any) => typeof o === 'string' ? o : o.value || o.label || o || '');

    // 3. Merge senza duplicati
    const merged = [...backendNames];
    hardcodedNames.forEach((h: string) => {
      if (h && !merged.some((b: string) => b.toUpperCase() === h.toUpperCase())) {
        merged.push(h);
      }
    });

    return merged;
  }, [allOffers, offerteList]);

  // Carica offerte dal backend
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/offers?category=MOBILE');
        setAllOffers(res.data || []);
        const names = (res.data || []).map((o: any) => o.name).filter(Boolean);
        setOfferteBackend(names.length > 0 ? names : null);
      } catch {
        setAllOffers([]);
        setOfferteBackend(null);
      }
    })();
  }, []);

  const patch = (p: Partial<MobileWizardData>) => setData((prev) => ({ ...prev, ...p }));

  // Carica in modalita edit
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
        if (p.category !== 'MOBILE') {
          alert('Questa pratica non e di tipo mobile');
          router.replace('/operator/practices/mobile');
          return;
        }
        setPracticeId(p.id);
        const cs = Array.isArray(p.completedSteps) ? p.completedSteps : [];
        setCompletedSteps(cs);
        setExpandedStep(Math.min(Math.max(...cs, 0) + 1, TOTAL_STEPS));
        setData({
          gestoreNuovaLinea: p.type || p.mobileData?.gestoreNuovaLinea,
          offerName: p.offerName,
          soldById: p.soldById,
          soldBy: p.soldBy,
          enteredById: p.enteredById,
          enteredBy: p.enteredBy,
          firstName: p.customerSnapshot?.firstName,
          lastName: p.customerSnapshot?.lastName,
          fiscalCode: p.customerSnapshot?.fiscalCode,
          phone: p.customerSnapshot?.phonePrimary || p.customerSnapshot?.phone,
          email: p.customerSnapshot?.email,
          ...(p.mobileData || {}),
          lavorazioniPostAttivazione: p.lavorazioniPostAttivazione,
        });
      } catch (err) {
        alert('Errore nel caricamento della pratica');
        router.replace('/operator/practices/mobile');
      } finally {
        setBootstrapping(false);
      }
    })();
  }, [router.isReady, edit]);

  const stepValid = useMemo(() => {
    return (id: number): boolean => {
      switch (id) {
        case 1: {
          const gestoreOk = data.gestoreNuovaLinea && (data.gestoreNuovaLinea !== 'ALTRO' || data.gestoreNuovaLineaAltro?.trim());
          const offertaOk = data.offerName && (data.offerName !== 'ALTRO' || data.offertaAltro?.trim());
          const dataOk = data.dataAttivazione && data.dataAttivazione.length >= 8;
          return !!(gestoreOk && offertaOk && dataOk);
        }
        case 2:
          return !!(data.soldById && data.enteredById);
        case 3: {
          const baseOk = data.firstName?.trim() && data.lastName?.trim() && data.fiscalCode && validateFiscalCode(data.fiscalCode) && data.phone?.trim();
          return !!baseOk;
        }
        case 4:
          return !!(
            data.codiceFiscaleVecchiaLinea &&
            data.numeroDaPortare !== undefined &&
            data.tipoLinea &&
            data.gestoreProvenienza &&
            (data.gestoreProvenienza !== 'ALTRO' || data.gestoreProvenienzaAltro?.trim())
          );
        case 5:
          return !!(data.ricarica && (data.ricarica !== 'ALTRO' || data.ricaricaAltro?.trim()));
        case 6:
          return !!(data.timUnica && (data.timUnica !== 'ALTRO' || data.timUnicaAltro?.trim()));
        default:
          return false;
      }
    };
  }, [data]);

  const saveStep = async (stepNumber: number): Promise<string | null> => {
    if (stepNumber === 1 && !practiceId) {
      const gestore = data.gestoreNuovaLinea === 'ALTRO' ? data.gestoreNuovaLineaAltro : data.gestoreNuovaLinea;
      const res = await api.post('/practices', {
        category: 'MOBILE',
        type: gestore,
        offerName: data.offerName === 'ALTRO' ? data.offertaAltro : data.offerName,
        offerCode: data.offerName === 'ALTRO' ? data.offertaAltro : data.offerName,
        customerData: data.fiscalCode?.length === 16 && data.firstName && data.lastName
          ? { firstName: data.firstName, lastName: data.lastName, fiscalCode: data.fiscalCode, phone: data.phone || '', email: data.email, address: '' }
          : undefined,
        mobileData: {
          gestoreNuovaLinea: data.gestoreNuovaLinea,
          gestoreNuovaLineaAltro: data.gestoreNuovaLineaAltro,
          offertaAltro: data.offertaAltro,
          noteGeneriche: data.noteGeneriche,
          dataAttivazione: data.dataAttivazione,
        },
      });
      setPracticeId(res.data.id);
      return res.data.id;
    }
    if (!practiceId) return null;

    const stepPayloads: Record<number, any> = {
      1: {
        offerName: data.offerName === 'ALTRO' ? data.offertaAltro : data.offerName,
        offerCode: data.offerName === 'ALTRO' ? data.offertaAltro : data.offerName,
        gestoreNuovaLinea: data.gestoreNuovaLinea,
        gestoreNuovaLineaAltro: data.gestoreNuovaLineaAltro,
        offertaAltro: data.offertaAltro,
        noteGeneriche: data.noteGeneriche,
        dataAttivazione: data.dataAttivazione,
        type: data.gestoreNuovaLinea === 'ALTRO' ? data.gestoreNuovaLineaAltro : data.gestoreNuovaLinea,
      },
      2: { soldById: data.soldById, soldBy: data.soldBy, enteredById: data.enteredById, enteredBy: data.enteredBy },
      3: {
        customerData: { firstName: data.firstName, lastName: data.lastName, fiscalCode: data.fiscalCode, phone: data.phone, email: data.email || '' },
      },
      4: {
        codiceFiscaleVecchiaLinea: data.codiceFiscaleVecchiaLinea,
        numeroDaPortare: data.numeroDaPortare,
        tipoLinea: data.tipoLinea,
        gestoreProvenienza: data.gestoreProvenienza,
        gestoreProvenienzaAltro: data.gestoreProvenienzaAltro,
        noteMnp: data.noteMnp,
      },
      5: {
        ibanCdc: data.ibanCdc,
        ricarica: data.ricarica,
        ricaricaAltro: data.ricaricaAltro,
        noteMetodoPagamento: data.noteMetodoPagamento,
      },
      6: {
        timUnica: data.timUnica,
        timUnicaAltro: data.timUnicaAltro,
        numeroReteFissaTimUnica: data.numeroReteFissaTimUnica,
        noteGeneriche: data.noteGeneriche,
        accordiCliente: data.accordiCliente,
        lavorazioniPostAttivazione: data.lavorazioniPostAttivazione,
      },
    };

    await api.put(`/practices/${practiceId}/step`, { stepNumber, data: stepPayloads[stepNumber] });
    return practiceId;
  };

  const advance = async (stepNumber: number) => {
    setLoading(true);
    try {
      await saveStep(stepNumber);
      if (!completedSteps.includes(stepNumber)) setCompletedSteps([...completedSteps, stepNumber]);
      if (stepNumber < TOTAL_STEPS) setExpandedStep(stepNumber + 1);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Errore sconosciuto';
      alert('Errore salvataggio step: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!practiceId) return;
    setLoading(true);
    try {
      await saveStep(TOTAL_STEPS);
      await api.put(`/practices/${practiceId}/step`, { stepNumber: TOTAL_STEPS, data: { completed: true } });
      await api.post(`/practices/${practiceId}/force-complete`, {});
      alert('Pratica mobile completata con successo!');
      router.push('/operator/practices/mobile');
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
      <OperatorLayout title="Nuova Pratica Mobile">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      </OperatorLayout>
    );
  }

  return (
    <OperatorLayout title={practiceId ? 'Modifica Pratica Mobile' : 'Nuova Pratica Mobile'}>
      <div className="p-0 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <DeviceMobile className="w-7 h-7 text-indigo-400" weight="duotone" />
            {practiceId ? 'Modifica Pratica Mobile' : 'Nuova Pratica Mobile'}
          </h1>
          <p className="text-slate-400">Compila i {TOTAL_STEPS} passaggi</p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Progresso</span>
            <span className="text-sm text-indigo-400">{completedSteps.length}/{TOTAL_STEPS}</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-600 to-purple-600"
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
                {/* STEP 1: GESTORE + OFFERTA + DATA */}
                {s.id === 1 && (
                  <div className="space-y-4">
                    {/* Card gestore */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-3">
                        Seleziona gestore <span className="text-rose-400">*</span>
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {MOBILE_PROVIDER_CARDS.map((provider) => {
                          const isSelected = data.gestoreNuovaLinea === provider.key;
                          return (
                            <motion.button
                              key={provider.key}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() =>
                                patch({
                                  gestoreNuovaLinea: provider.key,
                                  gestoreNuovaLineaAltro: undefined,
                                  offerName: undefined,
                                })
                              }
                              className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                                isSelected
                                  ? 'border-cyan-500 bg-cyan-600/20 shadow-lg shadow-cyan-500/10'
                                  : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                              }`}
                              data-testid={`mobile-card-${provider.key}`}
                            >
                              <ProviderIcon provider={provider} isSelected={isSelected} />
                              <span className={`font-bold text-xs text-center leading-tight ${isSelected ? 'text-cyan-400' : 'text-slate-300'}`}>
                                {provider.name}
                              </span>
                              {isSelected && <CheckCircle className="w-4 h-4 text-cyan-400" />}
                            </motion.button>
                          );
                        })}
                        {/* ALTRO */}
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => patch({ gestoreNuovaLinea: 'ALTRO', gestoreNuovaLineaAltro: '', offerName: undefined })}
                          className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                            data.gestoreNuovaLinea === 'ALTRO'
                              ? 'border-cyan-500 bg-cyan-600/20 shadow-lg shadow-cyan-500/10'
                              : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center font-bold text-lg text-white">+</div>
                          <span className={`font-bold text-xs text-center ${data.gestoreNuovaLinea === 'ALTRO' ? 'text-cyan-400' : 'text-slate-300'}`}>Altro</span>
                          {data.gestoreNuovaLinea === 'ALTRO' && <CheckCircle className="w-4 h-4 text-cyan-400" />}
                        </motion.button>
                      </div>
                      {/* Input ALTRO */}
                      {data.gestoreNuovaLinea === 'ALTRO' && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-3">
                          <input
                            type="text"
                            value={data.gestoreNuovaLineaAltro || ''}
                            onChange={(e) => patch({ gestoreNuovaLineaAltro: e.target.value })}
                            placeholder="Specifica gestore..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                            data-testid="mobile-gestore-altro"
                          />
                        </motion.div>
                      )}
                    </div>

                    {/* Offerta filtrata per gestore */}
                    {data.gestoreNuovaLinea && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <SelectWithOther
                          label={`Offerta ${data.gestoreNuovaLinea === 'ALTRO' ? data.gestoreNuovaLineaAltro : data.gestoreNuovaLinea} *`}
                          required
                          value={data.offerName}
                          otherValue={data.offertaAltro}
                          onChange={(v) => patch({ offerName: v })}
                          onOtherChange={(v) => patch({ offertaAltro: v })}
                          options={getFilteredOffers(data.gestoreNuovaLinea === 'ALTRO' ? data.gestoreNuovaLineaAltro : data.gestoreNuovaLinea)}
                          testId="mobile-offerta"
                        />
                      </motion.div>
                    )}

                    {/* Data attivazione */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Data attivazione <span className="text-rose-400">*</span></label>
                      <input
                        type="date"
                        value={parseItalianDate(data.dataAttivazione)}
                        onChange={(e) => patch({ dataAttivazione: formatDateToItalian(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                        data-testid="mobile-data-attivazione"
                      />
                    </div>

                    {/* Note */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Note</label>
                      <textarea
                        value={data.noteGeneriche || ''}
                        onChange={(e) => patch({ noteGeneriche: e.target.value })}
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                        data-testid="mobile-note-step1"
                      />
                    </div>

                    <WizardStepNav canAdvance={stepValid(1)} isLast={false} onAdvance={() => advance(1)} loading={loading} />
                  </div>
                )}

                {/* STEP 2: VENDITORI */}
                {s.id === 2 && (
                  <div className="space-y-4">
                    <OperatorsDropdown label="Venduto da *" value={data.soldById} onChange={(id, name) => patch({ soldById: id, soldBy: name })} testId="mobile-soldby" />
                    <OperatorsDropdown label="Inserito da *" value={data.enteredById} onChange={(id, name) => patch({ enteredById: id, enteredBy: name })} testId="mobile-enteredby" />
                    <p className="text-xs text-slate-500">Se il nome non e presente nell&apos;elenco, contatta il responsabile per aggiungere l&apos;operatore in Team.</p>
                    <WizardStepNav canAdvance={stepValid(2)} isLast={false} onBack={() => setExpandedStep(1)} onAdvance={() => advance(2)} loading={loading} />
                  </div>
                )}

                {/* STEP 3: CLIENTE */}
                {s.id === 3 && (
                  <div className="space-y-4">
                    <CustomerAutocomplete
                      value={{ firstName: data.firstName, lastName: data.lastName, fiscalCode: data.fiscalCode, phone: data.phone, email: data.email }}
                      onPatch={(p) => patch(p)}
                      onPick={(c: CustomerLite) => patch({ firstName: c.firstName, lastName: c.lastName, fiscalCode: c.fiscalCode, phone: c.phonePrimary || c.phone || '', email: c.email || '' })}
                    />
                    {data.fiscalCode && !validateFiscalCode(data.fiscalCode) && (
                      <p className="text-rose-400 text-sm">Codice fiscale non valido</p>
                    )}
                    <WizardStepNav canAdvance={stepValid(3)} isLast={false} onBack={() => setExpandedStep(2)} onAdvance={() => advance(3)} loading={loading} />
                  </div>
                )}

                {/* STEP 4: NUMERO / MNP */}
                {s.id === 4 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Codice fiscale vecchia linea <span className="text-rose-400">*</span></label>
                      <input
                        type="text"
                        value={data.codiceFiscaleVecchiaLinea || ''}
                        onChange={(e) => patch({ codiceFiscaleVecchiaLinea: e.target.value.toUpperCase() })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                        data-testid="mobile-cf-vecchia-linea"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Numero da portare <span className="text-rose-400">*</span></label>
                      <p className="text-xs text-slate-500 mb-2">Se nuovo numero scrivere 0</p>
                      <input
                        type="text"
                        value={data.numeroDaPortare || ''}
                        onChange={(e) => patch({ numeroDaPortare: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                        data-testid="mobile-numero-portare"
                      />
                    </div>
                    <SelectWithOther label="Tipo di linea" required value={data.tipoLinea} otherValue="" onChange={(v) => patch({ tipoLinea: v })} onOtherChange={() => {}} options={TIPI_LINEA_MOBILE} testId="mobile-tipo-linea" />
                    <SelectWithOther label="Gestore di provenienza" required value={data.gestoreProvenienza} otherValue={data.gestoreProvenienzaAltro} onChange={(v) => patch({ gestoreProvenienza: v })} onOtherChange={(v) => patch({ gestoreProvenienzaAltro: v })} options={GESTORI_MOBILE_PROVENIENZA as any} testId="mobile-gestore-provenienza" />
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Note MNP</label>
                      <textarea value={data.noteMnp || ''} onChange={(e) => patch({ noteMnp: e.target.value })} rows={3} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" />
                    </div>

                    {/* Riepilogo gestore scelto allo step 1 */}
                    <div className="rounded-xl p-3 bg-slate-950 border border-slate-800 flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-cyan-400" />
                      <div>
                        <p className="text-sm text-slate-500">Gestore selezionato allo Step 1</p>
                        <p className="text-sm font-bold text-slate-200">
                          {data.gestoreNuovaLinea === 'ALTRO' ? data.gestoreNuovaLineaAltro : data.gestoreNuovaLinea}
                        </p>
                      </div>
                    </div>

                    <WizardStepNav canAdvance={stepValid(4)} isLast={false} onBack={() => setExpandedStep(3)} onAdvance={() => advance(4)} loading={loading} />
                  </div>
                )}

                {/* STEP 5: PAGAMENTO / RICARICA */}
                {s.id === 5 && (
                  <div className="space-y-4">
                    <SelectWithOther label="Ricarica" required value={data.ricarica} otherValue={data.ricaricaAltro} onChange={(v) => patch({ ricarica: v })} onOtherChange={(v) => patch({ ricaricaAltro: v })} options={RICARICA_OPTIONS} testId="mobile-ricarica" />
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">IBAN / CDC</label>
                      <p className="text-xs text-slate-500 mb-2">Se ricaricabile non compilare</p>
                      <input
                        type="text"
                        value={data.ibanCdc || ''}
                        onChange={(e) => patch({ ibanCdc: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                        data-testid="mobile-iban"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Note metodo di pagamento</label>
                      <textarea value={data.noteMetodoPagamento || ''} onChange={(e) => patch({ noteMetodoPagamento: e.target.value })} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" />
                    </div>
                    <WizardStepNav canAdvance={stepValid(5)} isLast={false} onBack={() => setExpandedStep(4)} onAdvance={() => advance(5)} loading={loading} />
                  </div>
                )}

                {/* STEP 6: TIM UNICA + NOTE + CONFERMA */}
                {s.id === 6 && (
                  <div className="space-y-4">
                    <SelectWithOther label="TIM Unica" required value={data.timUnica} otherValue={data.timUnicaAltro} onChange={(v) => patch({ timUnica: v })} onOtherChange={(v) => patch({ timUnicaAltro: v })} options={TIM_UNICA_OPTIONS} testId="mobile-tim-unica" />
                    {(data.timUnica === 'AGGANCIATA' || data.timUnica === 'DA_AGGANCIARE') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Numero rete fissa TIM Unica</label>
                        <input
                          type="text"
                          value={data.numeroReteFissaTimUnica || ''}
                          onChange={(e) => patch({ numeroReteFissaTimUnica: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Note generiche</label>
                      <textarea value={data.noteGeneriche || ''} onChange={(e) => patch({ noteGeneriche: e.target.value })} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Accordi con il cliente</label>
                      <textarea value={data.accordiCliente || ''} onChange={(e) => patch({ accordiCliente: e.target.value })} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Lavorazioni post-attivazione</label>
                      <textarea value={data.lavorazioniPostAttivazione || ''} onChange={(e) => patch({ lavorazioniPostAttivazione: e.target.value })} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" />
                    </div>

                    <div className="rounded-xl p-4 bg-slate-950 border border-slate-800 flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                      <div className="text-sm text-slate-300 space-y-1">
                        <p><span className="text-slate-500">Offerta:</span> {data.offerName === 'ALTRO' ? data.offertaAltro : data.offerName}</p>
                        <p><span className="text-slate-500">Cliente:</span> {data.firstName} {data.lastName} &middot; {data.fiscalCode}</p>
                        <p><span className="text-slate-500">Gestore:</span> {data.gestoreNuovaLinea === 'ALTRO' ? data.gestoreNuovaLineaAltro : data.gestoreNuovaLinea}</p>
                        <p><span className="text-slate-500">TIM Unica:</span> {data.timUnica === 'ALTRO' ? data.timUnicaAltro : data.timUnica}</p>
                      </div>
                    </div>

                    <WizardStepNav canAdvance={stepValid(6)} isLast onBack={() => setExpandedStep(5)} onAdvance={submit} loading={loading} />
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