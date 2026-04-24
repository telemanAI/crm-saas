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
  ClipboardText,
  MapPin,
  MagnifyingGlass,
} from 'phosphor-react';
import OperatorLayout from '@/components/layout/OperatorLayout';
import { PracticeStepCard, WizardStepNav } from '@/components/practices/PracticeStepCard';
import { SelectWithOther } from '@/components/practices/SelectWithOther';
import { OperatorsDropdown } from '@/components/practices/OperatorsDropdown';
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
function ProviderIcon({ provider }: { provider: any }) {
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

interface CustomerSuggestion {
  id: string;
  fiscalCode: string;
  firstName: string;
  lastName: string;
  phonePrimary?: string;
  phone?: string;
  email?: string;
  address?: any;
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
  customerAddress?: { street?: string; number?: string; zip?: string; city?: string; province?: string };
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
  { id: 7, title: 'Riepilogo', icon: ClipboardText },
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

  // Ricerca cliente (come rete fissa)
  const [cfSuggestions, setCfSuggestions] = useState<CustomerSuggestion[]>([]);
  const [phoneSuggestions, setPhoneSuggestions] = useState<CustomerSuggestion[]>([]);
  const [nameSuggestions, setNameSuggestions] = useState<CustomerSuggestion[]>([]);
  const [showCfSuggestions, setShowCfSuggestions] = useState(false);
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [isSearchingCf, setIsSearchingCf] = useState(false);
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);
  const [isSearchingName, setIsSearchingName] = useState(false);
  const [lockedCustomer, setLockedCustomer] = useState<CustomerSuggestion | null>(null);

  // Offerte dinamiche caricate dal backend
  const [allOffers, setAllOffers] = useState<any[]>([]);
  const [offerteBackend, setOfferteBackend] = useState<any[] | null>(null);


  // Filtro offerte per gestore — match ESATTO sul provider per evitare falsi positivi
  const offerteList: any = offerteBackend && offerteBackend.length > 0 ? offerteBackend : TIPI_OFFERTA_ENERGY;
  const getFilteredOffers = useCallback((provider?: string) => {
    if (!provider) return offerteList;
    const provUpper = provider.toUpperCase();

    // 1. Offerte dal backend: match ESATTO sul campo provider
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
        const res = await api.get('/offers?category=ENERGY');
        setAllOffers(res.data || []);
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

  // Ricerca CF
  useEffect(() => {
    const searchFiscalCode = async () => {
      if (lockedCustomer && data.fiscalCode === lockedCustomer.fiscalCode) {
        setCfSuggestions([]);
        setShowCfSuggestions(false);
        return;
      }
      if (!data.fiscalCode || data.fiscalCode.length < 3) {
        setCfSuggestions([]);
        setShowCfSuggestions(false);
        return;
      }
      setIsSearchingCf(true);
      try {
        const res = await api.get(`/customers/search/by-fiscal-code?code=${data.fiscalCode}`);
        setCfSuggestions(res.data);
        setShowCfSuggestions(res.data.length > 0);
      } catch {
        setCfSuggestions([]);
      } finally {
        setIsSearchingCf(false);
      }
    };
    const timeoutId = setTimeout(searchFiscalCode, 300);
    return () => clearTimeout(timeoutId);
  }, [data.fiscalCode, lockedCustomer]);

  // Ricerca Telefono
  useEffect(() => {
    const searchPhone = async () => {
      if (lockedCustomer && data.phone === (lockedCustomer.phonePrimary || lockedCustomer.phone || '')) {
        setPhoneSuggestions([]);
        setShowPhoneSuggestions(false);
        return;
      }
      const phoneDigits = data.phone?.replace(/\D/g, '').length || 0;
      if (!data.phone || phoneDigits < 3) {
        setPhoneSuggestions([]);
        setShowPhoneSuggestions(false);
        return;
      }
      setIsSearchingPhone(true);
      try {
        const res = await api.get(`/customers/search/by-phone?q=${data.phone}`);
        setPhoneSuggestions(res.data);
        setShowPhoneSuggestions(res.data.length > 0);
      } catch {
        setPhoneSuggestions([]);
      } finally {
        setIsSearchingPhone(false);
      }
    };
    const timeoutId = setTimeout(searchPhone, 300);
    return () => clearTimeout(timeoutId);
  }, [data.phone, lockedCustomer]);

  // Ricerca Nome
  useEffect(() => {
    const searchName = async () => {
      const searchTerm = `${data.firstName || ''} ${data.lastName || ''}`.trim();
      const lockedName = lockedCustomer ? `${lockedCustomer.firstName} ${lockedCustomer.lastName}`.trim() : '';
      if (lockedCustomer && searchTerm === lockedName && searchTerm !== '') {
        setNameSuggestions([]);
        setShowNameSuggestions(false);
        return;
      }
      if (!searchTerm || searchTerm.length < 2) {
        setNameSuggestions([]);
        setShowNameSuggestions(false);
        return;
      }
      setIsSearchingName(true);
      try {
        const res = await api.get(`/customers/search/by-name?q=${searchTerm}`);
        setNameSuggestions(res.data);
        setShowNameSuggestions(res.data.length > 0);
      } catch {
        setNameSuggestions([]);
      } finally {
        setIsSearchingName(false);
      }
    };
    const timeoutId = setTimeout(searchName, 300);
    return () => clearTimeout(timeoutId);
  }, [data.firstName, data.lastName, lockedCustomer]);

  const handleSelectCustomer = (customer: CustomerSuggestion) => {
    patch({
      firstName: customer.firstName,
      lastName: customer.lastName,
      fiscalCode: customer.fiscalCode,
      phone: customer.phonePrimary || customer.phone || '',
      email: customer.email || '',
      customerAddress: customer.address || undefined,
    });
    setShowCfSuggestions(false);
    setShowPhoneSuggestions(false);
    setShowNameSuggestions(false);
    setCfSuggestions([]);
    setPhoneSuggestions([]);
    setNameSuggestions([]);
    setLockedCustomer(customer);
  };

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
          customerAddress: p.customerSnapshot?.address || p.customer?.address || undefined,
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
          data.phone?.trim()
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
      case 7:
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
          ? { firstName: data.firstName, lastName: data.lastName, fiscalCode: data.fiscalCode, phone: data.phone || '', email: data.email || '', address: data.customerAddress || { street: '', number: '', zip: '', city: '', province: '' } }
          : undefined,
        energyData: {
          gestoreNuovoContratto: data.gestoreNuovoContratto,
          gestoreNuovoContrattoAltro: data.gestoreNuovoContrattoAltro,
          tipoOfferta: data.tipoOfferta,
          tipoOffertaAltro: data.tipoOffertaAltro,
          dataAttivazione: data.dataAttivazione,
          noteGeneriche: data.noteGeneriche,
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
        customerData: {
          firstName: data.firstName,
          lastName: data.lastName,
          fiscalCode: data.fiscalCode,
          phone: data.phone,
          email: data.email || '',
          address: data.customerAddress,
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
      },
      5: { ibanCdc: data.ibanCdc, noteMetodoPagamento: data.noteMetodoPagamento },
      6: { noteGeneriche: data.noteGeneriche, accordiCliente: data.accordiCliente, lavorazioniPostAttivazione: data.lavorazioniPostAttivazione },
      7: { completed: true },
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
                              onClick={() => patch({ gestoreNuovoContratto: provider.key, gestoreNuovoContrattoAltro: undefined, tipoOfferta: undefined })}
                              className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${isSelected ? 'border-amber-500 bg-amber-600/20 shadow-lg shadow-amber-500/10' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800'}`}
                              data-testid={`energy-card-${provider.key}`}
                            >
                              <ProviderIcon provider={provider} />
                              <span className={`font-bold text-xs text-center leading-tight ${isSelected ? 'text-amber-400' : 'text-slate-300'}`}>{provider.name}</span>
                              {isSelected && <CheckCircle className="w-4 h-4 text-amber-400" />}
                            </motion.button>
                          );
                        })}
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => patch({ gestoreNuovoContratto: 'ALTRO', gestoreNuovoContrattoAltro: '', tipoOfferta: undefined })}
                          className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${data.gestoreNuovoContratto === 'ALTRO' ? 'border-amber-500 bg-amber-600/20 shadow-lg shadow-amber-500/10' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800'}`}
                        >
                          <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center font-bold text-lg text-white">+</div>
                          <span className={`font-bold text-xs text-center ${data.gestoreNuovoContratto === 'ALTRO' ? 'text-amber-400' : 'text-slate-300'}`}>Altro</span>
                          {data.gestoreNuovoContratto === 'ALTRO' && <CheckCircle className="w-4 h-4 text-amber-400" />}
                        </motion.button>
                      </div>
                      {data.gestoreNuovoContratto === 'ALTRO' && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-3">
                          <input type="text" value={data.gestoreNuovoContrattoAltro || ''} onChange={(e) => patch({ gestoreNuovoContrattoAltro: e.target.value })} placeholder="Specifica gestore..." className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" data-testid="energy-gestore-altro" />
                        </motion.div>
                      )}
                    </div>

                    {data.gestoreNuovoContratto && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <SelectWithOther label={`Offerta ${data.gestoreNuovoContratto === 'ALTRO' ? data.gestoreNuovoContrattoAltro : data.gestoreNuovoContratto} *`} required value={data.tipoOfferta} otherValue={data.tipoOffertaAltro} onChange={(v) => patch({ tipoOfferta: v })} onOtherChange={(v) => patch({ tipoOffertaAltro: v })} options={getFilteredOffers(data.gestoreNuovoContratto === 'ALTRO' ? data.gestoreNuovoContrattoAltro : data.gestoreNuovoContratto)} testId="energy-tipo-offerta" />
                      </motion.div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Data attivazione <span className="text-rose-400">*</span></label>
                      <input type="date" value={parseItalianDate(data.dataAttivazione)} onChange={(e) => patch({ dataAttivazione: formatDateToItalian(e.target.value) })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" data-testid="energy-data-attivazione" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Note</label>
                      <textarea value={data.noteGeneriche || ''} onChange={(e) => patch({ noteGeneriche: e.target.value })} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" data-testid="energy-note-step1" />
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

                {/* STEP 3: ANAGRAFICA CLIENTE (allineato a rete fissa) */}
                {s.id === 3 && (
                  <div className="space-y-4">
                    {/* CF */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Codice Fiscale <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={data.fiscalCode || ''}
                          onChange={(e) => patch({ fiscalCode: e.target.value.toUpperCase().slice(0, 16) })}
                          className={`w-full bg-slate-950 border rounded-xl px-4 py-3 text-slate-200 ${
                            data.fiscalCode && !validateFiscalCode(data.fiscalCode) ? 'border-rose-600' : 'border-slate-700'
                          }`}
                          placeholder="RSSMRA85T10A562S"
                        />
                        {isSearchingCf && <MagnifyingGlass className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 animate-pulse" />}
                      </div>
                      {showCfSuggestions && cfSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
                          {cfSuggestions.map((customer) => (
                            <button
                              key={customer.id}
                              onClick={() => handleSelectCustomer(customer)}
                              className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-0"
                            >
                              <p className="text-white font-medium">{customer.fiscalCode}</p>
                              <p className="text-sm text-slate-400">{customer.firstName} {customer.lastName}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Telefono */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Recapito cliente <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="tel"
                          value={data.phone || ''}
                          onChange={(e) => patch({ phone: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                          placeholder="3921234567"
                        />
                        {isSearchingPhone && <MagnifyingGlass className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 animate-pulse" />}
                      </div>
                      {showPhoneSuggestions && phoneSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
                          {phoneSuggestions.map((customer) => (
                            <button
                              key={customer.id}
                              onClick={() => handleSelectCustomer(customer)}
                              className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-0"
                            >
                              <p className="text-white font-medium">{customer.phonePrimary || customer.phone}</p>
                              <p className="text-sm text-slate-400">{customer.firstName} {customer.lastName} - {customer.fiscalCode}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Nome/Cognome */}
                    <div className="grid grid-cols-2 gap-4 relative">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Nome <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          value={data.firstName || ''}
                          onChange={(e) => patch({ firstName: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                          placeholder="Mario"
                        />
                      </div>
                      <div className="relative">
                        <label className="block text-sm font-medium text-slate-300 mb-2">Cognome <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          value={data.lastName || ''}
                          onChange={(e) => patch({ lastName: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                          placeholder="Rossi"
                        />
                        {isSearchingName && <MagnifyingGlass className="absolute right-4 top-[38px] w-5 h-5 text-slate-500 animate-pulse" />}
                      </div>
                      {showNameSuggestions && nameSuggestions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 top-[80px] bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden col-span-2">
                          {nameSuggestions.map((customer) => (
                            <button
                              key={customer.id}
                              onClick={() => handleSelectCustomer(customer)}
                              className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-0"
                            >
                              <p className="text-white font-medium">{customer.firstName} {customer.lastName}</p>
                              <p className="text-sm text-slate-400">CF: {customer.fiscalCode} - Tel: {customer.phonePrimary || customer.phone || 'N/D'}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                      <input
                        type="email"
                        value={data.email || ''}
                        onChange={(e) => patch({ email: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                        placeholder="email@esempio.com"
                      />
                    </div>

                    {/* Indirizzo Cliente */}
                    <div className="border-t border-slate-700 pt-4 mt-4">
                      <h4 className="text-sm font-semibold text-indigo-400 mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Indirizzo Cliente
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Via / Piazza</label>
                          <input
                            type="text"
                            value={data.customerAddress?.street || ''}
                            onChange={(e) => patch({ customerAddress: { ...data.customerAddress, street: e.target.value } })}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                            placeholder="Via Roma"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Civico</label>
                            <input
                              type="text"
                              value={data.customerAddress?.number || ''}
                              onChange={(e) => patch({ customerAddress: { ...data.customerAddress, number: e.target.value } })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                              placeholder="123"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">CAP</label>
                            <input
                              type="text"
                              value={data.customerAddress?.zip || ''}
                              onChange={(e) => patch({ customerAddress: { ...data.customerAddress, zip: e.target.value } })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                              placeholder="00100"
                              maxLength={5}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Città</label>
                            <input
                              type="text"
                              value={data.customerAddress?.city || ''}
                              onChange={(e) => patch({ customerAddress: { ...data.customerAddress, city: e.target.value } })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                              placeholder="Roma"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Provincia</label>
                            <input
                              type="text"
                              value={data.customerAddress?.province || ''}
                              onChange={(e) => patch({ customerAddress: { ...data.customerAddress, province: e.target.value.toUpperCase() } })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 uppercase"
                              placeholder="RM"
                              maxLength={2}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CF Vecchio Contratto (specifico energy) */}
                    <div className="pt-2">
                      <label className="block text-sm font-medium text-slate-300 mb-2">Codice fiscale vecchio contratto <span className="text-rose-500">*</span></label>
                      <input type="text" value={data.codiceFiscaleVecchioContratto || ''} onChange={(e) => patch({ codiceFiscaleVecchioContratto: e.target.value.toUpperCase() })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" data-testid="energy-cf-vecchio" />
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
                      <input type="text" value={data.numeroContatore || ''} onChange={(e) => patch({ numeroContatore: e.target.value.toUpperCase() })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 font-mono" data-testid="energy-numero-contatore" />
                    </div>
                    <SelectWithOther label="Potenza contatore" required value={data.potenzaContatore} otherValue={data.potenzaContatoreAltro} onChange={(v) => patch({ potenzaContatore: v })} onOtherChange={(v) => patch({ potenzaContatoreAltro: v })} options={POTENZE_CONTATORE} testId="energy-potenza" />
                    <SelectWithOther label="Gestore di provenienza" required value={data.gestoreProvenienza} otherValue={data.gestoreProvenienzaAltro} onChange={(v) => patch({ gestoreProvenienza: v })} onOtherChange={(v) => patch({ gestoreProvenienzaAltro: v })} options={GESTORI_ENERGY_PROVENIENZA as any} testId="energy-gestore-provenienza" />
                    <div className="rounded-xl p-3 bg-slate-950 border border-slate-800 flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-amber-400" />
                      <div>
                        <p className="text-sm text-slate-500">Gestore selezionato allo Step 1</p>
                        <p className="text-sm font-bold text-slate-200">{data.gestoreNuovoContratto === 'ALTRO' ? data.gestoreNuovoContrattoAltro : data.gestoreNuovoContratto}</p>
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
                      <input type="text" value={data.ibanCdc || ''} onChange={(e) => patch({ ibanCdc: e.target.value.toUpperCase() })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 font-mono" data-testid="energy-iban" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Note metodo di pagamento</label>
                      <textarea value={data.noteMetodoPagamento || ''} onChange={(e) => patch({ noteMetodoPagamento: e.target.value })} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" />
                    </div>
                    <WizardStepNav canAdvance={stepValid(5)} isLast={false} onBack={() => setExpandedStep(4)} onAdvance={() => advance(5)} loading={loading} />
                  </div>
                )}

                {/* STEP 6: NOTE */}
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
                    <WizardStepNav canAdvance={stepValid(6)} isLast={false} onBack={() => setExpandedStep(5)} onAdvance={() => advance(6)} loading={loading} />
                  </div>
                )}

                {/* STEP 7: RIEPILOGO (allineato a rete fissa) */}
                {s.id === 7 && (
                  <div className="space-y-4">
                    {/* Card Offerta */}
                    <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-6">
                      <h4 className="font-semibold text-amber-400 mb-4 flex items-center gap-2">
                        <Buildings className="w-5 h-5" />
                        Dettaglio Offerta
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-start">
                          <span className="text-slate-400">Gestore:</span>
                          <span className="text-white text-right font-medium max-w-[60%]">
                            {data.gestoreNuovoContratto === 'ALTRO' ? data.gestoreNuovoContrattoAltro : data.gestoreNuovoContratto}
                          </span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-slate-400">Tipo offerta:</span>
                          <span className="text-white text-right font-medium max-w-[60%]">
                            {data.tipoOfferta === 'ALTRO' ? data.tipoOffertaAltro : data.tipoOfferta}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Data attivazione:</span>
                          <span className="text-white">{data.dataAttivazione}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Venditori */}
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                      <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Venditori
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-slate-400">Venduto da:</span><span className="text-white">{data.soldBy}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Inserito da:</span><span className="text-white">{data.enteredBy}</span></div>
                      </div>
                    </div>

                    {/* Card Dati Cliente */}
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                      <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Dati Cliente
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-slate-400">Nome:</span><span className="text-white">{data.firstName} {data.lastName}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">CF:</span><span className="text-white font-mono text-xs">{data.fiscalCode}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Telefono:</span><span className="text-white">{data.phone}</span></div>
                        {data.email && <div className="flex justify-between"><span className="text-slate-400">Email:</span><span className="text-white">{data.email}</span></div>}
                        {data.customerAddress && (data.customerAddress.street || data.customerAddress.city) && (
                          <div className="flex justify-between items-start">
                            <span className="text-slate-400">Indirizzo:</span>
                            <span className="text-white text-right max-w-[60%]">
                              {data.customerAddress.street} {data.customerAddress.number}, {data.customerAddress.zip} {data.customerAddress.city} ({data.customerAddress.province})
                            </span>
                          </div>
                        )}
                        {data.codiceFiscaleVecchioContratto && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">CF vecchio contratto:</span>
                            <span className="text-white font-mono text-xs">{data.codiceFiscaleVecchioContratto}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Attivazione & Contatore */}
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                      <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <Gauge className="w-5 h-5" />
                        Attivazione & Contatore
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-slate-400">Tipo attivazione:</span><span className="text-white">{data.tipoAttivazione === 'ALTRO' ? data.tipoAttivazioneAltro : data.tipoAttivazione}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Numero contatore:</span><span className="text-white font-mono text-xs">{data.numeroContatore}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Potenza:</span><span className="text-white">{data.potenzaContatore === 'ALTRO' ? data.potenzaContatoreAltro : data.potenzaContatore}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Gestore provenienza:</span><span className="text-white">{data.gestoreProvenienza === 'ALTRO' ? data.gestoreProvenienzaAltro : data.gestoreProvenienza}</span></div>
                      </div>
                    </div>

                    {/* Card Pagamento */}
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                      <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Pagamento
                      </h4>
                      <div className="space-y-2 text-sm">
                        {data.ibanCdc && <div className="flex justify-between"><span className="text-slate-400">IBAN / CDC:</span><span className="text-white font-mono text-xs">{data.ibanCdc}</span></div>}
                        {data.noteMetodoPagamento && <div><span className="text-slate-400">Note:</span><p className="text-slate-300 mt-1">{data.noteMetodoPagamento}</p></div>}
                      </div>
                    </div>

                    {/* Card Note */}
                    {(data.noteGeneriche || data.accordiCliente || data.lavorazioniPostAttivazione) && (
                      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                        <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          Note
                        </h4>
                        <div className="space-y-3 text-sm">
                          {data.noteGeneriche && (
                            <div>
                              <span className="text-slate-400 block mb-1">Note generiche:</span>
                              <p className="text-slate-300">{data.noteGeneriche}</p>
                            </div>
                          )}
                          {data.accordiCliente && (
                            <div>
                              <span className="text-slate-400 block mb-1">Accordi con il cliente:</span>
                              <p className="text-slate-300">{data.accordiCliente}</p>
                            </div>
                          )}
                          {data.lavorazioniPostAttivazione && (
                            <div>
                              <span className="text-slate-400 block mb-1">Lavorazioni post-attivazione:</span>
                              <p className="text-slate-300">{data.lavorazioniPostAttivazione}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <WizardStepNav canAdvance={stepValid(7)} isLast onBack={() => setExpandedStep(6)} onAdvance={submit} loading={loading} />
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