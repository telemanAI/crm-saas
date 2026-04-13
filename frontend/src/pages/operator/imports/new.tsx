import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  CaretDown, 
  CaretUp, 
  ArrowLeft, 
  ArrowRight,
  Buildings,
  User,
  MapPin,
  Phone,
  CreditCard,
  FileText,
  Package,
  TelevisionSimple,
  Warning as WarningIcon,
  Eye,
  CheckCircle,
  Warning,
  MagnifyingGlass,
  Calendar
} from 'phosphor-react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/stores/authStore';
import { usePracticeWizardStore, ADDITIONAL_PACKAGES } from '@/stores/practiceWizardStore';
import api from '@/lib/axios';
import OperatorLayout from '@/components/layout/OperatorLayout';

const validateFiscalCode = (cf: string): boolean => {
  if (!cf || cf.length !== 16) return false;
  cf = cf.toUpperCase();
  const regex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
  if (!regex.test(cf)) return false;
  
  const odds: { [key: string]: number } = {
    '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
    'A': 1, 'B': 0, 'C': 5, 'D': 7, 'E': 9, 'F': 13, 'G': 15, 'H': 17, 'I': 19, 'J': 21,
    'K': 2, 'L': 4, 'M': 18, 'N': 20, 'O': 11, 'P': 3, 'Q': 6, 'R': 8, 'S': 12, 'T': 14,
    'U': 16, 'V': 10, 'W': 22, 'X': 25, 'Y': 24, 'Z': 23
  };
  
  const evens: { [key: string]: number } = {
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8, 'J': 9,
    'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18, 'T': 19,
    'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25
  };
  
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const char = cf[i];
    if (i % 2 === 0) sum += odds[char] || 0;
    else sum += evens[char] || 0;
  }
  
  const controlChar = String.fromCharCode(65 + (sum % 26));
  return cf[15] === controlChar;
};

const validatePhone = (phone: string): boolean => {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\.\(\)]/g, '');
  const regex = /^(\+[0-9]{1,4}|00[0-9]{1,4})?[0-9]{6,15}$/;
  return regex.test(cleaned) && cleaned.replace(/\D/g, '').length >= 8;
};

const validateUUID = (uuid: string): boolean => {
  if (!uuid) return false;
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
};

const extractPrice = (priceStr: string): number => {
  if (!priceStr) return 0;
  const match = priceStr.match(/(\d+(?:[.,]\d+)?)/);
  return match ? parseFloat(match[1].replace(',', '.')) : 0;
};

// Funzione per determinare quali pacchetti sono già inclusi nell'offerta base
const getExcludedPackageIds = (offerName: string): string[] => {
  if (!offerName) return [];
  
  const upperOffer = offerName.toUpperCase();
  const excluded: string[] = [];
  
  // 1. Controlla keyword specifiche (hanno precedenza)
  const specificKeywords: { [key: string]: string[] } = {
    'NETFLIX PREMIUM': ['netflix-premium'],
    'NETFLIX STANDARD': ['netflix-standard'],
    'CINEMA': ['cinema'],
    'SPORT': ['sport'],
    'CALCIO': ['calcio'],
    'KIDS': ['kids'],
    'ULTRA HD': ['ultra-hd'],
    'UHD': ['ultra-hd'],
  };
  
  Object.entries(specificKeywords).forEach(([keyword, packageIds]) => {
    if (upperOffer.includes(keyword)) {
      excluded.push(...packageIds);
    }
  });
  
  // 2. Netflix base: solo se c'è NETFLIX ma NON c'è PREMIUM o STANDARD
  // (così se esce "NETFLIX STANDARD" non esclude anche il base)
  if (upperOffer.includes('NETFLIX') && 
      !upperOffer.includes('NETFLIX PREMIUM') && 
      !upperOffer.includes('NETFLIX STANDARD')) {
    excluded.push('netflix-base');
  }
  
  return [...new Set(excluded)];
};

interface CustomerSuggestion {
  id: string;
  fiscalCode: string;
  firstName: string;
  lastName: string;
  phonePrimary?: string;
  phone?: string;
  email?: string;
  address?: string;
}

interface WizardStep {
  id: number;
  stepId: string;
  title: string;
  icon: any;
}

function OperatorsDropdown({ label, value, onChange }: { label: string; value?: string; onChange: (id: string, name: string) => void }) {
  const [operators, setOperators] = useState<Array<{id: string; firstName: string; lastName: string}>>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuthStore();

  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const response = await api.get('/users/operators', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOperators(response.data);
      } catch (err) {
        console.error('Errore caricamento operatori:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOperators();
  }, [token]);

  if (loading) return <div className="text-slate-400">Caricamento...</div>;

  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => {
          const selected = operators.find(o => o.id === e.target.value);
          onChange(e.target.value, selected ? `${selected.firstName} ${selected.lastName}` : '');
        }}
        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      >
        <option value="">-- Seleziona --</option>
        {operators.map((op) => (
          <option key={op.id} value={op.id}>{op.firstName} {op.lastName}</option>
        ))}
      </select>
    </div>
  );
}

// Step base (fissi 1-3)
const baseSteps: WizardStep[] = [
  { id: 1, stepId: 'offer', title: 'Tipo & Offerta', icon: Buildings },
  { id: 2, stepId: 'sellers', title: 'Venditore', icon: User },
  { id: 3, stepId: 'customer', title: 'Anagrafica Cliente', icon: User },
];

// Funzione per generare steps dinamici
const getSteps = (offerName: string | undefined, enableWashStep: boolean, enableAdditionalPackages: boolean): WizardStep[] => {
  const upperOffer = offerName?.toUpperCase() || '';
  const hasSkyTv = upperOffer.includes('SKY TV');
  const hasSkyWifi = upperOffer.includes('SKY WIFI');
  
  // Identifica i casi
  const isSkyTvOnly = hasSkyTv && !hasSkyWifi;      // Caso 1: Solo decoder
  const isSkyWifiOnly = hasSkyWifi && !hasSkyTv;    // Caso 2: Solo internet
  // Caso 3: Combo (hasSkyTv && hasSkyWifi) -> tutti gli step
  // Caso 0: Nessuno dei due -> flusso normale
  
  let currentId = 4;
  const dynamicSteps: WizardStep[] = [...baseSteps];
  
  // Step 4: Pacchetti (solo se c'è SKY TV - Caso 1 e 3)
  if (hasSkyTv && enableAdditionalPackages) {
    dynamicSteps.push({ id: currentId++, stepId: 'packages', title: 'Pacchetti Aggiuntivi', icon: Package });
  }
  
  // Step WASH (se abilitato: sempre per SKY TV, solo se abilitato per SKY WIFI)
  if (enableWashStep && (hasSkyTv || isSkyWifiOnly)) {
    dynamicSteps.push({ id: currentId++, stepId: 'wash', title: 'WASH', icon: TelevisionSimple });
  }
  
  // Step Linee (solo se c'è WIFI - Caso 0, 2, 3. NON Caso 1)
  if (!isSkyTvOnly) {
    dynamicSteps.push({ id: currentId++, stepId: 'line-new', title: 'Nuova Linea', icon: MapPin });
    dynamicSteps.push({ id: currentId++, stepId: 'line-old', title: 'Dati Vecchia Linea', icon: Phone });
  }
  
  // Step finali comuni (rinominati e con stepId univoci)
  dynamicSteps.push({ id: currentId++, stepId: 'payment', title: 'Metodo di Pagamento', icon: CreditCard });
  dynamicSteps.push({ id: currentId++, stepId: 'privacy', title: 'Privacy', icon: FileText });
  dynamicSteps.push({ id: currentId++, stepId: 'appointment', title: 'Appuntamento Installazione', icon: Calendar });
  dynamicSteps.push({ id: currentId++, stepId: 'summary', title: 'Riepilogo', icon: Eye });
  
  return dynamicSteps;
};

const offersCatalog = {
  TIM: [
    { name: "TIM WIFI CASA+NETFLIX", canone: "€27,90", attivazione: "€39 (o€ FWA)", vincolo: "48 MESI", note: "CAUZIONE 99€", disattivazione: "5€ PER OGNI MESE RESIDUO", type: "consumer" },
    { name: "TIM WIFI CASA+NETFLIX+DISNEY", canone: "€31,90", attivazione: "€39 (o€ FWA)", vincolo: "48 MESI", note: "CAUZIONE 99€", disattivazione: "5€ PER OGNI MESE RESIDUO", type: "consumer" },
    { name: "TIM WIFI CASA+NETFLIX+DISNEY+PRIME", canone: "€33,90", attivazione: "€39 (o€ FWA)", vincolo: "48 MESI", note: "CAUZIONE 99€", disattivazione: "5€ PER OGNI MESE RESIDUO", type: "consumer" },
    { name: "TIM WIFI CASA IN CONVERGENZA", canone: "€24,90", attivazione: "€39 (o€ FWA)", vincolo: "48 MESI", note: "CAUZIONE 99€", disattivazione: "5€ PER OGNI MESE RESIDUO", type: "consumer" },
    { name: "TIM WIFI CASA DA PROPORR+TIM VISION XS", canone: "€24,90", attivazione: "€39 (o€ FWA)", vincolo: "48 MESI", note: "CAUZIONE 99€", disattivazione: "5€ PER OGNI MESE RESIDUO", type: "consumer" },
    { name: "TIM PREMIUM BASE (MODEM NON INCLUSO)", canone: "€25,90", attivazione: "0€", vincolo: "24 MESI", note: "", disattivazione: "10€ PER OGNI MESE RESIDUO", type: "consumer" },
    { name: "TIM WIFI SPECIAL CARTA GIOVANI (UNDER 35)", canone: "€21,90", attivazione: "€39", vincolo: "24 MESI", note: "CAUZIONE 99€", disattivazione: "10€ PER OGNI MESE RESIDUO", type: "consumer" },
    { name: "TIM FWA SECONDA CASA", canone: "€14,90", attivazione: "0€", vincolo: "48 MESI", note: "CAUZIONE 99€", disattivazione: "5€ PER OGNI MESE RESIDUO", type: "consumer" },
    { name: "TIM FIBRA SECONDA CASA", canone: "€22,90", attivazione: "0€", vincolo: "48 MESI", note: "CAUZIONE 99€", disattivazione: "5€ PER OGNI MESE RESIDUO", type: "consumer" },
    { name: "INTERNET UNLIMITED CASA START IN CONVERGENZA", canone: "€23,95", attivazione: "€0", vincolo: "NO VINCOLO", note: "ACCETTATA", disattivazione: "23€", type: "consumer" },
    { name: "INTERNET UNLIMITED CASA START", canone: "€27,95", attivazione: "€0", vincolo: "NO VINCOLO", note: "ACCETTATA", disattivazione: "23€", type: "consumer" },
    { name: "INTERNET UNLIMITED CASA PRO", canone: "€29,95", attivazione: "€0", vincolo: "NO VINCOLO", note: "MODEM WIFI 7 INCLUSO", disattivazione: "23€", type: "consumer" },
    { name: "INTERNET UNLIMITED CASA ULTRA", canone: "€36,95", attivazione: "€0", vincolo: "NO VINCOLO", note: "MODEM WIFI 7+EXTENDER INCLUSO", disattivazione: "23€", type: "consumer" }
  ],
  Vodafone: [
    { name: "INTERNET UNLIMITED CASA START IN CONVERGENZA", canone: "€23,95", attivazione: "€0", vincolo: "NO VINCOLO", note: "ACCETTATA", disattivazione: "23€", type: "consumer" },
    { name: "INTERNET UNLIMITED CASA START", canone: "€27,95", attivazione: "€0", vincolo: "NO VINCOLO", note: "ACCETTATA", disattivazione: "23€", type: "consumer" },
    { name: "INTERNET UNLIMITED CASA PRO", canone: "€29,95", attivazione: "€0", vincolo: "NO VINCOLO", note: "ACCETTATA", disattivazione: "23€", type: "consumer" },
    { name: "INTERNET UNLIMITED CASA ULTRA", canone: "€36,95", attivazione: "€0", vincolo: "NO VINCOLO", note: "ACCETTATA", disattivazione: "23€", type: "consumer" },
    { name: "CASA FWA", canone: "€24,95", attivazione: "€0", vincolo: "NO VINCOLO", note: "ACCETTATA", disattivazione: "23€", type: "consumer" },
    { name: "CASA FWA START IN CONVERGENZA", canone: "€23,95", attivazione: "€0", vincolo: "NO VINCOLO", note: "ACCETTATA", disattivazione: "23€", type: "consumer" },
    { name: "CASA FWA START", canone: "€27,95", attivazione: "€0", vincolo: "NO VINCOLO", note: "ACCETTATA", disattivazione: "23€", type: "consumer" },
    { name: "CASA FWA PRO", canone: "€29,95", attivazione: "€0", vincolo: "NO VINCOLO", note: "ACCETTATA", disattivazione: "23€", type: "consumer" }
  ],
  WindTre: [
    { name: "CONVERGENZA SPECIAL FWA", canone: "€19,99 DOPO 12 MESI €23,99", attivazione: "€0", vincolo: "48 MESI", note: "SIM €7,99 AL MESE CON TUTTO ILLIMITATO (100GB FULL SPEED)", disattivazione: "RATE RESIDUE MODEM+ANTENNA", type: "consumer" },
    { name: "CONVERGENZA SPECIAL FTTH", canone: "€19,99 DOPO 12 MESI €23,99", attivazione: "€1,99 PER 24 MESI", vincolo: "48 MESI", note: "SIM €7,99 AL MESE CON TUTTO ILLIMITATO (100GB FULL SPEED)", disattivazione: "RATE RESIDUE MODEM", type: "consumer" },
    { name: "SUPER FIBRA", canone: "€28,99", attivazione: "€1,99 PER 24 MESI", vincolo: "48 MESI", note: "", disattivazione: "RATE RESIDUE MODEM", type: "consumer" }
  ],
  Iliad: [
    { name: "ILIAD FIBRA SUPER", canone: "€34,99", attivazione: "€39 (DA PAGARE IN NEGOZIO)", vincolo: "NO VINCOLO", note: "ACCETTATA", disattivazione: "€25,99", type: "consumer" },
    { name: "ILIAD FIBRA SUPER CON 2 RIPETITORI INCLUSI E MODEM 4G CON 350GB INCLUSI (IN CONVERGENZA)", canone: "€29,99", attivazione: "€39 (DA PAGARE IN NEGOZIO)", vincolo: "NO VINCOLO", note: "SOLO CON SIM DA ALMENO €9,99 DOMICILIATA", disattivazione: "€25,99", type: "consumer" },
    { name: "ILIAD FIBRA", canone: "€26,99", attivazione: "€39 (DA PAGARE IN NEGOZIO)", vincolo: "NO VINCOLO", note: "ACCETTATA", disattivazione: "€25,99", type: "consumer" },
    { name: "ILIAD FIBRA (IN CONVERGENZA CON OFFERTA DOMICILIATA)", canone: "€22,99", attivazione: "€39 (DA PAGARE IN NEGOZIO)", vincolo: "NO VINCOLO", note: "SOLO CON SIM DA ALMENO €9,99 DOMICILIATA", disattivazione: "€25,99", type: "consumer" }
  ],
  Optima: [
    { name: "SUPER CASA SMART IN CONVERGENZA LUCE/GAS", canone: "€23,95 DOPO 12 MESI €13,95", attivazione: "€29,90 FTTC/FTTH €70 FWA", vincolo: "NO VINCOLO", note: "MODEM 3,95", disattivazione: "29,9 SE DISATTIVA ENTRO 12 MESI, DOPO 0€", type: "consumer" },
    { name: "SUPER CONNESSI CONVERGENZA CON SIM", canone: "€31,90", attivazione: "€39,90 FTTC/FTTH €70 FWA", vincolo: "NO VINCOLO", note: "MODEM INCLUSO NO RATA", disattivazione: "29,9 SE DISATTIVA ENTRO 12 MESI, DOPO 0€", type: "consumer" },
    { name: "SUPER IMPRESA SMART IN CONVERGENZA LUCE/GAS", canone: "23,95+IVA DOPO 12 MESI 3,95 SOLO RATA MODEM", attivazione: "€39,90 FTTC/FTTH €70 FWA", vincolo: "NO VINCOLO", note: "MODEM 3,95", disattivazione: "29,9 SE DISATTIVA ENTRO 12 MESI, DOPO 0€", type: "business" },
    { name: "SUPER CONNESSI BUSINESS", canone: "26,9+ IVA", attivazione: "€39,90 FTTC/FTTH €70 FWA", vincolo: "NO VINCOLO", note: "MODEM INCLUSO NO RATA", disattivazione: "29,9 SE DISATTIVA ENTRO 12 MESI, DOPO 0€", type: "business" }
  ],
  Iren: [
    { name: "IREN CONNECT YOU IN CONVERGENZA CON LUCE", canone: "€18,99 DOPO 12 MESI €20,99", attivazione: "€49", vincolo: "VINCOLO 24 MESI", note: "NO LINEA VOCE SOLO DATI - DA INSERIRE CONTESTUALMENTE CON SEV FULL ENERGY LUCE", disattivazione: "€27,90 + €5,9 PER OGNI MESE RESIDUO", type: "consumer" }
  ],
  SKY: [
    { name: "SKY WIFI CON CONSEGNA HUB (OPEN FIBER)", canone: "€27,90 PER 18 MESI", attivazione: "0€", vincolo: "18 MESI", note: "", disattivazione: "0€ A 18 MESI", scadenza: "31/1", type: "consumer" },
    { name: "SKY WIFI + SKY TV", canone: "€29,90 PER 18 MESI", attivazione: "19€", vincolo: "18 MESI", note: "", disattivazione: "0€ A 18 MESI", scadenza: "31/1", type: "consumer" },
    { name: "SKY WIFI + SKY TV + NETFLIX", canone: "€34,90 PER 18 MESI", attivazione: "19€", vincolo: "18 MESI", note: "", disattivazione: "0€ A 18 MESI", scadenza: "31/1", type: "consumer" },
    { name: "SKY TV + CINEMA + UHD", canone: "€35,80 PER 18 MESI", attivazione: "19€", vincolo: "18 MESI", note: "", disattivazione: "0€ A 18 MESI", scadenza: "31/1", type: "consumer" },
    { name: "SKY TV + SPORT + UHD", canone: "€35,80 PER 18 MESI", attivazione: "19€", vincolo: "18 MESI", note: "", disattivazione: "0€ A 18 MESI", scadenza: "31/1", type: "consumer" },
    { name: "SKY TV + CALCIO", canone: "€29,90 PER 18 MESI", attivazione: "19€", vincolo: "18 MESI", note: "", disattivazione: "0€ A 18 MESI", scadenza: "31/1", type: "consumer" },
    { name: "SKY TV + NETFLIX + CINEMA", canone: "€19,90 PER 18 MESI", attivazione: "19€", vincolo: "18 MESI", note: "", disattivazione: "0€ A 18 MESI", scadenza: "15/2", type: "consumer" },
    { name: "SKY WIFI CON SPEDIZIONE HUB (FASTWEB)", canone: "€24,50", attivazione: "29€", vincolo: "NESSUN VINCOLO", note: "NESSUN AUMENTO", disattivazione: "22€", scadenza: "31/1", type: "consumer" },
    { name: "SKY WIFI BUSINESS CON CONSEGNA HUB (OPEN FIBER)", canone: "€21,50 PER 12 MESI DOPO €28,60", attivazione: "0€", vincolo: "NESSUN VINCOLO", note: "DOPO 12 MESI €28,60", disattivazione: "22€", scadenza: "31/1", type: "business" }
  ]
};

export default function NewPractice() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { data, setData, currentStep, setStep, reset, practiceId, setPracticeId } = usePracticeWizardStore();
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedStep, setExpandedStep] = useState(1);
  const [checkingDrafts, setCheckingDrafts] = useState(true);
  const [lockedCustomer, setLockedCustomer] = useState<CustomerSuggestion | null>(null);
  
  const [cfSuggestions, setCfSuggestions] = useState<CustomerSuggestion[]>([]);
  const [phoneSuggestions, setPhoneSuggestions] = useState<CustomerSuggestion[]>([]);
  const [nameSuggestions, setNameSuggestions] = useState<CustomerSuggestion[]>([]);
  const [showCfSuggestions, setShowCfSuggestions] = useState(false);
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [isSearchingCf, setIsSearchingCf] = useState(false);
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);
  const [isSearchingName, setIsSearchingName] = useState(false);
  const [cfOldLineSuggestions, setCfOldLineSuggestions] = useState<CustomerSuggestion[]>([]);
  const [showBusinessOnly, setShowBusinessOnly] = useState(false);
  const [dbOffers, setDbOffers] = useState<Record<string, any[]> | null>(null);
  const [tenantConfig, setTenantConfig] = useState({ enableWashStep: false, enableAdditionalPackages: true });
  
  // Carica configurazione tenant
  useEffect(() => {
    const loadTenantConfig = async () => {
      try {
        const { user } = useAuthStore.getState();
        if (user?.tenantId) {
          const response = await api.get(`/tenants/${user.tenantId}/config`);
          setTenantConfig(response.data);
        }
      } catch (err) {
        console.log('Usando config default');
      }
    };
    loadTenantConfig();
  }, []);
  
  // Steps dinamici basati su offerta e config
  const steps = getSteps(data.offerName, tenantConfig.enableWashStep, tenantConfig.enableAdditionalPackages);
  const totalSteps = steps.length;
  
  // Sincronizza pacchetti quando cambia l'offerta (rimuove dai selezionati quelli ora inclusi nell'offerta base)
  useEffect(() => {
    if (!data.offerName || !data.additionalPackages?.selectedIds) return;
    
    const excludedIds = getExcludedPackageIds(data.offerName);
    const currentSelected = data.additionalPackages.selectedIds;
    
    // Rimuovi dai selezionati quelli che sono ora esclusi (inclusi nell'offerta base)
    const validSelected = currentSelected.filter(id => !excludedIds.includes(id));
    
    // Se c'era qualcosa di selezionato che ora è escluso, aggiorna
    if (validSelected.length !== currentSelected.length) {
      const totalPrice = validSelected.reduce((sum, id) => {
        const pkg = ADDITIONAL_PACKAGES.find(p => p.id === id);
        return sum + (pkg?.price || 0);
      }, 0);
      
      setData({
        additionalPackages: {
          selectedIds: validSelected.length > 0 ? validSelected : ['none'],
          totalPrice
        }
      });
    }
  }, [data.offerName]);

  useEffect(() => {
    const searchOldLineCF = async () => {
      const cf = data.fiscalCodeOldLine;
      if (!cf || cf.length < 3 || cf === data.fiscalCode) {
        setCfOldLineSuggestions([]);
        return;
      }
      
      try {
        const response = await api.get(`/customers/search/by-fiscal-code?code=${cf}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCfOldLineSuggestions(response.data || []);
      } catch (err) {
        setCfOldLineSuggestions([]);
      }
    };

    const timeoutId = setTimeout(searchOldLineCF, 300);
    return () => clearTimeout(timeoutId);
  }, [data.fiscalCodeOldLine, token, data.fiscalCode]);
  
  // Carica offerte dal database
  useEffect(() => {
    const loadOffers = async () => {
      try {
        const response = await api.get('/offers/grouped');
        setDbOffers(response.data);
      } catch (err) {
        console.log('Fallback a offerte locali');
      }
    };
    loadOffers();
  }, []);

  // Usa offerte DB se disponibili, altrimenti fallback a hardcoded
  const activeOffersCatalog = dbOffers || offersCatalog;
 
  const isLastStep = (stepId: number) => stepId === totalSteps;

  useEffect(() => {
    const handleRouteChange = () => {
      const { edit } = router.query;
      
      if (edit && typeof edit === 'string' && token) {
        loadPracticeData(edit);
      } else if (!edit && router.isReady) {
        if (practiceId || completedSteps.length > 0 || data.type) {
          reset();
          setCompletedSteps([]);
          setExpandedStep(1);
          setStep(1);
          setPracticeId(null);
        }
        setCheckingDrafts(false);
      }
    };

    if (token && router.isReady) {
      handleRouteChange();
    }
  }, [router.query, router.isReady, token, reset, setStep, setPracticeId]);

  const loadPracticeData = async (id: string) => {
    try {
      const response = await api.get(`/practices/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const practice = response.data;
      
      setData({
        type: practice.type,
        offerCode: practice.offerCode,
        offerName: practice.offerName,
        soldById: practice.soldById,
        soldBy: practice.soldBy,
        enteredById: practice.enteredById,
        enteredBy: practice.enteredBy,
        firstName: practice.customerSnapshot?.firstName,
        lastName: practice.customerSnapshot?.lastName,
        fiscalCode: practice.customer?.fiscalCode || practice.customerSnapshot?.fiscalCode,
        phone: practice.customerSnapshot?.phonePrimary || practice.customerSnapshot?.phone,
        email: practice.customerSnapshot?.email,
        notes: practice.notes,
        offerCanone: practice.offerCanone,
        offerAttivazione: practice.offerAttivazione,
        offerVincolo: practice.offerVincolo,
        offerNote: practice.offerNote,
        offerDisattivazione: practice.offerDisattivazione,
        offerType: practice.offerType,
        offerScadenza: practice.offerScadenza,
        lineType: practice.lineType,
        installationAddress: practice.installationAddress,
        technology: practice.technology,
        oldPhoneNumber: practice.oldLineData?.oldPhoneNumber,
        migrationCode: practice.oldLineData?.migrationCode,
        iban: practice.paymentMethod?.iban,
        postePay: practice.paymentMethod?.postePay,
        bollettino: practice.paymentMethod?.bollettino,
        gdprConsent: practice.privacyData?.gdprConsent || false,
        privacyMarketing: practice.privacyData?.marketingConsent || false,
        gestore: practice.oldLineData?.gestore,
        gestoreAltro: practice.oldLineData?.gestoreAltro,
        fiscalCodeOldLine: practice.oldLineData?.fiscalCodeOldLine,
        prodottiRestituire: practice.oldLineData?.prodottiRestituire,
        oldLineNotes: practice.oldLineData?.notes,
        newLineNotes: practice.newLineNotes,
        appointmentData: practice.appointmentData?.data,
        appointmentOra: practice.appointmentData?.ora,
        appointmentOraFine: practice.appointmentData?.oraFine,
        appointmentAccordi: practice.appointmentData?.accordi,
        appointmentLavorazioni: practice.appointmentData?.lavorazioniPost,
        ragioneSociale: practice.customerSnapshot?.ragioneSociale,
        partitaIva: practice.customerSnapshot?.partitaIva,
        formaGiuridica: practice.customerSnapshot?.formaGiuridica,
        sedeLegale: practice.customerSnapshot?.sedeLegale,
        codiceRea: practice.customerSnapshot?.codiceRea,
        pec: practice.customerSnapshot?.pec,
        additionalPackages: practice.additionalPackages,
        washConfig: practice.washConfig,
        convergenza: practice.convergenza,
        lavorazioniPostAttivazione: practice.lavorazioniPostAttivazione,
      });
      
      if (practice.offerType === 'business') {
        setShowBusinessOnly(true);
      }
      
      const stepsFromBackend = practice.completedSteps || [];
      setCompletedSteps(stepsFromBackend);
      setPracticeId(practice.id);
      
      const nextStep = Math.max(...stepsFromBackend, 0) + 1;
      setExpandedStep(Math.min(nextStep, totalSteps));
      setStep(Math.min(nextStep, totalSteps));
      
      setCheckingDrafts(false);
    } catch (err) {
      console.error('Errore caricamento:', err);
      alert('Errore nel caricamento della pratica');
      router.push('/operator/practices');
    }
  };

  useEffect(() => {
    const searchFiscalCode = async () => {
      // Se abbiamo un cliente bloccato e il CF corrisponde esattamente, non cercare
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
        const response = await api.get(`/customers/search/by-fiscal-code?code=${data.fiscalCode}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCfSuggestions(response.data);
        setShowCfSuggestions(response.data.length > 0);
      } catch (err) {
        console.error('Errore ricerca CF:', err);
      } finally {
        setIsSearchingCf(false);
      }
    };

    const timeoutId = setTimeout(searchFiscalCode, 300);
    return () => clearTimeout(timeoutId);
  }, [data.fiscalCode, token, lockedCustomer]);

  useEffect(() => {
    const searchPhone = async () => {
      // Se abbiamo un cliente bloccato e il telefono corrisponde esattamente, non cercare
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
        const response = await api.get(`/customers/search/by-phone?q=${data.phone}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPhoneSuggestions(response.data);
        setShowPhoneSuggestions(response.data.length > 0);
      } catch (err) {
        console.error('Errore ricerca telefono:', err);
      } finally {
        setIsSearchingPhone(false);
      }
    };

    const timeoutId = setTimeout(searchPhone, 300);
    return () => clearTimeout(timeoutId);
  }, [data.phone, token, lockedCustomer]);

  useEffect(() => {
    const searchName = async () => {
      const searchTerm = `${data.firstName || ''} ${data.lastName || ''}`.trim();
      const lockedName = lockedCustomer ? `${lockedCustomer.firstName} ${lockedCustomer.lastName}`.trim() : '';
      
      // Se abbiamo un cliente bloccato e il nome completo corrisponde esattamente, non cercare
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
        const response = await api.get(`/customers/search/by-name?q=${searchTerm}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNameSuggestions(response.data);
        setShowNameSuggestions(response.data.length > 0);
      } catch (err) {
        console.error('Errore ricerca nome:', err);
      } finally {
        setIsSearchingName(false);
      }
    };

    const timeoutId = setTimeout(searchName, 300);
    return () => clearTimeout(timeoutId);
  }, [data.firstName, data.lastName, token, lockedCustomer]);

  const handleSelectCustomer = (customer: CustomerSuggestion) => {
    setData({
      fiscalCode: customer.fiscalCode,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phonePrimary || customer.phone || '',
      email: customer.email || '',
      installationAddress: customer.address ? { street: customer.address } : data.installationAddress
    });
    setShowCfSuggestions(false);
    setShowPhoneSuggestions(false);
    setShowNameSuggestions(false);
    setCfSuggestions([]);
    setPhoneSuggestions([]);
    setNameSuggestions([]);
    setLockedCustomer(customer); // Blocca i suggerimenti per questo cliente
  };

  const saveStep = async (stepNumber: number) => {
    try {
      if (stepNumber === 1 && !practiceId) {
        const response = await api.post('/practices', {
          type: data.type,
          offerCode: data.offerCode,
          offerName: data.offerName,
          offerCanone: data.offerCanone,
          offerAttivazione: data.offerAttivazione,
          offerVincolo: data.offerVincolo,
          offerNote: data.offerNote,
          offerDisattivazione: data.offerDisattivazione,
          offerType: data.offerType,
          offerScadenza: data.offerScadenza,
          soldById: data.soldById,
          soldBy: data.soldBy,
          enteredById: data.enteredById,
          enteredBy: data.enteredBy,
          customerData: {
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            fiscalCode: data.fiscalCode || '',
            phone: data.phone || '',
            email: data.email || '',
            ragioneSociale: data.ragioneSociale,
            partitaIva: data.partitaIva,
            formaGiuridica: data.formaGiuridica,
            sedeLegale: data.sedeLegale,
            codiceRea: data.codiceRea,
            pec: data.pec,
          }
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!response.data.id) {
          throw new Error('Server non ha restituito ID');
        }
        
        setPracticeId(response.data.id);
        return response.data.id;
      } else if (practiceId) {
        const stepData = getStepData(stepNumber);
        await api.put(`/practices/${practiceId}/step`, {
          stepNumber: stepNumber,
          data: stepData
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        return practiceId;
      }
    } catch (err: any) {
      console.error('Errore salvataggio:', err);
      const message = err.response?.data?.message || err.message || 'Errore sconosciuto';
      
      if (message.includes('soldById') || message.includes('enteredById')) {
        alert('Errore: Seleziona entrambi i venditori (Step 2)');
      } else {
        alert('Errore salvataggio: ' + message);
      }
      throw err;
    }
  };

  const getStepData = (stepNumber: number) => {
    const step = steps.find(s => s.id === stepNumber);
    const stepId = step?.stepId;
    
    switch (stepId) {
      case 'sellers': 
        return { soldById: data.soldById, soldBy: data.soldBy, enteredById: data.enteredById, enteredBy: data.enteredBy };
      case 'customer': 
        return { 
          customerData: { 
            firstName: data.firstName, lastName: data.lastName, fiscalCode: data.fiscalCode, 
            phone: data.phone, email: data.email,
            ragioneSociale: data.ragioneSociale, partitaIva: data.partitaIva, formaGiuridica: data.formaGiuridica,
            sedeLegale: data.sedeLegale, codiceRea: data.codiceRea, pec: data.pec,
          }, 
          notes: data.notes 
        };
      case 'packages': 
        return { additionalPackages: data.additionalPackages };
      case 'wash':
        return { washConfig: data.washConfig };
      case 'line-new': 
        return { 
          lineType: data.lineType, 
          installationAddress: data.installationAddress, 
          technology: data.technology, 
          notes: data.newLineNotes,
          convergenza: data.convergenza,
          lavorazioniPostAttivazione: data.lavorazioniPostAttivazione,
        };
      case 'line-old': 
        return { 
          oldLineData: data.lineType === 'MIGRAZIONE' ? { 
            oldPhoneNumber: data.oldPhoneNumber, migrationCode: data.migrationCode,
            gestore: data.gestore, gestoreAltro: data.gestoreAltro, fiscalCodeOldLine: data.fiscalCodeOldLine,
            prodottiRestituire: data.prodottiRestituire, notes: data.oldLineNotes
          } : {} 
        };
      case 'payment': 
        return { paymentMethod: { iban: data.iban, postePay: data.postePay, bollettino: data.bollettino } };
      case 'privacy': 
        return { gdprConsent: data.gdprConsent, marketingConsent: data.privacyMarketing };
      case 'appointment': 
        return { 
          data: data.appointmentData, 
          ora: data.appointmentOra, 
          oraFine: data.appointmentOraFine, 
          accordi: data.appointmentAccordi, 
          lavorazioniPost: data.lavorazioniPostAttivazione,
        };
      case 'summary': 
        return { completed: true };
      default: 
        return {};
    }
  };

  const handleStepComplete = async (stepId: number) => {
    try {
      await saveStep(stepId);

      if (!completedSteps.includes(stepId)) {
        setCompletedSteps([...completedSteps, stepId]);
      }
      
      if (!isLastStep(stepId)) {
        setExpandedStep(stepId + 1);
        setStep(stepId + 1);
      }
    } catch (err) {
      console.error('Blocco avanzamento');
    }
  };

  const handleStepClick = (stepId: number) => {
    const maxCompleted = Math.max(...completedSteps, 0);
    const canAccess = completedSteps.includes(stepId) || stepId === 1 || stepId <= maxCompleted + 1;
    
    if (canAccess) {
      setExpandedStep(stepId);
      setStep(stepId);
    }
  };

  const handleSubmit = async () => {
    if (!practiceId) {
      alert('Errore: ID pratica mancante');
      return;
    }
    
    setLoading(true);
    try {
      await api.put(`/practices/${practiceId}/step`, {
        stepNumber: steps.find(s => s.stepId === 'summary')?.id || totalSteps,
        data: { completed: true }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      await api.post(`/practices/${practiceId}/force-complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Pratica completata con successo!');
      reset();
      router.push('/operator/practices');
    } catch (err: any) {
      console.error('Errore finalizzazione:', err);
      alert('Errore: ' + (err.response?.data?.message || 'Errore sconosciuto'));
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = (stepId: number) => {
    const step = steps.find(s => s.id === stepId);
    if (!step) return false;
    
    switch (step.stepId) {
      case 'offer': 
        return data.type && data.offerCode && data.offerName;
      case 'sellers': 
        return data.soldById && data.enteredById && validateUUID(data.soldById) && validateUUID(data.enteredById);
      case 'customer': {
        const baseValid = data.firstName && data.lastName && data.fiscalCode && validateFiscalCode(data.fiscalCode) && data.phone && validatePhone(data.phone);
        if (!baseValid) return false;
        if (showBusinessOnly || data.offerType === 'business') {
          return !!(data.ragioneSociale && data.partitaIva && data.formaGiuridica && data.sedeLegale && data.pec);
        }
        return true;
      }
      case 'packages': 
        return data.additionalPackages?.selectedIds && data.additionalPackages.selectedIds.length > 0;
      case 'wash':
        if (!data.washConfig?.type) return false;
        if (data.washConfig.type === 'suspect') {
          return data.washConfig.suspectData?.clientCode && data.washConfig.suspectData.clientCode.length >= 5;
        }
        return true;
      case 'line-new': {
        const hasLineType = data.lineType && data.installationAddress?.street && data.technology;
        if (!hasLineType) return false;
        
        // 🔥 Validazione convergenza
        if (data.convergenza?.attiva) {
          if (data.convergenza.tipo === 'chiusa' && !data.convergenza.numero) {
            return false; // Blocca se "chiusa" senza numero
          }
          if (!data.convergenza.tipo) {
            return false; // Blocca se attiva ma nessun tipo selezionato
          }
        }
        return true;
      }
      case 'line-old': 
        return data.lineType === 'NUOVA' || (data.oldPhoneNumber && data.migrationCode && (data.gestore || data.gestoreAltro));
      case 'payment': 
        return data.iban || data.postePay || data.bollettino;
      case 'privacy': 
        return data.gdprConsent === true;
      case 'appointment':
        return true;
      case 'summary':
        return true;
      default: 
        return false;
    }
  };

  if (checkingDrafts) {
    return (
      <OperatorLayout title="Nuova Pratica">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      </OperatorLayout>
    );
  }

  return (
    <OperatorLayout title={practiceId ? "Modifica Pratica" : "Nuova Pratica"}>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {practiceId ? "Modifica Pratica" : "Nuova Pratica"}
          </h1>
          <p className="text-slate-400">
            {practiceId ? "Modifica i dati" : `Compila i ${totalSteps} passaggi`}
          </p>
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
          {steps.map((step) => {
            const Icon = step.icon;
            const isCompleted = completedSteps.includes(step.id);
            const isExpanded = expandedStep === step.id;
            const isValid = isStepValid(step.id);
            const maxCompleted = Math.max(...completedSteps, 0);
            const canAccess = completedSteps.includes(step.id) || step.id === 1 || step.id <= maxCompleted + 1;

            return (
              <motion.div
                key={step.id}
                className={`bg-slate-900/80 backdrop-blur-xl border rounded-2xl overflow-hidden transition-all ${
                  isExpanded ? 'border-indigo-600/50' : 'border-slate-800'
                } ${!canAccess ? 'opacity-50' : ''}`}
              >
                <button
                  onClick={() => handleStepClick(step.id)}
                  disabled={!canAccess}
                  className="w-full p-6 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isCompleted ? 'bg-emerald-600/20 text-emerald-400' :
                      isExpanded ? 'bg-indigo-600/20 text-indigo-400' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {isCompleted ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-500">Step {step.id}/{totalSteps}</span>
                        {isCompleted && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <h3 className={`font-semibold ${isExpanded ? 'text-white' : 'text-slate-300'}`}>
                        {step.title}
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isExpanded ? <CaretUp className="w-5 h-5 text-slate-400" /> : <CaretDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </button>

                <AnimatePresence mode="wait">
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-800"
                    >
                      <div className="p-6">
                        {step.stepId === 'offer' && (
                          <div className="space-y-6">
                            {/* Toggle Business */}
                            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                              <div>
                                <h3 className="text-white font-medium">Mostra solo offerte Business</h3>
                                <p className="text-slate-400 text-sm">Filtra per contratti aziendali</p>
                              </div>
                              <button
                                onClick={() => {
                                  const newValue = !showBusinessOnly;
                                  setShowBusinessOnly(newValue);
                                  if (data.offerType && ((newValue && data.offerType !== 'business') || (!newValue && data.offerType === 'business' && data.type))) {
                                    setData({ 
                                      type: undefined, 
                                      offerCode: '', 
                                      offerName: '',
                                      offerCanone: '',
                                      offerAttivazione: '',
                                      offerVincolo: '',
                                      offerNote: '',
                                      offerDisattivazione: '',
                                      offerType: undefined,
                                      offerScadenza: ''
                                    });
                                    // Reset step completati quando cambia filtro business
                                    setCompletedSteps([]);
                                  }
                                }}
                                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                                  showBusinessOnly ? 'bg-indigo-600' : 'bg-slate-600'
                                }`}
                              >
                                <span
                                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                                    showBusinessOnly ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Grid Gestori */}
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-3">Seleziona Gestore</label>
                              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                                {[
                                  { key: 'TIM_FIBRA', name: 'TIM', logo: '/logos/tim.png' },
                                  { key: 'VODAFONE', name: 'Vodafone', logo: '/logos/vodafone.png' },
                                  { key: 'WINDTRE', name: 'WindTre', logo: '/logos/windtre.png' },
                                  { key: 'ILIAD', name: 'Iliad', logo: '/logos/iliad.png' },
                                  { key: 'OPTIMA', name: 'Optima', logo: '/logos/optima.png' },
                                  { key: 'IREN', name: 'Iren', logo: '/logos/iren.png' },
                                  { key: 'SKY', name: 'SKY', logo: '/logos/sky.png' },
                                ].map((provider) => {
                                  const isSelected = data.type === provider.key;
                                  const hasOffers = activeOffersCatalog[provider.name as keyof typeof activeOffersCatalog]?.some(o => 
                                    showBusinessOnly ? o.type === 'business' : o.type === 'consumer'
                                  );
                                  
                                  return (
                                    <button
                                      key={provider.key}
                                      onClick={() => {
                                        if (!hasOffers) return;
                                        setData({ 
                                          type: provider.key as any, 
                                          offerCode: '', 
                                          offerName: '',
                                          offerCanone: '',
                                          offerAttivazione: '',
                                          offerVincolo: '',
                                          offerNote: '',
                                          offerDisattivazione: '',
                                          offerType: undefined,
                                          offerScadenza: ''
                                        });
                                      }}
                                      disabled={!hasOffers}
                                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                                        isSelected 
                                          ? 'border-cyan-500 bg-cyan-600/20 text-cyan-400' 
                                          : hasOffers
                                            ? 'border-slate-700 text-slate-400 hover:border-slate-600 hover:bg-slate-800'
                                            : 'border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
                                      }`}
                                    >
                                      <img src={provider.logo} alt={provider.name} className="w-12 h-12 object-contain" />
                                      <span className="font-bold text-sm text-center leading-tight">{provider.name}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Dropdown Offerte */}
                            {data.type && (
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Seleziona Offerta {showBusinessOnly ? 'Business' : 'Consumer'}
                                  </label>
                                  <select
                                    value={data.offerCode || ''}
                                    onChange={(e) => {
                                      if (!data.type) return;
                                      const providerName = {
                                        'TIM_FIBRA': 'TIM',
                                        'VODAFONE': 'Vodafone',
                                        'WINDTRE': 'WindTre',
                                        'ILIAD': 'Iliad',
                                        'OPTIMA': 'Optima',
                                        'IREN': 'Iren',
                                        'SKY': 'SKY'
                                      }[data.type];
                                      
                                      const selectedOffer = activeOffersCatalog[providerName as keyof typeof activeOffersCatalog]
                                        ?.find(o => o.name === e.target.value);
                                      
                                      if (selectedOffer) {
                                        setData({ 
                                          offerCode: selectedOffer.name,
                                          offerName: selectedOffer.name,
                                          offerCanone: selectedOffer.canone,
                                          offerAttivazione: selectedOffer.attivazione,
                                          offerVincolo: selectedOffer.vincolo,
                                          offerNote: selectedOffer.note,
                                          offerDisattivazione: selectedOffer.disattivazione,
                                          offerType: selectedOffer.type as any,
                                          offerScadenza: (selectedOffer as any).scadenza || ''
                                        });
                                        // Reset step completati > 3 quando cambia offerta, mantieni 1,2,3
                                        setCompletedSteps(prev => prev.filter(s => s <= 3));
                                      }
                                    }}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                  >
                                    <option value="">-- Seleziona offerta --</option>
                                    {activeOffersCatalog[{
                                      'TIM_FIBRA': 'TIM',
                                      'VODAFONE': 'Vodafone',
                                      'WINDTRE': 'WindTre',
                                      'ILIAD': 'Iliad',
                                      'OPTIMA': 'Optima',
                                      'IREN': 'Iren',
                                      'SKY': 'SKY'
                                   }[data.type] as keyof typeof activeOffersCatalog]
                                      ?.filter(o => showBusinessOnly ? o.type === 'business' : o.type === 'consumer')
                                      ?.map((offer) => (
                                        <option key={offer.name} value={offer.name}>{offer.name} - {offer.canone}/mese</option>
                                      ))}
                                  </select>
                                </div>

                                {/* Card Riepilogo Offerta */}
                                {data.offerName && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-slate-900/80 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-6"
                                  >
                                    <div className="flex items-center gap-3 mb-4">
                                      <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                                        <CheckCircle className="w-5 h-5" />
                                      </div>
                                      <div>
                                        <h3 className="text-lg font-semibold text-white">{data.offerName}</h3>
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                          data.offerType === 'business' 
                                            ? 'bg-purple-600/20 text-purple-400' 
                                            : 'bg-blue-600/20 text-blue-400'
                                        }`}>
                                          {data.offerType === 'business' ? 'Business' : 'Consumer'}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                      <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800">
                                        <label className="text-xs text-slate-500 block mb-1">Canone Mensile</label>
                                        <p className="text-emerald-400 font-bold text-lg">{data.offerCanone || '-'}</p>
                                      </div>
                                      <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800">
                                        <label className="text-xs text-slate-500 block mb-1">Attivazione</label>
                                        <p className="text-white font-medium">{data.offerAttivazione || '-'}</p>
                                      </div>
                                      <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800">
                                        <label className="text-xs text-slate-500 block mb-1">Vincolo</label>
                                        <p className="text-amber-400 font-medium">{data.offerVincolo || '-'}</p>
                                      </div>
                                      <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800">
                                        <label className="text-xs text-slate-500 block mb-1">Disattivazione</label>
                                        <p className="text-rose-400 font-medium text-sm">{data.offerDisattivazione || '-'}</p>
                                      </div>
                                    </div>

                                    {(data.offerNote || data.offerScadenza) && (
                                      <div className="space-y-2">
                                        {data.offerScadenza && (
                                          <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            <span className="text-slate-300">Scadenza: <span className="text-amber-400">{data.offerScadenza}</span></span>
                                          </div>
                                        )}
                                        {data.offerNote && (
                                          <div className="bg-amber-900/20 border border-amber-600/30 rounded-xl p-3">
                                            <label className="text-xs text-amber-500 block mb-1">Note Importanti</label>
                                            <p className="text-slate-300 text-sm">{data.offerNote}</p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {step.stepId === 'sellers' && (
                          <div className="space-y-4">
                            <OperatorsDropdown 
                              label="Venduto Da *"
                              value={data.soldById}
                              onChange={(id, name) => setData({ soldById: id, soldBy: name })}
                            />
                            <OperatorsDropdown 
                              label="Inserito Da *"
                              value={data.enteredById}
                              onChange={(id, name) => setData({ enteredById: id, enteredBy: name })}
                            />
                            {(!data.soldById || !data.enteredById) && (
                              <p className="text-rose-400 text-sm">* Seleziona entrambi</p>
                            )}
                          </div>
                        )}

                        {step.stepId === 'customer' && (
                          <div className="space-y-4">
                            <div className="relative">
                              <label className="block text-sm font-medium text-slate-300 mb-2">
                                Codice Fiscale <span className="text-rose-500">*</span>
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={data.fiscalCode || ''}
                                  onChange={(e) => setData({ fiscalCode: e.target.value.toUpperCase().slice(0, 16) })}
                                  className={`w-full bg-slate-950 border rounded-xl px-4 py-3 text-slate-200 ${
                                    data.fiscalCode && !validateFiscalCode(data.fiscalCode) 
                                      ? 'border-rose-600' 
                                      : 'border-slate-700'
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
                                Telefono <span className="text-rose-500">*</span>
                              </label>
                              <div className="relative">
                                <input
                                  type="tel"
                                  value={data.phone || ''}
                                  onChange={(e) => setData({ phone: e.target.value })}
                                  className={`w-full bg-slate-950 border rounded-xl px-4 py-3 text-slate-200 ${
                                    data.phone && !validatePhone(data.phone) 
                                      ? 'border-rose-600' 
                                      : 'border-slate-700'
                                  }`}
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
                                <label className="block text-sm font-medium text-slate-300 mb-2">Nome</label>
                                <input 
                                  type="text" 
                                  value={data.firstName || ''} 
                                  onChange={(e) => setData({ firstName: e.target.value })} 
                                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" 
                                  placeholder="Mario"
                                />
                              </div>
                              <div className="relative">
                                <label className="block text-sm font-medium text-slate-300 mb-2">Cognome</label>
                                <input 
                                  type="text" 
                                  value={data.lastName || ''} 
                                  onChange={(e) => setData({ lastName: e.target.value })} 
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
                                onChange={(e) => setData({ email: e.target.value })} 
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" 
                                placeholder="email@esempio.com"
                              />
                            </div>

                            {/* Campi Business */}
                            {(showBusinessOnly || data.offerType === 'business') && (
                              <>
                                <div className="border-t border-slate-700 pt-4 mt-4">
                                  <h4 className="text-sm font-semibold text-indigo-400 mb-4">Dati Aziendali</h4>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Ragione Sociale <span className="text-rose-500">*</span>
                                  </label>
                                  <input 
                                    type="text" 
                                    value={data.ragioneSociale || ''} 
                                    onChange={(e) => setData({ ragioneSociale: e.target.value })} 
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" 
                                    placeholder="Nome Azienda"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                      Partita IVA <span className="text-rose-500">*</span>
                                    </label>
                                    <input 
                                      type="text" 
                                      value={data.partitaIva || ''} 
                                      onChange={(e) => setData({ partitaIva: e.target.value.toUpperCase().slice(0, 11) })} 
                                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" 
                                      placeholder="12345678901"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                      Forma Giuridica <span className="text-rose-500">*</span>
                                    </label>
                                    <select 
                                      value={data.formaGiuridica || ''} 
                                      onChange={(e) => setData({ formaGiuridica: e.target.value })} 
                                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                                    >
                                      <option value="">-- Seleziona --</option>
                                      <option value="SRL">Srl</option>
                                      <option value="SRLS">Srls</option>
                                      <option value="SPA">Spa</option>
                                      <option value="SAS">Sas</option>
                                      <option value="SNC">Snc</option>
                                      <option value="DITTA_INDIVIDUALE">Ditta Individuale</option>
                                      <option value="ALTRO">Altro</option>
                                    </select>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Sede Legale <span className="text-rose-500">*</span>
                                  </label>
                                  <input 
                                    type="text" 
                                    value={data.sedeLegale || ''} 
                                    onChange={(e) => setData({ sedeLegale: e.target.value })} 
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" 
                                    placeholder="Via Roma 1, 00100 Roma (RM)"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                      Codice REA
                                    </label>
                                    <input 
                                      type="text" 
                                      value={data.codiceRea || ''} 
                                      onChange={(e) => setData({ codiceRea: e.target.value })} 
                                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" 
                                      placeholder="RM-123456"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                      PEC <span className="text-rose-500">*</span>
                                    </label>
                                    <input 
                                      type="email" 
                                      value={data.pec || ''} 
                                      onChange={(e) => setData({ pec: e.target.value })} 
                                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" 
                                      placeholder="azienda@pec.it"
                                    />
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {step.stepId === 'packages' && (
                          <div className="space-y-6">
                            {/* Banner pacchetti già inclusi nell'offerta */}
                            {(() => {
                              const excludedIds = getExcludedPackageIds(data.offerName || '');
                              const includedPackages = ADDITIONAL_PACKAGES.filter(p => excludedIds.includes(p.id) && p.id !== 'none');
                              
                              if (includedPackages.length === 0) return null;
                              
                              return (
                                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                                    <span className="font-semibold text-emerald-400">Pacchetti inclusi nell'offerta base</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {includedPackages.map(pkg => (
                                      <span key={pkg.id} className="text-sm bg-emerald-600/20 text-emerald-300 px-3 py-1 rounded-full">
                                        {pkg.label}
                                      </span>
                                    ))}
                                  </div>
                                  <p className="text-xs text-emerald-300/70 mt-2">
                                    Questi pacchetti sono già inclusi nella tua offerta e non possono essere aggiunti separatamente.
                                  </p>
                                </div>
                              );
                            })()}

                            <div className="text-center mb-6">
                              <h3 className="text-lg font-semibold text-white mb-2">Seleziona i Pacchetti Aggiuntivi</h3>
                              <p className="text-slate-400 text-sm">
                                {(() => {
                                  const excludedCount = getExcludedPackageIds(data.offerName || '').length;
                                  return excludedCount > 0 
                                    ? `Sono stati nascosti ${excludedCount} pacchetto/i già inclusi nella tua offerta` 
                                    : 'Puoi combinare più pacchetti SKY. Netflix è esclusivo.';
                                })()}
                              </p>
                            </div>

                            <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-xl p-4 text-center">
                              <span className="text-slate-300">Totale Pacchetti Aggiuntivi: </span>
                              <span className="text-2xl font-bold text-indigo-400">
                                €{(data.additionalPackages?.totalPrice || 0).toFixed(2)}/mese
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {(() => {
                                const excludedIds = getExcludedPackageIds(data.offerName || '');
                                
                                return ADDITIONAL_PACKAGES
                                  .filter(pkg => !excludedIds.includes(pkg.id))
                                  .map((pkg) => {
                                    const isSelected = data.additionalPackages?.selectedIds?.includes(pkg.id);
                                    const isNone = pkg.id === 'none';
                                    const isNetflix = pkg.category === 'netflix';
                                    
                                    return (
                                      <button
                                        key={pkg.id}
                                        type="button"
                                        onClick={() => {
                                          const { togglePackage, setNoPackages } = usePracticeWizardStore.getState();
                                          if (isNone) {
                                            setNoPackages();
                                          } else {
                                            togglePackage(pkg.id);
                                          }
                                        }}
                                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                                          isSelected
                                            ? 'border-indigo-500 bg-indigo-600/20'
                                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                        } ${isNone ? 'col-span-full' : ''}`}
                                      >
                                        <div className="flex justify-between items-start">
                                          <div>
                                            <span className={`font-medium ${isSelected ? 'text-indigo-300' : 'text-slate-200'}`}>
                                              {pkg.label}
                                            </span>
                                            {isNetflix && (
                                              <span className="ml-2 text-xs bg-red-600/30 text-red-400 px-2 py-0.5 rounded">
                                                Netflix
                                              </span>
                                            )}
                                          </div>
                                          <span className={`font-bold ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`}>
                                            {pkg.price > 0 ? `€${pkg.price.toFixed(2)}` : 'Gratis'}
                                          </span>
                                        </div>
                                      </button>
                                    );
                                  });
                              })()}
                            </div>

                            {(!data.additionalPackages?.selectedIds || data.additionalPackages.selectedIds.length === 0) && (
                              <p className="text-amber-400 text-sm text-center">
                                ⚠️ Seleziona almeno un'opzione (anche "Nessun pacchetto")
                              </p>
                            )}
                          </div>
                        )}

                        {step.stepId === 'wash' && (
                          <div className="space-y-6">
                            <div className="text-center mb-6">
                              <h3 className="text-lg font-semibold text-white mb-2">Gestione WASH</h3>
                              <p className="text-slate-400 text-sm">Indica se si tratta di un Suspect WASH o No WASH</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <button
                                type="button"
                                onClick={() => {
                                  const { setWashConfig } = usePracticeWizardStore.getState();
                                  setWashConfig({ enabled: true, type: 'none', timestamp: new Date() });
                                }}
                                className={`p-6 rounded-xl border-2 transition-all text-center ${
                                  data.washConfig?.type === 'none'
                                    ? 'border-emerald-500 bg-emerald-600/20'
                                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                }`}
                              >
                                <CheckCircle className={`w-12 h-12 mx-auto mb-3 ${
                                  data.washConfig?.type === 'none' ? 'text-emerald-400' : 'text-slate-500'
                                }`} />
                                <span className={`font-semibold text-lg ${
                                  data.washConfig?.type === 'none' ? 'text-emerald-300' : 'text-slate-300'
                                }`}>
                                  NO WASH
                                </span>
                                <p className="text-slate-400 text-sm mt-2">Cliente nuovo o senza abbonamento attivo</p>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const { setWashConfig } = usePracticeWizardStore.getState();
                                  setWashConfig({ 
                                    enabled: true, 
                                    type: 'suspect', 
                                    suspectData: { clientCode: '', action: 'disattiva' },
                                    timestamp: new Date() 
                                  });
                                }}
                                className={`p-6 rounded-xl border-2 transition-all text-center ${
                                  data.washConfig?.type === 'suspect'
                                    ? 'border-amber-500 bg-amber-600/20'
                                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                }`}
                              >
                                <WarningIcon className={`w-12 h-12 mx-auto mb-3 ${
                                  data.washConfig?.type === 'suspect' ? 'text-amber-400' : 'text-slate-500'
                                }`} />
                                <span className={`font-semibold text-lg ${
                                  data.washConfig?.type === 'suspect' ? 'text-amber-300' : 'text-slate-300'
                                }`}>
                                  SUSPECT WASH
                                </span>
                                <p className="text-slate-400 text-sm mt-2">Cliente con abbonamento SKY esistente</p>
                              </button>
                            </div>

                            {data.washConfig?.type === 'suspect' && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="space-y-4 p-4 bg-amber-600/10 border border-amber-500/30 rounded-xl"
                              >
                                <div>
                                  <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Codice Cliente Sky / Codice Fiscale Cliente <span className="text-rose-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    value={data.washConfig?.suspectData?.clientCode || ''}
                                    onChange={(e) => {
                                      const { setWashConfig } = usePracticeWizardStore.getState();
                                      setWashConfig({
                                        ...data.washConfig!,
                                        suspectData: {
                                          ...data.washConfig!.suspectData!,
                                          clientCode: e.target.value.toUpperCase()
                                        }
                                      });
                                    }}
                                    placeholder="Es. 12345678 o RSSMRA..."
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                    maxLength={16}
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Gestione vecchio abbonamento <span className="text-rose-500">*</span>
                                  </label>
                                  <select
                                    value={data.washConfig?.suspectData?.action || 'disattiva'}
                                    onChange={(e) => {
                                      const { setWashConfig } = usePracticeWizardStore.getState();
                                      setWashConfig({
                                        ...data.washConfig!,
                                        suspectData: {
                                          ...data.washConfig!.suspectData!,
                                          action: e.target.value as 'disattiva' | 'mantieni'
                                        }
                                      });
                                    }}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                  >
                                    <option value="disattiva">Disattivare vecchio abbonamento</option>
                                    <option value="mantieni">Mantenere vecchio abbonamento SKY</option>
                                  </select>
                                </div>
                              </motion.div>
                            )}

                            {!data.washConfig?.type && (
                              <p className="text-amber-400 text-sm text-center">
                                ⚠️ Seleziona il tipo di WASH
                              </p>
                            )}
                            {data.washConfig?.type === 'suspect' && (!data.washConfig?.suspectData?.clientCode || data.washConfig.suspectData.clientCode.length < 5) && (
                              <p className="text-rose-400 text-sm text-center">
                                ⚠️ Inserisci il Codice Cliente/CF (minimo 5 caratteri)
                              </p>
                            )}
                          </div>
                        )}

                        {step.stepId === 'line-new' && (
                          <div className="space-y-6">
                            {/* Tipo Linea */}
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">Tipo Linea</label>
                              <div className="flex gap-4">
                                <button onClick={() => setData({ lineType: 'NUOVA' })} className={`flex-1 p-4 rounded-xl border-2 transition-all ${data.lineType === 'NUOVA' ? 'border-emerald-500 bg-emerald-600/10 text-emerald-400' : 'border-slate-700 text-slate-400'}`}>
                                  <div className="font-bold">Nuova Attivazione</div>
                                </button>
                                <button onClick={() => setData({ lineType: 'MIGRAZIONE' })} className={`flex-1 p-4 rounded-xl border-2 transition-all ${data.lineType === 'MIGRAZIONE' ? 'border-amber-500 bg-amber-600/10 text-amber-400' : 'border-slate-700 text-slate-400'}`}>
                                  <div className="font-bold">Migrazione</div>
                                </button>
                              </div>
                            </div>

                            {/* Indirizzo e Tecnologia */}
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">Indirizzo Installazione</label>
                              <input type="text" value={data.installationAddress?.street || ''} onChange={(e) => setData({ installationAddress: { ...data.installationAddress, street: e.target.value } })} placeholder="Via Roma 123, Milano" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">Tecnologia</label>
                              <div className="flex gap-2">
                                {['FTTH', 'FTTC', 'FWA'].map((tech) => (
                                  <button key={tech} onClick={() => setData({ technology: tech as any })} className={`px-4 py-2 rounded-xl border transition-all ${data.technology === tech ? 'border-indigo-500 bg-indigo-600/10 text-indigo-400' : 'border-slate-700 text-slate-400'}`}>{tech}</button>
                                ))}
                              </div>
                            </div>

                            {/* 🔥 SEZIONE CONVERGENZA */}
                            <div className="border-t border-slate-700 pt-6">
                              <div className="flex items-center gap-3 mb-4">
                                <input 
                                  type="checkbox" 
                                  id="convergenza"
                                  checked={data.convergenza?.attiva || false}
                                  onChange={(e) => {
                                    const isActive = e.target.checked;
                                    if (!isActive) {
                                      setData({ convergenza: { attiva: false, tipo: null, numero: undefined } });
                                    } else {
                                      setData({ convergenza: { attiva: true, tipo: null, numero: undefined } });
                                    }
                                  }}
                                  className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-indigo-600"
                                />
                                <label htmlFor="convergenza" className="text-white font-medium cursor-pointer">
                                  Convergenza
                                </label>
                              </div>

                              {data.convergenza?.attiva && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="space-y-4 pl-8 border-l-2 border-indigo-500/30"
                                >
                                  <div className="flex gap-4">
                                    <button
                                      onClick={() => {
                                        const { setConvergenza } = usePracticeWizardStore.getState();
                                        setConvergenza({ attiva: true, tipo: 'daChiudere', numero: undefined });
                                      }}
                                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                                        data.convergenza?.tipo === 'daChiudere' 
                                          ? 'border-amber-500 bg-amber-600/10 text-amber-400' 
                                          : 'border-slate-700 text-slate-400'
                                      }`}
                                    >
                                      <div className="font-bold mb-1">Da Chiudere</div>
                                      <div className="text-xs opacity-70">Inserirai il numero in seguito</div>
                                    </button>
                                    
                                    <button
                                      onClick={() => {
                                        const { setConvergenza } = usePracticeWizardStore.getState();
                                        setConvergenza({ attiva: true, tipo: 'chiusa', numero: '' });
                                      }}
                                      className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                                        data.convergenza?.tipo === 'chiusa' 
                                          ? 'border-emerald-500 bg-emerald-600/10 text-emerald-400' 
                                          : 'border-slate-700 text-slate-400'
                                      }`}
                                    >
                                      <div className="font-bold mb-1">Chiusa</div>
                                      <div className="text-xs opacity-70">Inserisci il numero ora</div>
                                    </button>
                                  </div>

                                  {/* Alert per Da Chiudere */}
                                  {data.convergenza?.tipo === 'daChiudere' && (
                                    <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                                      <Warning className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                      <div>
                                        <p className="text-amber-300 font-medium text-sm">Attenzione</p>
                                        <p className="text-amber-300/80 text-sm">
                                          Ricordati che per rendere la pratica in stato globale completa devi inserire il numero da convergere in seguito
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Input per Chiusa */}
                                  {data.convergenza?.tipo === 'chiusa' && (
                                    <div>
                                      <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Aggiungi numero con cui chiudere la convergenza <span className="text-rose-500">*</span>
                                      </label>
                                      <input 
                                        type="text"
                                        value={data.convergenza?.numero || ''}
                                        onChange={(e) => {
                                          const { setConvergenza } = usePracticeWizardStore.getState();
                                          // FIX: Aggiunto 'attiva' esplicitamente per soddisfare il tipo ConvergenzaConfig
                                          setConvergenza({ 
                                            ...data.convergenza, 
                                            numero: e.target.value,
                                            attiva: data.convergenza?.attiva ?? true
                                          });
                                        }}
                                        placeholder="Es. 3201234567 o codice cliente"
                                        className={`w-full bg-slate-950 border rounded-xl px-4 py-3 text-slate-200 ${
                                          !data.convergenza?.numero ? 'border-rose-600' : 'border-slate-700'
                                        }`}
                                      />
                                      {!data.convergenza?.numero && (
                                        <p className="text-rose-400 text-sm mt-2">⚠️ Inserisci il numero di convergenza per procedere</p>
                                      )}
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </div>

                            {/* 🔥 LAVORAZIONI POST ATTIVAZIONE (spostato dallo step 8) */}
                            <div className="border-t border-slate-700 pt-6">
                              <div className="flex items-center gap-3 mb-4">
                                <input 
                                  type="checkbox" 
                                  id="lavorazioniPost"
                                  checked={!!data.lavorazioniPostAttivazione}
                                  onChange={(e) => {
                                    if (!e.target.checked) {
                                      setData({ lavorazioniPostAttivazione: undefined });
                                    } else {
                                      setData({ lavorazioniPostAttivazione: '' });
                                    }
                                  }}
                                  className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-indigo-600"
                                />
                                <label htmlFor="lavorazioniPost" className="text-white font-medium cursor-pointer">
                                  Lavorazioni post attivazione
                                </label>
                              </div>

                              {!!data.lavorazioniPostAttivazione && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                >
                                  <textarea
                                    value={data.lavorazioniPostAttivazione}
                                    onChange={(e) => setData({ lavorazioniPostAttivazione: e.target.value })}
                                    rows={3}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                                    placeholder="Descrivi le lavorazioni da effettuare post attivazione..."
                                  />
                                </motion.div>
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">Note Nuova Linea</label>
                              <textarea
                                value={data.newLineNotes || ''}
                                onChange={(e) => setData({ newLineNotes: e.target.value })}
                                rows={3}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                                placeholder="Note aggiuntive..."
                              />
                            </div>
                          </div>
                        )}

                        {step.stepId === 'line-old' && (
                          <div className="space-y-4">
                            {data.lineType === 'NUOVA' ? (
                              <div className="text-center py-8">
                                <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                                <p className="text-slate-400">Nuova attivazione - nessun dato richiesto</p>
                              </div>
                            ) : (
                              <>
                                <div>
                                  <label className="block text-sm font-medium text-slate-300 mb-2">Numero Attuale</label>
                                  <input 
                                    type="tel" 
                                    value={data.oldPhoneNumber || ''} 
                                    onChange={(e) => setData({ oldPhoneNumber: e.target.value })} 
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" 
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-slate-300 mb-2">Codice Migrazione</label>
                                  <input 
                                    type="text" 
                                    value={data.migrationCode || ''} 
                                    onChange={(e) => setData({ migrationCode: e.target.value })} 
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" 
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-slate-300 mb-2">Gestore Vecchia Linea</label>
                                  <select
                                    value={data.gestore || ''}
                                    onChange={(e) => setData({ gestore: e.target.value, gestoreAltro: '' })}
                                    disabled={!!data.gestoreAltro}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 disabled:opacity-50"
                                  >
                                    <option value="">-- Seleziona --</option>
                                    <option value="TIM">TIM</option>
                                    <option value="Vodafone">Vodafone</option>
                                    <option value="Wind3">Wind3</option>
                                    <option value="Iliad">Iliad</option>
                                    <option value="Optima">Optima</option>
                                    <option value="Iren">Iren</option>
                                  </select>
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-700">
                                  <input 
                                    type="checkbox" 
                                    id="altroGestore"
                                    checked={!!data.gestoreAltro}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setData({ gestore: '', gestoreAltro: ' ' });
                                      } else {
                                        setData({ gestoreAltro: '' });
                                      }
                                    }}
                                    className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-indigo-600"
                                  />
                                  <label htmlFor="altroGestore" className="text-slate-300 cursor-pointer">Altro gestore non in elenco</label>
                                </div>

                                {data.gestoreAltro !== undefined && data.gestoreAltro !== '' && (
                                  <div>
                                    <input 
                                      type="text" 
                                      value={data.gestoreAltro.trim()} 
                                      onChange={(e) => setData({ gestoreAltro: e.target.value })}
                                      placeholder="Specificare gestore..."
                                      className="w-full bg-slate-950 border border-indigo-500/50 rounded-xl px-4 py-3 text-slate-200" 
                                    />
                                  </div>
                                )}

                                <div className="space-y-2">
                                  <div className="flex items-center gap-3">
                                    <input 
                                      type="checkbox" 
                                      id="stessoCF"
                                      checked={data.fiscalCodeOldLine === data.fiscalCode && !!data.fiscalCode}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setData({ fiscalCodeOldLine: data.fiscalCode });
                                        } else {
                                          setData({ fiscalCodeOldLine: '' });
                                        }
                                      }}
                                      className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-indigo-600"
                                    />
                                    <label htmlFor="stessoCF" className="text-slate-300">Stesso CF del cliente</label>
                                  </div>

                                  <div className="relative">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Codice Fiscale Vecchia Linea</label>
                                    <input 
                                      type="text" 
                                      value={data.fiscalCodeOldLine || ''} 
                                      onChange={(e) => {
                                        const value = e.target.value.toUpperCase().slice(0, 16);
                                        setData({ fiscalCodeOldLine: value });
                                        if (value.length < 3) setCfOldLineSuggestions([]);
                                      }}
                                      disabled={data.fiscalCodeOldLine === data.fiscalCode && !!data.fiscalCode}
                                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 disabled:opacity-50"
                                      placeholder="RSSMRA85T10A562S"
                                    />
                                    {cfOldLineSuggestions.length > 0 && (
                                      <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
                                        {cfOldLineSuggestions.map((customer) => (
                                          <button
                                            key={customer.id}
                                            onClick={() => {
                                              setData({ fiscalCodeOldLine: customer.fiscalCode });
                                              setCfOldLineSuggestions([]);
                                            }}
                                            className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors"
                                          >
                                            <p className="text-white font-medium">{customer.fiscalCode}</p>
                                            <p className="text-sm text-slate-400">{customer.firstName} {customer.lastName}</p>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-slate-300 mb-2">Prodotti da Restituire</label>
                                  <select
                                    value={data.prodottiRestituire || ''}
                                    onChange={(e) => setData({ prodottiRestituire: e.target.value })}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                                  >
                                    <option value="">-- Seleziona --</option>
                                    <option value="Modem">Modem</option>
                                    <option value="Modem e Decoder">Modem e Decoder</option>
                                    <option value="Decoder">Decoder</option>
                                    <option value="Nessun prodotto da restituire">Nessun prodotto da restituire</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-slate-300 mb-2">Note Vecchia Linea</label>
                                  <textarea
                                    value={data.oldLineNotes || ''}
                                    onChange={(e) => setData({ oldLineNotes: e.target.value })}
                                    rows={3}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                                    placeholder="Note aggiuntive..."
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {step.stepId === 'payment' && (
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">IBAN</label>
                              <input type="text" value={data.iban || ''} onChange={(e) => setData({ iban: e.target.value.toUpperCase() })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" />
                            </div>
                            <div className="text-center text-slate-500">oppure</div>
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">PostePay</label>
                              <input type="text" value={data.postePay || ''} onChange={(e) => setData({ postePay: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200" />
                            </div>
                            <div className="flex items-center gap-3">
                              <input type="checkbox" id="bollettino" checked={data.bollettino || false} onChange={(e) => setData({ bollettino: e.target.checked })} className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-indigo-600" />
                              <label htmlFor="bollettino" className="text-slate-300">Bollettino postale</label>
                            </div>
                          </div>
                        )}

                        {step.stepId === 'privacy' && (
                          <div className="space-y-4">
                            <div className="bg-slate-800/50 rounded-xl p-4 border border-amber-500/30">
                              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                                <Warning className="w-5 h-5 text-amber-400" />
                                Consensi Privacy
                              </h4>
                              <div className="space-y-4">
                                <div className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg border border-rose-500/30">
                                  <input type="checkbox" id="gdpr" checked={data.gdprConsent || false} onChange={(e) => setData({ gdprConsent: e.target.checked })} className="mt-1 w-5 h-5 rounded border-slate-700 bg-slate-950 text-indigo-600" />
                                  <div className="flex-1">
                                    <label htmlFor="gdpr" className="text-slate-200 text-sm font-medium cursor-pointer">
                                      Trattamento dati personali <span className="text-rose-500">*</span>
                                    </label>
                                  </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 rounded-lg">
                                  <input type="checkbox" id="marketing" checked={data.privacyMarketing || false} onChange={(e) => setData({ privacyMarketing: e.target.checked })} className="mt-1 w-5 h-5 rounded border-slate-700 bg-slate-950 text-indigo-600" />
                                  <div>
                                    <label htmlFor="marketing" className="text-slate-300 text-sm cursor-pointer">Marketing (opzionale)</label>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {step.stepId === 'appointment' && (
                          <div className="space-y-6">
                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">Data Installazione</label>
                              <input 
                                type="date" 
                                value={data.appointmentData || ''} 
                                onChange={(e) => setData({ appointmentData: e.target.value })}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Dalle</label>
                                <input 
                                  type="time" 
                                  value={data.appointmentOra || ''} 
                                  onChange={(e) => setData({ appointmentOra: e.target.value })}
                                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Alle</label>
                                <input 
                                  type="time" 
                                  value={data.appointmentOraFine || ''} 
                                  onChange={(e) => setData({ appointmentOraFine: e.target.value })}
                                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-slate-300 mb-2">Accordi con il Cliente</label>
                              <textarea
                                value={data.appointmentAccordi || ''}
                                onChange={(e) => setData({ appointmentAccordi: e.target.value })}
                                rows={3}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200"
                                placeholder="Accordi presi con il cliente..."
                              />
                            </div>

                            {/* RIMOSSO: Lavorazioni Post Attivazione - spostato a step 4 */}
                          </div>
                        )}

                        {step.stepId === 'summary' && (
                          <div className="space-y-4">
                            {/* Dettaglio Offerta Base */}
                            {data.offerName && (
                              <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-6">
                                <h4 className="font-semibold text-indigo-400 mb-4 flex items-center gap-2">
                                  <Buildings className="w-5 h-5" />
                                  Dettaglio Offerta Base
                                </h4>
                                <div className="space-y-3 text-sm">
                                  <div className="flex justify-between items-start">
                                    <span className="text-slate-400">Offerta:</span>
                                    <span className="text-white text-right font-medium max-w-[60%]">{data.offerName}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Gestore:</span>
                                    <span className="text-white">{data.type}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Tipo:</span>
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      data.offerType === 'business' ? 'bg-purple-600/20 text-purple-400' : 'bg-blue-600/20 text-blue-400'
                                    }`}>
                                      {data.offerType === 'business' ? 'Business' : 'Consumer'}
                                    </span>
                                  </div>
                                  
                                  <div className="border-t border-slate-700 my-3" />
                                  
                                  <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Canone Mensile Base:</span>
                                    <span className="text-emerald-400 font-bold text-lg">{data.offerCanone || '-'}</span>
                                  </div>
                                  
                                  {data.offerScadenza && (
                                    <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-900/20 p-2 rounded-lg">
                                      <Calendar className="w-4 h-4" />
                                      <span>Promo valida fino al {data.offerScadenza}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Pacchetti Aggiuntivi (se presenti) */}
                            {data.additionalPackages?.selectedIds?.some(id => id !== 'none') && (
                              <div className="bg-slate-800/50 rounded-xl p-6 border border-indigo-500/30">
                                <h4 className="font-semibold text-indigo-400 mb-4 flex items-center gap-2">
                                  <Package className="w-5 h-5" />
                                  Pacchetti Aggiuntivi Selezionati
                                </h4>
                                <div className="space-y-2 text-sm">
                                  {data.additionalPackages.selectedIds.map(pkgId => {
                                    const pkg = ADDITIONAL_PACKAGES.find(p => p.id === pkgId);
                                    return pkg ? (
                                      <div key={pkg.id} className="flex justify-between items-center py-1 border-b border-slate-700/50 last:border-0">
                                        <span className="text-slate-300">{pkg.label}</span>
                                        <span className="text-indigo-300 font-medium">€{pkg.price.toFixed(2)}/mese</span>
                                      </div>
                                    ) : null;
                                  })}
                                  <div className="border-t border-slate-600 my-2 pt-2">
                                    <div className="flex justify-between font-bold">
                                      <span className="text-slate-300">Totale Pacchetti</span>
                                      <span className="text-indigo-400 text-lg">
                                        €{(data.additionalPackages?.totalPrice || 0).toFixed(2)}/mese
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* WASH Config (se presente - retroattivo) */}
                            {data.washConfig && data.washConfig.enabled && (
                              <div className="bg-slate-800/50 rounded-xl p-6 border border-amber-500/30">
                                <h4 className="font-semibold text-amber-400 mb-4 flex items-center gap-2">
                                  <TelevisionSimple className="w-5 h-5" />
                                  Gestione WASH
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between items-center">
                                    <span className="text-slate-400">Stato WASH:</span>
                                    <span className={`font-bold ${data.washConfig.type === 'suspect' ? 'text-amber-400' : 'text-emerald-400'}`}>
                                      {data.washConfig.type === 'suspect' ? 'SUSPECT WASH ⚠️' : 'NO WASH ✓'}
                                    </span>
                                  </div>
                                  
                                  {data.washConfig.type === 'suspect' && data.washConfig.suspectData && (
                                    <>
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Codice Cliente/CF:</span>
                                        <span className="text-white font-mono text-xs">{data.washConfig.suspectData.clientCode || '-'}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Gestione abbonamento:</span>
                                        <span className="text-amber-300">
                                          {data.washConfig.suspectData.action === 'disattiva' ? 'Disattiva vecchio' : 'Mantieni vecchio'}
                                        </span>
                                      </div>
                                    </>
                                  )}
                                  
                                  <div className="text-xs text-slate-500 mt-2 bg-slate-900/50 p-2 rounded">
                                    Registrato il: {data.washConfig.timestamp ? new Date(data.washConfig.timestamp).toLocaleString('it-IT') : 'N/D'}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Totale Combinato */}
                            <div className="bg-gradient-to-r from-emerald-900/30 to-indigo-900/30 border border-emerald-500/30 rounded-xl p-6">
                              <h4 className="font-bold text-white mb-4 text-lg">💰 Riepilogo Costi Totali</h4>
                              <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-slate-300">Canone Base:</span>
                                  <span className="text-white font-medium">{data.offerCanone || '€0,00'}</span>
                                </div>
                                
                              {((data.additionalPackages?.totalPrice || 0) > 0) && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-300">Pacchetti Aggiuntivi:</span>
                            <span className="text-indigo-300 font-medium">+ €{(data.additionalPackages?.totalPrice || 0).toFixed(2)}</span>
                          </div>
                        )}
                                
                                <div className="border-t border-slate-600 my-2" />
                                
                                <div className="flex justify-between items-center">
                                  <span className="text-white font-bold text-lg">Totale Mensile:</span>
                                  <span className="text-2xl font-bold text-emerald-400">
                                    €{(() => {
                                      const basePrice = extractPrice(data.offerCanone || '');
                                      const packagesPrice = data.additionalPackages?.totalPrice || 0;
                                      return (basePrice + packagesPrice).toFixed(2);
                                    })()}
                                  </span>
                                </div>
                                
                                {data.offerScadenza && (
                                  <p className="text-xs text-amber-400 mt-2 text-center bg-amber-900/20 p-2 rounded">
                                    ⚠️ Prezzo promozionale valido fino al {data.offerScadenza}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Dati Cliente */}
                            <div className="bg-slate-800/50 rounded-xl p-6">
                              <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                                <User className="w-5 h-5" />
                                Dati Cliente
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-slate-400">Nome:</span><span className="text-white">{data.firstName} {data.lastName}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">CF:</span><span className="text-white font-mono text-xs">{data.fiscalCode}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">Telefono:</span><span className="text-white">{data.phone}</span></div>
                                {data.lineType && (
                                  <>
                                    <div className="flex justify-between"><span className="text-slate-400">Tipo Linea:</span><span className="text-white">{data.lineType}</span></div>
                                    <div className="flex justify-between"><span className="text-slate-400">Tecnologia:</span><span className="text-white">{data.technology}</span></div>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            {/* Appuntamento */}
                            {(data.appointmentData || data.appointmentOra) && (
                              <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4">
                                <h5 className="font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  Appuntamento Installazione
                                </h5>
                                <div className="space-y-2 text-sm">
                                  {data.appointmentData && (
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Data:</span>
                                      <span className="text-white">{new Date(data.appointmentData).toLocaleDateString('it-IT')}</span>
                                    </div>
                                  )}
                                  {(data.appointmentOra || data.appointmentOraFine) && (
                                    <div className="flex justify-between">
                                      <span className="text-slate-400">Orario:</span>
                                      <span className="text-white">{data.appointmentOra || '--:--'} - {data.appointmentOraFine || '--:--'}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            <button
                              onClick={handleSubmit}
                              disabled={loading || !practiceId}
                              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {loading ? 'Salvataggio...' : <><Check className="w-5 h-5" /> Completa Pratica</>}
                            </button>
                            {!practiceId && <p className="text-rose-400 text-center text-sm">ID mancante - errore Step 1</p>}
                          </div>
                        )}

                        {!isLastStep(step.id) && (
                          <div className="flex justify-between mt-6 pt-6 border-t border-slate-800">
                            <button
                              onClick={() => { if (step.id > 1) { setExpandedStep(step.id - 1); setStep(step.id - 1); } }}
                              disabled={step.id === 1}
                              className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white disabled:opacity-30"
                            >
                              <ArrowLeft className="w-5 h-5" />
                              Indietro
                            </button>
                            <button
                              onClick={() => isValid && handleStepComplete(step.id)}
                              disabled={!isValid}
                              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white px-6 py-2 rounded-xl"
                            >
                              Avanti
                              <ArrowRight className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </OperatorLayout>
  );
}