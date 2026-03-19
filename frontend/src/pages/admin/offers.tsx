import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';
import Link from 'next/link';

interface Offer {
  id: string;
  provider: string;
  name: string;
  canone: string;
  attivazione: string;
  vincolo: string;
  note: string;
  disattivazione: string;
  type: string;
  scadenza: string;
  is_active: boolean;
  sort_order: number;
}

const PROVIDERS = ['TIM', 'Vodafone', 'WindTre', 'Iliad', 'Optima', 'Iren', 'SKY'];

const emptyOffer: Partial<Offer> = {
  provider: 'TIM',
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
};

export default function AdminOffers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOffer, setEditingOffer] = useState<Partial<Offer> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [filterProvider, setFilterProvider] = useState<string>('');
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'SUPER_ADMIN') {
      router.push('/login');
      return;
    }
    fetchOffers();
  }, [isAuthenticated, user, router]);

  const fetchOffers = async () => {
    try {
      const response = await api.get('/admin/offers');
      setOffers(response.data);
    } catch (error) {
      console.error('Errore:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingOffer) return;
    
    try {
      if (isCreating) {
        await api.post('/admin/offers', editingOffer);
      } else {
        await api.patch(`/admin/offers/${editingOffer.id}`, editingOffer);
      }
      setEditingOffer(null);
      setIsCreating(false);
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
      alert(error.response?.data?.message || 'Errore durante l\'eliminazione');
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
    ? offers.filter(o => o.provider === filterProvider)
    : offers;

  if (loading) return <div className="p-8 text-white">Caricamento...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Gestione Offerte</h1>
            <Link href="/admin/dashboard" className="text-blue-400 hover:underline text-sm">
              ← Torna alla Dashboard
            </Link>
          </div>
          <button
            onClick={() => { setEditingOffer({...emptyOffer}); setIsCreating(true); }}
            className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-white"
          >
            + Nuova Offerta
          </button>
        </div>

        {/* Filtro Provider */}
        <div className="mb-4">
          <select
            value={filterProvider}
            onChange={(e) => setFilterProvider(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white"
          >
            <option value="">Tutti i provider</option>
            {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <span className="ml-4 text-gray-300">{filteredOffers.length} offerte</span>
        </div>

        {/* Modal Editing */}
        {editingOffer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4 text-white">
                {isCreating ? 'Nuova Offerta' : 'Modifica Offerta'}
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Provider *</label>
                  <select
                    value={editingOffer.provider}
                    onChange={(e) => setEditingOffer({...editingOffer, provider: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  >
                    {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Tipo *</label>
                  <select
                    value={editingOffer.type}
                    onChange={(e) => setEditingOffer({...editingOffer, type: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  >
                    <option value="consumer">Consumer</option>
                    <option value="business">Business</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Nome Offerta *</label>
                  <input
                    type="text"
                    value={editingOffer.name}
                    onChange={(e) => setEditingOffer({...editingOffer, name: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="TIM WIFI CASA+NETFLIX"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Canone *</label>
                  <input
                    type="text"
                    value={editingOffer.canone}
                    onChange={(e) => setEditingOffer({...editingOffer, canone: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="€27,90"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Attivazione</label>
                  <input
                    type="text"
                    value={editingOffer.attivazione || ''}
                    onChange={(e) => setEditingOffer({...editingOffer, attivazione: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="€39"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Vincolo</label>
                  <input
                    type="text"
                    value={editingOffer.vincolo || ''}
                    onChange={(e) => setEditingOffer({...editingOffer, vincolo: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="24 MESI"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Disattivazione</label>
                  <input
                    type="text"
                    value={editingOffer.disattivazione || ''}
                    onChange={(e) => setEditingOffer({...editingOffer, disattivazione: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="€5 per mese residuo"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Scadenza</label>
                  <input
                    type="text"
                    value={editingOffer.scadenza || ''}
                    onChange={(e) => setEditingOffer({...editingOffer, scadenza: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="31/12"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Ordine</label>
                  <input
                    type="number"
                    value={editingOffer.sort_order || 0}
                    onChange={(e) => setEditingOffer({...editingOffer, sort_order: parseInt(e.target.value) || 0})}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Note</label>
                  <textarea
                    value={editingOffer.note || ''}
                    onChange={(e) => setEditingOffer({...editingOffer, note: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    rows={2}
                    placeholder="CAUZIONE 99€"
                  />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingOffer.is_active}
                    onChange={(e) => setEditingOffer({...editingOffer, is_active: e.target.checked})}
                    className="w-4 h-4"
                  />
                  <label className="text-sm text-gray-300">Attiva</label>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => { setEditingOffer(null); setIsCreating(false); }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white"
                >
                  Annulla
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white"
                >
                  Salva
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabella Offerte */}
        <div className="overflow-x-auto rounded-lg border border-gray-700">
          <table className="w-full border-collapse">
            <thead className="bg-gray-800">
              <tr>
                <th className="p-3 text-left text-gray-100 font-semibold border-b border-gray-600">Provider</th>
                <th className="p-3 text-left text-gray-100 font-semibold border-b border-gray-600">Nome</th>
                <th className="p-3 text-left text-gray-100 font-semibold border-b border-gray-600">Canone</th>
                <th className="p-3 text-left text-gray-100 font-semibold border-b border-gray-600">Tipo</th>
                <th className="p-3 text-left text-gray-100 font-semibold border-b border-gray-600">Stato</th>
                <th className="p-3 text-left text-gray-100 font-semibold border-b border-gray-600">Azioni</th>
              </tr>
            </thead>
            <tbody className="bg-gray-900">
              {filteredOffers.map((offer) => (
                <tr key={offer.id} className={`border-b border-gray-700 hover:bg-gray-800 transition-colors ${!offer.is_active ? 'opacity-50' : ''}`}>
                  <td className="p-3 font-medium text-gray-100">{offer.provider}</td>
                  <td className="p-3 text-gray-100">{offer.name}</td>
                  <td className="p-3 text-gray-100">{offer.canone}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs text-white ${offer.type === 'business' ? 'bg-purple-600' : 'bg-blue-600'}`}>
                      {offer.type}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs text-white ${offer.is_active ? 'bg-green-600' : 'bg-red-600'}`}>
                      {offer.is_active ? 'Attiva' : 'Disattivata'}
                    </span>
                  </td>
                  <td className="p-3 flex gap-2">
                    <button
                      onClick={() => { setEditingOffer(offer); setIsCreating(false); }}
                      className="bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded text-sm text-white"
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => handleToggle(offer.id)}
                      className="bg-yellow-600 hover:bg-yellow-500 px-2 py-1 rounded text-sm text-white"
                    >
                      {offer.is_active ? 'Disattiva' : 'Attiva'}
                    </button>
                    <button
                      onClick={() => handleDelete(offer.id, offer.name)}
                      className="bg-red-600 hover:bg-red-500 px-2 py-1 rounded text-sm text-white"
                    >
                      Elimina
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOffers.length === 0 && (
          <p className="text-center text-gray-300 py-8">Nessuna offerta trovata</p>
        )}
      </div>
    </div>
  );
}