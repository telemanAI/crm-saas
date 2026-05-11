/**
 * Tipi condivisi del wizard mobile.
 * Copia FEDELE da `pages/operator/practices/new.tsx` (PC).
 */

export interface CustomerSuggestion {
  id: string;
  fiscalCode: string;
  firstName: string;
  lastName: string;
  phonePrimary?: string;
  phone?: string;
  email?: string;
  address?: any;
}

export interface WizardStep {
  id: number;
  stepId: string;
  title: string;
  icon: any;
}
