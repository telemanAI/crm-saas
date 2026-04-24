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
  ClipboardText,
  MapPin,
  MagnifyingGlass,
} from 'phosphor-react';
import OperatorLayout from '@/components/layout/OperatorLayout';
import { PracticeStepCard, WizardStepNav } from '@/components/practices/PracticeStepCard';
import { SelectWithOther } from '@/components/practices/SelectWithOther';
import { OperatorsDropdown } from '@/components/practices/OperatorsDropdown';
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

interface MobileWizardData {
  gestoreNuovaLinea?: string;
  gestoreNuovaLineaAltro?: string;
  offerName?: string;
  offertaAltro?: string;
  dataAttivazione?: string;
  soldById?: string;
  soldBy?: string;
  enteredById?: string;
  enteredBy?: string;
  firstName?: string;
  lastName?: string;
  fiscalCode?: string;
  phone?: string;
  email?: string;
  customerAddress?: { street?: string; number?: string; zip?: string; city?: string; province?: string };
  codiceFiscaleVecchiaLinea?: string;
  numeroDaPortare?: string;
  tipoLinea?: string;
  gestoreProvenienza?: string;
  gestoreProvenienzaAltro?: string;
  noteMnp?: string;
  ibanCdc?: string;
  ricarica?: string;
  ricaricaAltro?: string;
  noteMetodoPagamento?: string;
  timUnica?: string;
  timUnicaAltro?: string;
  numeroReteFissaTimUnica?: string;
  noteGeneriche?: string;
  accordiCliente?: string;
  lavorazioniPostAttivazione?: string;
}

// Steps dinamici in base al gestore (TIM = step TIM Unica, altrimenti no)
const getSteps = (gestore?: string) => {
  const resolved = (gestore || '').toUpperCase();
  const isTim = resolved.includes('TIM');
  const base: { id: number; stepId: string; title: string; icon: any }[] = [
    { id: 1, stepId: 'offer', title: 'Offerta', icon: Buildings },
    { id: 2, stepId: 'sellers', title: 'Venditori', icon: User },
    { id: 3, stepId: 'customer', title: 'Anagrafica Cliente', icon: User },
    { id: 4, stepId: 'mnp', title: 'Numero & MNP', icon: Phone },
    { id: 5, stepId: 'payment', title: 'Pagamento & Ricarica', icon: CreditCard },
  ];
  if (isTim) {
    base.push({ id: 6, stepId: 'timUnica', title: 'TIM Unica & Note', icon: FileText });
  }
  base.push({ id: isTim ? 7 : 6, stepId: 'summary', title: 'Riepilogo', icon: ClipboardText });
  return base;
};

export default function NewMobilePractice() {
  const router = useRouter();
  const { edit } = router.query;
  const [data, setData] = useState<MobileWizardData>({});
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

  const offerteList = offerteBackend && offerteBackend.length > 0 ? offerteBackend : (OFFERTE_MOBILE as any);

  // Steps dinamici
  const resolvedGestore = data.gestoreNuovaLinea === 'ALTRO' ? data.gestoreNuovaLineaAltro : data.gestoreNuovaLinea;
  const steps = useMemo(() => getSteps(resolvedGestore), [resolvedGestore]);
  const totalSteps = steps.length;

  // Sincronizza completedSteps/expandedStep quando cambia la composizione degli step
  useEffect(() => {
    const validIds = new Set(steps.map(s => s.id));
    setCompletedSteps(prev => prev.filter(id => validIds.has(id)));
    setExpandedStep(prev => {
      if (!validIds.has(prev)) {
        const maxCompleted = Math.max(...completedSteps.filter(id => validIds.has(id)), 0);
        return Math.min(maxCompleted + 1, totalSteps);
      }
      return Math.min(prev, totalSteps);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length, resolvedGestore]);

  const getFilteredOffers = useCallback((provider?: string) => {
    if (!provider) return offerteList;
    const provUpper = provider.toUpperCase();
    const backendNames = allOffers
      .filter((o: any) => {
        if (typeof o === 'string') return false;
        const prov = (o.provider || '').toUpperCase();
        return prov === provUpper || prov.replace(/_/g, ' ') === provUpper;
      })
      .map((o: any) => o.name || '');
    const hardcodedNames = offerteList
      .filter((o: any) => {
        const name = (typeof o === 'string' ? o : o.value || o.label || o || '').toUpperCase();
        return name.startsWith(provUpper + ' ');
      })
      .map((o: any) => typeof o === 'string' ? o : o.value || o.label || o || '');
    const merged = [...backendNames];
    hardcodedNames.forEach((h: string) => {
      if (h && !merged.some((b: string) => b.toUpperCase() === h.toUpperCase())) {
        merged.push(h);
      }
    });
    return merged;
  }, [allOffers, offerteList]);

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

  // Ricerche anagrafica
  useEffect(() => {
    const searchFiscalCode = async () => {
      if (lockedCustomer && data.fiscalCode === lockedCustomer.fiscalCode) {
        setCfSuggestions([]); setShowCfSuggestions(false); return;
      }
      if (!data.fiscalCode || data.fiscalCode.length < 3) {
        setCfSuggestions([]); setShowCfSuggestions(false); return;
      }
      setIsSearchingCf(true);
      try {
        const res = await api.get(`/customers/search/by-fiscal-code?code=${data.fiscalCode}`);
        setCfSuggestions(res.data); setShowCfSuggestions(res.data.length > 0);
      } catch { setCfSuggestions([]); }
      finally { setIsSearchingCf(false); }
    };
    const t = setTimeout(searchFiscalCode, 300);
    return () => clearTimeout(t);
  }, [data.fiscalCode, lockedCustomer]);

  useEffect(() => {
    const searchPhone = async () => {
      if (lockedCustomer && data.phone === (lockedCustomer.phonePrimary || lockedCustomer.phone || '')) {
        setPhoneSuggestions([]); setShowPhoneSuggestions(false); return;
      }
      const digits = data.phone?.replace(/\D/g, '').length || 0;
      if (!data.phone || digits < 3) {
        setPhoneSuggestions([]); setShowPhoneSuggestions(false); return;
      }
      setIsSearchingPhone(true);
      try {
        const res = await api.get(`/customers/search/by-phone?q=${data.phone}`);
        setPhoneSuggestions(res.data); setShowPhoneSuggestions(res.data.length > 0);
      } catch { setPhoneSuggestions([]); }
      finally { setIsSearchingPhone(false); }
    };
    const t = setTimeout(searchPhone, 300);
    return () => clearTimeout(t);
  }, [data.phone, lockedCustomer]);

  useEffect(() => {
    const searchName = async () => {
      const term = `${data.firstName || ''} ${data.lastName || ''}`.trim();
      const lockedName = lockedCustomer ? `${lockedCustomer.firstName} ${lockedCustomer.lastName}`.trim() : '';
      if (lockedCustomer && term === lockedName && term !== '') {
        setNameSuggestions([]); setShowNameSuggestions(false); return;
      }
      if (!term || term.length < 2) {
        setNameSuggestions([]); setShowNameSuggestions(false); return;
      }
      setIsSearchingName(true);
      try {
        const res = await api.get(`/customers/search/by-name?q=${term}`);
        setNameSuggestions(res.data); setShowNameSuggestions(res.data.length > 0);
      } catch { setNameSuggestions([]); }
      finally { setIsSearchingName(false); }
    };
    const t = setTimeout(searchName, 300);
    return () => clearTimeout(t);
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
    setShowCfSuggestions(false); setShowPhoneSuggestions(false); setShowNameSuggestions(false);
    setCfSuggestions([]); setPhoneSuggestions([]); setNameSuggestions([]);
    setLockedCustomer(customer);
  };

  // Carica edit
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
        const loadedGestore = p.type || p.mobileData?.gestoreNuovaLinea;
        const isTim = (loadedGestore || '').toUpperCase().includes('TIM');
        const maxStep = Math.max(...cs, 0);
        const currentTotal = isTim ? 7 : 6;
        setExpandedStep(Math.min(maxStep + 1, currentTotal));
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
          customerAddress: p.customerSnapshot?.address || p.customer?.address || undefined,
          ...(p.mobileData || {}),
          lavorazioniPostAttivazione: p.lavorazioniPostAttivazione,
        });
      } catch {
        alert('Errore nel caricamento della pratica');
        router.replace('/operator/practices/mobile');
      } finally {
        setBootstrapping(false);
      }
    })();
  }, [router.isReady, edit]);

  const stepValid = useMemo(() => (id: number): boolean => {
    const step = steps.find(s => s.id === id);
    if (!step) return false;
    switch (step.stepId) {
      case 'offer': {
        const gestoreOk = data.gestoreNuovaLinea && (data.gestoreNuovaLinea !== 'ALTRO' || data.gestoreNuovaLineaAltro?.trim());
        const offertaOk = data.offerName && (data.offerName !== 'ALTRO' || data.offertaAltro?.trim());
        const dataOk = data.dataAttivazione && data.dataAttivazione.length >= 8;
        return !!(gestoreOk && offertaOk && dataOk);
      }
      case 'sellers':
        return !!(data.soldById && data.enteredById);
      case 'customer': {
        const baseOk = data.firstName?.trim() && data.lastName?.trim() && data.fiscalCode && validateFiscalCode(data.fiscalCode) && data.phone?.trim();
        return !!baseOk;
      }
      case 'mnp':
        return true; // STEP 4 TOTALMENTE OPZIONALE
      case 'payment':
        return !!(data.ricarica && (data.ricarica !== 'ALTRO' || data.ricaricaAltro?.trim()));
      case 'timUnica':
        return !!(data.timUnica && (data.timUnica !== 'ALTRO' || data.timUnicaAltro?.trim()));
      case 'summary':
        return true;
      default:
        return false;
    }
  }, [data, steps]);

  const saveStep = async (stepNumber: number): Promise<string | null> => {
    const step = steps.find(s => s.id === stepNumber);
    if (!step) return null;

    if (step.stepId === 'offer' && !practiceId) {
      const gestore = data.gestoreNuovaLinea === 'ALTRO' ? data.gestoreNuovaLineaAltro : data.gestoreNuovaLinea;
      const res = await api.post('/practices', {
        category: 'MOBILE',
        type: gestore,
        offerName: data.offerName === 'ALTRO' ? data.offertaAltro : data.offerName,
        offerCode: data.offerName === 'ALTRO' ? data.offertaAltro : data.offerName,
        customerData: data.fiscalCode?.length === 16 && data.firstName && data.lastName
          ? { firstName: data.firstName, lastName: data.lastName, fiscalCode: data.fiscalCode, phone: data.phone || '', email: data.email || '', address: data.customerAddress || { street: '', number: '', zip: '', city: '', province: '' } }
          : undefined,
        mobileData: {
          gestoreNuovaLinea: data.gestoreNuovaLinea,
          gestoreNuovaLineaAltro: data.gestoreNuovaLineaAltro,
          offertaAltro: data.offertaAltro,
          dataAttivazione: data.dataAttivazione,
          noteGeneriche: data.noteGeneriche,
        },
      });
      setPracticeId(res.data.id);
      return res.data.id;
    }
    if (!practiceId) return null;

    switch (step.stepId) {
      case 'offer':
        await api.put(`/practices/${practiceId}/step`, {
          stepNumber,
          data: {
            offerName: data.offerName === 'ALTRO' ? data.offertaAltro : data.offerName,
            offerCode: data.offerName === 'ALTRO' ? data.offertaAltro : data.offerName,
            gestoreNuovaLinea: data.gestoreNuovaLinea,
            gestoreNuovaLineaAltro: data.gestoreNuovaLineaAltro,
            offertaAltro: data.offertaAltro,
            dataAttivazione: data.dataAttivazione,
            noteGeneriche: data.noteGeneriche,
            type: data.gestoreNuovaLinea === 'ALTRO' ? data.gestoreNuovaLineaAltro : data.gestoreNuovaLinea,
          },
        });
        break;
      case 'sellers':
        await api.put(`/practices/${practiceId}/step`, {
          stepNumber,
          data: { soldById: data.soldById, soldBy: data.soldBy, enteredById: data.enteredById, enteredBy: data.enteredBy },
        });
        break;
      case 'customer':
        await api.put(`/practices/${practiceId}/step`, {
          stepNumber,
          data: {
            customerData: {
              firstName: data.firstName,
              lastName: data.lastName,
              fiscalCode: data.fiscalCode,
              phone: data.phone,
              email: data.email || '',
              address: data.customerAddress,
            },
          },
        });
        break;
      case 'mnp':
        await api.put(`/practices/${practiceId}/step`, {
          stepNumber,
          data: {
            codiceFiscaleVecchiaLinea: data.codiceFiscaleVecchiaLinea,
            numeroDaPortare: data.numeroDaPortare,
            tipoLinea: data.tipoLinea,
            gestoreProvenienza: data.gestoreProvenienza,
            gestoreProvenienzaAltro: data.gestoreProvenienzaAltro,
            noteMnp: data.noteMnp,
          },
        });
        break;
      case 'payment':
        await api.put(`/practices/${practiceId}/step`, {
          stepNumber,
          data: {
            ibanCdc: data.ibanCdc,
            ricarica: data.ricarica,
            ricaricaAltro: data.ricaricaAltro,
            noteMetodoPagamento: data.noteMetodoPagamento,
          },
        });
        break;
      case 'timUnica':
        await api.put(`/practices/${practiceId}/step`, {
          stepNumber,
          data: {
            timUnica: data.timUnica,
            timUnicaAltro: data.timUnicaAltro,
            numeroReteFissaTimUnica: data.numeroReteFissaTimUnica,
            noteGeneriche: data.noteGeneriche,
            accordiCliente: data.accordiCliente,
            lavorazioniPostAttivazione: data.lavorazioniPostAttivazione,
          },
        });
        break;
      case 'summary':
        await api.put(`/practices/${practiceId}/step`, { stepNumber, data: { completed: true } });
        break;
    }
    return practiceId;
  };

  const advance = async (stepNumber: number) => {
    setLoading(true);
    try {
      await saveStep(stepNumber);
      if (!completedSteps.includes(stepNumber)) setCompletedSteps([...completedSteps, stepNumber]);
      if (stepNumber < totalSteps) setExpandedStep(stepNumber + 1);
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
      await saveStep(totalSteps);
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

  const isTim = (resolvedGestore || '').toUpperCase().includes('TIM');

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
          <p className="text-slate-400">Compila i {totalSteps} passaggi</p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Progresso</span>
            <span className="text-sm text-indigo-400">{completedSteps.length}/{totalSteps}</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-600 to-purple-600"
              initial={{ width: 0 }}
              animate={{ width: `${(completedSteps.length / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <div className="space-y-4">
          {steps.map((s) => {
            const maxCompleted = Math.max(...completedSteps, 0);
            const canAccess = s.id === 1 || completedSteps.includes(s.id) || s.id <= maxCompleted + 1;
            return (
              <PracticeStepCard
                key={s.id}
                id={s.id}
                total={totalSteps}
                title={s.title}
                icon={s.icon}
                isExpanded={expandedStep === s.id}
                isCompleted={completedSteps.includes(s.id)}
                canAccess={canAccess}
                onToggle={() => handleStepClick(s.id)}
              >
                {/* STEP 1: OFFERTA */}
                {s.stepId === 'offer' && (
                  <div className="space-y-4">
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
                              onClick={() => patch({
                                gestoreNuovaLinea: provider.key,
                                gestoreNuovaLineaAltro: undefined,
                                offerName: undefined,
                                timUnica: undefined,
                                timUnicaAltro: undefined,
                                numeroReteFissaTimUnica: undefined,
                              })}
                              className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${isSelected ? 'border-cyan-500 bg-cyan-600/20 shadow-lg shadow-cyan-500/10' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800'}`}
                              data-testid={`mobile-card-${provider.key}`}
                            >
                              <ProviderIcon provider={provider} />
                              <span className={`font-bold text-xs text-center leading-tight ${isSelected ? 'text-cyan-400' : 'text-slate-300'}`}>{provider.name}</span>
                              {isSelected && <CheckCircle className="w-4 h-4 text-cyan-400" />}
                            </motion.button>
                          );
                        })}
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => patch({
                            gestoreNuovaLinea: 'ALTRO',
                            gestoreNuovaLineaAltro: '',
                            offerName: undefined,
                            timUnica: undefined,
                            timUnicaAltro: undefined,
                            numeroReteFissaTimUnica: undefined,
                          })}
                          className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${data.gestoreNuovaLinea === 'ALTRO' ? 'border-cyan-500 bg-cyan-600/20 shadow-lg shadow-cyan-500/10' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800'}`}
                        >
                          <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center font-bold text-lg text-white">+</div>
                          <span className={`font-bold text-xs text-center ${data.gestoreNuovaLinea === 'ALTRO' ? 'text-cyan-400' : 'text-slate-300'}`}>Altro</span>
                          {data.gestoreNuovaLinea === 'ALTRO' && <CheckCircle className="w-4 h-4 text-cyan-400" />}
                        </motion.button>
                      </div>
                      {data.gestoreNuovaLinea === 'ALTRO' && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-3">
                          <input type="text" value={data.gestoreNuovaLineaAltro || ''} onChange={(e) => patch({ gestoreNuovaLineaAltro: e.target.value })} placeholder="Specifica gestore..." className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" data-testid="mobile-gestore-altro" />
                        </motion.div>
                      )}
                    </div>

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

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Data attivazione <span className="text-rose-400">*</span></label>
                      <input type="date" value={parseItalianDate(data.dataAttivazione)} onChange={(e) => patch({ dataAttivazione: formatDateToItalian(e.target.value) })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" data-testid="mobile-data-attivazione" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Note</label>
                      <textarea value={data.noteGeneriche || ''} onChange={(e) => patch({ noteGeneriche: e.target.value })} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" data-testid="mobile-note-step1" />
                    </div>
                    <WizardStepNav canAdvance={stepValid(1)} isLast={false} onAdvance={() => advance(1)} loading={loading} />
                  </div>
                )}

                {/* STEP 2: VENDITORI */}
                {s.stepId === 'sellers' && (
                  <div className="space-y-4">
                    <OperatorsDropdown label="Venduto da *" value={data.soldById} onChange={(id, name) => patch({ soldById: id, soldBy: name })} testId="mobile-soldby" />
                    <OperatorsDropdown label="Inserito da *" value={data.enteredById} onChange={(id, name) => patch({ enteredById: id, enteredBy: name })} testId="mobile-enteredby" />
                    <p className="text-xs text-slate-500">Se il nome non e presente nell&apos;elenco, contatta il responsabile per aggiungere l&apos;operatore in Team.</p>
                    <WizardStepNav canAdvance={stepValid(2)} isLast={false} onBack={() => setExpandedStep(1)} onAdvance={() => advance(2)} loading={loading} />
                  </div>
                )}

                {/* STEP 3: ANAGRAFICA CLIENTE */}
                {s.stepId === 'customer' && (
                  <div className="space-y-4">
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

                    {data.fiscalCode && !validateFiscalCode(data.fiscalCode) && (
                      <p className="text-rose-400 text-sm">Codice fiscale non valido</p>
                    )}
                    <WizardStepNav canAdvance={stepValid(3)} isLast={false} onBack={() => setExpandedStep(2)} onAdvance={() => advance(3)} loading={loading} />
                  </div>
                )}

                {/* STEP 4: NUMERO & MNP — TUTTO OPZIONALE */}
                {s.stepId === 'mnp' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Codice fiscale vecchia linea</label>
                      <input type="text" value={data.codiceFiscaleVecchiaLinea || ''} onChange={(e) => patch({ codiceFiscaleVecchiaLinea: e.target.value.toUpperCase() })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" data-testid="mobile-cf-vecchia-linea" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Numero da portare</label>
                      <p className="text-xs text-slate-500 mb-2">Se nuovo numero scrivere 0</p>
                      <input type="text" value={data.numeroDaPortare || ''} onChange={(e) => patch({ numeroDaPortare: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" data-testid="mobile-numero-portare" />
                    </div>
                    <SelectWithOther label="Tipo di linea" value={data.tipoLinea} otherValue="" onChange={(v) => patch({ tipoLinea: v })} onOtherChange={() => {}} options={TIPI_LINEA_MOBILE} testId="mobile-tipo-linea" />
                    <SelectWithOther label="Gestore di provenienza" value={data.gestoreProvenienza} otherValue={data.gestoreProvenienzaAltro} onChange={(v) => patch({ gestoreProvenienza: v })} onOtherChange={(v) => patch({ gestoreProvenienzaAltro: v })} options={GESTORI_MOBILE_PROVENIENZA as any} testId="mobile-gestore-provenienza" />
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Note MNP</label>
                      <textarea value={data.noteMnp || ''} onChange={(e) => patch({ noteMnp: e.target.value })} rows={3} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" />
                    </div>
                    <div className="rounded-xl p-3 bg-slate-950 border border-slate-800 flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-cyan-400" />
                      <div>
                        <p className="text-sm text-slate-500">Gestore selezionato allo Step 1</p>
                        <p className="text-sm font-bold text-slate-200">{data.gestoreNuovaLinea === 'ALTRO' ? data.gestoreNuovaLineaAltro : data.gestoreNuovaLinea}</p>
                      </div>
                    </div>
                    <WizardStepNav canAdvance={stepValid(4)} isLast={false} onBack={() => setExpandedStep(3)} onAdvance={() => advance(4)} loading={loading} />
                  </div>
                )}

                {/* STEP 5: PAGAMENTO / RICARICA */}
                {s.stepId === 'payment' && (
                  <div className="space-y-4">
                    <SelectWithOther label="Ricarica" required value={data.ricarica} otherValue={data.ricaricaAltro} onChange={(v) => patch({ ricarica: v })} onOtherChange={(v) => patch({ ricaricaAltro: v })} options={RICARICA_OPTIONS} testId="mobile-ricarica" />
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">IBAN / CDC</label>
                      <p className="text-xs text-slate-500 mb-2">Se ricaricabile non compilare</p>
                      <input type="text" value={data.ibanCdc || ''} onChange={(e) => patch({ ibanCdc: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" data-testid="mobile-iban" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Note metodo di pagamento</label>
                      <textarea value={data.noteMetodoPagamento || ''} onChange={(e) => patch({ noteMetodoPagamento: e.target.value })} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" />
                    </div>
                    <WizardStepNav canAdvance={stepValid(5)} isLast={false} onBack={() => setExpandedStep(4)} onAdvance={() => advance(5)} loading={loading} />
                  </div>
                )}

                {/* STEP 6: TIM UNICA — SOLO SE GESTORE È TIM */}
                {s.stepId === 'timUnica' && (
                  <div className="space-y-4">
                    <SelectWithOther label="TIM Unica" required value={data.timUnica} otherValue={data.timUnicaAltro} onChange={(v) => patch({ timUnica: v })} onOtherChange={(v) => patch({ timUnicaAltro: v })} options={TIM_UNICA_OPTIONS} testId="mobile-tim-unica" />
                    {(data.timUnica === 'AGGANCIATA' || data.timUnica === 'DA_AGGANCIARE') && (
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Numero rete fissa TIM Unica</label>
                        <input type="text" value={data.numeroReteFissaTimUnica || ''} onChange={(e) => patch({ numeroReteFissaTimUnica: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" />
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
                    <WizardStepNav canAdvance={stepValid(6)} isLast={false} onBack={() => setExpandedStep(5)} onAdvance={() => advance(6)} loading={loading} />
                  </div>
                )}

                {/* STEP FINALE: RIEPILOGO */}
                {s.stepId === 'summary' && (
                  <div className="space-y-4">
                    {/* Card Offerta */}
                    <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-6">
                      <h4 className="font-semibold text-indigo-400 mb-4 flex items-center gap-2">
                        <Buildings className="w-5 h-5" />
                        Dettaglio Offerta
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-start">
                          <span className="text-slate-400">Gestore:</span>
                          <span className="text-white text-right font-medium max-w-[60%]">
                            {data.gestoreNuovaLinea === 'ALTRO' ? data.gestoreNuovaLineaAltro : data.gestoreNuovaLinea}
                          </span>
                        </div>
                        <div className="flex justify-between items-start">
                          <span className="text-slate-400">Offerta:</span>
                          <span className="text-white text-right font-medium max-w-[60%]">
                            {data.offerName === 'ALTRO' ? data.offertaAltro : data.offerName}
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
                      </div>
                    </div>

                    {/* Card Numero & MNP */}
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                      <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <Phone className="w-5 h-5" />
                        Numero & MNP
                      </h4>
                      <div className="space-y-2 text-sm">
                        {data.codiceFiscaleVecchiaLinea && <div className="flex justify-between"><span className="text-slate-400">CF vecchia linea:</span><span className="text-white font-mono text-xs">{data.codiceFiscaleVecchiaLinea}</span></div>}
                        {data.numeroDaPortare !== undefined && data.numeroDaPortare !== '' && <div className="flex justify-between"><span className="text-slate-400">Numero da portare:</span><span className="text-white">{data.numeroDaPortare}</span></div>}
                        {data.tipoLinea && <div className="flex justify-between"><span className="text-slate-400">Tipo linea:</span><span className="text-white">{data.tipoLinea}</span></div>}
                        {data.gestoreProvenienza && <div className="flex justify-between"><span className="text-slate-400">Gestore provenienza:</span><span className="text-white">{data.gestoreProvenienza === 'ALTRO' ? data.gestoreProvenienzaAltro : data.gestoreProvenienza}</span></div>}
                        {data.noteMnp && <div><span className="text-slate-400">Note MNP:</span><p className="text-slate-300 mt-1">{data.noteMnp}</p></div>}
                      </div>
                    </div>

                    {/* Card Pagamento */}
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                      <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Pagamento & Ricarica
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-slate-400">Ricarica:</span><span className="text-white">{data.ricarica === 'ALTRO' ? data.ricaricaAltro : data.ricarica}</span></div>
                        {data.ibanCdc && <div className="flex justify-between"><span className="text-slate-400">IBAN / CDC:</span><span className="text-white font-mono text-xs">{data.ibanCdc}</span></div>}
                        {data.noteMetodoPagamento && <div><span className="text-slate-400">Note:</span><p className="text-slate-300 mt-1">{data.noteMetodoPagamento}</p></div>}
                      </div>
                    </div>

                    {/* Card TIM Unica — solo se TIM */}
                    {isTim && (data.timUnica && data.timUnica !== 'NO') && (
                      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
                        <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                          <DeviceMobile className="w-5 h-5" />
                          TIM Unica
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-slate-400">Stato:</span><span className="text-white">{data.timUnica === 'ALTRO' ? data.timUnicaAltro : data.timUnica}</span></div>
                          {data.numeroReteFissaTimUnica && <div className="flex justify-between"><span className="text-slate-400">Numero rete fissa:</span><span className="text-white">{data.numeroReteFissaTimUnica}</span></div>}
                        </div>
                      </div>
                    )}

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

                    <WizardStepNav canAdvance={stepValid(s.id)} isLast onBack={() => setExpandedStep(isTim ? 6 : 5)} onAdvance={submit} loading={loading} />
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