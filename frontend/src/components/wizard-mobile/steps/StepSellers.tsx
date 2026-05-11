import OperatorsDropdown from '@/components/wizard-mobile/shared/OperatorsDropdown';
import { usePracticeWizardStore } from '@/stores/practiceWizardStore';
import { validateUUID } from '@/lib/wizard-mobile/validation';

/**
 * Step "Venditore + Inserito da".
 * Copia FEDELE del blocco `sellers` da `new.tsx` PC (rete fissa).
 * Usa lo stesso store + stesso endpoint `/users/operators`.
 */
export default function StepSellers() {
  const { data, setData } = usePracticeWizardStore();

  const valid =
    !!data.soldById &&
    !!data.enteredById &&
    validateUUID(data.soldById) &&
    validateUUID(data.enteredById);

  return (
    <div className="space-y-4">
      <OperatorsDropdown
        label="Venduto Da *"
        value={data.soldById}
        onChange={(id, name) => setData({ soldById: id, soldBy: name })}
      />
      <OperatorsDropdown
        label="Inserito Da *"
        value={data.enteredById}
        onChange={(id, name) => setData({ enteredById: id, enteredBy: name })}
      />
      {!valid && (
        <p className="text-xs text-rose-400">
          * Seleziona entrambi (venditore e operatore che ha inserito la pratica).
        </p>
      )}
    </div>
  );
}
