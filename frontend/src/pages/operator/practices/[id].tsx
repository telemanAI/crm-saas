import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { ADDITIONAL_PACKAGES } from '@/stores/practiceWizardStore';
import { 
  ArrowLeft, 
  Trash, 
  FileText, 
  User, 
  MapPin, 
  CreditCard, 
  CheckCircle, 
  Clock,
  Buildings,
  Phone,
  Envelope,
  Shield,
  Pencil,
  Check,
  X,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Tag,
  Package,
  TelevisionSimple,
  Warning,
  NavigationArrow
} from 'phosphor-react';
import { useAuthStore } from '@/stores/authStore';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/axios';
import OperatorLayout from '@/components/layout/OperatorLayout';
import Link from 'next/link';
import type { PracticeDetail as IPracticeDetail } from '@/types/practice';

// 🔥 HELPER: Converte valori potenzialmente oggetto/null in stringa sicura
const safeString = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    // Se è un oggetto (incluso {}), evita il crash React #31
    console.warn('[safeString] Tentativo di renderizzare oggetto:', value);
    return '';
  }
  return '';
};

// 🔥 HELPER: Sanitizza dati practice che potrebbero arrivare malformati dal backend
const sanitizePracticeData = (data: any): IPracticeDetail => {
  // Fix installationAddress se è stringa JSON
  if (data.installationAddress && typeof data.installationAddress === 'string') {
    try {
      data.installationAddress = JSON.parse(data.installationAddress);
    } catch {
      data.installationAddress = undefined;
    }
  }
  // Assicurati che sia un oggetto valido o undefined
  if (data.installationAddress && typeof data.installationAddress !== 'object') {
    data.installationAddress = undefined;
  }

  // Fix oldLineData se è stringa JSON
  if (data.oldLineData && typeof data.oldLineData === 'string') {
    try {
      data.oldLineData = JSON.parse(data.oldLineData);
    } catch {
      data.oldLineData = undefined;
    }
  }
  if (data.oldLineData && typeof data.oldLineData !== 'object') {
    data.oldLineData = undefined;
  }

  // Fix appointmentData se è stringa JSON
  if (data.appointmentData && typeof data.appointmentData === 'string') {
    try {
      data.appointmentData = JSON.parse(data.appointmentData);
    } catch {
      data.appointmentData = undefined;
    }
  }

  // Fix paymentMethod se è stringa JSON
  if (data.paymentMethod && typeof data.paymentMethod === 'string') {
    try {
      data.paymentMethod = JSON.parse(data.paymentMethod);
    } catch {
      data.paymentMethod = undefined;
    }
  }

  // Fix convergenza se è stringa JSON
  if (data.convergenza && typeof data.convergenza === 'string') {
    try {
      data.convergenza = JSON.parse(data.convergenza);
    } catch {
      data.convergenza = undefined;
    }
  }

  // Fix washConfig se è stringa JSON
  if (data.washConfig && typeof data.washConfig === 'string') {
    try {
      data.washConfig = JSON.parse(data.washConfig);
    } catch {
      data.washConfig = undefined;
    }
  }

  // Assicurati che customer sia un oggetto valido
  if (!data.customer || typeof data.customer !== 'object') {
    data.customer = {};
  }

  return data as IPracticeDetail;
};

// ===== SPRINT — Helper inline edit: matita + dropdown =====
interface InlineUserFieldProps {
  label: string;
  value: string;
  currentUserId?: string;
  canEdit: boolean;
  teamUsers: Array<{ id: string; firstName: string; lastName: string }>;
  onSave: (userId: string, name: string) => Promise<void>;
  testid?: string;
}
function InlineUserField({ label, value, currentUserId, canEdit, teamUsers, onSave, testid }: InlineUserFieldProps) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(currentUserId || '');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setVal(currentUserId || ''); }, [currentUserId]);
  const handleSave = async () => {
    setSaving(true);
    const u = teamUsers.find((x) => x.id === val);
    const name = u ? `${u.firstName} ${u.lastName}` : '';
    try { await onSave(val, name); setEditing(false); } finally { setSaving(false); }
  };
  return (
    <div data-testid={testid ? `inline-${testid}` : undefined}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <label className="text-sm text-slate-500">{label}</label>
        {canEdit && !editing && (
          <button
            data-testid={testid ? `${testid}-edit-btn` : undefined}
            onClick={() => setEditing(true)}
            className="p-1 text-slate-500 hover:text-emerald-400 transition-colors"
            title={`Modifica ${label}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {editing ? (
        <div className="flex items-center gap-2">
          <select
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500/50"
          >
            <option value="">— Seleziona operatore —</option>
            {teamUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
            ))}
          </select>
          <button onClick={handleSave} disabled={saving} className="p-1.5 text-emerald-400 hover:bg-emerald-600/20 rounded transition-colors" title="Salva">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => { setEditing(false); setVal(currentUserId || ''); }} className="p-1.5 text-rose-400 hover:bg-rose-600/20 rounded transition-colors" title="Annulla">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <p className="text-white">{value || <span className="text-slate-500 italic">Non assegnato</span>}</p>
      )}
    </div>
  );
}

// Inline edit generico select (Tecnologia, Metodo pagamento, ecc.)
interface InlineSelectFieldProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  canEdit: boolean;
  onSave: (newValue: string) => Promise<void>;
  testid?: string;
}
function InlineSelectField({ label, value, options, canEdit, onSave, testid }: InlineSelectFieldProps) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || '');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setVal(value || ''); }, [value]);
  const handleSave = async () => {
    setSaving(true);
    try { await onSave(val); setEditing(false); } finally { setSaving(false); }
  };
  const display = options.find((o) => o.value === value)?.label || value;
  return (
    <div data-testid={testid ? `inline-${testid}` : undefined}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <label className="text-xs text-slate-500">{label}</label>
        {canEdit && !editing && (
          <button
            data-testid={testid ? `${testid}-edit-btn` : undefined}
            onClick={() => setEditing(true)}
            className="p-1 text-slate-500 hover:text-emerald-400 transition-colors"
            title={`Modifica ${label}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {editing ? (
        <div className="flex items-center gap-2">
          <select
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500/50"
          >
            <option value="">— Seleziona —</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button onClick={handleSave} disabled={saving} className="p-1.5 text-emerald-400 hover:bg-emerald-600/20 rounded transition-colors" title="Salva">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => { setEditing(false); setVal(value || ''); }} className="p-1.5 text-rose-400 hover:bg-rose-600/20 rounded transition-colors" title="Annulla">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <p className="text-white font-medium">{display || <span className="text-slate-500 italic">—</span>}</p>
      )}
    </div>
  );
}

// Inline edit testo generico (IBAN, PostePay, indirizzo, CAP ecc.)
interface InlineTextFieldProps {
  label: string;
  value: string;
  canEdit: boolean;
  placeholder?: string;
  uppercase?: boolean;
  mono?: boolean;
  onSave: (newValue: string) => Promise<void>;
  testid?: string;
}
function InlineTextField({ label, value, canEdit, placeholder, uppercase, mono, onSave, testid }: InlineTextFieldProps) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || '');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setVal(value || ''); }, [value]);
  const handleSave = async () => {
    setSaving(true);
    try { await onSave(val); setEditing(false); } finally { setSaving(false); }
  };
  return (
    <div data-testid={testid ? `inline-${testid}` : undefined}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <label className="text-xs text-slate-500">{label}</label>
        {canEdit && !editing && (
          <button
            data-testid={testid ? `${testid}-edit-btn` : undefined}
            onClick={() => setEditing(true)}
            className="p-1 text-slate-500 hover:text-emerald-400 transition-colors"
            title={`Modifica ${label}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={val}
            onChange={(e) => setVal(uppercase ? e.target.value.toUpperCase() : e.target.value)}
            placeholder={placeholder}
            className={`flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500/50 ${mono ? 'font-mono' : ''}`}
          />
          <button onClick={handleSave} disabled={saving} className="p-1.5 text-emerald-400 hover:bg-emerald-600/20 rounded transition-colors" title="Salva">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => { setEditing(false); setVal(value || ''); }} className="p-1.5 text-rose-400 hover:bg-rose-600/20 rounded transition-colors" title="Annulla">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <p className={`text-white ${mono ? 'font-mono text-sm' : ''}`}>{value || <span className="text-slate-500 italic font-sans">—</span>}</p>
      )}
    </div>
  );
}

// ===== SPRINT — EditableCard: pattern "una sola matita per card".
// Quando l'utente clicca la matita, l'intera card entra in editMode
// e tutti i sub-campi diventano editabili. Una sola chiamata di save
// invia un unico payload coerente al backend. =====
function EditableCard({
  title,
  icon,
  borderClass,
  iconBgClass,
  canEdit,
  onSave,
  initialDraft,
  children,
  testid,
}: {
  title: string;
  icon: React.ReactNode;
  borderClass?: string;
  iconBgClass?: string;
  canEdit: boolean;
  onSave: (draft: any) => Promise<void> | void;
  initialDraft: any;
  children: (ctx: { editing: boolean; draft: any; setDraft: (patch: any) => void }) => React.ReactNode;
  testid?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraftState] = useState<any>(initialDraft);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (!editing) setDraftState(initialDraft); }, [initialDraft, editing]);
  const setDraft = (patch: any) => setDraftState((prev: any) => ({ ...prev, ...patch }));
  const handleSave = async () => {
    setSaving(true);
    try { await onSave(draft); setEditing(false); } finally { setSaving(false); }
  };
  const handleCancel = () => { setDraftState(initialDraft); setEditing(false); };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid={testid}
      className={`bg-slate-900/80 backdrop-blur-xl border ${borderClass || 'border-slate-800'} rounded-2xl p-6`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${iconBgClass || 'bg-indigo-600/20 text-indigo-400'} flex items-center justify-center`}>
            {icon}
          </div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
        </div>
        {canEdit && (
          editing ? (
            <div className="flex items-center gap-1.5">
              <button
                data-testid={testid ? `${testid}-save` : undefined}
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <Check className="w-3.5 h-3.5" /> {saving ? 'Salvo...' : 'Salva'}
              </button>
              <button
                data-testid={testid ? `${testid}-cancel` : undefined}
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center gap-1 px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              data-testid={testid ? `${testid}-edit` : undefined}
              onClick={() => setEditing(true)}
              className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800/50 rounded-lg transition-colors"
              title="Modifica"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )
        )}
      </div>
      {children({ editing, draft, setDraft })}
    </motion.div>
  );
}

// Helper di rendering field dentro EditableCard
function FieldView({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-slate-500 block mb-1">{label}</label>
      <div className="text-white">{children}</div>
    </div>
  );
}

// ===== SPRINT — Blocco editabile "Dati Linea Precedente" con una sola matita.
// Tutti i campi della vecchia linea (numero, codice migrazione, gestore, ecc.)
// + oldLineStatus + oldLineTechnology entrano insieme in edit-mode con una matita
// in alto a destra del blocco. Save unico via stepKey='line-old' allineato a new.tsx. =====
function OldLineEditableBlock({
  practice,
  canEdit,
  saveStepKey,
}: {
  practice: any;
  canEdit: boolean;
  saveStepKey: (stepKey: string, payload: Record<string, any>) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const initial = {
    oldPhoneNumber: practice.oldLineData?.oldPhoneNumber ?? '',
    migrationCode: practice.oldLineData?.migrationCode ?? '',
    gestore: practice.oldLineData?.gestore ?? '',
    gestoreAltro: practice.oldLineData?.gestoreAltro ?? '',
    fiscalCodeOldLine: practice.oldLineData?.fiscalCodeOldLine ?? '',
    prodottiRestituire: practice.oldLineData?.prodottiRestituire ?? '',
    notes: practice.oldLineData?.notes ?? '',
    oldLineStatus: practice.oldLineStatus ?? '',
    oldLineTechnology: practice.oldLineTechnology ?? '',
  };
  const [draft, setDraft] = useState<typeof initial>(initial);
  useEffect(() => { if (!editing) setDraft(initial); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [practice, editing]);
  const upd = (patch: Partial<typeof initial>) => setDraft((p) => ({ ...p, ...patch }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveStepKey('line-old', {
        oldLineData: {
          oldPhoneNumber: draft.oldPhoneNumber || null,
          migrationCode: draft.migrationCode || null,
          gestore: draft.gestore || null,
          gestoreAltro: draft.gestoreAltro || null,
          fiscalCodeOldLine: draft.fiscalCodeOldLine || null,
          prodottiRestituire: draft.prodottiRestituire || null,
          notes: draft.notes || null,
        },
        oldLineStatus: draft.oldLineStatus || null,
        oldLineTechnology: draft.oldLineTechnology || null,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-slate-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-amber-400 flex items-center gap-2">
          <Clock className="w-4 h-4" /> Dati Linea Precedente (Migrazione)
        </h3>
        {canEdit && (
          editing ? (
            <div className="flex items-center gap-1.5">
              <button
                data-testid="old-line-block-save"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <Check className="w-3.5 h-3.5" /> {saving ? 'Salvo...' : 'Salva'}
              </button>
              <button
                data-testid="old-line-block-cancel"
                onClick={() => { setDraft(initial); setEditing(false); }}
                className="flex items-center gap-1 px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              data-testid="old-line-block-edit"
              onClick={() => setEditing(true)}
              className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800/50 rounded-lg transition-colors"
              title="Modifica Dati Linea Precedente"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-amber-900/10 p-4 rounded-xl border border-amber-600/20">
        <FieldView label="Stato Vecchia Linea">
          {editing ? (
            <select value={draft.oldLineStatus} onChange={(e) => upd({ oldLineStatus: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500/50">
              <option value="">— Seleziona —</option>
              <option value="DA_DISATTIVARE">Da Disattivare</option>
              <option value="IN_DISATTIVAZIONE">In Disattivazione</option>
              <option value="DISATTIVATA">Disattivata</option>
            </select>
          ) : (
            <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${
              practice.oldLineStatus === 'DISATTIVATA' ? 'bg-emerald-600/20 text-emerald-300' :
              practice.oldLineStatus === 'IN_DISATTIVAZIONE' ? 'bg-amber-600/20 text-amber-300' :
              practice.oldLineStatus === 'DA_DISATTIVARE' ? 'bg-rose-600/20 text-rose-300' :
              'bg-slate-700/40 text-slate-400'
            }`}>
              {practice.oldLineStatus === 'DA_DISATTIVARE' ? 'Da Disattivare' :
               practice.oldLineStatus === 'IN_DISATTIVAZIONE' ? 'In Disattivazione' :
               practice.oldLineStatus === 'DISATTIVATA' ? 'Disattivata' : 'Non impostato'}
            </span>
          )}
        </FieldView>
        <FieldView label="Tecnologia Provenienza">
          {editing ? (
            <select value={draft.oldLineTechnology} onChange={(e) => upd({ oldLineTechnology: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500/50">
              <option value="">— Seleziona —</option>
              <option value="FTTC">FTTC</option>
              <option value="FTTH">FTTH</option>
              <option value="FWA">FWA</option>
            </select>
          ) : (
            <span className="font-medium">{practice.oldLineTechnology || <span className="text-slate-500 italic">—</span>}</span>
          )}
        </FieldView>
        <FieldView label="Numero Attuale">
          {editing ? (
            <input value={draft.oldPhoneNumber} onChange={(e) => upd({ oldPhoneNumber: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500/50" />
          ) : (
            <span>{practice.oldLineData?.oldPhoneNumber || <span className="text-slate-500 italic">—</span>}</span>
          )}
        </FieldView>
        <FieldView label="Codice Migrazione">
          {editing ? (
            <input value={draft.migrationCode} onChange={(e) => upd({ migrationCode: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-emerald-500/50" />
          ) : (
            <span className="font-mono">{practice.oldLineData?.migrationCode || <span className="text-slate-500 italic font-sans">—</span>}</span>
          )}
        </FieldView>
        <FieldView label="Gestore">
          {editing ? (
            <input value={draft.gestore} onChange={(e) => upd({ gestore: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500/50" />
          ) : (
            <span>{practice.oldLineData?.gestore || <span className="text-slate-500 italic">—</span>}</span>
          )}
        </FieldView>
        <FieldView label="Altro Gestore">
          {editing ? (
            <input value={draft.gestoreAltro} onChange={(e) => upd({ gestoreAltro: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500/50" />
          ) : (
            <span>{practice.oldLineData?.gestoreAltro || <span className="text-slate-500 italic">—</span>}</span>
          )}
        </FieldView>
        <FieldView label="CF Vecchia Linea">
          {editing ? (
            <input value={draft.fiscalCodeOldLine} onChange={(e) => upd({ fiscalCodeOldLine: e.target.value.toUpperCase() })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-emerald-500/50" />
          ) : (
            <span className="font-mono text-sm">{practice.oldLineData?.fiscalCodeOldLine || <span className="text-slate-500 italic font-sans">—</span>}</span>
          )}
        </FieldView>
        <div className="sm:col-span-2">
          <FieldView label="Prodotti da Restituire">
            {editing ? (
              <input value={draft.prodottiRestituire} onChange={(e) => upd({ prodottiRestituire: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500/50" />
            ) : (
              <span>{practice.oldLineData?.prodottiRestituire || <span className="text-slate-500 italic">—</span>}</span>
            )}
          </FieldView>
        </div>
        <div className="sm:col-span-2">
          <FieldView label="Note Vecchia Linea">
            {editing ? (
              <textarea value={draft.notes} onChange={(e) => upd({ notes: e.target.value })} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500/50" />
            ) : (
              <p className="text-slate-300 text-sm whitespace-pre-wrap">{practice.oldLineData?.notes || <span className="text-slate-500 italic">—</span>}</p>
            )}
          </FieldView>
        </div>
      </div>
    </div>
  );
}

export default function PracticeDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuthStore();
  // Phase B — Permessi granulari
  const canEditPractices = usePermission('canEditPractices');
  const canDeletePractices = usePermission('canDeletePractices');
  const [practice, setPractice] = useState<IPracticeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  
  const [notes, setNotes] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  
  const [operationalStatus, setOperationalStatus] = useState<string>('PENDING');
  
  const [convergenzaNumero, setConvergenzaNumero] = useState('');
  const [savingConvergenza, setSavingConvergenza] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [koReason, setKoReason] = useState('');
  const [pendingSkyTvStatus, setPendingSkyTvStatus] = useState<string | null>(null);
  const [skyTvKoReason, setSkyTvKoReason] = useState('');

  // ===== SPRINT — Stato globale (vincoli + banner) =====
  const [completionBlockers, setCompletionBlockers] = useState<string[]>([]);
  const [showCompletionError, setShowCompletionError] = useState(false);

  // ===== SPRINT — Operatori dropdown (stesso endpoint di new.tsx OperatorsDropdown) =====
  const [operators, setOperators] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  useEffect(() => {
    if (!canEditPractices) return;
    (async () => {
      try {
        const res = await api.get('/users/operators');
        setOperators(res.data || []);
      } catch { /* ignore */ }
    })();
  }, [canEditPractices]);

  // Helper inline: salva un campo allineato ai veri stepKey di new.tsx.
  // ===== SPRINT — Optimistic update: aggiorna SUBITO lo state locale con i
  // dati nuovi (così l'UI cambia istantaneamente), poi conferma con fetch.
  // Se l'API fallisce, il refetch riporta lo stato corretto. =====
  const saveStepKey = async (stepKey: string, payload: Record<string, any>) => {
    // 1) Optimistic update locale (rendering istantaneo)
    setPractice((prev) => prev ? { ...prev, ...payload } as any : prev);
    try {
      const res = await api.put(`/practices/${id}/step`, { stepKey, data: payload });
      // 2) Se il backend ritorna la pratica aggiornata, usiamo quella (fonte di verità)
      if (res?.data && (res.data.id === id || res.data.id === undefined)) {
        setPractice((prev) => prev ? sanitizePracticeData({ ...prev, ...res.data }) : prev);
      } else {
        // fallback: refetch silenzioso
        fetchPractice();
      }
      return true;
    } catch (err) {
      // Rollback: refetch per ripristinare lo stato vero
      fetchPractice();
      return false;
    }
  };

  useEffect(() => {
    if (id && token) fetchPractice();
  }, [id, token]);

  useEffect(() => {
    if (practice) setOperationalStatus(typeof practice.operationalStatus === 'string' ? practice.operationalStatus : 'PENDING');
  }, [practice]);

  const fetchPractice = async () => {
    try {
      const response = await api.get(`/practices/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let rawData = response.data;
      
      // 🔥 SANITIZZAZIONE CRITICA per evitare React #31
      rawData = sanitizePracticeData(rawData);
      
      let steps = rawData.completedSteps;
      if (typeof steps === 'string') {
        steps = steps.split(',').map((s: string) => Number(s.trim())).filter((n: number) => !isNaN(n));
      } else if (!Array.isArray(steps)) {
        steps = [];
      }
      rawData.completedSteps = steps;
      
      setPractice(rawData);
      setNotes(rawData.notes || '');
    } catch (err: any) {
      console.error('Errore caricamento pratica:', err);
      setError('Impossibile caricare la pratica');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (noteIndex: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa nota?')) return;
    try {
      await api.delete(`/practices/${id}/notes/${noteIndex}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPractice();
    } catch (err) {
      alert('Errore durante l\'eliminazione della nota');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questa pratica? L\'azione è irreversibile.')) return;
    
    setDeleteLoading(true);
    try {
      await api.delete(`/practices/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      router.push('/operator/practices');
    } catch (err) {
      console.error('Errore eliminazione:', err);
      alert('Errore durante l\'eliminazione');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    setNotesLoading(true);
    try {
      await api.put(`/practices/${id}/step`, {
        stepNumber: 3,
        data: { notes: notes }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsEditingNotes(false);
      fetchPractice();
    } catch (err) {
      console.error('Errore salvataggio note:', err);
      alert('Errore durante il salvataggio delle note');
    } finally {
      setNotesLoading(false);
    }
  };

  // 🔥 FIX BUILD: firma allargata da union type a string per supportare KO_CREDITO / KO_COPERTURA
  const handleOperationalStatusChange = async (newStatus: string) => {
    if (!practice || statusLoading) return;
    // Se è uno stato KO, apri prima il form motivazione e NON chiamare subito l'API
    if (isKoStatus(newStatus)) {
      setPendingStatus(newStatus);
      return;
    }
    // Stato non-KO: chiamata diretta
    await doUpdateStatus(newStatus);
  };

  const doUpdateStatus = async (newStatus: string, reason?: string) => {
    if (!practice) return;
    setStatusLoading(true);
    try {
      const payload: any = { status: newStatus };
      if (reason) payload.koReason = reason;
      await api.put(`/practices/${id}/operational-status`, payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOperationalStatus(newStatus);
      setPendingStatus(null);
      setKoReason('');
      fetchPractice();
    } catch (err: any) {
      console.error('Errore cambio stato:', err);
      alert('Errore aggiornamento stato: ' + (err?.response?.data?.message || err?.message || ''));
      if (practice.operationalStatus) {
        setOperationalStatus(practice.operationalStatus);
      }
    } finally {
      setStatusLoading(false);
    }
  };

  const confirmKoStatus = () => {
    if (!pendingStatus) return;
    if (!koReason.trim()) {
      alert('Inserisci la motivazione KO obbligatoria');
      return;
    }
    doUpdateStatus(pendingStatus, koReason.trim());
  };

  const updateSkyTvStatus = async (newSkyTvStatus: string | null) => {
    if (!practice || statusLoading) return;
    // Se è uno stato KO Sky TV, apri prima il form motivazione
    if (newSkyTvStatus && newSkyTvStatus.startsWith('KO_')) {
      setPendingSkyTvStatus(newSkyTvStatus);
      return;
    }
    await doUpdateSkyTv(newSkyTvStatus);
  };

  const doUpdateSkyTv = async (newSkyTvStatus: string | null, reason?: string) => {
    if (!practice) return;
    setStatusLoading(true);
    try {
      const payload: any = { skyTvStatus: newSkyTvStatus || null };
      if (reason) payload.skyTvKoReason = reason;
      await api.patch(`/practices/${id}/sky-tv-status`, payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPendingSkyTvStatus(null);
      setSkyTvKoReason('');
      fetchPractice();
    } catch (err: any) {
      console.error('Errore aggiornamento Sky TV:', err);
      alert('Errore aggiornamento Sky TV: ' + (err?.response?.data?.message || err?.message || ''));
    } finally {
      setStatusLoading(false);
    }
  };

  const confirmSkyTvKoStatus = () => {
    if (!pendingSkyTvStatus) return;
    if (!skyTvKoReason.trim()) {
      alert('Inserisci la motivazione KO Sky TV obbligatoria');
      return;
    }
    doUpdateSkyTv(pendingSkyTvStatus, skyTvKoReason.trim());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-400 bg-emerald-600/10 border-emerald-600/20';
      case 'cancelled': return 'text-rose-400 bg-rose-600/10 border-rose-600/20';
      case 'in_progress': return 'text-amber-400 bg-amber-600/10 border-amber-600/20';
      default: return 'text-slate-400 bg-slate-600/10 border-slate-600/20';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completata';
      case 'cancelled': return 'Annullata';
      case 'in_progress': return 'In corso';
      default: return 'Bozza';
    }
  };

  const isKoStatus = (s: string) => s === 'REJECTED' || s.includes('KO');

  const getOperationalStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVATED': return 'bg-emerald-500 text-white border-emerald-500';
      case 'REJECTED': return 'bg-rose-500 text-white border-rose-500';
      case 'KO_CREDITO': return 'bg-rose-500 text-white border-rose-500';
      case 'KO_COPERTURA': return 'bg-rose-500 text-white border-rose-500';
      case 'IN_PROGRESS': return 'bg-blue-500 text-white border-blue-500';
      default: return 'bg-amber-500 text-white border-amber-500';
    }
  };

  const getOperationalStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVATED': return 'Attivata';
      case 'REJECTED': return 'KO';
      case 'KO_CREDITO': return 'KO Credito';
      case 'KO_COPERTURA': return 'KO Copertura';
      case 'IN_PROGRESS': return 'In Lavorazione';
      default: return 'Da Completare';
    }
  };

  const getSkyTvColor = (status: string) => {
    switch (status) {
      case 'ATTIVO': return 'bg-emerald-500 text-white border-emerald-500';
      case 'IN_LAVORAZIONE': return 'bg-blue-500 text-white border-blue-500';
      case 'IN_VERIFICA_WM': return 'bg-amber-500 text-white border-amber-500';
      case 'NON_SALITA_ARCADIA': return 'bg-orange-500 text-white border-orange-500';
      default: return 'bg-rose-500 text-white border-rose-500';
    }
  };

  const isSkyTvKoStatus = (s: string) => s.startsWith('KO_');

  const getSkyTvLabel = (status: string) => {
    const map: Record<string, string> = {
      'IN_LAVORAZIONE': 'In lavorazione',
      'IN_VERIFICA_WM': 'In verifica WM',
      'NON_SALITA_ARCADIA': 'Non salita su Arcadia',
      'ATTIVO': 'Attivo',
      'KO_GENERICO': 'KO Generico',
      'KO_CREDITO': 'KO Credito',
      'KO_COPERTURA': 'KO Copertura',
      'KO_RINUNCIA_CLIENTE': 'KO Rinuncia Cliente',
    };
    return map[status] || status;
  };

  const getBorderColorByStatus = (status: string) => {
    switch (status) {
      case 'ACTIVATED': return 'border-emerald-600/50';
      case 'REJECTED': return 'border-rose-600/50';
      case 'IN_PROGRESS': return 'border-blue-600/50';
      default: return 'border-slate-800';
    }
  };

  if (loading) {
    return (
      <OperatorLayout title="Dettaglio Pratica">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      </OperatorLayout>
    );
  }

  if (error || !practice) {
    return (
      <OperatorLayout title="Errore">
        <div className="text-center py-12">
          <div className="text-rose-400 text-xl mb-4">{error || 'Pratica non trovata'}</div>
          <Link href="/operator/practices" className="text-indigo-400 hover:text-indigo-300">
            Torna alla lista
          </Link>
        </div>
      </OperatorLayout>
    );
  }

  const safeCompletedSteps = practice?.completedSteps 
    ? practice.completedSteps.map((s: any) => Number(s)).filter((n: number) => !isNaN(n)) 
    : [];

  // Check sicuro per indirizzo
  const hasAddressData = practice.installationAddress && (
    safeString(practice.installationAddress.street) || 
    safeString(practice.installationAddress.comune) || 
    safeString(practice.installationAddress.citta) || 
    safeString(practice.installationAddress.cap)
  );

  return (
    <OperatorLayout title={`Pratica ${practice.offerCode || practice.id.slice(0,8)}`}>
      <div className={`flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 md:mb-8 p-3 md:p-6 bg-slate-900/80 backdrop-blur-xl border ${getBorderColorByStatus(operationalStatus)} rounded-2xl gap-3`}>
        <div className="flex items-start gap-2 md:gap-4 min-w-0 flex-1">
          <Link href="/operator/practices">
            <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all flex-shrink-0">
              <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 md:gap-3 mb-2 flex-wrap">
              <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium border ${getStatusColor(practice.status)}`}>
                {getStatusLabel(practice.status)}
              </span>
              <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium ${getOperationalStatusColor(operationalStatus)}`}>
                {getOperationalStatusLabel(operationalStatus)}
              </span>
              
              {practice.statoGlobale && (
                <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium ${
                  practice.statoGlobale === 'completo' 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {practice.statoGlobale === 'completo' ? 'Completa' : 'Da Completare'}
                </span>
              )}

              <span className="text-slate-500 text-[10px] md:text-sm">Step {practice.currentStep}/9</span>
            </div>
            <h1 className="text-lg md:text-3xl font-bold text-white break-words">{practice.offerName}</h1>

            {/* ===== SPRINT — Banner vincoli (compare se l'utente tenta COMPLETATA con vincoli non ok) ===== */}
            {showCompletionError && completionBlockers.length > 0 && (
              <div
                data-testid="completion-blockers-banner"
                className="mt-3 p-3 md:p-4 bg-amber-950/30 border border-amber-500/40 rounded-xl"
              >
                <div className="flex items-start gap-2.5">
                  <Warning className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" weight="duotone" />
                  <div className="flex-1">
                    <p className="text-amber-300 text-sm font-medium mb-2">Impossibile completare la pratica</p>
                    <ul className="space-y-1">
                      {completionBlockers.map((b, i) => (
                        <li key={i} className="text-amber-200/90 text-xs md:text-sm flex items-start gap-2">
                          <span className="text-amber-400">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    onClick={() => setShowCompletionError(false)}
                    className="text-amber-400 hover:text-amber-300 p-1"
                    aria-label="Chiudi"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-1.5 mt-2 md:mt-3 flex-wrap">
              <span className="text-[10px] md:text-xs text-slate-400 mr-1 md:mr-2 w-full md:w-auto">Stato nuova linea:</span>
              {(['PENDING','IN_PROGRESS','ACTIVATED','REJECTED','KO_CREDITO','KO_COPERTURA'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => handleOperationalStatusChange(s)}
                  disabled={statusLoading || operationalStatus === s}
                  className={`px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-medium transition-all ${
                    operationalStatus === s
                      ? getOperationalStatusColor(s)
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {getOperationalStatusLabel(s)}
                </button>
              ))}
            </div>

            {/* ===== SPRINT — Stato vecchia linea (solo Migrazione) — riga di bottoni come Stato nuova linea ===== */}
            {canEditPractices && practice.lineType === 'MIGRAZIONE' && (
              <div className="flex items-center gap-1.5 mt-2 md:mt-3 flex-wrap" data-testid="old-line-status-row">
                <span className="text-[10px] md:text-xs text-slate-400 mr-1 md:mr-2 w-full md:w-auto">Stato vecchia linea:</span>
                {(['DA_DISATTIVARE','IN_DISATTIVAZIONE','DISATTIVATA'] as const).map((s) => {
                  const labels: Record<typeof s, string> = { DA_DISATTIVARE: 'Da Disattivare', IN_DISATTIVAZIONE: 'In Disattivazione', DISATTIVATA: 'Disattivata' };
                  const colors: Record<typeof s, string> = {
                    DA_DISATTIVARE: 'bg-rose-600/20 text-rose-300 border border-rose-500/40',
                    IN_DISATTIVAZIONE: 'bg-amber-600/20 text-amber-300 border border-amber-500/40',
                    DISATTIVATA: 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40',
                  };
                  const isActive = practice.oldLineStatus === s;
                  return (
                    <button
                      key={s}
                      data-testid={`old-line-status-${s}`}
                      onClick={async () => {
                        if (isActive) return;
                        // SPRINT — Optimistic: cambia subito lo stato locale per UI istantanea
                        setPractice((prev) => prev ? { ...prev, oldLineStatus: s } as any : prev);
                        // Allineato a new.tsx case 'line-old' (riga 891): mando l'intero oldLineData esistente
                        const ok = await saveStepKey('line-old', {
                          oldLineData: practice.oldLineData || {},
                          oldLineStatus: s,
                          oldLineTechnology: practice.oldLineTechnology ?? null,
                        });
                        if (!ok) fetchPractice();
                      }}
                      disabled={isActive}
                      className={`px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-medium transition-all ${
                        isActive ? colors[s] : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {labels[s]}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ===== SPRINT — Stato globale (sempre visibile) — riga di bottoni come Stato nuova linea ===== */}
            <div className="flex items-center gap-1.5 mt-2 md:mt-3 flex-wrap" data-testid="global-status-row">
              <span className="text-[10px] md:text-xs text-slate-400 mr-1 md:mr-2 w-full md:w-auto">Stato globale:</span>
              {(['NON_COMPLETATA','COMPLETATA'] as const).map((s) => {
                const labels: Record<typeof s, string> = { NON_COMPLETATA: 'Non completata', COMPLETATA: 'Completata' };
                // SPRINT — colori richiesti: rosso per NON_COMPLETATA, verde per COMPLETATA
                const colors: Record<typeof s, string> = {
                  NON_COMPLETATA: 'bg-rose-600/30 text-rose-200 border border-rose-500/50',
                  COMPLETATA: 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/50',
                };
                const isActive = practice.globalStatus === s;
                return (
                  <button
                    key={s}
                    data-testid={`global-status-${s}`}
                    onClick={async () => {
                      if (!canEditPractices || isActive) return;
                      // Optimistic update
                      setPractice((prev) => prev ? { ...prev, globalStatus: s } as any : prev);
                      try {
                        const res = await api.patch(`/practices/${id}/global-status`, { status: s });
                        if (res?.data) setPractice((prev) => prev ? sanitizePracticeData({ ...prev, ...res.data }) : prev);
                        setShowCompletionError(false);
                        setCompletionBlockers([]);
                      } catch (err: any) {
                        // Rollback
                        fetchPractice();
                        const errs = err?.response?.data?.errors || err?.response?.data?.message?.errors;
                        if (Array.isArray(errs) && errs.length > 0) {
                          setCompletionBlockers(errs);
                          setShowCompletionError(true);
                        } else {
                          setCompletionBlockers(['Impossibile cambiare lo stato. Verifica i vincoli.']);
                          setShowCompletionError(true);
                        }
                      }
                    }}
                    disabled={!canEditPractices || isActive}
                    className={`px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-medium transition-all ${
                      isActive ? colors[s] : 'bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-50'
                    }`}
                  >
                    {labels[s]}
                  </button>
                );
              })}
            </div>

            {pendingStatus && isKoStatus(pendingStatus) && (
              <div className="mt-4 p-4 bg-rose-950/30 border border-rose-500/30 rounded-xl">
                <label className="block text-sm text-rose-300 mb-2 font-medium">
                  Motivazione KO obbligatoria per {getOperationalStatusLabel(pendingStatus)}
                </label>
                <textarea
                  value={koReason}
                  onChange={(e) => setKoReason(e.target.value)}
                  placeholder="Descrivi il motivo del KO..."
                  rows={3}
                  className="w-full bg-slate-900 border border-rose-700/50 rounded-xl p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none text-sm"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={confirmKoStatus}
                    disabled={statusLoading || !koReason.trim()}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Conferma KO
                  </button>
                  <button
                    onClick={() => { setPendingStatus(null); setKoReason(''); }}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            )}

            {practice.offerName?.toUpperCase().includes('SKY TV') && (
              <div className="mt-4 p-4 bg-cyan-950/20 border border-cyan-500/20 rounded-xl">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs text-cyan-300 mr-1 font-medium w-full md:w-auto">Stato Sky TV:</span>
                  {([
                    '',
                    'IN_LAVORAZIONE',
                    'IN_VERIFICA_WM',
                    'NON_SALITA_ARCADIA',
                    'ATTIVO',
                    'KO_GENERICO',
                    'KO_CREDITO',
                    'KO_COPERTURA',
                    'KO_RINUNCIA_CLIENTE',
                  ] as const).map((s) => (
                    <button
                      key={s || 'none'}
                      onClick={() => updateSkyTvStatus(s || null)}
                      disabled={statusLoading || practice.skyTvStatus === (s || null)}
                      className={`px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-[10px] md:text-xs font-medium transition-all ${
                        practice.skyTvStatus === (s || null)
                          ? (s ? getSkyTvColor(s) : 'bg-slate-600 text-white border-slate-500')
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {s ? getSkyTvLabel(s) : 'Nessuno'}
                    </button>
                  ))}
                </div>

                {pendingSkyTvStatus && isSkyTvKoStatus(pendingSkyTvStatus) && (
                  <div className="mt-4 p-4 bg-rose-950/30 border border-rose-500/40 rounded-xl">
                    <label className="flex items-center gap-2 text-sm text-rose-300 mb-2 font-medium">
                      <TelevisionSimple className="w-4 h-4" weight="fill" />
                      Motivazione KO Sky TV obbligatoria — {getSkyTvLabel(pendingSkyTvStatus)}
                    </label>
                    <textarea
                      value={skyTvKoReason}
                      onChange={(e) => setSkyTvKoReason(e.target.value)}
                      placeholder="Descrivi il motivo del KO Sky TV..."
                      rows={3}
                      className="w-full bg-slate-900 border border-rose-700/50 rounded-xl p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none text-sm"
                    />
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={confirmSkyTvKoStatus}
                        disabled={statusLoading || !skyTvKoReason.trim()}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Conferma KO Sky TV
                      </button>
                      <button
                        onClick={() => { setPendingSkyTvStatus(null); setSkyTvKoReason(''); }}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                      >
                        Annulla
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
          {practice?.status !== 'completed' && (
            <button 
              onClick={async () => {
                if (!confirm('Forzare il completamento?')) return;
                try {
                  await api.post(`/practices/${id}/force-complete`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  alert('Completata!');
                  fetchPractice();
                } catch (e) {
                  alert('Errore');
                }
              }}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-600/30 rounded-xl transition-all text-xs md:text-sm"
            >
              <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Forza </span>Completa
            </button>
          )}
          
          {canEditPractices && (
            <Link href={`/operator/practices/new?edit=${id}`}>
              <button data-testid="practice-edit-btn" className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-600/30 rounded-xl transition-all text-xs md:text-sm">
                <Pencil className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Modifica
              </button>
            </Link>
          )}
          
          {canDeletePractices && (
            <button 
              onClick={handleDelete}
              disabled={deleteLoading}
              data-testid="practice-delete-btn"
              className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-600/30 rounded-xl transition-all disabled:opacity-50 text-xs md:text-sm"
            >
              <Trash className="w-3.5 h-3.5 md:w-4 md:h-4" />
              {deleteLoading ? '...' : 'Elimina'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 pb-24 md:pb-0">
        {/* Colonna Sinistra: Info Pratica + tutto il resto */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          
          {/* INFO PRATICA — Primo gruppo in evidenza */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/80 backdrop-blur-xl border border-indigo-500/20 rounded-2xl p-5 md:p-6"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">Info Pratica</h2>
            </div>

            <div className="space-y-4">
              {practice.offerName && (
                <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                  <h3 className="text-indigo-400 font-semibold mb-3 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Dettaglio Offerta
                  </h3>
                  
                  <div className="space-y-2 mb-4">
                    <p className="text-white font-medium leading-tight">{practice.offerName}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        practice.offerType === 'business' 
                          ? 'bg-purple-600/20 text-purple-400' 
                          : 'bg-blue-600/20 text-blue-400'
                      }`}>
                        {practice.offerType === 'business' ? 'Business' : 'Consumer'}
                      </span>
                      <span className="text-xs text-slate-500">{practice.type}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
                    {practice.offerCanone && (
                      <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-700">
                        <span className="text-slate-400 text-xs block mb-1">Canone</span>
                        <span className="text-emerald-400 font-bold">{safeString(practice.offerCanone)}</span>
                      </div>
                    )}
                    {practice.offerAttivazione && (
                      <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-700">
                        <span className="text-slate-400 text-xs block mb-1">Attivazione</span>
                        <span className="text-white font-semibold">{safeString(practice.offerAttivazione)}</span>
                      </div>
                    )}
                    {practice.offerVincolo && (
                      <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-700">
                        <span className="text-slate-400 text-xs block mb-1">Vincolo</span>
                        <span className="text-amber-400 font-semibold">{safeString(practice.offerVincolo)}</span>
                      </div>
                    )}
                    {practice.offerDisattivazione && (
                      <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-700">
                        <span className="text-slate-400 text-xs block mb-1">Disattivazione</span>
                        <span className="text-rose-400 text-sm font-semibold">{safeString(practice.offerDisattivazione)}</span>
                      </div>
                    )}
                  </div>

                  {practice.offerNote && (
                    <div className="bg-amber-900/10 border border-amber-600/20 rounded-lg p-3 mb-3">
                      <span className="text-amber-500 text-xs block mb-1 font-medium">Note Importanti</span>
                      <p className="text-slate-300 text-sm leading-relaxed">{safeString(practice.offerNote)}</p>
                    </div>
                  )}
                  
                  {practice.offerScadenza && (
                    <div className="flex items-center gap-2 text-sm bg-slate-900/50 rounded-lg p-2 border border-slate-800">
                      <Calendar className="w-4 h-4 text-amber-400" />
                      <span className="text-slate-400">Scadenza promo:</span>
                      <span className="text-amber-400 font-semibold">{safeString(practice.offerScadenza)}</span>
                    </div>
                  )}

                  {practice.additionalPackages && (
                    <div className="mt-4 pt-4 border-t border-slate-700 bg-gradient-to-r from-emerald-900/20 to-indigo-900/20 rounded-xl p-4 border border-emerald-500/20">
                      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-emerald-400" />
                        Riepilogo Costi
                      </h4>
                      <div className="space-y-2 text-sm mb-3">
                        <div className="flex justify-between text-slate-400">
                          <span>Canone Base:</span>
                          <span>{safeString(practice.offerCanone) || '-'}</span>
                        </div>
                        {practice.additionalPackages.totalPrice > 0 && (
                          <div className="flex justify-between text-indigo-300">
                            <span>Pacchetti:</span>
                            <span>+ €{practice.additionalPackages.totalPrice.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      <div className="border-t border-slate-600 pt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-bold">Totale:</span>
                          <span className="text-xl font-bold text-emerald-400">
                            €{(() => {
                              const basePrice = parseFloat(practice.offerCanone?.replace(/[^0-9.,]/g, '').replace(',', '.') || '0');
                              return (basePrice + (practice.additionalPackages?.totalPrice || 0)).toFixed(2);
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-500 block mb-1">Tipo Offerta</label>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      practice.type === 'TIM_FIBRA' ? 'bg-blue-500' : 
                      practice.type === 'VODAFONE' ? 'bg-rose-500' :
                      practice.type === 'WINDTRE' ? 'bg-orange-500' :
                      practice.type === 'ILIAD' ? 'bg-red-500' :
                      practice.type === 'OPTIMA' ? 'bg-emerald-500' :
                      practice.type === 'IREN' ? 'bg-amber-500' :
                      'bg-cyan-500'
                    }`} />
                    <span className="text-white font-medium">
                      {practice.type === 'TIM_FIBRA' ? 'TIM Fibra' : 
                       practice.type === 'VODAFONE' ? 'Vodafone' :
                       practice.type === 'WINDTRE' ? 'WindTre' :
                       practice.type === 'ILIAD' ? 'Iliad' :
                       practice.type === 'OPTIMA' ? 'Optima' :
                       practice.type === 'IREN' ? 'Iren' :
                       practice.type === 'SKY' ? 'SKY' :
                       safeString(practice.type)}
                    </span>
                  </div>
                </div>
                
                {practice.offerCode && (
                  <div>
                    <label className="text-sm text-slate-500 block mb-1">Codice Offerta</label>
                    <p className="text-white font-mono text-sm bg-slate-800/50 px-2 py-1 rounded inline-block">
                      {safeString(practice.offerCode)}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* ===== SPRINT — Venduto Da inline edit allineato a new.tsx (stepKey 'sellers') ===== */}
                <InlineUserField
                  label="Venduto Da"
                  value={safeString(practice.soldBy)}
                  currentUserId={practice.soldById}
                  canEdit={canEditPractices}
                  teamUsers={operators}
                  onSave={async (userId, name) => {
                    await saveStepKey('sellers', {
                      soldById: userId,
                      soldBy: name,
                      enteredById: practice.enteredById,
                      enteredBy: practice.enteredBy,
                    });
                  }}
                  testid="sold-by"
                />

                {/* ===== SPRINT — Inserito Da inline edit allineato a new.tsx (stepKey 'sellers') ===== */}
                <InlineUserField
                  label="Inserito Da"
                  value={safeString(practice.enteredBy)}
                  currentUserId={practice.enteredById}
                  canEdit={canEditPractices}
                  teamUsers={operators}
                  onSave={async (userId, name) => {
                    await saveStepKey('sellers', {
                      soldById: practice.soldById,
                      soldBy: practice.soldBy,
                      enteredById: userId,
                      enteredBy: name,
                    });
                  }}
                  testid="entered-by"
                />
              </div>

              {practice.customerId && (
                <Link href={`/operator/customers/${practice.customerId}`}>
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 border border-cyan-600/30 rounded-xl transition-all text-sm font-medium group">
                    <User className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Anagrafica cliente
                    <NavigationArrow className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
              )}

              {practice.convergenza?.attiva && (
                <div className="border-t border-slate-700 pt-4 mt-2">
                  <h4 className="text-sm font-semibold text-indigo-400 mb-3 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${practice.statoGlobale === 'completo' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    Convergenza {practice.statoGlobale === 'completo' ? 'Completata' : 'Da Chiudere'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {practice.convergenza.tipo && (
                      <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
                        <span className="text-slate-500 text-xs block mb-1">Tipo</span>
                        <span className="text-white">{practice.convergenza.tipo === 'daChiudere' ? 'Da Chiudere' : 'Chiusa'}</span>
                      </div>
                    )}
                    {practice.convergenza.numero && (
                      <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
                        <span className="text-slate-500 text-xs block mb-1">Numero</span>
                        <span className="text-white font-mono">{safeString(practice.convergenza.numero)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* PACCHETTI AGGIUNTIVI */}
          {practice.additionalPackages?.selectedIds?.some(pkgId => pkgId !== 'none') && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-slate-900/80 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-white">Pacchetti Aggiuntivi</h2>
              </div>

              <div className="space-y-3 mb-4">
                {practice.additionalPackages.selectedIds.map(pkgId => {
                  const pkg = ADDITIONAL_PACKAGES.find(p => p.id === pkgId);
                  return pkg ? (
                    <div key={pkg.id} className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${pkg.category === 'netflix' ? 'bg-red-500' : 'bg-indigo-500'}`} />
                        <span className="text-slate-200 font-medium">{pkg.label}</span>
                        {pkg.category === 'netflix' && (
                          <span className="text-xs bg-red-600/30 text-red-400 px-2 py-0.5 rounded">Netflix</span>
                        )}
                      </div>
                      <span className="text-indigo-300 font-bold">€{pkg.price.toFixed(2)}/mese</span>
                    </div>
                  ) : null;
                })}
              </div>

              <div className="border-t border-indigo-500/30 pt-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-medium">Totale Pacchetti:</span>
                  <span className="text-2xl font-bold text-indigo-400">
                    €{practice.additionalPackages.totalPrice.toFixed(2)}/mese
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {practice.washConfig?.enabled && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`backdrop-blur-xl border rounded-2xl p-6 ${
                practice.washConfig.type === 'suspect' 
                  ? 'bg-amber-900/20 border-amber-500/30' 
                  : 'bg-emerald-900/20 border-emerald-500/30'
              }`}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  practice.washConfig.type === 'suspect' 
                    ? 'bg-amber-600/20 text-amber-400' 
                    : 'bg-emerald-600/20 text-emerald-400'
                }`}>
                  <TelevisionSimple className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-white">Gestione WASH</h2>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-900/50 rounded-xl">
                  <span className="text-slate-400">Stato WASH:</span>
                  <span className={`font-bold text-lg ${
                    practice.washConfig.type === 'suspect' ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {practice.washConfig.type === 'suspect' ? '⚠️ SUSPECT WASH' : '✓ NO WASH'}
                  </span>
                </div>

                {practice.washConfig.type === 'suspect' && practice.washConfig.suspectData && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-900/50 rounded-xl">
                      <span className="text-slate-500 text-xs block mb-1">Codice Cliente/CF</span>
                      <span className="text-white font-mono text-sm">
                        {safeString(practice.washConfig.suspectData.clientCode) || '-'}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-900/50 rounded-xl">
                      <span className="text-slate-500 text-xs block mb-1">Gestione Abbonamento</span>
                      <span className={`text-sm font-medium ${
                        practice.washConfig.suspectData.action === 'disattiva' ? 'text-rose-400' : 'text-amber-400'
                      }`}>
                        {practice.washConfig.suspectData.action === 'disattiva' 
                          ? 'Disattiva vecchio' 
                          : 'Mantieni vecchio'}
                      </span>
                    </div>
                  </div>
                )}

                {practice.washConfig.timestamp && (
                  <div className="text-xs text-slate-500 bg-slate-900/30 p-2 rounded-lg border border-slate-800">
                    Registrato il: {new Date(practice.washConfig.timestamp).toLocaleString('it-IT')}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ===== SPRINT — Card Dettagli Linea: matita unica per Tipo + Tecnologia + Lavorazioni ===== */}
          {(canEditPractices || practice.lineType || practice.technology || (practice.oldLineData && Object.keys(practice.oldLineData).length > 0)) && (
            <EditableCard
              title="Dettagli Linea"
              icon={<MapPin className="w-5 h-5" />}
              iconBgClass="bg-blue-600/20 text-blue-400"
              canEdit={canEditPractices}
              testid="line-details-card"
              initialDraft={{
                lineType: practice.lineType ?? '',
                technology: practice.technology ?? '',
                lavorazioniPostAttivazione: practice.lavorazioniPostAttivazione ?? '',
              }}
              onSave={async (d) => {
                await saveStepKey('line-new', {
                  lineType: d.lineType || null,
                  installationAddress: practice.installationAddress || null,
                  technology: d.technology || null,
                  notes: practice.newLineNotes ?? null,
                  convergenza: practice.convergenza ?? null,
                  lavorazioniPostAttivazione: d.lavorazioniPostAttivazione || null,
                });
              }}
            >
              {({ editing, draft, setDraft }) => (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FieldView label="Tipo Attivazione">
                      {editing ? (
                        <select value={draft.lineType} onChange={(e) => setDraft({ lineType: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500/50">
                          <option value="">— Seleziona —</option>
                          <option value="NUOVA">Nuova Attivazione</option>
                          <option value="MIGRAZIONE">Migrazione</option>
                        </select>
                      ) : (
                        <span className={`inline-flex px-3 py-1 rounded-lg text-sm font-medium ${
                          practice.lineType === 'NUOVA' ? 'bg-emerald-600/20 text-emerald-400'
                          : practice.lineType === 'MIGRAZIONE' ? 'bg-amber-600/20 text-amber-400'
                          : 'bg-slate-700/40 text-slate-400'
                        }`}>
                          {practice.lineType === 'NUOVA' ? 'Nuova Attivazione' : practice.lineType === 'MIGRAZIONE' ? 'Migrazione' : 'Non impostato'}
                        </span>
                      )}
                    </FieldView>
                    <FieldView label="Tecnologia">
                      {editing ? (
                        <select value={draft.technology} onChange={(e) => setDraft({ technology: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500/50">
                          <option value="">— Seleziona —</option>
                          <option value="FTTC">FTTC</option>
                          <option value="FTTH">FTTH</option>
                          <option value="FWA">FWA</option>
                          <option value="ADSL">ADSL</option>
                        </select>
                      ) : (
                        <span className="font-medium">{practice.technology || <span className="text-slate-500 italic">—</span>}</span>
                      )}
                    </FieldView>
                    <div className="sm:col-span-2">
                      <FieldView label="Lavorazioni Post Attivazione">
                        {editing ? (
                          <textarea value={draft.lavorazioniPostAttivazione} onChange={(e) => setDraft({ lavorazioniPostAttivazione: e.target.value })} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500/50" />
                        ) : (
                          <p className="text-sm text-slate-300 whitespace-pre-wrap">{practice.lavorazioniPostAttivazione || <span className="text-slate-500 italic">—</span>}</p>
                        )}
                      </FieldView>
                    </div>
                  </div>

                  {/* ===== SPRINT — Dati Linea Precedente: matita unica per il blocco intero ===== */}
                  {practice.lineType === 'MIGRAZIONE' && (
                    <OldLineEditableBlock
                      practice={practice}
                      canEdit={canEditPractices}
                      saveStepKey={saveStepKey}
                    />
                  )}
                </>
              )}
            </EditableCard>
          )}
          
          {/* ===== SPRINT — Card unificata Indirizzo + Appuntamento: una sola matita.
              Click matita → tutti i sub-campi (Via, Comune, Città, CAP, Data, Ora, Note)
              diventano editabili → ✓ salva con DUE PUT (line-new + appointment). ===== */}
          {(canEditPractices || practice.appointmentData || hasAddressData) && (
            <EditableCard
              title="Indirizzo di Installazione e Appuntamento"
              icon={<MapPin className="w-5 h-5" />}
              iconBgClass="bg-indigo-600/20 text-indigo-400"
              borderClass="border-indigo-500/30"
              canEdit={canEditPractices}
              testid="install-and-appointment-card"
              initialDraft={{
                street: practice.installationAddress?.street ?? '',
                comune: practice.installationAddress?.comune ?? '',
                citta: practice.installationAddress?.citta ?? '',
                cap: practice.installationAddress?.cap ?? '',
                data: practice.appointmentData?.data ?? '',
                ora: practice.appointmentData?.ora ?? '',
                oraFine: practice.appointmentData?.oraFine ?? '',
                accordi: practice.appointmentData?.accordi ?? '',
              }}
              onSave={async (d) => {
                // 1) Salvataggio indirizzo (stepKey 'line-new' allineato a new.tsx riga 883)
                await saveStepKey('line-new', {
                  lineType: practice.lineType ?? null,
                  installationAddress: {
                    street: d.street || null,
                    comune: d.comune || null,
                    citta: d.citta || null,
                    cap: d.cap || null,
                  },
                  technology: practice.technology ?? null,
                  notes: practice.newLineNotes ?? null,
                  convergenza: practice.convergenza ?? null,
                  lavorazioniPostAttivazione: practice.lavorazioniPostAttivazione ?? null,
                });
                // 2) Salvataggio appuntamento (stepKey 'appointment' allineato a new.tsx riga 906)
                await saveStepKey('appointment', {
                  data: d.data || null,
                  ora: d.ora || null,
                  oraFine: d.oraFine || null,
                  accordi: d.accordi || null,
                  lavorazioniPost: (practice.appointmentData as any)?.lavorazioniPost ?? null,
                });
              }}
            >
              {({ editing, draft, setDraft }) => (
                <>
                  {/* Blocco indirizzo */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Indirizzo Installazione
                    </h3>
                    <div className="space-y-3 text-sm bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                      <FieldView label="Indirizzo">
                        {editing ? (
                          <input data-testid="install-street-input" type="text" value={draft.street} onChange={(e) => setDraft({ street: e.target.value })} placeholder="Via Roma 123" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500/50" />
                        ) : (
                          <span>{safeString(practice.installationAddress?.street) || <span className="text-slate-500 italic">—</span>}</span>
                        )}
                      </FieldView>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <FieldView label="Comune">
                          {editing ? (
                            <input data-testid="install-comune-input" type="text" value={draft.comune} onChange={(e) => setDraft({ comune: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500/50" />
                          ) : (
                            <span>{safeString(practice.installationAddress?.comune) || <span className="text-slate-500 italic">—</span>}</span>
                          )}
                        </FieldView>
                        <FieldView label="Città">
                          {editing ? (
                            <input data-testid="install-citta-input" type="text" value={draft.citta} onChange={(e) => setDraft({ citta: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500/50" />
                          ) : (
                            <span>{safeString(practice.installationAddress?.citta) || <span className="text-slate-500 italic">—</span>}</span>
                          )}
                        </FieldView>
                        <FieldView label="CAP">
                          {editing ? (
                            <input data-testid="install-cap-input" type="text" value={draft.cap} onChange={(e) => setDraft({ cap: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-emerald-500/50" />
                          ) : (
                            <span className="font-mono text-sm">{safeString(practice.installationAddress?.cap) || <span className="text-slate-500 italic font-sans">—</span>}</span>
                          )}
                        </FieldView>
                      </div>
                    </div>
                  </div>

                  {/* Blocco appuntamento */}
                  <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Appuntamento Installazione
                    </h3>
                    <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <FieldView label="Data">
                          {editing ? (
                            <input data-testid="appointment-data-input" type="date" value={draft.data} onChange={(e) => setDraft({ data: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500/50" />
                          ) : (
                            <span>{practice.appointmentData?.data ? new Date(practice.appointmentData.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }) : <span className="text-slate-500 italic">—</span>}</span>
                          )}
                        </FieldView>
                        <FieldView label="Ora Inizio">
                          {editing ? (
                            <input data-testid="appointment-ora-input" type="time" value={draft.ora} onChange={(e) => setDraft({ ora: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500/50" />
                          ) : (
                            <span>{safeString(practice.appointmentData?.ora) || <span className="text-slate-500 italic">—</span>}</span>
                          )}
                        </FieldView>
                        <FieldView label="Ora Fine">
                          {editing ? (
                            <input data-testid="appointment-orafine-input" type="time" value={draft.oraFine} onChange={(e) => setDraft({ oraFine: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500/50" />
                          ) : (
                            <span>{safeString(practice.appointmentData?.oraFine) || <span className="text-slate-500 italic">—</span>}</span>
                          )}
                        </FieldView>
                      </div>
                      <FieldView label="Note / Accordi">
                        {editing ? (
                          <textarea data-testid="appointment-accordi-input" value={draft.accordi} onChange={(e) => setDraft({ accordi: e.target.value })} placeholder="Note per l'installazione..." rows={3} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500/50" />
                        ) : (
                          <p className="text-slate-300 text-sm whitespace-pre-wrap">{safeString(practice.appointmentData?.accordi) || <span className="text-slate-500 italic">—</span>}</p>
                        )}
                      </FieldView>
                    </div>
                  </div>
                </>
              )}
            </EditableCard>
          )}

          {/* ===== SPRINT — Card Metodo di Pagamento: una sola matita per la card.
              Click matita → tutti i campi diventano editabili → ✓ salva tutto in un solo PUT. ===== */}
          {(canEditPractices || (practice.paymentMethod && Object.keys(practice.paymentMethod).length > 0)) && (
            <EditableCard
              title="Metodo di Pagamento"
              icon={<CreditCard className="w-5 h-5" />}
              iconBgClass="bg-violet-600/20 text-violet-400"
              canEdit={canEditPractices}
              testid="payment-card"
              initialDraft={{
                iban: practice.paymentMethod?.iban ?? '',
                postePay: practice.paymentMethod?.postePay ?? '',
                bollettino: !!practice.paymentMethod?.bollettino,
              }}
              onSave={async (d) => {
                await saveStepKey('payment', {
                  paymentMethod: {
                    iban: d.iban?.toUpperCase() || null,
                    postePay: d.postePay || null,
                    bollettino: !!d.bollettino,
                  },
                });
              }}
            >
              {({ editing, draft, setDraft }) => (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-800/50 rounded-xl">
                    <label className="text-xs text-slate-500 block mb-1">IBAN</label>
                    {editing ? (
                      <input
                        data-testid="payment-iban-input"
                        type="text"
                        value={draft.iban}
                        onChange={(e) => setDraft({ iban: e.target.value.toUpperCase() })}
                        placeholder="IT00 X000 0000 0000 0000 0000 000"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm font-mono focus:outline-none focus:border-emerald-500/50"
                      />
                    ) : (
                      <p className="text-white font-mono text-sm">{safeString(practice.paymentMethod?.iban) || <span className="text-slate-500 italic font-sans">—</span>}</p>
                    )}
                  </div>

                  <div className="p-3 bg-slate-800/50 rounded-xl">
                    <label className="text-xs text-slate-500 block mb-1">PostePay</label>
                    {editing ? (
                      <input
                        data-testid="payment-postepay-input"
                        type="text"
                        value={draft.postePay}
                        onChange={(e) => setDraft({ postePay: e.target.value })}
                        placeholder="Numero PostePay"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                      />
                    ) : (
                      <p className="text-white">{safeString(practice.paymentMethod?.postePay) || <span className="text-slate-500 italic">—</span>}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                    <span className="text-slate-400 flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4" /> Bollettino Postale
                    </span>
                    {editing ? (
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          data-testid="payment-bollettino-input"
                          type="checkbox"
                          checked={!!draft.bollettino}
                          onChange={(e) => setDraft({ bollettino: e.target.checked })}
                          className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-indigo-600 cursor-pointer"
                        />
                      </label>
                    ) : (
                      <span className="text-white text-sm">{practice.paymentMethod?.bollettino ? 'Sì' : 'No'}</span>
                    )}
                  </div>
                </div>
              )}
            </EditableCard>
          )}

          {practice.newLineNotes && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-white">Note Linea</h2>
              </div>
              <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {safeString(practice.newLineNotes)}
                </p>
              </div>
            </motion.div>
          )}
        </div>{/* /lg:col-span-2 */}

        {/* Colonna Destra: Note Cronologia + Progresso */}
        <div className="lg:col-span-1 space-y-4 md:space-y-6">


          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Note & Cronologia</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {(practice.notesHistory?.length || 0)} note inserite
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6 p-4 bg-slate-800/80 rounded-xl border border-slate-600">
              <label className="block text-sm text-slate-200 mb-2 font-medium">Aggiungi nuova nota</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Scrivi qui la tua nota..."
                rows={3}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 resize-none text-sm transition-all"
              />
              <div className="flex justify-end mt-3">
                <button 
                  onClick={async () => {
                    if (!notes.trim()) return;
                    setNotesLoading(true);
                    try {
                      await api.put(`/practices/${id}/step`, {
                        stepNumber: 3,
                        data: { notes: notes }
                      }, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      setNotes('');
                      fetchPractice();
                    } catch (err) {
                      alert('Errore salvataggio nota');
                    } finally {
                      setNotesLoading(false);
                    }
                  }}
                  disabled={notesLoading || !notes.trim()}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    notesLoading || !notes.trim()
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-400' 
                      : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  {notesLoading ? 'Salvataggio...' : 'Aggiungi Nota'}
                </button>
              </div>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {practice.notesHistory && practice.notesHistory.length > 0 ? (
                practice.notesHistory
                  .slice()
                  .reverse()
                  .map((note, index) => {
                    const isKo = !!(note as any).isKoReason;
                    const isSkyTvKo = !!(note as any).isSkyTvKoReason;
                    const highlight = isKo || isSkyTvKo;
                    return (
                      <div key={index} className="relative pl-6 pb-4 border-l-2 border-slate-700 last:border-0">
                        <div className={`absolute left-[-5px] top-0 w-2 h-2 rounded-full ${highlight ? 'bg-rose-500 ring-2 ring-rose-500/30' : 'bg-amber-500'}`} />

                        <div className={`rounded-xl p-4 border ${
                          highlight
                            ? 'bg-rose-950/30 border-rose-500/40'
                            : 'bg-slate-950/50 border-slate-800'
                        }`}>
                          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                            <div className="flex items-center gap-2 flex-wrap">
                              {highlight && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-600/20 border border-rose-500/40 text-rose-300 text-[10px] font-bold uppercase tracking-wider">
                                  <Warning className="w-3 h-3" weight="fill" />
                                  Motivazione KO
                                </span>
                              )}
                              {isSkyTvKo && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 text-[10px] font-bold uppercase tracking-wider">
                                  <TelevisionSimple className="w-3 h-3" weight="fill" />
                                  Sky TV
                                </span>
                              )}
                              <span className={`text-xs font-medium ${highlight ? 'text-rose-300' : 'text-amber-400'}`}>
                                {safeString(note.createdBy) || 'Operatore'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">
                                {new Date(note.createdAt).toLocaleString('it-IT', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              <button
                                onClick={() => {
                                  const historyLength = practice.notesHistory?.length || 0;
                                  handleDeleteNote(historyLength - 1 - index);
                                }}
                                className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                                title="Elimina nota"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${highlight ? 'text-rose-100' : 'text-slate-300'}`}>
                            {safeString(note.text)}
                          </p>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nessuna nota presente</p>
                  <p className="text-xs mt-1">Aggiungi la prima nota usando il form sopra</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* SPRINT (point 10) — Card "Indirizzo Installazione" rimossa da qui
              perché unificata nella card centrale "Indirizzo di Installazione
              e Appuntamento" (vedi colonna sinistra). */}

          {/* SPRINT — Il Progresso step si nasconde quando TUTTI gli step sono compilati
              (indipendente dallo stato globale). Se rimangono step aperti, resta visibile
              e indica dove ci si è fermati. ===== */}
          {(() => {
            const totalSteps = 9; // wizard rete fissa = 9 step
            const allCompleted = (practice.completedSteps?.length || 0) >= totalSteps;
            return allCompleted;
          })() ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              data-testid="practice-completed-badge"
              className="bg-emerald-950/40 backdrop-blur-xl border border-emerald-500/40 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-600/30 text-emerald-300 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" weight="fill" />
                </div>
                <div>
                  <h3 className="text-emerald-200 font-semibold">Pratica compilata</h3>
                  <p className="text-emerald-300/70 text-xs mt-0.5">Tutti gli step sono stati completati.</p>
                </div>
              </div>
            </motion.div>
          ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">Progresso</h2>
            </div>

            <div className="space-y-2">
              {Array.from({length: 9}, (_, i) => i + 1).map((step) => {
                const isCurrent = practice.currentStep === step;
                const isCompleted = safeCompletedSteps.includes(step);
                
                return (
                  <div 
                    key={step}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      isCompleted 
                        ? 'bg-emerald-600/10 text-emerald-400' 
                        : isCurrent
                          ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20'
                          : 'bg-slate-800/50 text-slate-500'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-700 text-slate-400'
                    }`}>
                      {isCompleted ? '✓' : step}
                    </div>
                    <span className="text-sm">
                      {['Tipo & Offerta', 'Venditore', 'Anagrafica', 'Nuova Linea', 'Dati Vecchia Linea', 'Pagamento', 'Privacy', 'Appuntamento', 'Riepilogo'][step - 1]}
                    </span>
                    {isCurrent && <span className="ml-auto text-xs text-indigo-400">In corso</span>}
                  </div>
                );
              })}
            </div>
            
            {practice.status?.toLowerCase() === 'completed' && (
              <div className="mt-4 p-3 bg-emerald-600/10 border border-emerald-600/20 rounded-xl text-center">
                <span className="text-emerald-400 text-sm font-medium">✓ Pratica Compilata</span>
              </div>
            )}
          </motion.div>
          )}
        </div>{/* /lg:col-span-1 */}
      </div>{/* /lg:grid-cols-3 */}

      {/* ===== SPRINT — Card unificata: Indirizzo + Appuntamento ===== */}
    </OperatorLayout>
  );
}