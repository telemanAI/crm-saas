import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, PencilSimple, MapPin, Calendar, Clock,
  Check, Warning, User, CreditCard,
} from 'phosphor-react';
import api from '@/lib/axios';

interface QuickEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  practice: any;
  teamUsers: Array<{ id: string; firstName: string; lastName: string }>;
  canEdit: boolean;
  onSaved: () => void;
}

export default function QuickEditModal({ isOpen, onClose, practice, teamUsers, canEdit, onSaved }: QuickEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stati operativi
  const opStatuses = [
    { value: 'PENDING', label: 'Da Completare' },
    { value: 'IN_PROGRESS', label: 'In Lavorazione' },
    { value: 'ACTIVATED', label: 'Attivata' },
    { value: 'REJECTED', label: 'Rifiutata' },
    { value: 'KO_CREDITO', label: 'KO Credito' },
    { value: 'KO_COPERTURA', label: 'KO Copertura' },
  ];

  const lineStatuses = [
    { value: 'ATTIVA', label: 'Attiva' },
    { value: 'IN_ATTIVAZIONE', label: 'In Attivazione' },
    { value: 'DA_ATTIVARE', label: 'Da Attivare' },
    { value: 'KO', label: 'KO' },
  ];

  const oldLineStatuses = [
    { value: 'DA_DISATTIVARE', label: 'Da Disattivare' },
    { value: 'IN_DISATTIVAZIONE', label: 'In Disattivazione' },
    { value: 'DISATTIVATA', label: 'Disattivata' },
  ];

  const paymentMethods = [
    { value: 'RID', label: 'RID' },
    { value: 'BOLLETTINO', label: 'Bollettino' },
    { value: 'CARTA', label: 'Carta di Credito' },
    { value: 'POSTEPAY', label: 'PostePay' },
  ];

  const techOptions = [
    { value: 'FTTC', label: 'FTTC' },
    { value: 'FTTH', label: 'FTTH' },
    { value: 'FWA', label: 'FWA' },
  ];

  // Form state
  const [form, setForm] = useState({
    operationalStatus: practice?.operationalStatus || '',
    lineStatus: practice?.lineStatus || '',
    oldLineStatus: practice?.oldLineStatus || '',
    oldLineTechnology: practice?.oldLineTechnology || '',
    paymentMethod: practice?.paymentMethod?.method || '',
    soldById: practice?.soldById || '',
    enteredById: practice?.enteredById || '',
    // Indirizzo
    street: practice?.installationAddress?.street || '',
    civico: practice?.installationAddress?.civico || '',
    citta: practice?.installationAddress?.citta || '',
    comune: practice?.installationAddress?.comune || '',
    cap: practice?.installationAddress?.cap || '',
    // Appuntamento
    appointmentData: practice?.appointmentData?.data || '',
    appointmentOra: practice?.appointmentData?.ora || '',
    appointmentNote: practice?.appointmentData?.accordi || '',
  });

  useEffect(() => {
    if (practice) {
      setForm({
        operationalStatus: practice.operationalStatus || '',
        lineStatus: practice.lineStatus || '',
        oldLineStatus: practice.oldLineStatus || '',
        oldLineTechnology: practice.oldLineTechnology || '',
        paymentMethod: practice.paymentMethod?.method || '',
        soldById: practice.soldById || '',
        enteredById: practice.enteredById || '',
        street: practice.installationAddress?.street || '',
        civico: practice.installationAddress?.civico || '',
        citta: practice.installationAddress?.citta || '',
        comune: practice.installationAddress?.comune || '',
        cap: practice.installationAddress?.cap || '',
        appointmentData: practice.appointmentData?.data || '',
        appointmentOra: practice.appointmentData?.ora || '',
        appointmentNote: practice.appointmentData?.accordi || '',
      });
    }
  }, [practice]);

  const handleSave = async (field: string, value: any) => {
    if (!canEdit || !practice?.id) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      await api.put(`/practices/${practice.id}/step`, {
        stepNumber: 1,
        stepKey: 'quick-edit',
        data: { [field]: value },
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore salvataggio');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    await handleSave('installationAddress', {
      street: form.street,
      civico: form.civico,
      citta: form.citta,
      comune: form.comune,
      cap: form.cap,
    });
  };

  const handleSaveAppointment = async () => {
    await handleSave('appointmentData', {
      data: form.appointmentData,
      ora: form.appointmentOra,
      accordi: form.appointmentNote,
    });
  };

  const SelectField = ({ label, value, options, onChange, field }: any) => (
    <div className="space-y-1.5">
      <label className="text-xs text-slate-400 block">{label}</label>
      <select
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          setForm((f: any) => ({ ...f, [field]: val }));
          onChange(val);
        }}
        disabled={!canEdit || loading}
        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-200 disabled:opacity-50"
      >
        <option value="">-- Seleziona --</option>
        {options.map((o: any) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );

  if (!isOpen || !practice) return null;

  const isMigrazione = practice.lineType === 'MIGRAZIONE';
  // ===== SPRINT — Category-aware: mostra/nasconde i campi rilevanti per
  // FIXED_LINE / MOBILE / ENERGY. Per Mobile/Energy non esiste vecchia linea
  // né indirizzo di installazione, quindi nascondiamo i blocchi non pertinenti. =====
  const category: 'FIXED_LINE' | 'MOBILE' | 'ENERGY' = practice.category || 'FIXED_LINE';
  const showFixedLineFields = category === 'FIXED_LINE';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                <PencilSimple className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Quick Edit</h3>
                <p className="text-xs text-slate-400">{practice.offerName}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5">
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm flex items-center gap-2">
                <Warning className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* Stato Operativo */}
            <SelectField
              label="Stato Operativo"
              value={form.operationalStatus}
              options={opStatuses}
              field="operationalStatus"
              onChange={(val: string) => handleSave('operationalStatus', val)}
            />

            {/* Stato Nuova Linea — solo Fixed Line */}
            {showFixedLineFields && (
              <SelectField
                label="Stato Nuova Linea"
                value={form.lineStatus}
                options={lineStatuses}
                field="lineStatus"
                onChange={(val: string) => handleSave('lineStatus', val)}
              />
            )}

            {/* Stato Vecchia Linea — solo Migrazione (Fixed Line) */}
            {showFixedLineFields && isMigrazione && (
              <SelectField
                label="Stato Vecchia Linea"
                value={form.oldLineStatus}
                options={oldLineStatuses}
                field="oldLineStatus"
                onChange={(val: string) => handleSave('oldLineStatus', val)}
              />
            )}

            {/* Tecnologia Provenienza — solo Migrazione (Fixed Line) */}
            {showFixedLineFields && isMigrazione && (
              <SelectField
                label="Tecnologia Provenienza"
                value={form.oldLineTechnology}
                options={techOptions}
                field="oldLineTechnology"
                onChange={(val: string) => handleSave('oldLineTechnology', val)}
              />
            )}

            {/* Metodo Pagamento */}
            <SelectField
              label="Metodo di Pagamento"
              value={form.paymentMethod}
              options={paymentMethods}
              field="paymentMethod"
              onChange={(val: string) => handleSave('paymentMethod', { method: val })}
            />

            {/* Venduto Da / Inserito Da */}
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Venduto Da"
                value={form.soldById}
                options={teamUsers.map((u: any) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))}
                field="soldById"
                onChange={(val: string) => handleSave('soldById', val)}
              />
              <SelectField
                label="Inserito Da"
                value={form.enteredById}
                options={teamUsers.map((u: any) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))}
                field="enteredById"
                onChange={(val: string) => handleSave('enteredById', val)}
              />
            </div>

            {/* Indirizzo Installazione + Appuntamento — solo Fixed Line */}
            {showFixedLineFields && (
              <>
            <div className="border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-300 mb-2">
                <MapPin className="w-4 h-4 text-blue-400" />
                <span className="font-medium">Indirizzo Installazione</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Via" value={form.street} onChange={(e) => setForm((f: any) => ({ ...f, street: e.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200" />
                <input placeholder="Civico" value={form.civico} onChange={(e) => setForm((f: any) => ({ ...f, civico: e.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200" />
                <input placeholder="Città" value={form.citta} onChange={(e) => setForm((f: any) => ({ ...f, citta: e.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200" />
                <input placeholder="Comune" value={form.comune} onChange={(e) => setForm((f: any) => ({ ...f, comune: e.target.value }))} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200" />
              </div>
              <input placeholder="CAP" value={form.cap} onChange={(e) => setForm((f: any) => ({ ...f, cap: e.target.value }))} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200" />
              <button
                onClick={handleSaveAddress}
                disabled={loading}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Salva Indirizzo
              </button>
            </div>

            {/* Appuntamento */}
            <div className="border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-300 mb-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span className="font-medium">Appuntamento Installazione</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Data</label>
                  <input type="date" value={form.appointmentData} onChange={(e) => setForm((f: any) => ({ ...f, appointmentData: e.target.value }))} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200" />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Ora</label>
                  <input type="time" value={form.appointmentOra} onChange={(e) => setForm((f: any) => ({ ...f, appointmentOra: e.target.value }))} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Note</label>
                <textarea value={form.appointmentNote} onChange={(e) => setForm((f: any) => ({ ...f, appointmentNote: e.target.value }))} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 resize-none" />
              </div>
              <button
                onClick={handleSaveAppointment}
                disabled={loading}
                className="w-full py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Salva Appuntamento
              </button>
            </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm transition-colors"
            >
              Chiudi
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
