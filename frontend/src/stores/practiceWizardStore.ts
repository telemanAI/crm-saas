import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Interfaccia Pacchetti Aggiuntivi
interface AdditionalPackage {
  id: string;
  label: string;
  price: number;
  category: 'netflix' | 'sky' | 'none';
}

// Interfaccia WASH Config
interface WashConfig {
  enabled: boolean;
  type: 'suspect' | 'none';
  suspectData?: {
    clientCode: string;
    action: 'disattiva' | 'mantieni';
  };
  timestamp?: Date;
}

interface PracticeData {
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
  };
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
  // NUOVI CAMPI per Pacchetti e WASH
  additionalPackages?: {
    selectedIds: string[];
    totalPrice: number;
  };
  washConfig?: WashConfig | null;
  washConfigSnapshot?: WashConfig | null; // Per retroattività
}

interface PracticeWizardState {
  data: PracticeData;
  currentStep: number;
  practiceId: string | null;
  setData: (data: Partial<PracticeData>) => void;
  setStep: (step: number) => void;
  setPracticeId: (id: string | null) => void;
  reset: () => void;
  // Nuovi metodi per pacchetti
  togglePackage: (packageId: string) => void;
  setNoPackages: () => void;
  getTotalPackagesPrice: () => number;
  // Nuovi metodi per WASH
  setWashConfig: (config: WashConfig | null) => void;
}

// Lista pacchetti disponibili
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

export const usePracticeWizardStore = create<PracticeWizardState>()(
  persist(
    (set, get) => ({
      data: { 
        phone: '',
        additionalPackages: { selectedIds: [], totalPrice: 0 },
        washConfig: null,
      },
      currentStep: 1,
      practiceId: null,
      
      setData: (newData) => set((state) => ({ 
        data: { ...state.data, ...newData } 
      })),
      
      setStep: (step) => set({ currentStep: step }),
      
      setPracticeId: (id) => set({ practiceId: id }),
      
      reset: () => set({ 
        data: { 
          phone: '',
          additionalPackages: { selectedIds: [], totalPrice: 0 },
          washConfig: null,
        }, 
        currentStep: 1, 
        practiceId: null 
      }),

      // Toggle pacchetto (con logica esclusività)
      togglePackage: (packageId: string) => set((state) => {
        const currentIds = state.data.additionalPackages?.selectedIds || [];
        let newIds: string[];

        // Se seleziono "nessuno", svuoto tutto
        if (packageId === 'none') {
          newIds = ['none'];
        }
        // Se seleziono qualcos'altro e c'era "nessuno", lo rimuovo
        else if (currentIds.includes('none')) {
          newIds = [packageId];
        }
        // Gestione Netflix (mutuamente esclusivi)
        else if (packageId.startsWith('netflix-')) {
          // Rimuovi altri Netflix e aggiungi/rimuovi questo
          const withoutNetflix = currentIds.filter(id => !id.startsWith('netflix-'));
          if (currentIds.includes(packageId)) {
            newIds = withoutNetflix;
          } else {
            newIds = [...withoutNetflix, packageId];
          }
        }
        // Toggle normale per pacchetti SKY
        else {
          if (currentIds.includes(packageId)) {
            newIds = currentIds.filter(id => id !== packageId);
          } else {
            newIds = [...currentIds, packageId];
          }
        }

        // Calcola totale
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

      // Seleziona "Nessun pacchetto"
      setNoPackages: () => set((state) => ({
        data: {
          ...state.data,
          additionalPackages: { selectedIds: ['none'], totalPrice: 0 }
        }
      })),

      // Calcola totale pacchetti
      getTotalPackagesPrice: () => {
        const state = get();
        return state.data.additionalPackages?.totalPrice || 0;
      },

      // Imposta configurazione WASH
      setWashConfig: (config: WashConfig | null) => set((state) => ({
        data: {
          ...state.data,
          washConfig: config,
          washConfigSnapshot: config // Salva snapshot per retroattività
        }
      })),
    }),
    {
      name: 'practice-wizard-storage',
    }
  )
);