/**
 * Componenti condivisi per le pagine Gare (lista + dettaglio):
 * - Tipi
 * - Helper di formatting / status
 * - CompetitionModal (create/edit)
 * - CopyModal (copia su altro shop)
 * - TargetsBuilder + PrizesBuilder
 *
 * Estratti dalla pagina operator/competitions/index.tsx per essere riusati
 * anche dalla pagina di dettaglio con leaderboard.
 */
import { useEffect, useState } from 'react';
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
} from 'phosphor-react';

// ============ Types ============
export type TargetCategory = 'FIXED_LINE' | 'MOBILE' | 'ENERGY' | 'DEVICE' | 'CUSTOM';
export type PrizeScope = 'OPERATOR' | 'SHOP' | 'COMPANY';
export type PrizeCategory =
  | 'FIXED_LINE'
  | 'MOBILE'
  | 'ENERGY'
  | 'DEVICE'
  | 'GLOBAL'
  | 'CUSTOM';

export interface CompetitionTarget {
  id?: string;
  label: string;
  category: TargetCategory;
  matchProviders: string[];
  matchOfferKeywords: string[];
  matchPracticeTypes: string[];
  targetPieces: number;
  sortOrder?: number;
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

export function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
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

// ============ Modal Create/Edit ============
export function CompetitionModal({
  open,
  initial,
  onClose,
  onSaved,
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
  const [templateKey, setTemplateKey] = useState('');
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
      setTemplateKey(initial?.templateKey || '');
      setTargets((initial?.targets || []).map((t) => ({ ...t })));
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
      if (t.targetPieces < 0) return alert('I pezzi target non possono essere negativi');
    }
    for (const p of prizes) {
      if (!p.label.trim()) return alert('Tutti i premi devono avere un nome');
    }

    setSaving(true);
    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        startDate,
        endDate,
        isActive,
        templateKey: templateKey.trim() || undefined,
        targets: targets.map((t, i) => ({
          ...t,
          matchProviders: t.matchProviders.filter(Boolean).map((s) => s.trim().toUpperCase()),
          matchOfferKeywords: t.matchOfferKeywords.filter(Boolean).map((s) => s.trim().toUpperCase()),
          matchPracticeTypes: t.matchPracticeTypes.filter(Boolean),
          sortOrder: i,
        })),
        prizes: prizes.map((p, i) => ({ ...p, sortOrder: i })),
      };
      if (isEdit) {
        await api.patch(`/competitions/${initial!.id}`, payload);
      } else {
        await api.post('/competitions', payload);
      }
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
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      data-testid="competition-modal"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" weight="fill" />
            {isEdit ? `Modifica gara · ${initial?.title}` : 'Nuova gara'}
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
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
              <button
                key={t.id}
                onClick={() => setTab(t.id as any)}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition ${
                  active
                    ? 'border-amber-400 text-amber-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
                data-testid={`tab-${t.id}`}
              >
                <Icon className="w-4 h-4 inline mr-1" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="p-5">
          {tab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Titolo *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Es. Gara Aprile 2026"
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                  data-testid="comp-title"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1 block">Descrizione</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-slate-300 mb-1 block">Data inizio *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300 mb-1 block">Data fine *</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-300 mb-1 block">
                  Template Key{' '}
                  <span className="text-xs text-slate-500">(per aggregare gare simili tra shop)</span>
                </label>
                <input
                  type="text"
                  value={templateKey}
                  onChange={(e) => setTemplateKey(e.target.value)}
                  placeholder="Es. AUTO-2026-04"
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm font-mono"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-300">Gara attiva (visibile e in conteggio)</span>
              </label>
            </div>
          )}

          {tab === 'targets' && <TargetsBuilder targets={targets} onChange={setTargets} />}

          {tab === 'prizes' && (
            <PrizesBuilder prizes={prizes} targets={targets} onChange={setPrizes} />
          )}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-slate-800 sticky bottom-0 bg-slate-900">
          <button onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white">
            Annulla
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-white font-medium disabled:opacity-50"
            data-testid="comp-save"
          >
            {saving ? 'Salvo...' : isEdit ? 'Salva modifiche' : 'Crea gara'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ Targets builder ============
function TargetsBuilder({
  targets,
  onChange,
}: {
  targets: CompetitionTarget[];
  onChange: (t: CompetitionTarget[]) => void;
}) {
  const add = () =>
    onChange([
      ...targets,
      {
        label: '',
        category: 'MOBILE',
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
          Definisci i sotto-target di questa gara (es. "TIM+KENA MNP target 30",
          "Tutti SKY target 1600"). Una pratica può matchare più target.
        </p>
        <button
          onClick={add}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-white text-sm font-medium"
          data-testid="add-target"
        >
          <Plus className="w-4 h-4 inline mr-1" weight="bold" />
          Target
        </button>
      </div>

      {targets.length === 0 ? (
        <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded">
          Nessun target. Senza target la gara conta tutte le pratiche di tutte le categorie.
        </div>
      ) : (
        <div className="space-y-2">
          {targets.map((t, i) => (
            <div
              key={i}
              className="bg-slate-800/50 border border-slate-700 rounded-lg p-3"
              data-testid={`target-row-${i}`}
            >
              <div className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-5">
                  <label className="text-xs text-slate-400 mb-1 block">Etichetta *</label>
                  <input
                    type="text"
                    value={t.label}
                    onChange={(e) => upd(i, { label: e.target.value })}
                    placeholder="Es. TIM+KENA MNP"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-xs text-slate-400 mb-1 block">Categoria</label>
                  <select
                    value={t.category}
                    onChange={(e) => upd(i, { category: e.target.value as TargetCategory })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
                  >
                    {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3">
                  <label className="text-xs text-slate-400 mb-1 block">Pezzi target</label>
                  <input
                    type="number"
                    min={0}
                    value={t.targetPieces}
                    onChange={(e) => upd(i, { targetPieces: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
                  />
                </div>
                <div className="col-span-1 flex items-end justify-end h-full">
                  <button
                    onClick={() => rm(i)}
                    className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    Provider (separati da virgola, vuoto = tutti)
                  </label>
                  <input
                    type="text"
                    value={t.matchProviders.join(', ')}
                    onChange={(e) =>
                      upd(i, {
                        matchProviders: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="TIM, KENA"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">
                    Parole chiave nell'offerta (separate da virgola)
                  </label>
                  <input
                    type="text"
                    value={t.matchOfferKeywords.join(', ')}
                    onChange={(e) =>
                      upd(i, {
                        matchOfferKeywords: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="MNP, FAMIGLIA"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Prizes builder ============
function PrizesBuilder({
  prizes,
  targets,
  onChange,
}: {
  prizes: CompetitionPrize[];
  targets: CompetitionTarget[];
  onChange: (p: CompetitionPrize[]) => void;
}) {
  const add = () =>
    onChange([
      ...prizes,
      {
        label: '',
        scope: 'OPERATOR',
        kind: 'PIECES',
        category: 'GLOBAL',
        targetId: null,
        threshold: 0,
        prizeValue: null,
      },
    ]);
  const upd = (i: number, patch: Partial<CompetitionPrize>) =>
    onChange(prizes.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  const rm = (i: number) => onChange(prizes.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-400">
          Premi a scaglioni: scope <span className="text-amber-300">OPERATORE</span> per
          incentivare i singoli, <span className="text-blue-300">NEGOZIO</span> per il team
          locale, <span className="text-emerald-300">AZIENDA</span> per la company complessiva.
        </p>
        <button
          onClick={add}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-white text-sm font-medium"
          data-testid="add-prize"
        >
          <Plus className="w-4 h-4 inline mr-1" weight="bold" />
          Premio
        </button>
      </div>

      {prizes.length === 0 ? (
        <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded">
          Nessun premio configurato.
        </div>
      ) : (
        <div className="space-y-2">
          {prizes.map((p, i) => (
            <div
              key={i}
              className="bg-slate-800/50 border border-slate-700 rounded-lg p-3"
              data-testid={`prize-row-${i}`}
            >
              <div className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-4">
                  <label className="text-xs text-slate-400 mb-1 block">Etichetta *</label>
                  <input
                    type="text"
                    value={p.label}
                    onChange={(e) => upd(i, { label: e.target.value })}
                    placeholder="Es. Bonus 2000 pezzi"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">Scope</label>
                  <select
                    value={p.scope}
                    onChange={(e) => upd(i, { scope: e.target.value as PrizeScope })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
                  >
                    {Object.entries(PRIZE_SCOPE_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">Categoria</label>
                  <select
                    value={p.category}
                    onChange={(e) => upd(i, { category: e.target.value as PrizeCategory })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
                  >
                    <option value="GLOBAL">Tutto</option>
                    <option value="FIXED_LINE">Rete fissa</option>
                    <option value="MOBILE">Mobile</option>
                    <option value="ENERGY">Luce/Gas</option>
                    <option value="DEVICE">Dispositivi</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="text-xs text-slate-400 mb-1 block">Soglia</label>
                  <input
                    type="number"
                    min={0}
                    value={p.threshold}
                    onChange={(e) => upd(i, { threshold: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-400 mb-1 block">Valore €</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={p.prizeValue ?? ''}
                    onChange={(e) =>
                      upd(i, { prizeValue: e.target.value === '' ? null : Number(e.target.value) })
                    }
                    placeholder="1500"
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
                  />
                </div>
                <div className="col-span-1 flex items-end justify-end h-full">
                  <button onClick={() => rm(i)} className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded">
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {p.category === 'CUSTOM' && (
                <div className="mt-2">
                  <label className="text-xs text-slate-400 mb-1 block">
                    Target collegato (per category=Custom)
                  </label>
                  <select
                    value={p.targetId || ''}
                    onChange={(e) => upd(i, { targetId: e.target.value || null })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-white text-sm"
                  >
                    <option value="">— Nessuno —</option>
                    {targets.map((t, idx) => (
                      <option key={t.id || `idx-${idx}`} value={t.id || ''}>
                        {t.label || `Target ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Copy modal ============
export function CopyModal({
  open,
  competition,
  shops,
  currentShopId,
  onClose,
  onCopied,
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
    if (open) {
      setTargetShopId('');
      setCopyTargets(true);
      setCopyPrizes(true);
    }
  }, [open]);

  const otherShops = (shops || []).filter((s) => s.shopId !== currentShopId);

  const submit = async () => {
    if (!targetShopId) return alert('Seleziona uno shop di destinazione');
    if (!competition) return;
    setSaving(true);
    try {
      await api.post(`/competitions/${competition.id}/copy`, {
        targetShopId,
        copyTargets,
        copyPrizes,
      });
      onCopied();
      onClose();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Errore copia');
    } finally {
      setSaving(false);
    }
  };

  if (!open || !competition) return null;
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      data-testid="copy-modal"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Copy className="w-5 h-5 text-blue-400" weight="fill" />
            Copia gara su altro negozio
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Copia "{competition.title}" su un altro shop dove sei FOUNDER o ADMIN abilitato.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Shop di destinazione *</label>
            <select
              value={targetShopId}
              onChange={(e) => setTargetShopId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
              data-testid="copy-target-shop"
            >
              <option value="">— Seleziona —</option>
              {otherShops.map((s: any) => (
                <option key={s.shopId} value={s.shopId}>
                  {s.name} {s.role ? `(${s.role})` : ''}
                </option>
              ))}
            </select>
            {otherShops.length === 0 && (
              <p className="text-xs text-rose-400 mt-1">Non hai altri negozi su cui copiare.</p>
            )}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={copyTargets}
              onChange={(e) => setCopyTargets(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-slate-300">Copia anche i target</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={copyPrizes}
              onChange={(e) => setCopyPrizes(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-slate-300">Copia anche i premi</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white">
            Annulla
          </button>
          <button
            onClick={submit}
            disabled={saving || !targetShopId}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium disabled:opacity-50"
            data-testid="copy-confirm"
          >
            {saving ? 'Copio...' : 'Copia gara'}
          </button>
        </div>
      </div>
    </div>
  );
}
