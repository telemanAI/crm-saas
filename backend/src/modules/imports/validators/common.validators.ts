export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export class CommonValidators {
  static fiscalCode(value: string): ValidationResult {
    if (!value) return { valid: false, error: 'Codice fiscale obbligatorio' };
    
    const cleaned = value.toUpperCase().trim();
    const regex = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/;
    
    if (!regex.test(cleaned)) {
      return { valid: false, error: 'Formato codice fiscale non valido' };
    }
    
    return { valid: true };
  }

  static email(value: string): ValidationResult {
    if (!value) return { valid: true }; // Email opzionale
    
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(value)) {
      return { valid: false, error: 'Formato email non valido' };
    }
    
    return { valid: true };
  }

  static phone(value: string): ValidationResult {
    if (!value) return { valid: false, error: 'Telefono obbligatorio' };
    
    const cleaned = value.replace(/[\s\-\(\)]/g, '');
    const regex = /^(\+39)?[0-9]{9,11}$/;
    
    if (!regex.test(cleaned)) {
      return { valid: false, error: 'Formato telefono non valido' };
    }
    
    return { valid: true };
  }

  static required(value: any, fieldName: string): ValidationResult {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return { valid: false, error: `${fieldName} è obbligatorio` };
    }
    return { valid: true };
  }

  static normalizeStatus(value: string, context: 'PRACTICE' | 'OPERATIONAL'): string {
    if (!value) return context === 'PRACTICE' ? 'draft' : 'PENDING';
    
    const normalized = value.toLowerCase().trim();
    
    if (context === 'PRACTICE') {
      const statusMap = {
        'bozza': 'draft',
        'draft': 'draft',
        'in lavorazione': 'in_progress',
        'in corso': 'in_progress',
        'in attesa': 'in_progress',
        'processing': 'in_progress',
        'completata': 'completed',
        'finita': 'completed',
        'attivata': 'completed',
        'done': 'completed',
        'annullata': 'cancelled',
        'cancellata': 'cancelled',
        'rifiutata': 'cancelled',
        'ko': 'cancelled',
      };
      return statusMap[normalized] || 'draft';
    } else {
      const operationalMap: Record<string, string> = {
        // PENDING — grigio
        'pending': 'PENDING',
        'in attesa': 'PENDING',
        'da fare': 'PENDING',
        'da inserire': 'PENDING',
        'da attivare': 'PENDING',
        'nuova': 'PENDING',
        'bozza': 'PENDING',
        'new': 'PENDING',
        'aperta': 'PENDING',
        'stand by': 'PENDING',
        'sospesa': 'PENDING',
        
        // IN_PROGRESS — giallo
        'in lavorazione': 'IN_PROGRESS',
        'in corso': 'IN_PROGRESS',
        'processing': 'IN_PROGRESS',
        'in delivery': 'IN_PROGRESS',
        'inviata': 'IN_PROGRESS',
        'presa in carico': 'IN_PROGRESS',
        'working': 'IN_PROGRESS',
        'lavorazione': 'IN_PROGRESS',
        'esecuzione': 'IN_PROGRESS',
        'in gestione': 'IN_PROGRESS',
        
        // ACTIVATED — verde
        'attivata': 'ACTIVATED',
        'attiva': 'ACTIVATED',
        'completed': 'ACTIVATED',
        'completata': 'ACTIVATED',
        'finita': 'ACTIVATED',
        'conclusa': 'ACTIVATED',
        'terminata': 'ACTIVATED',
        'installata': 'ACTIVATED',
        'attivo': 'ACTIVATED',
        'done': 'ACTIVATED',
        'ok': 'ACTIVATED',
        'successo': 'ACTIVATED',
        'chiusa positivamente': 'ACTIVATED',
        
        // REJECTED — rosso
        'rifiutata': 'REJECTED',
        'rejected': 'REJECTED',
        'ko': 'REJECTED',
        'annullata': 'REJECTED',
        'cancellata': 'REJECTED',
        'chiusa': 'REJECTED',
        'fallita': 'REJECTED',
        'errata': 'REJECTED',
        'rifiutato': 'REJECTED',
        'annullato': 'REJECTED',
        'cancellato': 'REJECTED',
        'negativo': 'REJECTED',
        'respinta': 'REJECTED',
        'chiusa negativamente': 'REJECTED',
      };
      return operationalMap[normalized] || 'PENDING';
    }
  }

  static normalizePhone(value: string): string {
    if (!value) return '';
    let cleaned = value.replace(/[\s\-\(\)]/g, '');
    if (cleaned.startsWith('00')) cleaned = '+' + cleaned.substring(2);
    if (cleaned.startsWith('3') && cleaned.length === 10) cleaned = '+39' + cleaned;
    return cleaned;
  }

  static extractPrice(value: string): string {
    if (!value) return '0';
    const match = value.toString().match(/€?\s?(\d+[\.,]?\d*)/);
    return match ? match[1].replace(',', '.') : value.toString();
  }
}