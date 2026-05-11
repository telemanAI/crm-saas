/**
 * Funzioni di validazione condivise.
 * Copia FEDELE da `pages/operator/practices/new.tsx` (PC) — NON modificare.
 */

export const validateFiscalCode = (cf: string): boolean => {
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

export const validatePhone = (phone: string): boolean => {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\.\(\)]/g, '');
  const regex = /^(\+[0-9]{1,4}|00[0-9]{1,4})?[0-9]{6,15}$/;
  return regex.test(cleaned) && cleaned.replace(/\D/g, '').length >= 8;
};

export const validateUUID = (uuid: string): boolean => {
  if (!uuid) return false;
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(uuid);
};

export const extractPrice = (priceStr: string): number => {
  if (!priceStr) return 0;
  const match = priceStr.match(/(\d+(?:[.,]\d+)?)/);
  return match ? parseFloat(match[1].replace(',', '.')) : 0;
};

// Funzione per determinare quali pacchetti sono già inclusi nell'offerta base
export const getExcludedPackageIds = (offerName: string): string[] => {
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
  if (upperOffer.includes('NETFLIX') &&
      !upperOffer.includes('NETFLIX PREMIUM') &&
      !upperOffer.includes('NETFLIX STANDARD')) {
    excluded.push('netflix-base');
  }

  return [...new Set(excluded)];
};
