// Dropdown degli operatori (utenti dello shop) per i campi "Venduto da" e
// "Inserito da". Chiama l'endpoint esistente /users/operators.
import { useEffect, useState } from 'react';
import api from '@/lib/axios';

interface Props {
  label: string;
  value?: string; // userId
  onChange: (id: string, name: string) => void;
  testId?: string;
}

export function OperatorsDropdown({ label, value, onChange, testId }: Props) {
  const [operators, setOperators] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/users/operators');
        setOperators(res.data || []);
      } catch {
        setOperators([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="text-slate-400 text-sm">Caricamento operatori...</div>;

  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      <select
        value={value || ''}
        onChange={(e) => {
          const op = operators.find((o) => o.id === e.target.value);
          onChange(e.target.value, op ? `${op.firstName} ${op.lastName}` : '');
        }}
        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        data-testid={testId}
      >
        <option value="">-- Seleziona --</option>
        {operators.map((op) => (
          <option key={op.id} value={op.id}>{op.firstName} {op.lastName}</option>
        ))}
      </select>
    </div>
  );
}
