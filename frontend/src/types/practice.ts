// Tipi centralizzati per Practice e Customer
// Modifica qui per aggiornare tutti i file
// ============================================

export type PracticeType = 'TIM_FIBRA' | 'SKY' | 'VODAFONE' | 'WINDTRE' | 'ILIAD' | 'OPTIMA' | 'IREN';

export type PracticeStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';

export type OperationalStatus = 'PENDING' | 'IN_PROGRESS' | 'ACTIVATED' | 'REJECTED';

export interface CustomerBase {
  firstName: string;
  lastName: string;
  fiscalCode?: string;
  phonePrimary?: string;
  email?: string;
  ragioneSociale?: string;
  partitaIva?: string;
}

export interface CustomerSnapshot extends Partial<CustomerBase> {
  formaGiuridica?: string;
  sedeLegale?: string;
  codiceRea?: string;
  pec?: string;
  phone?: string;
  address?: {           // 🔥 AGGIUNTO: Indirizzo del cliente
    street?: string;
    number?: string;
    city?: string;
    zip?: string;
    province?: string;
  };
}

export interface InstallationAddress {
  street?: string;
  comune?: string;
  citta?: string;
  cap?: string;
}

export interface ConvergenzaInfo {
  attiva: boolean;
  tipo: 'daChiudere' | 'chiusa';
  numero?: string;
}

export interface NoteEntry {
  text: string;
  createdAt: string;
  createdBy: string;
  createdById: string;
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

export interface AdditionalPackagesConfig {
  selectedIds: string[];
  totalPrice: number;
}

// Tipi per dati precedentemente 'any'
export interface OldLineData {
  oldPhoneNumber?: string;
  migrationCode?: string;
  gestore?: string;
  gestoreAltro?: string;
  fiscalCodeOldLine?: string;
  prodottiRestituire?: string;
  notes?: string;
}

export interface PaymentMethod {
  iban?: string;
  postePay?: string;
  bollettino?: boolean;
}

export interface AppointmentData {
  data?: string;
  ora?: string;
  oraFine?: string;
  accordi?: string;
  lavorazioniPost?: string;
}

export interface PrivacyData {
  consensoMarketing?: boolean;
  consensoProfilazione?: boolean;
  [key: string]: any;
}

// Tipo per la lista pratiche (index.tsx)
export interface PracticeListItem {
  id: string;
  type: PracticeType;
  offerName: string;
  customer: CustomerBase;
  customerSnapshot?: CustomerSnapshot;
  status: PracticeStatus;
  currentStep: number;
  completedSteps?: number[];
  operationalStatus?: string;
  createdAt: string;
  statoGlobale?: 'completo' | 'non_completo' | null;
  convergenza?: {
    attiva: boolean;
    tipo: 'daChiudere' | 'chiusa';
  };
}

// Tipo per il dettaglio pratica ([id].tsx)
export interface PracticeDetail {
  id: string;
  type: PracticeType;
  offerName: string;
  offerCode: string;
  status: string;
  operationalStatus?: OperationalStatus;
  currentStep: number;
  completedSteps: number[];
  createdAt: string;
  updatedAt: string;
  customer: CustomerBase;
  customerId?: string; // 🔥 NUOVO: Per navigazione al cliente
  customerSnapshot?: CustomerSnapshot;
  lineType?: string;
  installationAddress?: InstallationAddress;
  technology?: string;
  oldLineData?: OldLineData;
  paymentMethod?: PaymentMethod;
  soldBy?: string;
  enteredBy?: string;
  soldById?: string;
  enteredById?: string;
  notes?: string;
  newLineNotes?: string;
  appointmentData?: AppointmentData;
  notesHistory?: NoteEntry[];
  offerType?: 'business' | 'consumer';
  offerCanone?: string;
  offerAttivazione?: string;
  offerVincolo?: string;
  offerDisattivazione?: string;
  offerNote?: string;
  offerScadenza?: string;
  additionalPackages?: AdditionalPackagesConfig;
  washConfig?: WashConfig;
  convergenza?: ConvergenzaInfo;
  statoGlobale?: 'completo' | 'non_completo' | null;
  lavorazioniPostAttivazione?: string;
  privacyData?: PrivacyData;
}