/**
 * Generatore di step dinamici per il wizard mobile.
 * Copia FEDELE della logica `getSteps` da `pages/operator/practices/new.tsx` (PC).
 */
import {
  Buildings, User, MapPin, Phone, CreditCard, FileText,
  Package, TelevisionSimple, Eye, Calendar,
} from 'phosphor-react';
import type { WizardStep } from './types';

export const baseSteps: WizardStep[] = [
  { id: 1, stepId: 'offer',    title: 'Tipo & Offerta',     icon: Buildings },
  { id: 2, stepId: 'sellers',  title: 'Venditore',          icon: User },
  { id: 3, stepId: 'customer', title: 'Anagrafica Cliente', icon: User },
];

export const getSteps = (
  offerName: string | undefined,
  enableWashStep: boolean,
  enableAdditionalPackages: boolean,
): WizardStep[] => {
  const upperOffer = offerName?.toUpperCase() || '';
  const hasSkyTv   = upperOffer.includes('SKY TV');
  const hasSkyWifi = upperOffer.includes('SKY WIFI');

  const isSkyTvOnly   = hasSkyTv && !hasSkyWifi;
  const isSkyWifiOnly = hasSkyWifi && !hasSkyTv;

  let currentId = 4;
  const dynamicSteps: WizardStep[] = [...baseSteps];

  if (hasSkyTv && enableAdditionalPackages) {
    dynamicSteps.push({ id: currentId++, stepId: 'packages', title: 'Pacchetti Aggiuntivi', icon: Package });
  }

  if (enableWashStep && (hasSkyTv || isSkyWifiOnly)) {
    dynamicSteps.push({ id: currentId++, stepId: 'wash', title: 'WASH', icon: TelevisionSimple });
  }

  if (!isSkyTvOnly) {
    dynamicSteps.push({ id: currentId++, stepId: 'line-new', title: 'Configurazione Linea', icon: MapPin });
    dynamicSteps.push({ id: currentId++, stepId: 'line-old', title: 'Dati Vecchia Linea',   icon: Phone });
  }

  dynamicSteps.push({ id: currentId++, stepId: 'payment',     title: 'Metodo di Pagamento',       icon: CreditCard });
  dynamicSteps.push({ id: currentId++, stepId: 'privacy',     title: 'Privacy',                   icon: FileText });
  dynamicSteps.push({ id: currentId++, stepId: 'appointment', title: 'Appuntamento Installazione', icon: Calendar });
  dynamicSteps.push({ id: currentId++, stepId: 'summary',     title: 'Riepilogo',                 icon: Eye });

  return dynamicSteps;
};
