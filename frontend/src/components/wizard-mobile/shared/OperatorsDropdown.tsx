import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';

interface Props {
  label: string;
  value?: string;
  onChange: (id: string, name: string) => void;
}

/**
 * Dropdown operatori usato dagli step "venditori" / "inserito da".
 * Carica dalla rotta `/users/operators` (stessa usata dal wizard PC).
 */
export default function OperatorsDropdown({ label, value, onChange }: Props) {
  const [operators, setOperators] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuthStore();

  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const response = await api.get('/users/operators', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setOperators(response.data || []);
      } catch (err) {
        console.error('Errore caricamento operatori:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOperators();
  }, [token]);

  if (loading) {
    return <div className="text-sm text-slate-500">Caricamento...</div>;
  }

  return (
    <label className="block">
      <span className="block text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</span>
      <select
        value={value || ''}
        onChange={(e) => {
          const selected = operators.find((o) => o.id === e.target.value);
          onChange(
            e.target.value,
            selected ? `${selected.firstName} ${selected.lastName}` : '',
          );
        }}
        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      >
        <option value="">-- Seleziona --</option>
        {operators.map((op) => (
          <option key={op.id} value={op.id}>
            {op.firstName} {op.lastName}
          </option>
        ))}
      </select>
    </label>
  );
}
