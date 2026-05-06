import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import OperatorLayout from '@/components/layout/OperatorLayout';
import api from '@/lib/axios';
import { useAuthStore } from '@/stores/authStore';
import { usePermission } from '@/hooks/usePermission';
import {
  Plus,
  PencilSimple,
  Trash,
  Tag,
  Storefront,
  CaretDown,
  CaretRight,
  DotsSixVertical,
  X,
  CurrencyEur,
  Package,
  Warning,
  CheckCircle,
  XCircle,
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

// ============== Types ==============
interface CustomFieldDef {
  id?: string;
  fieldKey: string;
  fieldLabel: string;
  fieldType: 'STRING' | 'NUMBER' | 'BOOLEAN';
  isRequired?: boolean;
  sortOrder?: number;
}

interface ProductGroup {
  id: string;
  name: string;
  sortOrder: number;
  customFields: CustomFieldDef[];
}

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  groupId: string | null;
  groupName: string | null;
  customFields: Record<string, any> | null;
  isForSale: boolean;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderLevel: number;
  unitCost: number | null;
  sellingPrice: number | null;
  margin: number | null;
  marginPercent: number | null;
  stockStatus: 'OK' | 'LOW' | 'OUT';
  createdAt: string;
  updatedAt: string;
}

// ============== Sortable group card ==============
function SortableGroupCard({
  group,
  products,
  canManage,
  canSell,
  canSeeCost,
  onEditGroup,
  onDeleteGroup,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onSell,
}: {
  group: ProductGroup;
  products: Product[];
  canManage: boolean;
  canSell: boolean;
  canSeeCost: boolean;
  onEditGroup: () => void;
  onDeleteGroup: () => void;
  onAddProduct: () => void;
  onEditProduct: (p: Product) => void;
  onDeleteProduct: (p: Product) => void;
  onSell: (p: Product) => void;
}) {
  const [open, setOpen] = useState(true);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: group.id });

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
      className={`rounded-xl border border-emerald-500/20 bg-slate-900/40 overflow-hidden ${
        isDragging ? 'ring-2 ring-emerald-500 shadow-xl' : ''
      }`}
      data-testid={`group-card-${group.id}`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-emerald-500/10">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {canManage && (
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-emerald-400 p-1 touch-none"
              aria-label="Trascina"
            >
              <DotsSixVertical className="w-4 h-4" weight="bold" />
            </button>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 flex-1 min-w-0 text-left"
          >
            {open ? (
              <CaretDown className="w-4 h-4 text-emerald-300 flex-shrink-0" weight="bold" />
            ) : (
              <CaretRight className="w-4 h-4 text-emerald-300 flex-shrink-0" weight="bold" />
            )}
            <Tag className="w-4 h-4 text-emerald-300 flex-shrink-0" />
            <span className="font-bold text-emerald-200 tracking-wide truncate">{group.name}</span>
            <span className="text-xs text-slate-400 bg-slate-900/60 rounded-full px-2 py-0.5 flex-shrink-0">
              {products.length}
            </span>
          </button>
        </div>
        <div className="flex items-center gap-1">
          {canManage && (
            <>
              <button
                onClick={onAddProduct}
                title="Aggiungi prodotto"
                className="p-1.5 text-emerald-300 hover:bg-emerald-500/20 rounded transition"
                data-testid={`group-add-product-${group.id}`}
              >
                <Plus className="w-4 h-4" weight="bold" />
              </button>
              <button
                onClick={onEditGroup}
                title="Modifica gruppo"
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded transition"
                data-testid={`group-edit-${group.id}`}
              >
                <PencilSimple className="w-4 h-4" />
              </button>
              <button
                onClick={onDeleteGroup}
                title="Elimina gruppo"
                className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded transition"
                data-testid={`group-delete-${group.id}`}
              >
                <Trash className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {open && (
        <div className="p-3">
          {products.length === 0 ? (
            <div className="text-slate-500 text-sm text-center py-6">
              Nessun prodotto in questo gruppo
              {canManage && (
                <button
                  onClick={onAddProduct}
                  className="ml-2 text-emerald-400 hover:underline"
                >
                  + Aggiungi
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {products.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  canManage={canManage}
                  canSell={canSell}
                  canSeeCost={canSeeCost}
                  onEdit={() => onEditProduct(p)}
                  onDelete={() => onDeleteProduct(p)}
                  onSell={() => onSell(p)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============== Product row ==============
function ProductRow({
  product,
  canManage,
  canSell,
  canSeeCost,
  onEdit,
  onDelete,
  onSell,
}: {
  product: Product;
  canManage: boolean;
  canSell: boolean;
  canSeeCost: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSell: () => void;
}) {
  const StatusBadge = () => {
    if (product.stockStatus === 'OUT')
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-rose-500/20 text-rose-300">
          <XCircle className="w-3 h-3" weight="fill" /> Esaurito
        </span>
      );
    if (product.stockStatus === 'LOW')
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-300">
          <Warning className="w-3 h-3" weight="fill" /> Sotto soglia
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-300">
        <CheckCircle className="w-3 h-3" weight="fill" /> Disponibile
      </span>
    );
  };

  return (
    <div
      className="grid grid-cols-[1fr_auto] md:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-center bg-slate-900 hover:bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2.5 transition"
      data-testid={`product-row-${product.id}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white truncate">{product.name}</span>
          <StatusBadge />
        </div>
        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
          <span className="font-mono">{product.sku}</span>
          {product.customFields &&
            Object.entries(product.customFields)
              .slice(0, 3)
              .map(([k, v]) => (
                <span key={k} className="bg-slate-800 px-1.5 py-0.5 rounded">
                  {k}: {String(v)}
                </span>
              ))}
        </div>
      </div>

      <div className="hidden md:flex flex-col items-end text-sm">
        <span className="text-slate-300 font-medium">
          <Package className="w-3 h-3 inline mr-1" />
          {product.quantity}
        </span>
        <span className="text-xs text-slate-500">soglia {product.reorderLevel}</span>
      </div>

      <div className="hidden md:flex flex-col items-end text-sm whitespace-nowrap">
        <span className="text-emerald-300 font-semibold">
          {product.sellingPrice !== null ? `€${product.sellingPrice.toFixed(2)}` : '—'}
        </span>
        {canSeeCost && product.unitCost !== null && (
          <span className="text-xs text-slate-500">
            costo €{product.unitCost.toFixed(2)}{' '}
            {product.marginPercent !== null && (
              <span className="text-emerald-500">·+{product.marginPercent}%</span>
            )}
          </span>
        )}
      </div>

      <div className="flex gap-1 justify-end">
        {canSell && product.isForSale && product.quantity > 0 && (
          <button
            onClick={onSell}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-white text-xs font-medium transition"
            data-testid={`product-sell-${product.id}`}
          >
            <Storefront className="w-3.5 h-3.5 inline mr-1" weight="bold" />
            Vendi
          </button>
        )}
        {canManage && (
          <>
            <button
              onClick={onEdit}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded transition"
              data-testid={`product-edit-${product.id}`}
            >
              <PencilSimple className="w-4 h-4" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded transition"
              data-testid={`product-delete-${product.id}`}
            >
              <Trash className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ============== Group form modal ==============
function GroupFormModal({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial?: ProductGroup | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial;
  const [name, setName] = useState('');
  const [fields, setFields] = useState<CustomFieldDef[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name || '');
      setFields(initial?.customFields?.map((f) => ({ ...f })) || []);
    }
  }, [open, initial]);

  const addField = () =>
    setFields((prev) => [
      ...prev,
      { fieldKey: '', fieldLabel: '', fieldType: 'STRING', isRequired: false },
    ]);

  const updField = (idx: number, patch: Partial<CustomFieldDef>) =>
    setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, ...patch } : f)));

  const rmField = (idx: number) => setFields((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    if (!name.trim()) {
      alert('Nome del gruppo obbligatorio');
      return;
    }
    for (const f of fields) {
      if (!f.fieldKey.trim() || !f.fieldLabel.trim()) {
        alert('Tutti i campi custom devono avere chiave e label');
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        customFields: fields.map((f, i) => ({
          fieldKey: f.fieldKey.trim().toLowerCase().replace(/\s+/g, '_'),
          fieldLabel: f.fieldLabel.trim(),
          fieldType: f.fieldType,
          isRequired: f.isRequired ?? false,
          sortOrder: i,
        })),
      };
      if (isEdit) {
        await api.patch(`/inventory/groups/${initial!.id}`, payload);
      } else {
        await api.post('/inventory/groups', payload);
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" data-testid="group-modal">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">
            {isEdit ? 'Modifica gruppo' : 'Nuovo gruppo prodotti'}
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Nome gruppo *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. Telefoni, Accessori, SIM"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
              data-testid="group-name-input"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-slate-300">
                Campi custom <span className="text-slate-500">(opzionali, es. IMEI per Telefoni)</span>
              </label>
              <button
                onClick={addField}
                className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                data-testid="group-add-field"
              >
                + Campo
              </button>
            </div>
            {fields.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Nessun campo custom</p>
            ) : (
              <div className="space-y-2">
                {fields.map((f, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center bg-slate-800/50 p-2 rounded">
                    <input
                      type="text"
                      placeholder="chiave (es. imei)"
                      value={f.fieldKey}
                      onChange={(e) => updField(i, { fieldKey: e.target.value })}
                      className="col-span-3 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                    />
                    <input
                      type="text"
                      placeholder="Etichetta (IMEI)"
                      value={f.fieldLabel}
                      onChange={(e) => updField(i, { fieldLabel: e.target.value })}
                      className="col-span-4 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                    />
                    <select
                      value={f.fieldType}
                      onChange={(e) => updField(i, { fieldType: e.target.value as any })}
                      className="col-span-2 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white"
                    >
                      <option value="STRING">Testo</option>
                      <option value="NUMBER">Numero</option>
                      <option value="BOOLEAN">Sì/No</option>
                    </select>
                    <label className="col-span-2 text-xs text-slate-400 flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={f.isRequired ?? false}
                        onChange={(e) => updField(i, { isRequired: e.target.checked })}
                      />
                      Obbligatorio
                    </label>
                    <button
                      onClick={() => rmField(i)}
                      className="col-span-1 text-rose-400 hover:bg-rose-500/20 rounded p-1"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white">
            Annulla
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-white font-medium disabled:opacity-50"
            data-testid="group-save-btn"
          >
            {saving ? 'Salvo...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============== Product form modal ==============
function ProductFormModal({
  open,
  initial,
  groups,
  defaultGroupId,
  canSeeCost,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial?: Product | null;
  groups: ProductGroup[];
  defaultGroupId?: string | null;
  canSeeCost: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!initial;
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [quantity, setQuantity] = useState<number>(0);
  const [reorderLevel, setReorderLevel] = useState<number>(5);
  const [unitCost, setUnitCost] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [isForSale, setIsForSale] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name || '');
      setSku(initial?.sku || '');
      setGroupId(initial?.groupId || defaultGroupId || null);
      setCustomFields(initial?.customFields || {});
      setQuantity(initial?.quantity ?? 0);
      setReorderLevel(initial?.reorderLevel ?? 5);
      setUnitCost(initial?.unitCost != null ? String(initial.unitCost) : '');
      setSellingPrice(initial?.sellingPrice != null ? String(initial.sellingPrice) : '');
      setIsForSale(initial?.isForSale ?? true);
    }
  }, [open, initial, defaultGroupId]);

  const selectedGroup = groups.find((g) => g.id === groupId);
  const fieldDefs = selectedGroup?.customFields || [];

  const submit = async () => {
    if (!name.trim()) {
      alert('Nome obbligatorio');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        name: name.trim(),
        groupId: groupId || null,
        customFields: Object.keys(customFields).length ? customFields : undefined,
        quantity: Number(quantity) || 0,
        reorderLevel: Number(reorderLevel) || 0,
        sellingPrice: sellingPrice ? Number(sellingPrice) : undefined,
        isForSale,
      };
      if (sku.trim()) payload.sku = sku.trim();
      if (canSeeCost && unitCost) payload.unitCost = Number(unitCost);

      if (isEdit) {
        await api.patch(`/inventory/products/${initial!.id}`, payload);
      } else {
        await api.post('/inventory/products', payload);
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" data-testid="product-modal">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{isEdit ? 'Modifica prodotto' : 'Nuovo prodotto'}</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="text-sm text-slate-300 mb-1 block">Nome prodotto *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es. iPhone 15 Pro 256GB"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
              data-testid="product-name-input"
            />
          </div>
          <div>
            <label className="text-sm text-slate-300 mb-1 block">SKU (auto se vuoto)</label>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white font-mono"
            />
          </div>
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Gruppo</label>
            <select
              value={groupId || ''}
              onChange={(e) => setGroupId(e.target.value || null)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
              data-testid="product-group-select"
            >
              <option value="">— Nessun gruppo —</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {fieldDefs.length > 0 && (
            <div className="md:col-span-2 bg-slate-800/30 rounded p-3 border border-slate-700/50">
              <div className="text-xs text-slate-400 mb-2 uppercase tracking-wide">
                Campi specifici di "{selectedGroup?.name}"
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {fieldDefs.map((f) => (
                  <div key={f.fieldKey}>
                    <label className="text-sm text-slate-300 mb-1 block">
                      {f.fieldLabel}
                      {f.isRequired && <span className="text-rose-400"> *</span>}
                    </label>
                    {f.fieldType === 'BOOLEAN' ? (
                      <select
                        value={String(customFields[f.fieldKey] ?? '')}
                        onChange={(e) =>
                          setCustomFields({ ...customFields, [f.fieldKey]: e.target.value === 'true' })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                      >
                        <option value="">—</option>
                        <option value="true">Sì</option>
                        <option value="false">No</option>
                      </select>
                    ) : (
                      <input
                        type={f.fieldType === 'NUMBER' ? 'number' : 'text'}
                        value={customFields[f.fieldKey] ?? ''}
                        onChange={(e) =>
                          setCustomFields({
                            ...customFields,
                            [f.fieldKey]: f.fieldType === 'NUMBER' ? Number(e.target.value) : e.target.value,
                          })
                        }
                        className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                        data-testid={`custom-field-${f.fieldKey}`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm text-slate-300 mb-1 block">Quantità in stock</label>
            <input
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Soglia "scorta bassa"</label>
            <input
              type="number"
              min={0}
              value={reorderLevel}
              onChange={(e) => setReorderLevel(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
            />
          </div>

          {canSeeCost && (
            <div>
              <label className="text-sm text-slate-300 mb-1 block">
                Prezzo acquisto <span className="text-xs text-slate-500">(privato)</span>
              </label>
              <div className="relative">
                <CurrencyEur className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded pl-8 pr-3 py-2 text-white"
                />
              </div>
            </div>
          )}
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Prezzo vendita</label>
            <div className="relative">
              <CurrencyEur className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="number"
                step="0.01"
                min={0}
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded pl-8 pr-3 py-2 text-white"
                data-testid="product-selling-price"
              />
            </div>
          </div>

          <div className="md:col-span-2 flex items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isForSale}
                onChange={(e) => setIsForSale(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-slate-300">In vendita (visibile nel catalogo vendite)</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white">
            Annulla
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-white font-medium disabled:opacity-50"
            data-testid="product-save-btn"
          >
            {saving ? 'Salvo...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============== Sell modal ==============
function SellModal({
  open,
  product,
  onClose,
  onSold,
}: {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSold: () => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [unitSalePrice, setUnitSalePrice] = useState<string>('');
  // Venditore obbligatorio — chi ha materialmente venduto al cliente.
  // Aggancia la vendita alle gare con il venditore CORRETTO (potrebbe essere
  // diverso da chi clicca il bottone, es. admin che registra a posteriori).
  const [operators, setOperators] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [soldByUserId, setSoldByUserId] = useState<string>('');
  const [linkCustomer, setLinkCustomer] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [linkPractice, setLinkPractice] = useState(false);
  const [customerPractices, setCustomerPractices] = useState<any[]>([]);
  const [selectedPracticeId, setSelectedPracticeId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  // Phase D minimal — metodo di pagamento
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [saving, setSaving] = useState(false);

  // Carica lista venditori (operators del negozio attivo) all'apertura del modal
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await api.get('/users/operators');
        const list = Array.isArray(res.data) ? res.data : [];
        setOperators(list);
      } catch (err) {
        console.error('[SellModal] errore caricamento operatori:', err);
        setOperators([]);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (open && product) {
      setQuantity(1);
      setUnitSalePrice(product.sellingPrice != null ? String(product.sellingPrice) : '');
      setSoldByUserId('');
      setLinkCustomer(false);
      setCustomerSearch('');
      setCustomers([]);
      setSelectedCustomer(null);
      setLinkPractice(false);
      setCustomerPractices([]);
      setSelectedPracticeId(null);
      setNotes('');
      setPaymentMethod('CASH');
    }
  }, [open, product]);

  const searchCustomers = async () => {
    if (!customerSearch.trim() || customerSearch.trim().length < 2) {
      setCustomers([]);
      return;
    }
    try {
      const res = await api.get(`/customers?search=${encodeURIComponent(customerSearch.trim())}&limit=10`);
      const data = Array.isArray(res.data) ? res.data : res.data.items || res.data.data || [];
      setCustomers(data);
    } catch {
      setCustomers([]);
    }
  };

  useEffect(() => {
    const t = setTimeout(searchCustomers, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerSearch]);

  const pickCustomer = async (c: any) => {
    setSelectedCustomer(c);
    setCustomerSearch('');
    setCustomers([]);
    setSelectedPracticeId(null);
    try {
      const res = await api.get(`/practices?customerId=${c.id}`);
      const data = Array.isArray(res.data) ? res.data : res.data.items || res.data.data || [];
      setCustomerPractices(data);
    } catch {
      setCustomerPractices([]);
    }
  };

  const submit = async () => {
    if (!product) return;
    if (!soldByUserId) {
      alert('Seleziona il venditore — è obbligatorio per agganciare la vendita alle gare');
      return;
    }
    if (quantity > product.quantity) {
      alert(`Quantità superiore allo stock disponibile (${product.quantity})`);
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        itemId: product.id,
        quantity,
        soldByUserId,
      };
      if (unitSalePrice) payload.unitSalePrice = Number(unitSalePrice);
      if (selectedCustomer) payload.customerId = selectedCustomer.id;
      if (selectedPracticeId) payload.practiceId = selectedPracticeId;
      if (notes.trim()) payload.notes = notes.trim();
      if (paymentMethod) payload.paymentMethod = paymentMethod;

      await api.post('/inventory/sales', payload);
      onSold();
      onClose();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Errore vendita');
    } finally {
      setSaving(false);
    }
  };

  if (!open || !product) return null;

  const total = (Number(unitSalePrice) || 0) * quantity;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" data-testid="sell-modal">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Storefront className="w-5 h-5 text-emerald-400" weight="fill" />
            Vendita rapida
          </h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 mb-4">
          <div className="font-medium text-white">{product.name}</div>
          <div className="text-xs text-slate-400 mt-0.5 flex gap-3 flex-wrap">
            <span className="font-mono">{product.sku}</span>
            <span>Stock: {product.quantity}</span>
            {product.groupName && <span>· {product.groupName}</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Quantità</label>
            <input
              type="number"
              min={1}
              max={product.quantity}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
              data-testid="sell-quantity"
            />
          </div>
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Prezzo unitario</label>
            <div className="relative">
              <CurrencyEur className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="number"
                step="0.01"
                min={0}
                value={unitSalePrice}
                onChange={(e) => setUnitSalePrice(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded pl-8 pr-3 py-2 text-white"
                data-testid="sell-unit-price"
              />
            </div>
          </div>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 mb-4 text-emerald-200 text-sm">
          Totale vendita: <strong>€{total.toFixed(2)}</strong>
        </div>

        {/* Venditore — OBBLIGATORIO. Aggancia la vendita alle gare con il venditore corretto */}
        <div className="mb-4">
          <label className="text-sm text-slate-300 mb-1 flex items-center gap-1">
            <span>Venditore</span>
            <span className="text-rose-400">*</span>
          </label>
          <select
            value={soldByUserId}
            onChange={(e) => setSoldByUserId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
            required
            data-testid="sell-sold-by"
          >
            <option value="">— Seleziona chi ha venduto —</option>
            {operators.map((op) => (
              <option key={op.id} value={op.id}>
                {`${op.firstName ?? ''} ${op.lastName ?? ''}`.trim() || op.id.slice(0, 8)}
              </option>
            ))}
          </select>
          {!soldByUserId && (
            <p className="text-xs text-amber-400 mt-1">
              Obbligatorio: senza venditore la vendita NON conta nelle gare.
            </p>
          )}
        </div>

        {/* Step cliente opzionale */}
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={linkCustomer}
              onChange={(e) => {
                setLinkCustomer(e.target.checked);
                if (!e.target.checked) {
                  setSelectedCustomer(null);
                  setSelectedPracticeId(null);
                  setLinkPractice(false);
                }
              }}
              className="w-4 h-4"
              data-testid="sell-link-customer"
            />
            <span className="text-sm text-slate-300 font-medium">Collega questa vendita ad un cliente</span>
          </label>

          {linkCustomer && (
            <div className="ml-6 space-y-2">
              {selectedCustomer ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-2 flex items-center justify-between">
                  <span className="text-sm text-emerald-200">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                    {selectedCustomer.fiscalCode && (
                      <span className="text-xs text-slate-400 ml-2 font-mono">
                        {selectedCustomer.fiscalCode}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedCustomer(null);
                      setSelectedPracticeId(null);
                    }}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Cambia
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Cerca per nome, cognome, codice fiscale o telefono..."
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                    data-testid="sell-customer-search"
                  />
                  {customers.length > 0 && (
                    <div className="max-h-40 overflow-y-auto border border-slate-700 rounded">
                      {customers.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => pickCustomer(c)}
                          className="w-full text-left p-2 hover:bg-slate-800 text-sm text-slate-200 border-b border-slate-700 last:border-0"
                        >
                          <div className="font-medium">
                            {c.firstName} {c.lastName}
                          </div>
                          <div className="text-xs text-slate-400 flex gap-2">
                            {c.fiscalCode && <span className="font-mono">{c.fiscalCode}</span>}
                            {c.phonePrimary && <span>{c.phonePrimary}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Step pratica opzionale (solo se cliente scelto) */}
              {selectedCustomer && customerPractices.length > 0 && (
                <div className="mt-3">
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={linkPractice}
                      onChange={(e) => {
                        setLinkPractice(e.target.checked);
                        if (!e.target.checked) setSelectedPracticeId(null);
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-300 font-medium">
                      Collega anche ad una pratica del cliente
                    </span>
                  </label>
                  {linkPractice && (
                    <select
                      value={selectedPracticeId || ''}
                      onChange={(e) => setSelectedPracticeId(e.target.value || null)}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                      data-testid="sell-practice-select"
                    >
                      <option value="">— Seleziona pratica —</option>
                      {customerPractices.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.category || 'Pratica'} · {p.offerName || p.offerCode || p.id.slice(0, 8)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="text-sm text-slate-300 mb-1 block">Note (opzionali)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm"
            placeholder="Es. sconto fedeltà, regalo natale..."
          />
        </div>

        {/* Phase D minimal — metodo di pagamento */}
        <div>
          <label className="text-sm text-slate-300 mb-1 block">Metodo di pagamento *</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { v: 'CASH', label: '💵 Contanti' },
              { v: 'CARD', label: '💳 Carta' },
              { v: 'POS', label: '🧾 POS' },
              { v: 'BANK_TRANSFER', label: '🏦 Bonifico' },
              { v: 'FINANCING', label: '📊 Finanziamento' },
              { v: 'OTHER', label: '… Altro' },
            ] as const).map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setPaymentMethod(opt.v)}
                data-testid={`sell-payment-${opt.v}`}
                className={`px-2 py-2 rounded text-sm font-medium border transition ${
                  paymentMethod === opt.v
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {paymentMethod === 'FINANCING' && (
            <p className="text-xs text-amber-400 mt-2">
              ⓘ Il finanziamento è registrato come metodo. I dettagli completi (provider, rate, importo finanziato) verranno gestiti in un secondo step.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-slate-300 hover:text-white">
            Annulla
          </button>
          <button
            onClick={submit}
            disabled={saving || quantity > product.quantity || !soldByUserId}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-white font-medium disabled:opacity-50"
            data-testid="sell-confirm-btn"
          >
            {saving ? 'Registro...' : `Conferma vendita €${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============== Main page ==============
export default function ProductsCatalogPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const canViewProducts = usePermission('canViewProducts');
  const canManageProducts = usePermission('canManageProducts');
  const canSellDevices = usePermission('canSellDevices');

  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ProductGroup | null>(null);

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [defaultGroupForProduct, setDefaultGroupForProduct] = useState<string | null>(null);

  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [sellingProduct, setSellingProduct] = useState<Product | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!canViewProducts) {
      router.push('/operator/dashboard');
      return;
    }
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, canViewProducts]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [g, p] = await Promise.all([
        api.get('/inventory/groups'),
        api.get('/inventory/products'),
      ]);
      setGroups(g.data);
      setProducts(p.data);
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || 'Errore caricamento');
    } finally {
      setLoading(false);
    }
  };

  // Raggruppa prodotti per gruppo (incluso "senza gruppo")
  const grouped = useMemo(() => {
    const filtered = filterQuery.trim()
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
            p.sku.toLowerCase().includes(filterQuery.toLowerCase()),
        )
      : products;
    const map = new Map<string | null, Product[]>();
    for (const p of filtered) {
      const key = p.groupId || null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return map;
  }, [products, filterQuery]);

  const handleReorderGroups = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = groups.findIndex((g) => g.id === active.id);
    const newIdx = groups.findIndex((g) => g.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const next = arrayMove(groups, oldIdx, newIdx);
    setGroups(next);
    try {
      await api.patch('/inventory/groups/reorder', {
        items: next.map((g, i) => ({ id: g.id, sortOrder: i })),
      });
    } catch (err) {
      console.error(err);
      fetchAll();
    }
  };

  const handleDeleteGroup = async (group: ProductGroup) => {
    if (!confirm(`Eliminare il gruppo "${group.name}"? I prodotti collegati resteranno in catalogo senza gruppo.`)) return;
    await api.delete(`/inventory/groups/${group.id}`);
    fetchAll();
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Eliminare il prodotto "${product.name}"?`)) return;
    await api.delete(`/inventory/products/${product.id}`);
    fetchAll();
  };

  if (loading) {
    return (
      <OperatorLayout>
        <div className="p-8 text-slate-400">Caricamento catalogo...</div>
      </OperatorLayout>
    );
  }

  const productsNoGroup = grouped.get(null) || [];

  return (
    <OperatorLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Tag className="w-6 h-6 text-emerald-400" weight="duotone" />
              Catalogo prodotti
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Organizza i tuoi dispositivi in gruppi liberi (Telefoni, Accessori…) con campi custom.
            </p>
          </div>
          {canManageProducts && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingGroup(null);
                  setGroupModalOpen(true);
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-white text-sm font-medium"
                data-testid="new-group-btn"
              >
                <Plus className="w-4 h-4 inline mr-1" weight="bold" /> Nuovo gruppo
              </button>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setDefaultGroupForProduct(null);
                  setProductModalOpen(true);
                }}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-white text-sm font-medium"
                data-testid="new-product-btn"
              >
                <Plus className="w-4 h-4 inline mr-1" weight="bold" /> Nuovo prodotto
              </button>
            </div>
          )}
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Cerca prodotto per nome o SKU..."
            className="w-full md:max-w-sm bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm"
            data-testid="catalog-search"
          />
        </div>

        {groups.length === 0 && products.length === 0 ? (
          <div className="text-center py-16 text-slate-500 border border-dashed border-slate-700 rounded-xl">
            <Tag className="w-12 h-12 mx-auto mb-3 text-slate-600" weight="duotone" />
            <p>Catalogo vuoto.</p>
            {canManageProducts && (
              <p className="text-sm mt-2">
                Inizia creando un{' '}
                <button onClick={() => setGroupModalOpen(true)} className="text-emerald-400 hover:underline">
                  gruppo
                </button>{' '}
                (es. Telefoni) o un prodotto.
              </p>
            )}
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleReorderGroups}>
            <SortableContext items={groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {groups.map((g) => (
                  <SortableGroupCard
                    key={g.id}
                    group={g}
                    products={grouped.get(g.id) || []}
                    canManage={canManageProducts}
                    canSell={canSellDevices}
                    canSeeCost={canManageProducts}
                    onEditGroup={() => {
                      setEditingGroup(g);
                      setGroupModalOpen(true);
                    }}
                    onDeleteGroup={() => handleDeleteGroup(g)}
                    onAddProduct={() => {
                      setEditingProduct(null);
                      setDefaultGroupForProduct(g.id);
                      setProductModalOpen(true);
                    }}
                    onEditProduct={(p) => {
                      setEditingProduct(p);
                      setProductModalOpen(true);
                    }}
                    onDeleteProduct={handleDeleteProduct}
                    onSell={(p) => {
                      setSellingProduct(p);
                      setSellModalOpen(true);
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {productsNoGroup.length > 0 && (
          <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/40 overflow-hidden">
            <div className="px-4 py-3 bg-slate-800/50">
              <span className="font-bold text-slate-300">Senza gruppo</span>
              <span className="ml-2 text-xs text-slate-500 bg-slate-900/60 rounded-full px-2 py-0.5">
                {productsNoGroup.length}
              </span>
            </div>
            <div className="p-3 space-y-2">
              {productsNoGroup.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  canManage={canManageProducts}
                  canSell={canSellDevices}
                  canSeeCost={canManageProducts}
                  onEdit={() => {
                    setEditingProduct(p);
                    setProductModalOpen(true);
                  }}
                  onDelete={() => handleDeleteProduct(p)}
                  onSell={() => {
                    setSellingProduct(p);
                    setSellModalOpen(true);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <GroupFormModal
        open={groupModalOpen}
        initial={editingGroup}
        onClose={() => setGroupModalOpen(false)}
        onSaved={fetchAll}
      />
      <ProductFormModal
        open={productModalOpen}
        initial={editingProduct}
        groups={groups}
        defaultGroupId={defaultGroupForProduct}
        canSeeCost={canManageProducts}
        onClose={() => setProductModalOpen(false)}
        onSaved={fetchAll}
      />
      <SellModal
        open={sellModalOpen}
        product={sellingProduct}
        onClose={() => setSellModalOpen(false)}
        onSold={fetchAll}
      />
    </OperatorLayout>
  );
}
