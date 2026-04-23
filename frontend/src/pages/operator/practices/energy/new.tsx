import { useCallback, useEffect, useMemo, useState } from 'react';
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
  ENERGY_PROVIDER_CARDS,
  TIPI_ATTIVAZIONE_ENERGY,
  POTENZE_CONTATORE,
  TIPI_OFFERTA_ENERGY,
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

interface EnergyWizardData {
  // Step 1: gestore + offerta
  gestoreNuovoContratto?: string;
  gestoreNuovoContrattoAltro?: string;
  tipoOfferta?: string;
  tipoOffertaAltro?: string;
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
  codiceFiscaleVecchioContratto?: string;
  // Step 4: attivazione + contatore
  tipoAttivazione?: string;
  tipoAttivazioneAltro?: string;
  numeroContatore?: string;
  potenzaContatore?: string;
  potenzaContatoreAltro?: string;
  gestoreProvenienza?: string;
  gestoreProvenienzaAltro?: string;
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

  // Offerte dinamiche caricate dal backend
  const [allOffers, setAllOffers] = useState<any[]>([]);
  const [offerteBackend, setOfferteBackend] = useState<any[] | null>(null);

  const offerteList: any = offerteBackend && offerteBackend.length > 0 ? offerteBackend : TIPI_OFFERTA_ENERGY;

  // Filtro offerte per gestore (DEVE essere DOPO offerteList)
  const getFilteredOffers = useCallback((provider?: string) => {
    if (!provider) return offerteList;
    const provUpper = provider.toUpperCase();

    const backendNames = allOffers
      .filter((o: any) => {
        const name = (typeof o === 'string' ? o : o.name || '').toUpperCase();
        const prov = (typeof o === 'string' ? '' : (o.provider || '')).toUpperCase();
        return name.includes(provUpper) || prov.includes(provUpper);
      })
      .map((o: any) => (typeof o === 'string' ? o : o.name || ''));

    const hardcodedNames = offerteList
      .filter((o: any) => {
        const name = (typeof o === 'string' ? o : o.value || o.label || o || '').toUpperCase();
        return name.includes(provUpper);
      })
      .map((o: any) => (typeof o === 'string' ? o : o.value || o.label || o || ''));

    // Merge: backend + hardcoded mancanti
    const merged = [...backendNames];
    hardcodedNames.forEach((h: string) => {
      if (!merged.some((b: string) => b.toUpperCase() === h.toUpperCase())) {
        merged.push(h);
      }
    });

    // Se il merge è vuoto, ritorna [] (non offerteList altrimenti mostra TUTTE le offerte)
    // L'utente userà "Altro" per scrivere manualmente
    return merged.length > 0 ? merged : [];
  }, [allOffers, offerteList]);

  // Carica offerte dal backend (una sola volta)
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/offers?category=ENERGY');
        setAllOffers(res.data || []);
        // Formatta per SelectWithOther
        const items = (res.data || [])
          .filter((o: any) => o.name)
          .map((o: any) => ({ value: o.name, label: o.name }));
        setOfferteBackend(items.length > 0 ? items : null);
      } catch {
        setAllOffers([]);
        setOfferteBackend(null);
      }
    })();
  }, []);

  const patch = (p: Partial<EnergyWizardData>) => setData((prev) => ({ ...prev, ...p }));

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
        if (p.category !== 'ENERGY') {
          alert('Questa pratica non e di tipo luce/gas');
          router.replace('/operator/practices/energy');
          return;
        }
        setPracticeId(p.id);
        const cs = Array.isArray(p.completedSteps) ? p.completedSteps : [];
        setCompletedSteps(cs);
        setExpandedStep(Math.min(Math.max(...cs, 0) + 1, TOTAL_STEPS));
        setData({
          gestoreNuovoContratto: p.type || p.energyData?.gestoreNuovoContratto,
          soldById: p.soldById,
          soldBy: p.soldBy,
          enteredById: p.enteredById,
          enteredBy: p.enteredBy,
          firstName: p.customerSnapshot?.firstName,
          lastName: p.customerSnapshot?.lastName,
          fiscalCode: p.customerSnapshot?.fiscalCode,
          phone: p.customerSnapshot?.phonePrimary || p.customerSnapshot?.phone,
          email: p.customerSnapshot?.email,
          codiceFiscaleVecchioContratto: p.energyData?.codiceFiscaleVecchioContratto,
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
      case 1: {
        const gestoreOk = data.gestoreNuovoContratto && (data.gestoreNuovoContratto !== 'ALTRO' || data.gestoreNuovoContrattoAltro?.trim());
        const offertaOk = data.tipoOfferta && (data.tipoOfferta !== 'ALTRO' || data.tipoOffertaAltro?.trim());
        const dataOk = data.dataAttivazione && data.dataAttivazione.length >= 8;
        return !!(gestoreOk && offertaOk && dataOk);
      }
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
          (data.gestoreProvenienza !== 'ALTRO' || data.gestoreProvenienzaAltro?.trim())
        );
      case 5:
        return !!data.ibanCdc?.trim();
      case 6:
        return true;
      default:
        return false;
    }
  }, [data]);

  const saveStep = async (stepNumber: number): Promise<string | null> => {
    if (stepNumber === 1 && !practiceId) {
      const gestore = data.gestoreNuovoContratto === 'ALTRO' ? data.gestoreNuovoContrattoAltro : data.gestoreNuovoContratto;
      const res = await api.post('/practices', {
        category: 'ENERGY',
        type: gestore,
        offerName: data.tipoOfferta === 'ALTRO' ? data.tipoOffertaAltro : data.tipoOfferta,
        offerCode: data.tipoOfferta === 'ALTRO' ? data.tipoOffertaAltro : data.tipoOfferta,
        customerData: data.fiscalCode?.length === 16 && data.firstName && data.lastName
          ? { firstName: data.firstName, lastName: data.lastName, fiscalCode: data.fiscalCode, phone: data.phone || '', email: data.email }
          : undefined,
        energyData: {
          gestoreNuovoContratto: data.gestoreNuovoContratto,
          gestoreNuovoContrattoAltro: data.gestoreNuovoContrattoAltro,
          tipoOfferta: data.tipoOfferta,
          tipoOffertaAltro: data.tipoOffertaAltro,
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
        offerName: data.tipoOfferta === 'ALTRO' ? data.tipoOffertaAltro : data.tipoOfferta,
        offerCode: data.tipoOfferta === 'ALTRO' ? data.tipoOffertaAltro : data.tipoOfferta,
        tipoOfferta: data.tipoOfferta,
        tipoOffertaAltro: data.tipoOffertaAltro,
        gestoreNuovoContratto: data.gestoreNuovoContratto,
        gestoreNuovoContrattoAltro: data.gestoreNuovoContrattoAltro,
        noteGeneriche: data.noteGeneriche,
        dataAttivazione: data.dataAttivazione,
        type: data.gestoreNuovoContratto === 'ALTRO' ? data.gestoreNuovoContrattoAltro : data.gestoreNuovoContratto,
      },
      2: { soldById: data.soldById, soldBy: data.soldBy, enteredById: data.enteredById, enteredBy: data.enteredBy },
      3: {
        customerData: { firstName: data.firstName, lastName: data.lastName, fiscalCode: data.fiscalCode, phone: data.phone, email: data.email },
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
      },
      5: { ibanCdc: data.ibanCdc, noteMetodoPagamento: data.noteMetodoPagamento },
      6: { noteGeneriche: data.noteGeneriche, accordiCliente: data.accordiCliente, lavorazioniPostAttivazione: data.lavorazioniPostAttivazione },
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
      await api.put(`/practices/${practiceId}/step`, { stepNumber: TOTAL_STEPS, data: { completed: true } });
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
                {/* STEP 1: GESTORE + OFFERTA + DATA */}
                {s.id === 1 && (
                  <div className="space-y-4">
                    {/* Card gestore */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-3">
                        Seleziona gestore <span className="text-rose-400">*</span>
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {ENERGY_PROVIDER_CARDS.map((provider) => {
                          const isSelected = data.gestoreNuovoContratto === provider.key;
                          return (
                            <motion.button
                              key={provider.key}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() =>
                                patch({
                                  gestoreNuovoContratto: provider.key,
                                  gestoreNuovoContrattoAltro: undefined,
                                  tipoOfferta: undefined,
                                })
                              }
                              className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                                isSelected
                                  ? 'border-amber-500 bg-amber-600/20 shadow-lg shadow-amber-500/10'
                                  : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                              }`}
                              data-testid={`energy-card-${provider.key}`}
                            >
                              <ProviderIcon provider={provider} isSelected={isSelected} />
                              <span className={`font-bold text-xs text-center leading-tight ${isSelected ? 'text-amber-400' : 'text-slate-300'}`}>
                                {provider.name}
                              </span>
                              {isSelected && <CheckCircle className="w-4 h-4 text-amber-400" />}
                            </motion.button>
                          );
                        })}
                        {/* ALTRO */}
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => patch({ gestoreNuovoContratto: 'ALTRO', gestoreNuovoContrattoAltro: '', tipoOfferta: undefined })}
                          className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                            data.gestoreNuovoContratto === 'ALTRO'
                              ? 'border-amber-500 bg-amber-600/20 shadow-lg shadow-amber-500/10'
                              : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                          }`}
                        >
                          <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center font-bold text-lg text-white">+</div>
                          <span className={`font-bold text-xs text-center ${data.gestoreNuovoContratto === 'ALTRO' ? 'text-amber-400' : 'text-slate-300'}`}>Altro</span>
                          {data.gestoreNuovoContratto === 'ALTRO' && <CheckCircle className="w-4 h-4 text-amber-400" />}
                        </motion.button>
                      </div>
                      {/* Input ALTRO */}
                      {data.gestoreNuovoContratto === 'ALTRO' && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-3">
                          <input
                            type="text"
                            value={data.gestoreNuovoContrattoAltro || ''}
                            onChange={(e) => patch({ gestoreNuovoContrattoAltro: e.target.value })}
                            placeholder="Specifica gestore..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                            data-testid="energy-gestore-altro"
                          />
                        </motion.div>
                      )}
                    </div>

                    {/* Offerta filtrata per gestore */}
                    {data.gestoreNuovoContratto && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <SelectWithOther
                          label={`Offerta ${data.gestoreNuovoContratto === 'ALTRO' ? data.gestoreNuovoContrattoAltro : data.gestoreNuovoContratto} *`}
                          required
                          value={data.tipoOfferta}
                          otherValue={data.tipoOffertaAltro}
                          onChange={(v) => patch({ tipoOfferta: v })}
                          onOtherChange={(v) => patch({ tipoOffertaAltro: v })}
                          options={getFilteredOffers(data.gestoreNuovoContratto === 'ALTRO' ? data.gestoreNuovoContrattoAltro : data.gestoreNuovoContratto)}
                          testId="energy-tipo-offerta"
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
                        data-testid="energy-data-attivazione"
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
                        data-testid="energy-note-step1"
                      />
                    </div>

                    <WizardStepNav canAdvance={stepValid(1)} isLast={false} onAdvance={() => advance(1)} loading={loading} />
                  </div>
                )}

                {/* STEP 2: VENDITORI */}
                {s.id === 2 && (
                  <div className="space-y-4">
                    <OperatorsDropdown label="Venduto da *" value={data.soldById} onChange={(id, name) => patch({ soldById: id, soldBy: name })} testId="energy-soldby" />
                    <OperatorsDropdown label="Inserito da *" value={data.enteredById} onChange={(id, name) => patch({ enteredById: id, enteredBy: name })} testId="energy-enteredby" />
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
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Codice fiscale vecchio contratto <span className="text-rose-400">*</span></label>
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
                    <WizardStepNav canAdvance={stepValid(3)} isLast={false} onBack={() => setExpandedStep(2)} onAdvance={() => advance(3)} loading={loading} />
                  </div>
                )}

                {/* STEP 4: ATTIVAZIONE & CONTATORE */}
                {s.id === 4 && (
                  <div className="space-y-4">
                    <SelectWithOther label="Tipo di attivazione" required value={data.tipoAttivazione} otherValue={data.tipoAttivazioneAltro} onChange={(v) => patch({ tipoAttivazione: v })} onOtherChange={(v) => patch({ tipoAttivazioneAltro: v })} options={TIPI_ATTIVAZIONE_ENERGY} testId="energy-tipo-attivazione" />
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Numero contatore <span className="text-rose-400">*</span></label>
                      <p className="text-xs text-slate-500 mb-2">LUCE = POD, GAS = PDR</p>
                      <input
                        type="text"
                        value={data.numeroContatore || ''}
                        onChange={(e) => patch({ numeroContatore: e.target.value.toUpperCase() })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 font-mono"
                        data-testid="energy-numero-contatore"
                      />
                    </div>
                    <SelectWithOther label="Potenza contatore" required value={data.potenzaContatore} otherValue={data.potenzaContatoreAltro} onChange={(v) => patch({ potenzaContatore: v })} onOtherChange={(v) => patch({ potenzaContatoreAltro: v })} options={POTENZE_CONTATORE} testId="energy-potenza" />
                    <SelectWithOther label="Gestore di provenienza" required value={data.gestoreProvenienza} otherValue={data.gestoreProvenienzaAltro} onChange={(v) => patch({ gestoreProvenienza: v })} onOtherChange={(v) => patch({ gestoreProvenienzaAltro: v })} options={GESTORI_ENERGY_PROVENIENZA as any} testId="energy-gestore-provenienza" />

                    {/* Riepilogo gestore scelto allo step 1 */}
                    <div className="rounded-xl p-3 bg-slate-950 border border-slate-800 flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-amber-400" />
                      <div>
                        <p className="text-sm text-slate-500">Gestore selezionato allo Step 1</p>
                        <p className="text-sm font-bold text-slate-200">
                          {data.gestoreNuovoContratto === 'ALTRO' ? data.gestoreNuovoContrattoAltro : data.gestoreNuovoContratto}
                        </p>
                      </div>
                    </div>

                    <WizardStepNav canAdvance={stepValid(4)} isLast={false} onBack={() => setExpandedStep(3)} onAdvance={() => advance(4)} loading={loading} />
                  </div>
                )}

                {/* STEP 5: PAGAMENTO */}
                {s.id === 5 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">IBAN / CDC <span className="text-rose-400">*</span></label>
                      <p className="text-xs text-slate-500 mb-2">Se bollettino scrivere &quot;BOLLETTINO&quot;</p>
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
                      <textarea value={data.noteMetodoPagamento || ''} onChange={(e) => patch({ noteMetodoPagamento: e.target.value })} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" />
                    </div>
                    <WizardStepNav canAdvance={stepValid(5)} isLast={false} onBack={() => setExpandedStep(4)} onAdvance={() => advance(5)} loading={loading} />
                  </div>
                )}

                {/* STEP 6: NOTE & CONFERMA */}
                {s.id === 6 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Note generiche</label>
                      <textarea value={data.noteGeneriche || ''} onChange={(e) => patch({ noteGeneriche: e.target.value })} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Accordi con cliente</label>
                      <textarea value={data.accordiCliente || ''} onChange={(e) => patch({ accordiCliente: e.target.value })} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Lavorazioni post-attivazione</label>
                      <textarea value={data.lavorazioniPostAttivazione || ''} onChange={(e) => patch({ lavorazioniPostAttivazione: e.target.value })} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" />
                    </div>

                    <div className="rounded-xl p-4 bg-slate-950 border border-slate-800 flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                      <div className="text-sm text-slate-300 space-y-1">
                        <p><span className="text-slate-500">Cliente:</span> {data.firstName} {data.lastName} &middot; {data.fiscalCode}</p>
                        <p><span className="text-slate-500">Attivazione:</span> {data.tipoAttivazione === 'ALTRO' ? data.tipoAttivazioneAltro : data.tipoAttivazione}</p>
                        <p><span className="text-slate-500">Contatore:</span> {data.numeroContatore} &middot; {data.potenzaContatore === 'ALTRO' ? data.potenzaContatoreAltro : data.potenzaContatore}</p>
                        <p><span className="text-slate-500">Gestore:</span> {data.gestoreNuovoContratto === 'ALTRO' ? data.gestoreNuovoContrattoAltro : data.gestoreNuovoContratto}</p>
                        <p><span className="text-slate-500">Pagamento:</span> {data.ibanCdc}</p>
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
