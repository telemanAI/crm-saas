import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AdditionalPackage {
  id: string;
  label: string;
  price: number;
  category: 'netflix' | 'sky' | 'none';
}

export interface WashConfig {
  enabled: boolean;
  type: 'suspect' | 'none';
  suspectData?: {
    clientCode: string;
    action: 'disattiva' | 'mantieni';
  };
  timestamp?: Date;
}

// 🔥 NUOVO: Interfaccia Convergenza
export interface ConvergenzaConfig {
  attiva?: boolean;
  tipo?: 'daChiudere' | 'chiusa' | null;
  numero?: string;
}

// 🔥 NUOVO: Interfaccia Indirizzo Cliente
export interface CustomerAddress {
  street?: string;      // Via
  number?: string;      // Civico
  city?: string;        // Città
  zip?: string;         // CAP
  province?: string;    // Provincia
}

export interface PracticeData {
  type?: 'TIM_FIBRA' | 'SKY';
  offerCode?: string;
  offerName?: string;
  offerCanone?: string;
  offerAttivazione?: string;
  offerVincolo?: string;
  offerNote?: string;
  offerDisattivazione?: string;
  offerType?: 'consumer' | 'business';
  offerScadenza?: string;
  soldBy?: string;
  enteredBy?: string;
  soldById?: string;
  enteredById?: string;
  firstName?: string;
  lastName?: string;
  fiscalCode?: string;
  phone?: string;
  email?: string;
  notes?: string;
  lineType?: 'NUOVA' | 'MIGRAZIONE';
  installationAddress?: {
    street?: string;
    city?: string;
    zip?: string;
    comune?: string;
    citta?: string;
    cap?: string;
  };
  customerAddress?: CustomerAddress; // 🔥 AGGIUNTO: al livello corretto
  technology?: 'FTTH' | 'FTTC' | 'FWA';
  oldPhoneNumber?: string;
  migrationCode?: string;
  iban?: string;
  postePay?: string;
  bollettino?: boolean;
  gdprConsent?: boolean;
  privacyMarketing?: boolean;
  gestore?: string;
  gestoreAltro?: string;
  fiscalCodeOldLine?: string;
  prodottiRestituire?: string;
  oldLineNotes?: string;
  newLineNotes?: string;
  appointmentData?: string;
  appointmentOra?: string;
  appointmentOraFine?: string;
  appointmentAccordi?: string;
  appointmentLavorazioni?: string;
  ragioneSociale?: string;
  partitaIva?: string;
  formaGiuridica?: string;
  sedeLegale?: string;
  codiceRea?: string;
  pec?: string;
  storeConfig?: {
    enableWashStep: boolean;
    enableAdditionalPackages: boolean;
  };
  additionalPackages?: {
    selectedIds: string[];
    totalPrice: number;
  };
  washConfig?: WashConfig | null;
  washConfigSnapshot?: WashConfig | null;
  
  // 🔥 NUOVI CAMPI
  convergenza?: ConvergenzaConfig;
  lavorazioniPostAttivazione?: string;
  statoGlobale?: 'completo' | 'non_completo' | null;
}

// ... resto del file invariato (WIZARD_STEPS, ADDITIONAL_PACKAGES, ecc.) ...

export type StepId = 
  | 'offer'
  | 'sellers'
  | 'customer'
  | 'packages'
  | 'lines'
  | 'wash'
  | 'old-line'
  | 'payment'
  | 'privacy'
  | 'appointment'
  | 'summary';

export interface WizardStep {
  id: StepId;
  title: string;
  icon: string;
  isVisible: (data: PracticeData) => boolean;
}

export const WIZARD_STEPS: WizardStep[] = [
  { id: 'offer', title: 'Tipo & Offerta', icon: 'Buildings', isVisible: () => true },
  { id: 'sellers', title: 'Venditore', icon: 'User', isVisible: () => true },
  { id: 'customer', title: 'Anagrafica Cliente', icon: 'User', isVisible: () => true },
  { 
    id: 'packages', 
    title: 'Pacchetti Aggiuntivi', 
    icon: 'Package', 
    isVisible: (data) => data.offerName?.includes('SKY TV') ?? false 
  },
  { 
    id: 'lines', 
    title: 'Configurazione Nuova Linea',
    icon: 'MapPin', 
    isVisible: () => true 
  },
  { 
    id: 'wash', 
    title: 'WASH', 
    icon: 'TelevisionSimple', 
    isVisible: (data) => {
      const isSky = data.offerName?.includes('SKY TV') ?? false;
      const washEnabled = data.storeConfig?.enableWashStep ?? false;
      return isSky && washEnabled;
    } 
  },
  { id: 'old-line', title: 'Dati Vecchia Linea', icon: 'Phone', isVisible: () => true },
  { id: 'payment', title: 'Pagamento', icon: 'CreditCard', isVisible: () => true },
  { id: 'privacy', title: 'Privacy', icon: 'FileText', isVisible: () => true },
  { id: 'appointment', title: 'Appuntamento', icon: 'Calendar', isVisible: () => true },
  { id: 'summary', title: 'Riepilogo', icon: 'Eye', isVisible: () => true },
];

export const ADDITIONAL_PACKAGES: AdditionalPackage[] = [
  { id: 'none', label: 'NESSUN PACCHETTO AGGIUNTIVO', price: 0, category: 'none' },
  { id: 'netflix-base', label: 'NETFLIX BASE', price: 5.00, category: 'netflix' },
  { id: 'netflix-standard', label: 'NETFLIX STANDARD', price: 11.99, category: 'netflix' },
  { id: 'netflix-premium', label: 'NETFLIX PREMIUM', price: 17.99, category: 'netflix' },
  { id: 'cinema', label: 'CINEMA', price: 10.00, category: 'sky' },
  { id: 'sport', label: 'SPORT', price: 22.90, category: 'sky' },
  { id: 'calcio', label: 'CALCIO', price: 8.00, category: 'sky' },
  { id: 'kids', label: 'KIDS', price: 5.00, category: 'sky' },
  { id: 'ultra-hd', label: 'ULTRA HD', price: 5.00, category: 'sky' },
];

interface PracticeWizardState {
  data: PracticeData;
  currentStepId: StepId;
  currentStep: number;
  practiceId: string | null;
  completedStepIds: StepId[];
  
  getVisibleSteps: () => WizardStep[];
  getCurrentStepNumber: () => number;
  getTotalSteps: () => number;
  isLastStep: () => boolean;
  
  setData: (data: Partial<PracticeData>) => void;
  setStep: (step: StepId | number) => void;
  setStoreConfig: (config: PracticeData['storeConfig']) => void;
  setOffer: (offer: {
    type: 'TIM_FIBRA' | 'SKY';
    offerCode: string;
    offerName: string;
    offerType: 'consumer' | 'business';
    offerCanone?: string;
    offerAttivazione?: string;
    offerVincolo?: string;
    offerNote?: string;
    offerDisattivazione?: string;
    offerScadenza?: string;
  }) => void;
  
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (stepId: StepId) => void;
  
  completeStep: (stepId: StepId) => void;
  isStepCompleted: (stepId: StepId) => boolean;
  
  setPracticeId: (id: string | null) => void;
  reset: () => void;
  
  togglePackage: (packageId: string) => void;
  setNoPackages: () => void;
  getTotalPackagesPrice: () => number;
  
  setWashConfig: (config: WashConfig | null) => void;
  
  // 🔥 NUOVE FUNZIONI
  setConvergenza: (config: ConvergenzaConfig) => void;
  setLavorazioniPostAttivazione: (value: string | null) => void;
  calculateStatoGlobale: () => void;
}

const initialState = {
  data: { 
    phone: '',
    additionalPackages: { selectedIds: [], totalPrice: 0 },
    washConfig: null,
    storeConfig: {
      enableWashStep: false,
      enableAdditionalPackages: true
    },
    convergenza: { attiva: false, tipo: null },
    statoGlobale: null,
    lavorazioniPostAttivazione: undefined
  } as PracticeData,
  currentStepId: 'offer' as StepId,
  currentStep: 1,
  practiceId: null,
  completedStepIds: [] as StepId[],
};

export const usePracticeWizardStore = create<PracticeWizardState>()(
  persist(
    (set, get) => ({
      ...initialState,

      getVisibleSteps: () => {
        const { data } = get();
        return WIZARD_STEPS.filter(step => step.isVisible(data));
      },

      getCurrentStepNumber: () => {
        return get().currentStep;
      },

      getTotalSteps: () => {
        return get().getVisibleSteps().length;
      },

      isLastStep: () => {
        const visible = get().getVisibleSteps();
        return get().currentStep === visible.length;
      },

      setData: (newData) => set((state) => ({ 
        data: { ...state.data, ...newData } 
      })),

      setStep: (step) => set((state) => {
        const visible = WIZARD_STEPS.filter(s => s.isVisible(state.data));
        let newStepId: StepId;
        let newStepNumber: number;
        
        if (typeof step === 'number') {
          newStepNumber = step;
          newStepId = visible[step - 1]?.id || 'offer';
        } else {
          newStepId = step;
          newStepNumber = visible.findIndex(s => s.id === step) + 1;
          if (newStepNumber === 0) newStepNumber = 1;
        }
        
        return { currentStepId: newStepId, currentStep: newStepNumber };
      }),

      setStoreConfig: (config) => set((state) => ({
        data: {
          ...state.data,
          storeConfig: { 
            enableWashStep: state.data.storeConfig?.enableWashStep ?? false,
            enableAdditionalPackages: state.data.storeConfig?.enableAdditionalPackages ?? true,
            ...config 
          }
        }
      })),

      setOffer: (offer) => set((state) => {
        const newData = { 
          ...state.data, 
          type: offer.type,
          offerCode: offer.offerCode,
          offerName: offer.offerName,
          offerType: offer.offerType,
          offerCanone: offer.offerCanone,
          offerAttivazione: offer.offerAttivazione,
          offerVincolo: offer.offerVincolo,
          offerNote: offer.offerNote,
          offerDisattivazione: offer.offerDisattivazione,
          offerScadenza: offer.offerScadenza,
          additionalPackages: { selectedIds: [], totalPrice: 0 },
          washConfig: null
        };

        const newVisibleSteps = WIZARD_STEPS.filter(s => s.isVisible(newData));
        const newVisibleIds = newVisibleSteps.map(s => s.id);
        
        const currentStillVisible = newVisibleIds.includes(state.currentStepId);
        
        let newStepId = state.currentStepId;
        let newStepNumber = state.currentStep;
        
        if (!currentStillVisible) {
          newStepId = newVisibleIds[0] || 'offer';
          newStepNumber = 1;
        }

        return { 
          data: newData, 
          currentStepId: newStepId,
          currentStep: newStepNumber,
          completedStepIds: state.completedStepIds.filter(id => newVisibleIds.includes(id))
        };
      }),

      nextStep: () => {
        const { currentStepId, currentStep, getVisibleSteps, completeStep } = get();
        const visible = getVisibleSteps();
        const currentIdx = visible.findIndex(s => s.id === currentStepId);
        const next = visible[currentIdx + 1];
        
        if (next) {
          completeStep(currentStepId);
          set({ currentStepId: next.id, currentStep: currentStep + 1 });
        }
      },

      prevStep: () => {
        const { currentStepId, currentStep, getVisibleSteps } = get();
        const visible = getVisibleSteps();
        const currentIdx = visible.findIndex(s => s.id === currentStepId);
        const prev = visible[currentIdx - 1];
        
        if (prev) {
          set({ currentStepId: prev.id, currentStep: currentStep - 1 });
        }
      },

      goToStep: (stepId) => {
        const { completedStepIds, getVisibleSteps } = get();
        const visible = getVisibleSteps();
        const targetIndex = visible.findIndex(s => s.id === stepId);
        const lastCompletedIndex = Math.max(
          ...completedStepIds.map(id => visible.findIndex(s => s.id === id)),
          -1
        );
        
        if (targetIndex <= lastCompletedIndex + 1) {
          set({ currentStepId: stepId, currentStep: targetIndex + 1 });
        }
      },

      completeStep: (stepId) => set((state) => {
        if (!state.completedStepIds.includes(stepId)) {
          return { completedStepIds: [...state.completedStepIds, stepId] };
        }
        return {};
      }),

      isStepCompleted: (stepId) => {
        return get().completedStepIds.includes(stepId);
      },

      setPracticeId: (id) => set({ practiceId: id }),

      reset: () => set(initialState),

      togglePackage: (packageId) => set((state) => {
        const currentIds = state.data.additionalPackages?.selectedIds || [];
        let newIds: string[];

        if (packageId === 'none') {
          newIds = ['none'];
        } else if (currentIds.includes('none')) {
          newIds = [packageId];
        } else if (packageId.startsWith('netflix-')) {
          const withoutNetflix = currentIds.filter(id => !id.startsWith('netflix-'));
          if (currentIds.includes(packageId)) {
            newIds = withoutNetflix;
          } else {
            newIds = [...withoutNetflix, packageId];
          }
        } else {
          if (currentIds.includes(packageId)) {
            newIds = currentIds.filter(id => id !== packageId);
          } else {
            newIds = [...currentIds, packageId];
          }
        }

        const totalPrice = newIds.reduce((sum, id) => {
          const pkg = ADDITIONAL_PACKAGES.find(p => p.id === id);
          return sum + (pkg?.price || 0);
        }, 0);

        return {
          data: {
            ...state.data,
            additionalPackages: { selectedIds: newIds, totalPrice }
          }
        };
      }),

      setNoPackages: () => set((state) => ({
        data: {
          ...state.data,
          additionalPackages: { selectedIds: ['none'], totalPrice: 0 }
        }
      })),

      getTotalPackagesPrice: () => {
        return get().data.additionalPackages?.totalPrice || 0;
      },

      setWashConfig: (config) => set((state) => ({
        data: {
          ...state.data,
          washConfig: config,
          washConfigSnapshot: config
        }
      })),

      // 🔥 NUOVE IMPLEMENTAZIONI
      setConvergenza: (config) => set((state) => {
        const newConvergenza = { ...state.data.convergenza, ...config };
        let statoGlobale = state.data.statoGlobale;
        
        // Calcolo automatico stato globale
        if (newConvergenza.attiva) {
          if (newConvergenza.tipo === 'chiusa' && newConvergenza.numero && newConvergenza.numero.length > 0) {
            statoGlobale = 'completo';
          } else if (newConvergenza.tipo === 'daChiudere') {
            statoGlobale = 'non_completo';
          } else if (newConvergenza.tipo === 'chiusa' && !newConvergenza.numero) {
            statoGlobale = 'non_completo';
          }
        } else {
          statoGlobale = null;
        }

        return {
          data: {
            ...state.data,
            convergenza: newConvergenza,
            statoGlobale
          }
        };
      }),

      setLavorazioniPostAttivazione: (value) => set((state) => ({
        data: {
          ...state.data,
          lavorazioniPostAttivazione: value || undefined
        }
      })),

      calculateStatoGlobale: () => set((state) => {
        const { convergenza } = state.data;
        let statoGlobale: 'completo' | 'non_completo' | null = null;
        
        if (convergenza?.attiva) {
          if (convergenza.tipo === 'chiusa' && convergenza.numero && convergenza.numero.length > 0) {
            statoGlobale = 'completo';
          } else {
            statoGlobale = 'non_completo';
          }
        }
        
        return { data: { ...state.data, statoGlobale } };
      })
    }),
    {
      name: 'practice-wizard-storage',
    }
  )
);