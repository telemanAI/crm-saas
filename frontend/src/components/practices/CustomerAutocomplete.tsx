// Ricerca/autocomplete cliente per codice fiscale / telefono / nome.
// Versione riusabile per i wizard MOBILE ed ENERGY (il wizard rete fissa
// ne ha una sua versione inline più complessa che per ora non tocchiamo).
//
// Pattern:
//  - L'utente inizia a scrivere → chiamiamo /customers/search/by-* con debounce
//  - Mostriamo suggestion → on click prefillano tutti i campi + "bloccano" il cliente
//  - Se l'utente cambia i campi dopo il lock, sbloccano e riprende la ricerca
import { useEffect, useRef, useState } from 'react';
import { MagnifyingGlass } from 'phosphor-react';
import api from '@/lib/axios';

export interface CustomerLite {
  id: string;
  fiscalCode: string;
  firstName: string;
  lastName: string;
  phonePrimary?: string;
  phone?: string;
  email?: string;
  address?: any;
}

interface Props {
  value: {
    firstName?: string;
    lastName?: string;
    fiscalCode?: string;
    phone?: string;
    email?: string;
  };
  onPatch: (patch: Partial<Props['value']>) => void;
  onPick: (customer: CustomerLite) => void;
}

export function CustomerAutocomplete({ value, onPatch, onPick }: Props) {
  const [cfSuggestions, setCfSuggestions] = useState<CustomerLite[]>([]);
  const [showCf, setShowCf] = useState(false);
  const [searchingCf, setSearchingCf] = useState(false);
  const [locked, setLocked] = useState<CustomerLite | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Ricerca per CF
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (locked && value.fiscalCode === locked.fiscalCode) {
      setCfSuggestions([]);
      setShowCf(false);
      return;
    }
    const cf = (value.fiscalCode || '').trim();
    if (cf.length < 3) {
      setCfSuggestions([]);
      setShowCf(false);
      return;
    }
    setSearchingCf(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/customers/search/by-fiscal-code?code=${encodeURIComponent(cf)}`);
        setCfSuggestions(res.data || []);
        setShowCf((res.data || []).length > 0);
      } catch {
        setCfSuggestions([]);
      } finally {
        setSearchingCf(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value.fiscalCode, locked]);

  const pick = (c: CustomerLite) => {
    setLocked(c);
    setShowCf(false);
    onPick(c);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Nome <span className="text-rose-400">*</span></label>
          <input
            type="text"
            value={value.firstName || ''}
            onChange={(e) => { setLocked(null); onPatch({ firstName: e.target.value }); }}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            data-testid="cust-firstname"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Cognome <span className="text-rose-400">*</span></label>
          <input
            type="text"
            value={value.lastName || ''}
            onChange={(e) => { setLocked(null); onPatch({ lastName: e.target.value }); }}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            data-testid="cust-lastname"
          />
        </div>
      </div>

      <div className="relative">
        <label className="block text-sm font-medium text-slate-300 mb-2">Codice fiscale <span className="text-rose-400">*</span></label>
        <div className="relative">
          <input
            type="text"
            value={value.fiscalCode || ''}
            onChange={(e) => { setLocked(null); onPatch({ fiscalCode: e.target.value.toUpperCase().slice(0, 16) }); }}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            placeholder="RSSMRA85T10A562S"
            data-testid="cust-fiscalcode"
          />
          {searchingCf && <MagnifyingGlass className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 animate-pulse" />}
        </div>

        {showCf && cfSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden">
            {cfSuggestions.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => pick(c)}
                className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-0"
              >
                <p className="text-white font-medium">{c.fiscalCode}</p>
                <p className="text-sm text-slate-400">{c.firstName} {c.lastName}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Recapito cliente <span className="text-rose-400">*</span></label>
          <input
            type="tel"
            value={value.phone || ''}
            onChange={(e) => { setLocked(null); onPatch({ phone: e.target.value }); }}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            placeholder="Es. 3331234567"
            data-testid="cust-phone"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Email <span className="text-rose-400">*</span></label>
          <input
            type="email"
            value={value.email || ''}
            onChange={(e) => onPatch({ email: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            data-testid="cust-email"
          />
        </div>
      </div>

      {locked && (
        <div className="px-4 py-2 bg-emerald-900/20 border border-emerald-700/40 rounded-lg text-emerald-300 text-sm">
          ✓ Cliente esistente associato: {locked.firstName} {locked.lastName} · {locked.fiscalCode}
        </div>
      )}
    </div>
  );
}
