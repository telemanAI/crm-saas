
1|// ============================================
2|// Tipi centralizzati per Practice e Customer
3|// Modifica qui per aggiornare tutti i file
4|// ============================================
5|
6|export type PracticeType = 'TIM_FIBRA' | 'SKY' | 'VODAFONE' | 'WINDTRE' | 'ILIAD' | 'OPTIMA' | 'IREN';
7|
8|export type PracticeStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled';
9|
10|export type OperationalStatus = 'PENDING' | 'IN_PROGRESS' | 'ACTIVATED' | 'REJECTED';
11|
12|export interface CustomerBase {
13|  firstName: string;
14|  lastName: string;
15|  fiscalCode?: string;
16|  phonePrimary?: string;
17|  email?: string;
18|  ragioneSociale?: string;
19|  partitaIva?: string;
20|}
21|
22|export interface CustomerSnapshot extends Partial<CustomerBase> {
23|  formaGiuridica?: string;
24|  sedeLegale?: string;
25|  codiceRea?: string;
26|  pec?: string;
27|  phone?: string;
28|}
29|
30|export interface InstallationAddress {
31|  street?: string;
32|  comune?: string;
33|  citta?: string;
34|  cap?: string;
35|}
36|
37|export interface ConvergenzaInfo {
38|  attiva: boolean;
39|  tipo: 'daChiudere' | 'chiusa';
40|  numero?: string;
41|}
42|
43|export interface NoteEntry {
44|  text: string;
45|  createdAt: string;
46|  createdBy: string;
47|  createdById: string;
48|}
49|
50|export interface WashConfig {
51|  enabled: boolean;
52|  type: 'suspect' | 'none';
53|  suspectData?: {
54|    clientCode: string;
55|    action: 'disattiva' | 'mantieni';
56|  };
57|  timestamp?: Date;
58|}
59|
60|export interface AdditionalPackagesConfig {
61|  selectedIds: string[];
62|  totalPrice: number;
63|}
64|
65|// Tipo per la lista pratiche (index.tsx)
66|export interface PracticeListItem {
67|  id: string;
68|  type: PracticeType;
69|  offerName: string;
70|  customer: CustomerBase;
71|  customerSnapshot?: CustomerSnapshot;
72|  status: PracticeStatus;
73|  currentStep: number;
74|  completedSteps?: number[];
75|  operationalStatus?: string;
76|  createdAt: string;
77|  statoGlobale?: 'completo' | 'non_completo' | null;
78|  convergenza?: {
79|    attiva: boolean;
80|    tipo: 'daChiudere' | 'chiusa';
81|  };
82|}
83|
84|// Tipo per il dettaglio pratica ([id].tsx)
85|export interface PracticeDetail {
86|  id: string;
87|  type: PracticeType;
88|  offerName: string;
89|  offerCode: string;
90|  status: string;
91|  operationalStatus?: OperationalStatus;
92|  currentStep: number;
93|  completedSteps: number[];
94|  createdAt: string;
95|  updatedAt: string;
96|  customer: CustomerBase;
97|  customerSnapshot?: CustomerSnapshot;
98|  lineType?: string;
99|  installationAddress?: InstallationAddress;
100|  technology?: string;
101|  oldLineData?: any;
102|  paymentMethod?: any;
103|  soldBy?: string;
104|  enteredBy?: string;
105|  soldById?: string;
106|  enteredById?: string;
107|  notes?: string;
108|  newLineNotes?: string;
109|  appointmentData?: any;
110|  notesHistory?: NoteEntry[];
111|  offerType?: 'business' | 'consumer';
112|  offerCanone?: string;
113|  offerAttivazione?: string;
114|  offerVincolo?: string;
115|  offerDisattivazione?: string;
116|  offerNote?: string;
117|  offerScadenza?: string;
118|  additionalPackages?: AdditionalPackagesConfig;
119|  washConfig?: WashConfig;
120|  convergenza?: ConvergenzaInfo;
121|  statoGlobale?: 'completo' | 'non_completo' | null;
122|  lavorazioniPostAttivazione?: string;
123|  privacyData?: any;
124|}
125|
