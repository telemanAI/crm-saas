// Componente UI riusabile: select con opzioni predefinite + campo "Altro" di
// testo libero. Pattern comune in MOBILE ed ENERGY per i campi con lista fissa
// di provider/gestori/offerte con la possibilità di scrivere a mano.
//
// Uso:
//   <SelectWithOther
//     label="Gestore di provenienza *"
//     value={data.gestoreProvenienza}
//     otherValue={data.gestoreProvenienzaAltro}
//     onChange={(v) => update({ gestoreProvenienza: v })}
//     onOtherChange={(v) => update({ gestoreProvenienzaAltro: v })}
//     options={GESTORI_MOBILE_PROVENIENZA}
//   />
import { CaretDown } from 'phosphor-react';

interface Props {
  label: string;
  value?: string;
  otherValue?: string;
  onChange: (v: string) => void;
  onOtherChange: (v: string) => void;
  options: readonly string[] | ReadonlyArray<{ value: string; label: string }>;
  required?: boolean;
  placeholder?: string;
  otherPlaceholder?: string;
  hint?: string;
  testId?: string;
}

export function SelectWithOther({
  label,
  value,
  otherValue,
  onChange,
  onOtherChange,
  options,
  required,
  placeholder = '-- Seleziona --',
  otherPlaceholder = 'Specifica il valore',
  hint,
  testId,
}: Props) {
  // Normalizza options: sempre a forma {value, label}
  const normalized = options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o,
  );

  // Aggiungiamo automaticamente la voce "ALTRO" se non già presente.
  const hasAltro = normalized.some(
    (o) => o.value.toUpperCase() === 'ALTRO' || o.label.toUpperCase() === 'ALTRO',
  );
  const listWithAltro = hasAltro ? normalized : [...normalized, { value: 'ALTRO', label: 'Altro' }];

  const isOther = value === 'ALTRO';

  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        {label}
        {required && <span className="text-rose-400 ml-1">*</span>}
      </label>
      {hint && <p className="text-xs text-slate-500 mb-2">{hint}</p>}

      <div className="relative">
        <select
          value={value || ''}
          onChange={(e) => {
            onChange(e.target.value);
            // Se l'utente cambia selezione via dropdown, azzera il campo "altro"
            // solo quando il valore selezionato NON è più ALTRO.
            if (e.target.value !== 'ALTRO') onOtherChange('');
          }}
          className="w-full appearance-none bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 pr-10 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          data-testid={testId}
        >
          <option value="">{placeholder}</option>
          {listWithAltro.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <CaretDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
      </div>

      {isOther && (
        <input
          type="text"
          value={otherValue || ''}
          onChange={(e) => onOtherChange(e.target.value)}
          placeholder={otherPlaceholder}
          className="mt-2 w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          data-testid={testId ? `${testId}-altro` : undefined}
        />
      )}
    </div>
  );
}
