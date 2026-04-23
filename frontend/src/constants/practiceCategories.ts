// Costanti condivise per i wizard pratiche MOBILE / ENERGY.
// Centralizzate per evitare duplicazioni e permettere modifiche da un solo punto.

export const OPERATORI_ADDETTI = [
  'FEDERICO',
  'SALVO',
  'ANDREA',
  'CLARISSA',
  'ANTONIO',
  'ANGELA',
  'FIORELLA',
] as const;

// ===== MOBILE =====
export const GESTORI_MOBILE_PROVENIENZA = [
  'TIM',
  'VODAFONE',
  'WIND3',
  'ILIAD',
  'KENA',
  'HO',
  'VERY',
  'OPTIMA',
  'ITALIA POWER',
  'EMOBILE24',
  'FASTWEB',
  'SKY MOBILE',
  'TISCALI',
] as const;

export const GESTORI_MOBILE_NUOVI = [
  'TIM',
  'VODAFONE',
  'WIND3',
  'ILIAD',
  'OPTIMA',
  'ITALIA POWER',
  'EMOBILE24',
  'KENA',
  'HO',
  'VERY',
  'SKY MOBILE',
] as const;

export const OFFERTE_MOBILE = [
  'TIM POWER FAMIGLIA 4,99',
  'TIM 5,99',
  'TIM 6,99',
  'TIM 7,99',
  'TIM 8,99',
  'TIM 9,99',
  'VODAFONE MOBILE START 9,95',
  'VODAFONE MOBILE PRO 11,95',
  'VODAFONE MOBILE POWER 14,95',
  'VODAFONE MOBILE ULTRA 19,95',
  'WIND GO XS 5,99',
  'WIND GO S 6,99',
  'WIND GO UNLIMITED FIRE 6,99',
  'WIND GO UNLIMITED FIRE 5G 7,99',
  'WIND GO UNLIMITED 9,99',
  'OPTIMA MOBILE SMART 4,99',
  'OPTIMA SUPER MOBILE 5G 6,99',
  'SKY MOBILE 9,95',
  'SKY MOBILE 11,90',
  'SKY MOBILE 14,95',
  'SKY MOBILE 19,95',
] as const;

export const TIPI_LINEA_MOBILE = [
  { value: 'MNP', label: 'MNP' },
  { value: 'DOPPIA_MNP', label: 'DOPPIA MNP' },
  { value: 'NUOVO_NUMERO', label: 'NUOVO NUMERO' },
] as const;

export const RICARICA_OPTIONS = [
  { value: 'DA_FARE', label: 'DA FARE' },
  { value: 'DA_NON_FARE', label: 'DA NON FARE' },
  { value: 'ALTRO', label: 'Altro' },
] as const;

export const TIM_UNICA_OPTIONS = [
  { value: 'AGGANCIATA', label: 'AGGANCIATA' },
  { value: 'DA_AGGANCIARE', label: 'DA AGGANCIARE' },
  { value: 'NON_AGGANCIARE', label: 'NON AGGANCIARE / ALTRO OPERATORE' },
  { value: 'ALTRO', label: 'Altro' },
] as const;

// ===== ENERGY (LUCE / GAS) =====
export const GESTORI_ENERGY_PROVENIENZA = [
  'ENEL',
  'ENI PLENITUDE',
  'ACEA',
  'EDISON',
  'SERVIZIO ELETTRICO NAZIONALE',
  'A2A',
  'IREN',
  'OPTIMA',
  'ITALIA POWER',
  'SORGENIA',
  'SINERGY',
] as const;

export const GESTORI_ENERGY_NUOVI = [
  'IREN SEV',
  'A2A',
  'ITALIA POWER',
  'SORGENIA BOLLETTA EXPRESS',
  'SINERGY BOLLETTA EXPRESS',
  'ENEL AB CONTACT',
  'OPTIMA',
  'ACEA WIND3',
  'ENI PLENITUDE',
  'EDISON',
] as const;

export const TIPI_ATTIVAZIONE_ENERGY = [
  { value: 'LUCE_SWITCH', label: 'LUCE SWITCH' },
  { value: 'LUCE_GAS_SWITCH', label: 'LUCE+GAS SWITCH' },
  { value: 'LUCE_VOLTURA', label: 'LUCE SWITCH CON CAMBIO INTESTATARIO (VOLTURA)' },
  { value: 'LUCE_SUBENTRO', label: 'LUCE SWITCH SU CONTATORE NON ATTIVO (SUBENTRO)' },
  { value: 'LUCE_POSA_NUOVO_CONTATORE', label: 'LUCE POSA NUOVO CONTATORE' },
  { value: 'GAS_SWITCH', label: 'GAS SWITCH' },
  { value: 'GAS_POSA_NUOVO_CONTATORE', label: 'GAS POSA NUOVO CONTATORE' },
  { value: 'ALTRO', label: 'Altro' },
] as const;

export const POTENZE_CONTATORE = [
  { value: '1.5_KW', label: '1,5 KW' },
  { value: '3_KW', label: '3 KW' },
  { value: '4.5_KW', label: '4,5 KW' },
  { value: '6_KW', label: '6 KW' },
  { value: 'GAS', label: 'GAS' },
  { value: 'ALTRO', label: 'Altro' },
] as const;

export const TIPI_OFFERTA_ENERGY = [
  { value: 'VARIABILE', label: 'VARIABILE' },
  { value: 'FISSA', label: 'FISSA' },
  { value: 'ALTRO', label: 'Altro' },
] as const;

// ===== CARD GESTORI MOBILE (per wizard step 4) =====
export const MOBILE_PROVIDER_CARDS = [
  { key: 'TIM', name: 'TIM', color: '#003B8E', initials: 'TM', textColor: '#fff' },
  { key: 'VODAFONE', name: 'Vodafone', color: '#E60000', initials: 'VF', textColor: '#fff' },
  { key: 'WIND3', name: 'Wind3', color: '#FF6B00', initials: 'W3', textColor: '#fff' },
  { key: 'ILIAD', name: 'Iliad', color: '#D70000', initials: 'IL', textColor: '#fff' },
  { key: 'KENA', name: 'Kena', color: '#FF6600', initials: 'KN', textColor: '#fff' },
  { key: 'HO', name: 'Ho.', color: '#00A0E3', initials: 'HO', textColor: '#fff' },
  { key: 'VERY', name: 'Very', color: '#7B2D8E', initials: 'VR', textColor: '#fff' },
  { key: 'OPTIMA', name: 'Optima', color: '#0047AB', initials: 'OP', textColor: '#fff' },
  { key: 'ITALIA POWER', name: 'Italia Power', color: '#009246', initials: 'IP', textColor: '#fff' },
  { key: 'EMOBILE24', name: 'eMobile24', color: '#2ECC71', initials: 'E24', textColor: '#fff' },
  { key: 'FASTWEB', name: 'Fastweb', color: '#FFCC00', initials: 'FW', textColor: '#000' },
  { key: 'SKY MOBILE', name: 'SKY Mobile', color: '#005EB8', initials: 'SM', textColor: '#fff' },
] as const;

// ===== CARD GESTORI ENERGY (per wizard step 4) =====
export const ENERGY_PROVIDER_CARDS = [
  { key: 'IREN SEV', name: 'Iren SEV', color: '#00A651', initials: 'IS', textColor: '#fff' },
  { key: 'A2A', name: 'A2A', color: '#0072BC', initials: 'A2', textColor: '#fff' },
  { key: 'ITALIA POWER', name: 'Italia Power', color: '#009246', initials: 'IP', textColor: '#fff' },
  { key: 'SORGENIA BOLLETTA EXPRESS', name: 'Sorgenia', color: '#FF6600', initials: 'SR', textColor: '#fff' },
  { key: 'SINERGY BOLLETTA EXPRESS', name: 'Sinergy', color: '#0066CC', initials: 'SN', textColor: '#fff' },
  { key: 'ENEL AB CONTACT', name: 'Enel', color: '#FF8000', initials: 'EN', textColor: '#fff' },
  { key: 'OPTIMA', name: 'Optima', color: '#0047AB', initials: 'OP', textColor: '#fff' },
  { key: 'ACEA WIND3', name: 'Acea Wind3', color: '#6B35A0', initials: 'AW', textColor: '#fff' },
  { key: 'ENI PLENITUDE', name: 'Eni Plenitude', color: '#008542', initials: 'EP', textColor: '#fff' },
  { key: 'EDISON', name: 'Edison', color: '#0055A4', initials: 'ED', textColor: '#fff' },
] as const;
