/**
 * TAPPA 3.1 — Componenti condivisi per le pagine Gare.
 *
 * Differenze rispetto alla Tappa 4:
 *  - CompetitionModal: nuovi campi `scopeType` (shop/company) e `isHidden`
 *  - TargetsBuilder: target a 3 modalità esplicite (category/provider/specific)
 *    con dropdown offerte dal catalogo (fetch /competitions/offers-options/:cat)
 *  - CopyModal invariato
 *  - Helpers (getStatus, CATEGORY_LABEL, ecc.) invariati
 *
 * Backward compat: i target Tappa 3 originale (matchProviders/matchOfferKeywords)
 * continuano a funzionare lato backend; il frontend mostra un alert "target
 * legacy — apri e riconverti" se incontra target senza targetType.
 */
import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/axios';
import {
  Plus,
  Trash,
  Trophy,
  Calendar,
  Target as TargetIcon,
  Gift,
  X,
  Copy,
  CheckCircle,
  Clock,
  Pause,
  EyeSlash,
  Buildings,
  Storefront,
  MagnifyingGlass,
} from 'phosphor-react';

// ============ Types ============
export type TargetCategory = 'FIXED_LINE' | 'MOBILE' | 'ENERGY' | 'DEVICE' | 'CUSTOM';
export type TargetType = 'category_generic' | 'provider_generic' | 'specific';
export type PrizeScope = 'OPERATOR' | 'SHOP' | 'COMPANY';
export type PrizeCategory =
  | 'FIXED_LINE' | 'MOBILE' | 'ENERGY' | 'DEVICE' | 'GLOBAL' | 'CUSTOM';
export type CompetitionScope = 'shop' | 'company';

export interface CompetitionTarget {
  id?: string;
  label: string;
  category: TargetCategory;
  targetType?: TargetType;
  provider?: string | null;
  offerIds?: string[];
  inventoryItemIds?: string[];
  // backward compat
  matchProviders: string[];
  matchOfferKeywords: string[];
  matchPracticeTypes: string[];
  targetPieces: number;
  sortOrder?: number;
  revenuePerPiece?: number;
}

export interface CompetitionPrize {
  id?: string;
  label: string;
  scope: PrizeScope;
  kind?: 'PIECES' | 'REVENUE';
  category: PrizeCategory;
  targetId?: string | null;
  threshold: number;
  prizeValue?: number | null;
  sortOrder?: number;
}

export interface Competition {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isAutoMonthly: boolean;
  templateKey: string | null;
  scopeType?: CompetitionScope;
  isHidden?: boolean;
  founderCompensation?: number;
  targets: CompetitionTarget[];
  prizes: CompetitionPrize[];
  createdAt: string;
}

export const CATEGORY_LABEL: Record<TargetCategory, string> = {
  FIXED_LINE: 'Rete fissa',
  MOBILE: 'Mobile',
  ENERGY: 'Luce/Gas',
  DEVICE: 'Dispositivi',
  CUSTOM: 'Custom',
};

export const PRIZE_SCOPE_LABEL: Record<PrizeScope, string> = {
  OPERATOR: 'Operatore',
  SHOP: 'Negozio',
  COMPANY: 'Azienda',
};

export const PRIZE_CATEGORY_LABEL: Record<PrizeCategory, string> = {
  GLOBAL: 'Tutto',
  FIXED_LINE: 'Rete fissa',
  MOBILE: 'Mobile',
  ENERGY: 'Luce/Gas',
  DEVICE: 'Dispositivi',
  CUSTOM: 'Custom',
};

const TARGET_TYPE_LABEL: Record<TargetType, string> = {
  category_generic: 'Tutta la categoria',
  provider_generic: 'Tutto un provider',
  specific: 'Promo specifiche',
};

export function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function getStatus(c: Competition): { label: string; color: string; icon: any } {
  const now = new Date();
  const start = new Date(c.startDate);
  const end = new Date(c.endDate);
  if (!c.isActive) return { label: 'Disattivata', color: 'bg-slate-700 text-slate-300', icon: Pause };
  if (now < start) return { label: 'In arrivo', color: 'bg-blue-500/20 text-blue-300', icon: Clock };
  if (now > end) return { label: 'Conclusa', color: 'bg-slate-700 text-slate-300', icon: CheckCircle };
  return { label: 'In corso', color: 'bg-emerald-500/20 text-emerald-300', icon: Trophy };
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
export function endOfMonthISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

// ============ Cache offers per categoria ============
type OffersOptions = {
  providers: string[];
  grouped: Record<string, Array<{ id: string; name: string; canone: string; type: string }>>;
};
type DeviceGroup = {
  id: string;
  name: string;
  sortOrder?: number;
  products: Array<{
    id: string;
    name: string;
    quantity: number;
    availableQuantity: number;
    unitCost: number | null;
    sellingPrice: number | null;
    sku: string;
  }>;
};
const offersCache: Record<string, OffersOptions> = {};
const deviceGroupsCache: Record<string, DeviceGroup[]> = {};

async function fetchOffersOptions(category: TargetCategory): Promise<OffersOptions> {
  if (offersCache[category]) return offersCache[category];
  if (category === 'CUSTOM' || category === 'DEVICE') {
    const empty = { providers: [], grouped: {} };
    offersCache[category] = empty;
    return empty;
  }
  try {
    const res = await api.get(`/competitions/offers-options/${category}`);
    offersCache[category] = res.data;
    return res.data;
  } catch {
    return { providers: [], grouped: {} };
  }
}

async function fetchDeviceGroups(q?: string): Promise<DeviceGroup[]> {
  const cacheKey = q || '_all';
  if (deviceGroupsCache[cacheKey]) return deviceGroupsCache[cacheKey];
  try {
    const res = await api.get(`/inventory/groups-with-products${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    deviceGroupsCache[cacheKey] = res.data;
    return res.data;
  } catch {
    return [];
  }
}

// ============ Modal Create/Edit ============
export function CompetitionModal({
  open, initial, onClose, onSaved,
}: {
  open: boolean;
  initial?: Competition | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [scopeType, setScopeType] = useState<CompetitionScope>('shop');
  const [isHidden, setIsHidden] = useState(false);
  const [templateKey, setTemplateKey] = useState('');
  // Tappa 3.2 — sotto-selezione shop per gare scope=company
  const [founderCompensation, setFounderCompensation] = useState<number>(0);
  const [selectedShopIds, setSelectedShopIds] = useState<string[]>([]);
  const [companyShops, setCompanyShops] = useState<Array<{
    shopId: string;
    name: string;
    subscriptionCode?: string;
    isActiveShop?: boolean;
  }>>([]);
  const [targets, setTargets] = useState<CompetitionTarget[]>([]);
  const [prizes, setPrizes] = useState<CompetitionPrize[]>([]);
  const [tab, setTab] = useState<'general' | 'targets' | 'prizes'>('general');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(initial?.title || '');
      setDescription(initial?.description || '');
      setStartDate(initial?.startDate?.slice(0, 10) || todayISO());
      setEndDate(initial?.endDate?.slice(0, 10) || endOfMonthISO());
      setIsActive(initial?.isActive ?? true);
      setScopeType((initial?.scopeType as CompetitionScope) || 'shop');
      setIsHidden(initial?.isHidden ?? false);
      setFounderCompensation(initial?.founderCompensation ?? 0);
      setTemplateKey(initial?.templateKey || '');
      setSelectedShopIds((initial as any)?.selectedShopIds || []);
      // Carica lista shop della company (best-effort)
      api
        .get('/competitions/company/shops')
        .then((r) => setCompanyShops(r.data || []))
        .catch(() => setCompanyShops([]));
      setTargets((initial?.targets || []).map((t) => ({
        ...t,
        targetType: t.targetType || (t.matchProviders?.length || t.matchOfferKeywords?.length ? 'specific' : 'category_generic'),
        offerIds: t.offerIds || [],
        inventoryItemIds: t.inventoryItemIds || [],
      })));
      setPrizes((initial?.prizes || []).map((p) => ({ ...p })));
      setTab('general');
    }
  }, [open, initial]);

  const submit = async () => {
    if (!title.trim()) return alert('Titolo obbligatorio');
    if (!startDate || !endDate) return alert('Inserisci date inizio e fine');
    if (startDate > endDate) return alert('Data inizio deve essere precedente a data fine');
    for (const t of targets) {
      if (!t.label.trim()) return alert('Tutti i target devono avere un nome');
      if (t.targetType === 'provider_generic' && !t.provider?.trim()) {
        return alert(`Target "${t.label}": seleziona un provider`);
      }
      if (t.targetType === 'specific' && (!t.offerIds || t.offerIds.length === 0)) {
        return alert(`Target "${t.label}": seleziona almeno una promo`);
      }
      if (t.category === 'DEVICE' && (!t.inventoryItemIds || t.inventoryItemIds.length === 0)) {
        return alert(`Target "${t.label}": seleziona almeno un prodotto dal catalogo`);
      }
    }
    for (const p of prizes) if (!p.label.trim()) return alert('Tutti i premi devono avere un nome');

    setSaving(true);
    try {
      // PHASE A FIX BUG #1: strip dei campi non whitelistati nel DTO backend
      // (forbidNonWhitelisted: true blocca id, competitionId, createdAt, updatedAt nei nested)
      const cleanTargets = targets.map((t, i) => ({
        // SOLO i campi previsti da TargetDto:
        label: t.label.trim(),
        category: t.category,
        targetType: t.targetType || 'category_generic',
        provider: t.provider?.trim() || null,
        offerIds: t.targetType === 'specific' ? (t.offerIds || []) : [],
        inventoryItemIds: t.inventoryItemIds || [],
        matchProviders: (t.matchProviders || []).filter(Boolean).map((s) => s.trim().toUpperCase()),
        matchOfferKeywords: (t.matchOfferKeywords || []).filter(Boolean).map((s) => s.trim().toUpperCase()),
        matchPracticeTypes: (t.matchPracticeTypes || []).filter(Boolean),
        targetPieces: Number(t.targetPieces) || 0,
        revenuePerPiece: Number(t.revenuePerPiece) || 0,
        sortOrder: i,
      }));
      const cleanPrizes = prizes.map((p, i) => ({
        // SOLO i campi previsti da PrizeDto:
        label: p.label.trim(),
        scope: p.scope,
        kind: p.kind,
        category: p.category,
        targetId: p.targetId || null,
        threshold: Number(p.threshold) || 0,
        prizeValue: p.prizeValue ?? null,
        sortOrder: i,
      }));

      const payload: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        startDate, endDate, isActive, scopeType, isHidden,
        founderCompensation: Number(founderCompensation) || 0,
        templateKey: templateKey.trim() || undefined,
        // Tappa 3.2 — invia shop selezionati solo se scope=company
        selectedShopIds:
          scopeType === 'company' && selectedShopIds.length > 0 ? selectedShopIds : undefined,
        targets: cleanTargets,
        prizes: cleanPrizes,
      };
      if (isEdit) await api.patch(`/competitions/${initial!.id}`, payload);
      else await api.post('/competitions', payload);
      onSaved();
      onClose();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Errore salvataggio');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" data-testid="competition-modal">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" weight="fill" />
            {isEdit ? `Modifica gara · ${initial?.title}` : 'Nuova gara'}
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex gap-1 px-5 pt-3 border-b border-slate-800 sticky top-[68px] bg-slate-900 z-10">
          {[
            { id: 'general', label: 'Generale', icon: Calendar },
            { id: 'targets', label: `Target (${targets.length})`, icon: TargetIcon },
            { id: 'prizes', label: `Premi (${prizes.length})`, icon: Gift },
          ].map((t) => {
            const Icon = t.icon as any;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id as any)}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition ${
                  active ? 'border-amber-400 text-amber-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
                data-testid={`tab-${t.id}`}>
                <Icon className="w-4 h-4 inline mr-1" />{t.label}
              </button>
            );
          })}
        </div>

        <div className="p-5">
          {tab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Titolo *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="Es. Gara Aprile 2026"
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" data-testid="comp-title" />
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Descrizione</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-300 mb-1 block">Data inizio *</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="text-sm text-slate-300 mb-1 block">Data fine *</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" />
                </div>
              </div>

              {/* === Tappa 3.1 — Scope === */}
              <div>
                <label className="text-sm text-slate-300 mb-2 block">Ambito gara</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setScopeType('shop')}
                    className={`p-3 rounded border text-left transition ${
                      scopeType === 'shop'
                        ? 'border-amber-400 bg-amber-500/10 text-amber-200'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'}`}
                    data-testid="scope-shop">
                    <Storefront className="w-5 h-5 mb-1" weight={scopeType==='shop'?'fill':'regular'} />
                    <div className="font-bold text-sm">Solo questo negozio</div>
                    <div className="text-xs opacity-70">I pezzi contano solo dallo shop attivo</div>
                  </button>
                  <button type="button" onClick={() => setScopeType('company')}
                    className={`p-3 rounded border text-left transition ${
                      scopeType === 'company'
                        ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                        : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'}`}
                    data-testid="scope-company">
                    <Buildings className="w-5 h-5 mb-1" weight={scopeType==='company'?'fill':'regular'} />
                    <div className="font-bold text-sm">Tutta l'azienda</div>
                    <div className="text-xs opacity-70">I pezzi contano da tutti gli shop della company</div>
                  </button>
                </div>
              </div>

              {/* Tappa 3.2 — Sotto-selezione shop per gare company */}
              {scopeType === 'company' && companyShops.length > 1 && (
                <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-emerald-200 font-semibold flex items-center gap-1">
                      <Buildings className="w-4 h-4" /> Negozi che partecipano alla gara
                    </label>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedShopIds(companyShops.map((s) => s.shopId))}
                        className="text-[10px] uppercase tracking-widest text-emerald-300 hover:text-emerald-100"
                        data-testid="select-all-shops"
                      >
                        Tutti
                      </button>
                      <span className="text-slate-600">·</span>
                      <button
                        type="button"
                        onClick={() => setSelectedShopIds([])}
                        className="text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-200"
                        data-testid="clear-shops"
                      >
                        Nessuno
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 mb-2">
                    Lascia vuoto per includere <strong>tutti</strong> i negozi della company. Seleziona
                    un sottoinsieme per creare gare parallele (es. 10 negozi → 2 gare da 5).
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-auto pr-1">
                    {companyShops.map((s) => {
                      const checked = selectedShopIds.includes(s.shopId);
                      return (
                        <label
                          key={s.shopId}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded border cursor-pointer text-xs transition ${
                            checked
                              ? 'border-emerald-400 bg-emerald-500/10 text-emerald-100'
                              : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-600'
                          }`}
                          data-testid={`shop-pick-${s.shopId}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedShopIds([...selectedShopIds, s.shopId]);
                              } else {
                                setSelectedShopIds(selectedShopIds.filter((x) => x !== s.shopId));
                              }
                            }}
                            className="w-3.5 h-3.5"
                          />
                          <Storefront className="w-3.5 h-3.5 text-slate-400" />
                          <span className="flex-1 truncate font-medium">{s.name}</span>
                          {s.isActiveShop && (
                            <span className="text-[9px] uppercase tracking-widest text-amber-400">
                              attivo
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-[11px] text-emerald-300">
                    {selectedShopIds.length === 0
                      ? `→ Tutti i ${companyShops.length} negozi parteciperanno`
                      : `→ ${selectedShopIds.length} su ${companyShops.length} negozi selezionati`}
                  </div>
                </div>
              )}

              {/* === Tappa 3.1 — Hidden === */}
              <label className="flex items-start gap-2 cursor-pointer p-3 bg-slate-800/40 border border-slate-700 rounded">
                <input type="checkbox" checked={isHidden} onChange={(e) => setIsHidden(e.target.checked)}
                  className="w-4 h-4 mt-0.5" data-testid="comp-hidden" />
                <div>
                  <div className="text-sm text-slate-200 font-medium flex items-center gap-1">
                    <EyeSlash className="w-4 h-4" /> Gara nascosta
                  </div>
                  <div className="text-xs text-slate-500">
                    Solo i founder la vedranno (utile per bonus segreti o test interni).
                  </div>
                </div>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-300 mb-1 block">
                    Template Key <span className="text-xs text-slate-500">(per aggregare gare gemelle)</span>
                  </label>
                  <input type="text" value={templateKey} onChange={(e) => setTemplateKey(e.target.value)}
                    placeholder="Es. AUTO-2026-04"
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm font-mono" />
                </div>
                <div>
                  <label className="text-sm text-slate-300 mb-1 block">
                    Compenso Founder <span className="text-xs text-slate-500">(€ fisso per la gara)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={founderCompensation}
                    onChange={(e) => setFounderCompensation(Number(e.target.value) || 0)}
                    placeholder="0,00"
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                    data-testid="comp-founder-compensation"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4" />
                <span className="text-sm text-slate-300">Gara attiva (visibile e in conteggio)</span>
              </label>
            </div>
          )}

          {tab === 'targets' && <TargetsBuilder targets={targets} onChange={setTargets} />}
          {tab === 'prizes' && <PrizesBuilder prizes={prizes} targets={targets} onChange={setPrizes} />}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-slate-800 sticky bottom-0 bg-slate-900">
          <button onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white">Annulla</button>
          <button onClick={submit} disabled={saving}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-white font-medium disabled:opacity-50"
            data-testid="comp-save">
            {saving ? 'Salvo...' : isEdit ? 'Salva modifiche' : 'Crea gara'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ Targets builder (TAPPA 3.1: 3 modalità) ============
function TargetsBuilder({
  targets, onChange,
}: {
  targets: CompetitionTarget[];
  onChange: (t: CompetitionTarget[]) => void;
}) {
  const add = () =>
    onChange([
      ...targets,
      {
        label: '',
        category: 'FIXED_LINE',
        targetType: 'category_generic',
        provider: null,
        offerIds: [],
        inventoryItemIds: [],
        matchProviders: [],
        matchOfferKeywords: [],
        matchPracticeTypes: [],
        targetPieces: 0,
      },
    ]);
  const upd = (i: number, patch: Partial<CompetitionTarget>) =>
    onChange(targets.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  const rm = (i: number) => onChange(targets.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">
          Definisci i target. Ognuno può essere <b>generico per categoria</b>,{' '}
          <b>generico per provider</b> o <b>specifico</b> (selezione promo dal catalogo).
        </p>
        <button onClick={add}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-white text-sm font-medium"
          data-testid="add-target">
          <Plus className="w-4 h-4 inline mr-1" weight="bold" />Target
        </button>
      </div>

      {targets.length === 0 ? (
        <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded">
          Nessun target. Senza target la gara conta tutte le pratiche del periodo.
        </div>
      ) : (
        <div className="space-y-3">
          {targets.map((t, i) => (
            <TargetRow key={i} target={t} idx={i} onUpdate={(patch) => upd(i, patch)} onRemove={() => rm(i)} />
          ))}
        </div>
      )}
    </div>
  );
}

function TargetRow({
  target, idx, onUpdate, onRemove,
}: {
  target: CompetitionTarget;
  idx: number;
  onUpdate: (patch: Partial<CompetitionTarget>) => void;
  onRemove: () => void;
}) {
  const [opts, setOpts] = useState<OffersOptions>({ providers: [], grouped: {} });
  const [search, setSearch] = useState('');
  // Phase G — UX promo specifiche: prima il provider, poi le sue offerte
  const [specificProvider, setSpecificProvider] = useState<string>('');
  // DEVICE — gruppi catalogo con prodotti
  const [deviceGroups, setDeviceGroups] = useState<DeviceGroup[]>([]);
  const [deviceSearch, setDeviceSearch] = useState('');
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  useEffect(() => {
    fetchOffersOptions(target.category).then(setOpts);
  }, [target.category]);

  useEffect(() => {
    if (target.category === 'DEVICE') {
      fetchDeviceGroups(deviceSearch).then(setDeviceGroups);
    }
  }, [target.category, deviceSearch]);

  // Quando cambia categoria/tipoTarget reset provider+offerIds
  useEffect(() => {
    setSpecificProvider('');
  }, [target.category, target.targetType]);

  // All'edit di una gara già esistente: deduce provider iniziale dalle offerIds salvate
  useEffect(() => {
    if (target.targetType !== 'specific') return;
    if (specificProvider) return;
    if (!target.offerIds || target.offerIds.length === 0) return;
    if (!opts.grouped) return;
    for (const [prov, list] of Object.entries(opts.grouped)) {
      if (list.some((o) => target.offerIds!.includes(o.id))) {
        setSpecificProvider(prov);
        break;
      }
    }
  }, [opts, target.offerIds, target.targetType, specificProvider]);

  const flatOffers = useMemo(() => {
    const res: Array<{ id: string; name: string; provider: string; canone: string }> = [];
    // Phase G — Se è in modalità specific E un provider è stato scelto,
    // mostriamo SOLO le offerte di quel provider (evita la lista lunghissima)
    const filterByProvider =
      target.targetType === 'specific' && specificProvider ? specificProvider : null;
    for (const [prov, offers] of Object.entries(opts.grouped)) {
      if (filterByProvider && prov !== filterByProvider) continue;
      for (const o of offers) res.push({ id: o.id, name: o.name, provider: prov, canone: o.canone });
    }
    return res;
  }, [opts, target.targetType, specificProvider]);

  const filteredOffers = useMemo(() => {
    if (!search.trim()) return flatOffers;
    const s = search.trim().toLowerCase();
    return flatOffers.filter((o) =>
      o.name.toLowerCase().includes(s) || o.provider.toLowerCase().includes(s),
    );
  }, [flatOffers, search]);

  const toggleOffer = (id: string) => {
    const current = target.offerIds || [];
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    onUpdate({ offerIds: next });
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3" data-testid={`target-row-${idx}`}>
      <div className="grid grid-cols-12 gap-2 items-start">
        <div className="col-span-5">
          <label className="text-xs text-slate-400 mb-1 block">Etichetta *</label>
          <input type="text" value={target.label} onChange={(e) => onUpdate({ label: e.target.value })}
            placeholder='Es. "Tutte le rete fissa" o "Vodafone mobile"'
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm" />
        </div>
        <div className="col-span-3">
          <label className="text-xs text-slate-400 mb-1 block">Categoria</label>
          <select value={target.category} onChange={(e) => onUpdate({ category: e.target.value as TargetCategory, offerIds: [], provider: null, ...(e.target.value === 'DEVICE' ? { targetType: 'category_generic' } : {}) })}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm">
            {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs text-slate-400 mb-1 block">Pezzi target</label>
          <input type="number" min={0} value={target.targetPieces}
            onChange={(e) => onUpdate({ targetPieces: Number(e.target.value) })}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-slate-400 mb-1 block">
            Ricavo/pezzo <span className="text-slate-600">(€)</span>
          </label>
          <input
            type="number"
            min={0}
            step={0.01}
            value={target.revenuePerPiece ?? 0}
            onChange={(e) => onUpdate({ revenuePerPiece: Number(e.target.value) || 0 })}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
            data-testid={`target-revenue-${idx}`}
          />
        </div>
        <div className="col-span-1 flex items-end justify-end h-full">
          <button onClick={onRemove} className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded"><Trash className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Tipo target — NASCOSTO per DEVICE (usa direttamente prodotti catalogo) */}
      {target.category !== 'DEVICE' && (
        <div className="mt-3">
          <label className="text-xs text-slate-400 mb-1 block">Tipo di target</label>
          <div className="grid grid-cols-3 gap-2">
            {(['category_generic', 'provider_generic', 'specific'] as TargetType[]).map((tt) => (
              <button key={tt} type="button"
                onClick={() => onUpdate({ targetType: tt })}
                className={`px-2 py-1.5 rounded text-xs font-medium border transition ${
                  target.targetType === tt
                    ? 'border-amber-400 bg-amber-500/10 text-amber-200'
                    : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'}`}
                data-testid={`tt-${tt}-${idx}`}>
                {TARGET_TYPE_LABEL[tt]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Configurazione condizionale — NON DEVICE */}
      {target.category !== 'DEVICE' && target.targetType === 'category_generic' && (
        <div className="mt-2 text-xs text-slate-500 bg-slate-900/40 rounded p-2">
          Conterà <b>tutte</b> le pratiche di categoria <b>{CATEGORY_LABEL[target.category]}</b> nel periodo
          (ACTIVATED, non importate, con venditore assegnato).
        </div>
      )}

      {target.category !== 'DEVICE' && target.targetType === 'provider_generic' && (
        <div className="mt-2">
          <label className="text-xs text-slate-400 mb-1 block">Provider *</label>
          <select value={target.provider || ''} onChange={(e) => onUpdate({ provider: e.target.value || null })}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm">
            <option value="">— Seleziona provider —</option>
            {opts.providers.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="text-xs text-slate-500 mt-1">
            ⚡ Auto-include: nuove promo {target.provider || '...'} in catalogo entrano automaticamente al ricalcolo.
          </div>
        </div>
      )}

      {target.category !== 'DEVICE' && target.targetType === 'specific' && (
        <div className="mt-2 space-y-3">
          {/* Phase G — Step 1: prima scegli il provider */}
          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              Provider * <span className="text-slate-600">(scegli prima il gestore della promo)</span>
            </label>
            <select
              value={specificProvider}
              onChange={(e) => {
                setSpecificProvider(e.target.value);
                // Cambio provider: pulisco selezioni precedenti per evitare mix tra provider diversi
                onUpdate({ offerIds: [] });
                setSearch('');
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
              data-testid={`tt-specific-provider-${idx}`}
            >
              <option value="">— Seleziona gestore —</option>
              {opts.providers.map((p) => (
                <option key={p} value={p}>
                  {p} ({(opts.grouped[p] || []).length} promo)
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: lista promo SOLO del provider scelto */}
          {specificProvider ? (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Promo {specificProvider} selezionate ({target.offerIds?.length || 0}) *
              </label>
              {flatOffers.length === 0 ? (
                <div className="text-xs text-slate-500 py-2">
                  Nessuna promo {specificProvider} attiva nel catalogo.
                </div>
              ) : (
                <>
                  <div className="relative mb-2">
                    <MagnifyingGlass className="w-4 h-4 absolute left-2 top-2 text-slate-500" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={`Cerca tra le promo ${specificProvider}...`}
                      className="w-full bg-slate-900 border border-slate-700 rounded pl-8 pr-2 py-1.5 text-white text-sm"
                    />
                  </div>
                  <div className="max-h-44 overflow-y-auto bg-slate-900 border border-slate-700 rounded">
                    {filteredOffers.map((o) => {
                      const checked = (target.offerIds || []).includes(o.id);
                      return (
                        <label
                          key={o.id}
                          className={`flex items-center gap-2 px-2 py-1.5 text-xs cursor-pointer hover:bg-slate-800 ${checked ? 'bg-amber-500/10 border-l-2 border-amber-400' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOffer(o.id)}
                            className="w-3.5 h-3.5"
                          />
                          <span className="text-slate-200 flex-1">{o.name}</span>
                          <span className="text-slate-500">{o.canone}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="flex justify-between items-center mt-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => onUpdate({ offerIds: filteredOffers.map((o) => o.id) })}
                      className="text-amber-400 hover:text-amber-300"
                    >
                      Seleziona tutte
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdate({ offerIds: [] })}
                      className="text-slate-500 hover:text-slate-300"
                    >
                      Deseleziona tutte
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-500 bg-slate-900/40 rounded p-2">
              👆 Seleziona prima il gestore della promo. Poi vedrai SOLO le offerte di quel provider.
            </div>
          )}
        </div>
      )}

      {/* DEVICE — Selezione prodotti dal catalogo */}
      {target.category === 'DEVICE' && (
        <div className="mt-3 space-y-2">
          <label className="text-xs text-slate-400 block">
            Prodotti del catalogo ({target.inventoryItemIds?.length || 0} selezionati)
          </label>
          <div className="relative">
            <MagnifyingGlass className="w-4 h-4 absolute left-2 top-2 text-slate-500" />
            <input
              type="text"
              value={deviceSearch}
              onChange={(e) => setDeviceSearch(e.target.value)}
              placeholder="Cerca dispositivo (es. iPhone 15 Pro 256 Nero)..."
              className="w-full bg-slate-900 border border-slate-700 rounded pl-8 pr-2 py-1.5 text-white text-sm"
            />
          </div>
          {deviceGroups.length === 0 ? (
            <div className="text-xs text-slate-500 py-2">
              Nessun prodotto trovato. Aggiungi prodotti al catalogo vendita.
            </div>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {deviceGroups.map((g) => {
                const isExpanded = expandedGroup === g.id;
                const selectedInGroup = g.products.filter((p) =>
                  (target.inventoryItemIds || []).includes(p.id)
                ).length;
                return (
                  <div key={g.id} className="border border-slate-700 rounded bg-slate-900/40">
                    <button
                      type="button"
                      onClick={() => setExpandedGroup(isExpanded ? null : g.id)}
                      className="w-full flex items-center justify-between px-2 py-1.5 text-xs hover:bg-slate-800/50 transition"
                    >
                      <span className="font-semibold text-slate-300">{g.name}</span>
                      <span className="text-slate-500">
                        {g.products.length} prodotti
                        {selectedInGroup > 0 && (
                          <span className="text-amber-400 ml-1">({selectedInGroup} sel.)</span>
                        )}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-slate-700/50">
                        {g.products.map((p) => {
                          const checked = (target.inventoryItemIds || []).includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-center gap-2 px-2 py-1.5 text-[11px] cursor-pointer hover:bg-slate-800 ${checked ? 'bg-amber-500/10 border-l-2 border-amber-400' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  const current = target.inventoryItemIds || [];
                                  const next = current.includes(p.id)
                                    ? current.filter((x) => x !== p.id)
                                    : [...current, p.id];
                                  onUpdate({ inventoryItemIds: next });
                                }}
                                className="w-3.5 h-3.5"
                              />
                              <span className="text-slate-200 flex-1">{p.name}</span>
                              <span className="text-slate-500">Stock: {p.availableQuantity}</span>
                              {p.sellingPrice !== null && (
                                <span className="text-emerald-400">
                                  €{Number(p.sellingPrice).toFixed(0)}
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex justify-between items-center text-[11px]">
            <button
              type="button"
              onClick={() => onUpdate({ inventoryItemIds: [] })}
              className="text-slate-500 hover:text-slate-300"
            >
              Deseleziona tutto
            </button>
            <span className="text-slate-500">
              {target.inventoryItemIds?.length || 0} prodotti selezionati
            </span>
          </div>
        </div>
      )}

      {/* Filtro consumer/business (opzionale, applicabile a tutti i tipi) */}
      <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
        <span>Tipo cliente:</span>
        {['consumer', 'business'].map((pt) => {
          const checked = (target.matchPracticeTypes || []).includes(pt);
          return (
            <label key={pt} className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={checked}
                onChange={(e) => {
                  const cur = target.matchPracticeTypes || [];
                  onUpdate({
                    matchPracticeTypes: e.target.checked
                      ? [...cur, pt]
                      : cur.filter((x) => x !== pt),
                  });
                }}
                className="w-3 h-3" />
              {pt === 'consumer' ? 'Consumer' : 'Business'}
            </label>
          );
        })}
        <span className="text-slate-600">(vuoto = entrambi)</span>
      </div>
    </div>
  );
}

// ============ Prizes builder (invariato dalla Tappa 4) ============
function PrizesBuilder({
  prizes, targets, onChange,
}: {
  prizes: CompetitionPrize[];
  targets: CompetitionTarget[];
  onChange: (p: CompetitionPrize[]) => void;
}) {
  const add = () => onChange([...prizes, {
    label: '', scope: 'OPERATOR', kind: 'PIECES', category: 'GLOBAL',
    targetId: null, threshold: 0, prizeValue: null,
  }]);
  const upd = (i: number, patch: Partial<CompetitionPrize>) =>
    onChange(prizes.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const rm = (i: number) => onChange(prizes.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">
          Premi a scaglioni: <span className="text-amber-300">OPERATORE</span>, <span className="text-blue-300">NEGOZIO</span>, <span className="text-emerald-300">AZIENDA</span>.
        </p>
        <button onClick={add} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-white text-sm font-medium" data-testid="add-prize">
          <Plus className="w-4 h-4 inline mr-1" weight="bold" />Premio
        </button>
      </div>
      {prizes.length === 0 ? (
        <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded">Nessun premio configurato.</div>
      ) : (
        <div className="space-y-2">
          {prizes.map((p, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3" data-testid={`prize-row-${i}`}>
              <div className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-4">
                  <label className="text-xs text-slate-400 mb-1 block">Etichetta *</label>
                  <input type="text" value={p.label} onChange={(e) => upd(i, { label: e.target.value })}
                    placeholder="Es. Bonus 2000 pezzi"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">Scope</label>
                  <select value={p.scope} onChange={(e) => upd(i, { scope: e.target.value as PrizeScope })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm">
                    {Object.entries(PRIZE_SCOPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">Categoria</label>
                  <select value={p.category} onChange={(e) => upd(i, { category: e.target.value as PrizeCategory })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm">
                    {Object.entries(PRIZE_CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="text-xs text-slate-400 mb-1 block">Soglia</label>
                  <input type="number" min={0} value={p.threshold}
                    onChange={(e) => upd(i, { threshold: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">Valore €</label>
                  <input type="number" step="0.01" min={0} value={p.prizeValue ?? ''}
                    onChange={(e) => upd(i, { prizeValue: e.target.value === '' ? null : Number(e.target.value) })}
                    placeholder="1500"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm" />
                </div>
                <div className="col-span-1 flex items-end justify-end h-full">
                  <button onClick={() => rm(i)} className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded"><Trash className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Copy modal (invariato dalla Tappa 4) ============
export function CopyModal({
  open, competition, shops, currentShopId, onClose, onCopied,
}: {
  open: boolean;
  competition: Competition | null;
  shops: any[];
  currentShopId: string | null;
  onClose: () => void;
  onCopied: () => void;
}) {
  const [targetShopId, setTargetShopId] = useState('');
  const [copyTargets, setCopyTargets] = useState(true);
  const [copyPrizes, setCopyPrizes] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setTargetShopId(''); setCopyTargets(true); setCopyPrizes(true); }
  }, [open]);

  const otherShops = (shops || []).filter((s) => s.shopId !== currentShopId);

  const submit = async () => {
    if (!targetShopId) return alert('Seleziona uno shop di destinazione');
    if (!competition) return;
    setSaving(true);
    try {
      await api.post(`/competitions/${competition.id}/copy`, { targetShopId, copyTargets, copyPrizes });
      onCopied(); onClose();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Errore copia');
    } finally { setSaving(false); }
  };

  if (!open || !competition) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" data-testid="copy-modal">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Copy className="w-5 h-5 text-blue-400" weight="fill" />Copia gara su altro negozio
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-slate-400 mb-4">Copia "{competition.title}" su un altro shop.</p>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Shop di destinazione *</label>
            <select value={targetShopId} onChange={(e) => setTargetShopId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white" data-testid="copy-target-shop">
              <option value="">— Seleziona —</option>
              {otherShops.map((s: any) => <option key={s.shopId} value={s.shopId}>{s.name}</option>)}
            </select>
            {otherShops.length === 0 && <p className="text-xs text-rose-400 mt-1">Non hai altri negozi su cui copiare.</p>}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={copyTargets} onChange={(e) => setCopyTargets(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm text-slate-300">Copia anche i target</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={copyPrizes} onChange={(e) => setCopyPrizes(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm text-slate-300">Copia anche i premi</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white">Annulla</button>
          <button onClick={submit} disabled={saving || !targetShopId}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium disabled:opacity-50"
            data-testid="copy-confirm">
            {saving ? 'Copio...' : 'Copia gara'}
          </button>
        </div>
      </div>
    </div>
  );
}
