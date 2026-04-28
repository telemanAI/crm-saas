import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';
import Link from 'next/link';
import {
  ArrowLeft,
  Globe,
  DeviceMobile,
  Lightning,
  DotsSixVertical,
  CaretDown,
  CaretRight,
} from 'phosphor-react';

import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

// Map colori statici (Tailwind JIT non supporta template literal dinamici)
const ACCENT_CLASSES: Record<
  string,
  { border: string; bg: string; bgHover: string; text: string }
> = {
  amber: {
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/10',
    bgHover: 'hover:bg-amber-500/15',
    text: 'text-amber-200',
  },
  indigo: {
    border: 'border-indigo-500/20',
    bg: 'bg-indigo-500/10',
    bgHover: 'hover:bg-indigo-500/15',
    text: 'text-indigo-200',
  },
  orange: {
    border: 'border-orange-500/20',
    bg: 'bg-orange-500/10',
    bgHover: 'hover:bg-orange-500/15',
    text: 'text-orange-200',
  },
};

// ---------- Sortable single row ----------
function SortableOfferRow({
  offer,
  onEdit,
  onDelete,
  onToggle,
}: {
  offer: Offer;
  onEdit: (o: Offer) => void;
  onDelete: (id: string, name: string) => void;
  onToggle: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: offer.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`offer-row-${offer.id}`}
      className={`grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_2fr_1fr_1fr_auto_auto] gap-2 md:gap-4 items-center bg-gray-900 hover:bg-gray-800/80 border border-gray-700 rounded-lg px-3 py-2.5 transition ${
        isDragging ? 'ring-2 ring-indigo-500 shadow-xl' : ''
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-indigo-400 p-1 touch-none"
        aria-label="Trascina per riordinare"
        data-testid={`offer-drag-handle-${offer.id}`}
      >
        <DotsSixVertical className="w-5 h-5" weight="bold" />
      </button>

      <div className="min-w-0">
        <div className="font-medium text-white truncate">{offer.name}</div>
        <div className="text-xs text-gray-400 uppercase mt-0.5 md:hidden">
          {offer.type} · {offer.canone}
        </div>
      </div>

      <div className="hidden md:block text-sm text-gray-200 font-semibold">
        {offer.canone}
      </div>
      <div className="hidden md:block text-xs text-gray-400 uppercase">
        {offer.type}
      </div>

      <button
        onClick={() => onToggle(offer.id)}
        className={`text-xs font-bold px-2 py-1 rounded whitespace-nowrap ${
          offer.is_active
            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
        }`}
        data-testid={`offer-toggle-${offer.id}`}
      >
        {offer.is_active ? 'Attiva' : 'Off'}
      </button>

      <div className="flex gap-2 text-sm whitespace-nowrap col-span-3 md:col-span-1 justify-end md:justify-start">
        <button
          onClick={() => onEdit(offer)}
          className="text-indigo-400 hover:text-indigo-300"
          data-testid={`offer-edit-${offer.id}`}
        >
          Modifica
        </button>
        <button
          onClick={() => onDelete(offer.id, offer.name)}
          className="text-rose-400 hover:text-rose-300"
          data-testid={`offer-delete-${offer.id}`}
        >
          Elimina
        </button>
      </div>
    </div>
  );
}

// ---------- Provider Card (sortable group) ----------
function ProviderCard({
  provider,
  offers,
  onReorder,
  onEdit,
  onDelete,
  onToggle,
  accent,
}: {
  provider: string;
  offers: Offer[];
  onReorder: (provider: string, newOrder: Offer[]) => void;
  onEdit: (o: Offer) => void;
  onDelete: (id: string, name: string) => void;
  onToggle: (id: string) => void;
  accent: string;
}) {
  const [open, setOpen] = useState(true);
  const colors = ACCENT_CLASSES[accent] || ACCENT_CLASSES.indigo;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = offers.findIndex((o) => o.id === active.id);
    const newIndex = offers.findIndex((o) => o.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newOrder = arrayMove(offers, oldIndex, newIndex);
    onReorder(provider, newOrder);
  };

  return (
    <div
      className={`rounded-xl border ${colors.border} bg-gray-800/40 overflow-hidden`}
      data-testid={`provider-card-${provider}`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 ${colors.bg} ${colors.bgHover} transition`}
        data-testid={`provider-toggle-${provider}`}
      >
        <div className="flex items-center gap-2">
          {open ? (
            <CaretDown className={`w-4 h-4 ${colors.text}`} weight="bold" />
          ) : (
            <CaretRight className={`w-4 h-4 ${colors.text}`} weight="bold" />
          )}
          <span className={`font-bold ${colors.text} tracking-wide`}>
            {provider}
          </span>
          <span className="text-xs text-gray-400 bg-gray-900/60 rounded-full px-2 py-0.5">
            {offers.length}
          </span>
        </div>
        <span className="text-xs text-gray-500 hidden sm:inline">
          trascina le offerte per riordinarle
        </span>
      </button>

      {open && (
        <div className="p-3 space-y-2">
          {offers.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-4">
              Nessuna offerta
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={offers.map((o) => o.id)}
                strategy={verticalListSortingStrategy}
              >
                {offers.map((offer) => (
                  <SortableOfferRow
                    key={offer.id}
                    offer={offer}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onToggle={onToggle}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Main page ----------
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
  const Icon = meta.icon;

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [filterProvider, setFilterProvider] = useState<string>('');
  const [detailsJson, setDetailsJson] = useState<string>('');
  const [savingOrderFor, setSavingOrderFor] = useState<string | null>(null);

  const emptyOffer: Offer = {
    id: '',
    category,
    provider: '',
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
      setOffers(res.data as Offer[]);
    } catch (error: any) {
      console.error('Errore caricamento offerte:', error);
      alert(
        'Errore caricamento offerte: ' +
          (error?.response?.data?.message || error.message),
      );
    } finally {
      setLoading(false);
    }
  };

  // Raggruppa per provider, rispettando l'ordine corrente
  const groupedOffers = useMemo(() => {
    const groups: Record<string, Offer[]> = {};
    const source = filterProvider
      ? offers.filter((o) => o.provider === filterProvider)
      : offers;
    for (const o of source) {
      if (!groups[o.provider]) groups[o.provider] = [];
      groups[o.provider].push(o);
    }
    for (const p of Object.keys(groups)) {
      groups[p].sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return a.name.localeCompare(b.name);
      });
    }
    return groups;
  }, [offers, filterProvider]);

  const providerList = useMemo(
    () => Object.keys(groupedOffers).sort((a, b) => a.localeCompare(b)),
    [groupedOffers],
  );

  const allProviders = useMemo(
    () => [...new Set(offers.map((o) => o.provider))].sort(),
    [offers],
  );

  const handleReorder = async (provider: string, newOrder: Offer[]) => {
    // 1) update ottimistico locale
    const updated = [...offers];
    newOrder.forEach((o, index) => {
      const idx = updated.findIndex((x) => x.id === o.id);
      if (idx !== -1) {
        updated[idx] = { ...updated[idx], sort_order: index };
      }
    });
    setOffers(updated);

    // 2) salvataggio sul backend
    setSavingOrderFor(provider);
    try {
      const items = newOrder.map((o, index) => ({
        id: o.id,
        sort_order: index,
      }));
      await api.patch('/admin/offers/reorder', { items });
    } catch (error: any) {
      alert(
        'Errore salvataggio ordine: ' +
          (error?.response?.data?.message || error.message),
      );
      // Ricarica per tornare allo stato server
      fetchOffers();
    } finally {
      setSavingOrderFor(null);
    }
  };

  const handleSave = async () => {
    if (!editingOffer) return;
    try {
      const { id, created_at, updated_at, sort_order, ...rest } =
        editingOffer as any;
      let payload: any = { ...rest, category };
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
        // per le nuove offerte, metti in coda al suo gruppo
        const sameProvider = offers.filter(
          (o) => o.provider === editingOffer.provider,
        );
        const nextOrder =
          sameProvider.length > 0
            ? Math.max(...sameProvider.map((o) => o.sort_order)) + 1
            : 0;
        payload.sort_order = nextOrder;
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

  if (loading)
    return (
      <div className="p-4 md:p-8 text-white bg-gray-900 min-h-screen">
        Caricamento...
      </div>
    );

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
          <div className="flex gap-2">
            {savingOrderFor && (
              <span
                className="text-xs text-indigo-300 self-center animate-pulse"
                data-testid="offer-saving-order"
              >
                Salvataggio ordine…
              </span>
            )}
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
            {allProviders.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <span className="text-gray-300 text-sm">{offers.length} offerte totali</span>
          <span className="text-gray-500 text-xs hidden sm:inline">
            · Trascina <DotsSixVertical className="w-3 h-3 inline" /> per
            riordinare all'interno di un provider
          </span>
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
                    onChange={(e) =>
                      setEditingOffer({ ...editingOffer, provider: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  >
                    {allProviders.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    <option value="TIM_FIBRA">TIM_FIBRA</option>
                    <option value="VODAFONE">VODAFONE</option>
                    <option value="WINDTRE">WINDTRE</option>
                    <option value="ILIAD">ILIAD</option>
                    <option value="OPTIMA">OPTIMA</option>
                    <option value="IREN">IREN</option>
                    <option value="SKY">SKY</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Tipo *</label>
                  <select
                    value={editingOffer.type}
                    onChange={(e) =>
                      setEditingOffer({ ...editingOffer, type: e.target.value })
                    }
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
                    onChange={(e) =>
                      setEditingOffer({ ...editingOffer, name: e.target.value })
                    }
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
                    onChange={(e) =>
                      setEditingOffer({ ...editingOffer, canone: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="€27,90"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Attivazione</label>
                  <input
                    type="text"
                    value={editingOffer.attivazione || ''}
                    onChange={(e) =>
                      setEditingOffer({
                        ...editingOffer,
                        attivazione: e.target.value,
                      })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="€19,99 (una tantum)"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Vincolo</label>
                  <input
                    type="text"
                    value={editingOffer.vincolo || ''}
                    onChange={(e) =>
                      setEditingOffer({ ...editingOffer, vincolo: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="24 mesi"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Scadenza</label>
                  <input
                    type="text"
                    value={editingOffer.scadenza || ''}
                    onChange={(e) =>
                      setEditingOffer({ ...editingOffer, scadenza: e.target.value })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="31/12/2025"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Disattivazione</label>
                  <input
                    type="text"
                    value={editingOffer.disattivazione || ''}
                    onChange={(e) =>
                      setEditingOffer({
                        ...editingOffer,
                        disattivazione: e.target.value,
                      })
                    }
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                    placeholder="Dettagli uscita"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">Note</label>
                  <textarea
                    value={editingOffer.note || ''}
                    onChange={(e) =>
                      setEditingOffer({ ...editingOffer, note: e.target.value })
                    }
                    rows={3}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-300 mb-1">
                    Details JSON{' '}
                    {category === 'MOBILE'
                      ? '(minutes, sms, gb, has_5g...)'
                      : category === 'ENERGY'
                      ? '(fornitura, f1, pcv, pagamento...)'
                      : ''}
                  </label>
                  <textarea
                    value={detailsJson}
                    onChange={(e) => setDetailsJson(e.target.value)}
                    rows={5}
                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-green-400 font-mono text-xs"
                    placeholder={`Esempio ${category}:
${
  category === 'MOBILE'
    ? '{"minutes":"ILLIMITATE","sms":"200","gb":"150GB","has_5g":true}'
    : category === 'ENERGY'
    ? '{"fornitura":"LUCE","tipo_offerta":"FISSO","f1":"0,22","pcv":"12"}'
    : '{}'
}`}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Lascia vuoto per non usare details. Deve essere JSON valido.
                  </p>
                </div>
                <div className="md:col-span-2 flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingOffer.is_active}
                      onChange={(e) =>
                        setEditingOffer({
                          ...editingOffer,
                          is_active: e.target.checked,
                        })
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

        {providerList.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-500 border border-dashed border-gray-700 rounded-xl">
            Nessuna offerta{' '}
            {category === 'FIXED_LINE'
              ? 'rete fissa'
              : category === 'MOBILE'
              ? 'mobile'
              : 'luce/gas'}
            . Creane una nuova.
          </div>
        ) : (
          <div className="space-y-4">
            {providerList.map((provider) => (
              <ProviderCard
                key={provider}
                provider={provider}
                offers={groupedOffers[provider]}
                onReorder={handleReorder}
                onEdit={(o) => {
                  setEditingOffer(o);
                  setDetailsJson(
                    o.details ? JSON.stringify(o.details, null, 2) : '',
                  );
                  setIsCreating(false);
                }}
                onDelete={handleDelete}
                onToggle={handleToggle}
                accent={meta.accent}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
