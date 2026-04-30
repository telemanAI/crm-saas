import { Practice, PracticeCategory } from '../entities/practice.entity';

export class PracticeResponseDto {
  id: string;
  category: PracticeCategory;
  type: string;
  status: string;
  operationalStatus?: string;
  skyTvStatus?: string | null;
  statoGlobale?: 'completo' | 'non_completo' | null;
  currentStep: number;
  completedSteps: number[];
  customerId: string | null;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    fiscalCode?: string;
    phonePrimary?: string;
    email?: string;
  };
  customerSnapshot?: any;
  offerCode?: string;
  offerName?: string;
  offerCanone?: string;
  offerAttivazione?: string;
  offerVincolo?: string;
  offerNote?: string;
  offerDisattivazione?: string;
  offerType?: string;
  offerScadenza?: string;
  additionalPackages?: {
    selectedIds: string[];
    totalPrice: number;
  };
  washConfig?: {
    enabled: boolean;
    type: 'suspect' | 'none';
    suspectData?: {
      clientCode: string;
      action: 'disattiva' | 'mantieni';
    };
    timestamp?: Date;
  };
  convergenza?: {
    attiva: boolean;
    tipo: 'daChiudere' | 'chiusa' | null;
    numero?: string;
  } | null;
  lavorazioniPostAttivazione?: string | null;

  lineType?: string;
  installationAddress?: any;
  technology?: string;
  oldLineData?: any;
  paymentMethod?: any;
  soldBy?: string;
  enteredBy?: string;
  soldById?: string;
  enteredById?: string;
  notes?: string;
  newLineNotes?: string;
  appointmentData?: any;
  notesHistory?: any;
  createdAt: Date;
  updatedAt: Date;

  // Dati specifici per categoria (null per le altre)
  mobileData?: Record<string, any> | null;
  energyData?: Record<string, any> | null;

  constructor(practice: Practice) {
    this.id = practice.id;
    this.category = (practice.category as PracticeCategory) || 'FIXED_LINE';
    this.type = practice.type;
    this.status = practice.status;
    this.operationalStatus = practice.operationalStatus || 'PENDING';
    this.skyTvStatus = practice.skyTvStatus ?? null;
    this.statoGlobale = practice.statoGlobale || null;
    this.currentStep = practice.currentStep;

    const steps = practice.completedSteps as any;
    let numericSteps: number[] = [];

    if (Array.isArray(steps)) {
      numericSteps = steps
        .map((s: any) => (typeof s === 'string' ? parseInt(s, 10) : Number(s)))
        .filter((n: number) => !isNaN(n) && n > 0);
    } else if (typeof steps === 'string' && steps.length > 0) {
      numericSteps = steps
        .split(',')
        .map((s: string) => parseInt(s.trim(), 10))
        .filter((n: number) => !isNaN(n) && n > 0);
    }

    this.completedSteps = [...new Set(numericSteps)].sort((a, b) => a - b);
    this.customerId =
      practice.customerId || (practice.customer ? practice.customer.id : null);

    if (practice.customer) {
      this.customer = {
        id: practice.customer.id,
        firstName: practice.customer.firstName,
        lastName: practice.customer.lastName,
        fiscalCode: (practice.customer as any).fiscalCode,
        phonePrimary: practice.customer.phonePrimary,
        email: practice.customer.email,
      };
    } else if (practice.customerSnapshot) {
      this.customer = {
        id: 'snapshot',
        firstName: practice.customerSnapshot.firstName,
        lastName: practice.customerSnapshot.lastName,
        fiscalCode: practice.customerSnapshot.fiscalCode,
        phonePrimary:
          practice.customerSnapshot.phonePrimary || practice.customerSnapshot.phone,
        email: practice.customerSnapshot.email,
      };
    } else {
      this.customer = { id: '', firstName: '', lastName: '' };
    }

    this.customerSnapshot = practice.customerSnapshot || {};
    this.offerCode =
      typeof practice.offerCode === 'string' ? practice.offerCode : undefined;
    this.offerName =
      typeof practice.offerName === 'string' ? practice.offerName : undefined;
    this.offerCanone =
      typeof practice.offerCanone === 'string' ? practice.offerCanone : undefined;
    this.offerAttivazione =
      typeof practice.offerAttivazione === 'string'
        ? practice.offerAttivazione
        : undefined;
    this.offerVincolo =
      typeof practice.offerVincolo === 'string' ? practice.offerVincolo : undefined;
    this.offerNote =
      typeof practice.offerNote === 'string' ? practice.offerNote : undefined;
    this.offerDisattivazione =
      typeof practice.offerDisattivazione === 'string'
        ? practice.offerDisattivazione
        : undefined;
    this.offerType =
      typeof practice.offerType === 'string' ? practice.offerType : undefined;
    this.offerScadenza =
      typeof practice.offerScadenza === 'string' ? practice.offerScadenza : undefined;
    this.additionalPackages = practice.additionalPackages;
    this.washConfig = practice.washConfig;

    this.convergenza = practice.convergenza;
    this.lavorazioniPostAttivazione = practice.lavorazioniPostAttivazione;

    this.lineType = practice.lineType;
    this.installationAddress = practice.installationAddress || {};
    this.technology =
      typeof practice.technology === 'string' ? practice.technology : undefined;
    this.oldLineData = practice.oldLineData || {};
    this.paymentMethod = practice.paymentMethod || {};
    this.soldBy = typeof practice.soldBy === 'string' ? practice.soldBy : undefined;
    this.enteredBy =
      typeof practice.enteredBy === 'string' ? practice.enteredBy : undefined;
    this.soldById = practice.soldById;
    this.enteredById = practice.enteredById;
    this.notes = typeof practice.notes === 'string' ? practice.notes : undefined;
    this.newLineNotes =
      typeof practice.newLineNotes === 'string' ? practice.newLineNotes : undefined;
    this.appointmentData = practice.appointmentData || {};
    this.notesHistory = practice.notesHistory || [];
    this.createdAt = practice.createdAt;
    this.updatedAt = practice.updatedAt;

    this.mobileData = practice.mobileData || null;
    this.energyData = practice.energyData || null;
  }
}
