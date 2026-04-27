import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';
import Link from 'next/link';
import { ArrowLeft, Globe, DeviceMobile, Lightning } from 'phosphor-react';

type OfferCategory = 'FIXED_LINE' | 'MOBILE' | 'ENERGY';

interface Offer {
  id: string;
  category?: OfferCategory;
  provider: string;
  name: string;
  canone: string;
  attivazione?: string;
  vincolo?: string;
  note?: string;
  disattivazione?: string;
  type: string;
  scadenza?: string;
  is_active: boolean;
  sort_order: number;
  details?: Record<string, any> | null;
}

// Provider per categoria. Estendibile aggiungendo elementi all'array.
const PROVIDERS_BY_CATEGORY: Record<OfferCategory, string[]> = {
  FIXED_LINE: [
    'TIM_FIBRA',
    'VODAFONE',
    'WINDTRE',
    'ILIAD',
    'OPTIMA',
    'IREN',
    'SKY',
  ],
  MOBILE: [
    'TIM',
    'VODAFONE',
    'WIND3',
    'ILIAD',
    'KENA',
    'HO',
    'VERY',
    'OPTIMA',
    'ITALIA_POWER',
    'EMOBILE24',
    'FASTWEB',
    'SKY_MOBILE',
    'TISCALI',
  ],
  ENERGY: [
    'OPTIMA',
    'IREN',
    'ITALIA POWER',
    'WINDTRE',
    'ACEA',
    'FASTWEB',
    'A2A',
  ],
};

const META_BY_CATEGORY: Record<
  OfferCategory,
  { title: string; icon: any; accent: string; description: string }
> = {
  FIXED_LINE: {
    title: 'Offerte Rete Fissa',
    icon: Globe,
    accent: 'amber',
    description: 'Gestione offerte FTTH/FTTC/FWA per i wizard di rete fissa',
  },
  MOBILE: {
    title: 'Offerte Rete Mobile',
    icon: DeviceMobile,
    accent: 'indigo',
    description: 'Gestione offerte SIM / MNP visibili nei wizard mobile',
  },
  ENERGY: {
    title: 'Offerte Luce e Gas',
    icon: Lightning,
    accent: 'orange',
    description: 'Gestione offerte energia per i wizard luce/gas',
  },
};

export default function OffersManagementPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const category: OfferCategory = useMemo(() => {
    const raw = (router.query.category as string) || 'FIXED_LINE';
    return ['FIXED_LINE', 'MOBILE', 'ENERGY'].includes(raw)
      ? (raw as OfferCategory)
      : 'FIXED_LINE';
  }, [router.query.category]);

  const meta = META_BY_CATEGORY[category];
  const PROVIDERS = PROVIDERS_BY_CATEGORY[category];
  const Icon = meta.icon;

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [filterProvider, setFilterProvider] = useState<string>('');
  const [detailsJson, setDetailsJson] = useState<string>('');

  const emptyOffer: Offer = {
    id: '',
    category,
    provider: PROVIDERS[0],
    name: '',
    canone: '',
    attivazione: '',
    vincolo: '',
    note: '',
    disattivazione: '',
    type: 'consumer',
    scadenza: '',
    is_active: true,
    sort_order: 0,
    details: null,
  };

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'SUPER_ADMIN') {
      router.push('/login');
      return;
    }
    if (!router.isReady) return;
    fetchOffers();
    setFilterProvider('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user, router.isReady, category]);

  const fetchOffers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/offers?category=${category}`);
      setOffers(res.data);
    } catch (error: any) {
      console.error('Errore caricamento offerte:', error);
      alert('Errore caricamento offerte: ' + (error?.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingOffer) return;
    try {
      const { id, created_at, updated_at, ...rest } = editingOffer as any;
      // Parse details JSON se presente
      let payload = { ...rest, category };
      if (detailsJson.trim()) {
        try {
          payload.details = JSON.parse(detailsJson);
        } catch {
          alert('JSON Details non valido');
          return;
        }
      } else {
        payload.details = null;
      }
      if (isCreating) {
        await api.post('/admin/offers', payload);
      } else {
        await api.patch(`/admin/offers/${editingOffer.id}`, payload);
      }
      setEditingOffer(null);
      setIsCreating(false);
      setDetailsJson('');
      fetchOffers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Errore durante il salvataggio');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Eliminare l'offerta "${name}"?`)) return;
    try {
      await api.delete(`/admin/offers/${id}`);
      fetchOffers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Errore eliminazione');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.patch(`/admin/offers/${id}/toggle`);
      fetchOffers();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Errore');
    }
  };

  const filteredOffers = filterProvider
    ? offers.filter((o) => o.provider === filterProvider)
    : offers;

  if (loading) return <div className="p-4 md:p-8 text-white bg-gray-900 min-h-screen">Caricamento...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <Icon className="w-7 h-7" weight="duotone" />
              {meta.title}
            </h1>
            <p className="text-gray-400 text-sm mt-1">{meta.description}</p>
            <Link
              href="/admin/dashboard"
              className="text-amber-400 hover:text-amber-300 text-sm flex items-center gap-1 mt-2"
            >
              <ArrowLeft className="w-4 h-4" /> Torna alla Dashboard Admin
            </Link>
          </div>
          <button
            onClick={() => {
              setEditingOffer({ ...emptyOffer });
              setDetailsJson('');
              setIsCreating(true);
            }}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-white font-medium"
            data-testid="offer-new-btn"
          >
            + Nuova Offerta
          </button>
        </div>

        <div className="mb-4 flex gap-2 bg-gray-800 p-1 rounded-lg w-fit">
          {(['FIXED_LINE', 'MOBILE', 'ENERGY'] as OfferCategory[]).map((cat) => {
            const m = META_BY_CATEGORY[cat];
            const MIcon = m.icon;
            const isActive = cat === category;
            return (
              <Link
                key={cat}
                href={`/admin/offers?category=${cat}`}
                className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
                data-testid={`offer-cat-${cat}`}
              >
                <MIcon className="w-4 h-4" />
                {cat === 'FIXED_LINE' ? 'Rete fissa' : cat === 'MOBILE' ? 'Mobile' : 'Luce/Gas'}
              </Link>
            );
          })}
        </div>

        <div className="mb-4 flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            value={filterProvider}
            onChange={(e) => setFilterProvider(e.target.value)}
            className="w-full sm:w-auto bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white"
            data-testid="offer-filter-provider"
          >
            <option value="">Tutti i provider</option>
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <span className="text-gray-300 text-sm">{filteredOffers.length} offerte</span>
        </div>

        {editingOffer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 p-4 md:p-6 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg md:text-xl font-bold mb-4 text-white">
                {isCreating ? 'Nuova Offerta' : 'Modifica Offerta'}
                <span className="text-sm text-gray-400 ml-2">· {meta.title}</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Provider *</label>
                  <select
                    value={editingOffer.provider}
                    onChange={(e) => setEditingOffer({ ...editingOffer, provider: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Tipo *</label>
                  <select
                    value={editingOffer.type}
                    onChange={(e) => setEditingOffer({ ...editingOffer, type: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  >
                    <option value="consumer">Consumer</option>
                    <option value="business">Business</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Nome Offerta *</label>
                  <input
                    type="text"
                    value={editingOffer.name}
                    onChange={(e) => setEditingOffer({ ...editingOffer, name: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder={
                      category === 'MOBILE'
                        ? 'TIM POWER FAMIGLIA 4,99'
                        : category === 'ENERGY'
                        ? 'OFFERTA FISSA 12 MESI'
                        : 'TIM WIFI CASA+NETFLIX'
                    }
                    data-testid="offer-name-input"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Canone *</label>
                  <input
                    type="text"
                    value={editingOffer.canone}
                    onChange={(e) => setEditingOffer({ ...editingOffer, canone: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="€27,90"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Attivazione</label>
                  <input
                    type="text"
                    value={editingOffer.attivazione || ''}
                    onChange={(e) => setEditingOffer({ ...editingOffer, attivazione: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="€19,99 (una tantum)"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Vincolo</label>
                  <input
                    type="text"
                    value={editingOffer.vincolo || ''}
                    onChange={(e) => setEditingOffer({ ...editingOffer, vincolo: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="24 mesi"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Scadenza</label>
                  <input
                    type="text"
                    value={editingOffer.scadenza || ''}
                    onChange={(e) => setEditingOffer({ ...editingOffer, scadenza: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="31/12/2025"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Disattivazione</label>
                  <input
                    type="text"
                    value={editingOffer.disattivazione || ''}
                    onChange={(e) => setEditingOffer({ ...editingOffer, disattivazione: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="Dettagli uscita"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Note</label>
                  <textarea
                    value={editingOffer.note || ''}
                    onChange={(e) => setEditingOffer({ ...editingOffer, note: e.target.value })}
                    rows={3}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  />
                </div>
                {/* Campo Details JSON */}
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">
                    Details JSON {category === 'MOBILE' ? '(minutes, sms, gb, has_5g...)' : category === 'ENERGY' ? '(fornitura, f1, pcv, pagamento...)' : ''}
                  </label>
                  <textarea
                    value={detailsJson}
                    onChange={(e) => setDetailsJson(e.target.value)}
                    rows={5}
                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-green-400 font-mono text-xs"
                    placeholder={`Esempio ${category}:
${category === 'MOBILE' ? '{"minutes":"ILLIMITATE","sms":"200","gb":"150GB","has_5g":true}' : category === 'ENERGY' ? '{"fornitura":"LUCE","tipo_offerta":"FISSO","f1":"0,22","pcv":"12"}' : '{}'}`}
                  />
                  <p className="text-xs text-gray-500 mt-1">Lascia vuoto per non usare details. Deve essere JSON valido.</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Ordine</label>
                  <input
                    type="number"
                    value={editingOffer.sort_order}
                    onChange={(e) =>
                      setEditingOffer({ ...editingOffer, sort_order: parseInt(e.target.value) || 0 })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingOffer.is_active}
                      onChange={(e) =>
                        setEditingOffer({ ...editingOffer, is_active: e.target.checked })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-gray-300 text-sm">Offerta attiva</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-4">
                <button
                  onClick={() => {
                    setEditingOffer(null);
                    setIsCreating(false);
                    setDetailsJson('');
                  }}
                  className="px-4 py-2 text-gray-300 hover:text-white"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSave}
                  className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-white font-medium"
                  data-testid="offer-save-btn"
                >
                  Salva
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Provider</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Nome</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Canone</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Tipo</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Stato</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700 bg-gray-900">
              {filteredOffers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Nessuna offerta {category === 'FIXED_LINE' ? 'rete fissa' : category === 'MOBILE' ? 'mobile' : 'luce/gas'}. Creane una nuova.
                  </td>
                </tr>
              ) : (
                filteredOffers.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-800">
                    <td className="px-4 py-3 text-sm text-gray-200">{o.provider}</td>
                    <td className="px-4 py-3 text-sm text-gray-200 font-medium">{o.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-200">{o.canone}</td>
                    <td className="px-4 py-3 text-sm text-gray-400 uppercase text-xs">{o.type}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(o.id)}
                        className={`text-xs font-bold px-2 py-1 rounded ${
                          o.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {o.is_active ? 'Attiva' : 'Disattivata'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <button
                        onClick={() => {
                          setEditingOffer(o);
                          setDetailsJson(o.details ? JSON.stringify(o.details, null, 2) : '');
                          setIsCreating(false);
                        }}
                        className="text-indigo-400 hover:text-indigo-300 mr-3"
                      >
                        Modifica
                      </button>
                      <button
                        onClick={() => handleDelete(o.id, o.name)}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        Elimina
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
