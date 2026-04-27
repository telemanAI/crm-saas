import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  ArrowLeft,
  DeviceMobile,
  User,
  Phone,
  CreditCard,
  FileText,
  PencilSimple,
  Trash,
  CheckCircle,
  Note,
  Clock,
  Shield,
  NavigationArrow,
  Check,
  Buildings,
} from 'phosphor-react';
import { useAuthStore } from '@/stores/authStore';
import OperatorLayout from '@/components/layout/OperatorLayout';
import api from '@/lib/axios';

function formatDate(date: string | undefined) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function safeString(value: any) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Sì' : 'No';
  if (typeof value === 'object') {
    console.warn('[safeString] Tentativo di renderizzare oggetto:', value);
    return '';
  }
  return String(value);
}

const sanitizePracticeData = (data: any) => {
  if (data.mobileData && typeof data.mobileData === 'string') {
    try { data.mobileData = JSON.parse(data.mobileData); } catch { data.mobileData = {}; }
  }
  if (data.mobileData && typeof data.mobileData !== 'object') data.mobileData = {};
  if (!data.customer || typeof data.customer !== 'object') data.customer = {};
  return data;
};

export default function MobilePracticeDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuthStore();
  const [practice, setPractice] = useState<any>(null);
  const [offerDetails, setOfferDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (!id || typeof id !== 'string' || !token) return;
    fetchPractice();
  }, [id, token]);

  // Carica dettagli offerta quando la pratica è disponibile
  useEffect(() => {
    if (!practice?.offerName || !practice?.type) return;
    loadOfferDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practice?.offerName, practice?.type]);

  const fetchPractice = async () => {
    try {
      const res = await api.get(`/practices/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let raw = res.data;
      raw = sanitizePracticeData(raw);
      setPractice(raw);
    } catch {
      router.replace('/operator/practices/mobile');
    } finally {
      setLoading(false);
    }
  };

  const loadOfferDetails = async () => {
    try {
      const res = await api.get(`/offers?category=MOBILE`);
      const offers = res.data || [];
      const match = offers.find((o: any) =>
        o.name === practice.offerName &&
        (o.provider === practice.type || o.provider === practice.type?.replace(/ /g, '_'))
      );
      if (match) setOfferDetails(match);
    } catch {
      // Silenzioso: se l'offerta non si trova, non mostriamo nulla
    }
  };

  const updateOpStatus = async (newStatus: 'PENDING' | 'IN_PROGRESS' | 'ACTIVATED' | 'REJECTED') => {
    if (!practice || statusLoading) return;
    setStatusLoading(true);
    try {
      await api.put(`/practices/${id}/operational-status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPractice();
    } catch (err: any) {
      alert('Errore aggiornamento stato: ' + (err.response?.data?.message || err.message));
    } finally {
      setStatusLoading(false);
    }
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      await api.put(`/practices/${id}/step`, {
        stepNumber: 3,
        data: { notes: noteText.trim() }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNoteText('');
      fetchPractice();
    } catch (err: any) {
      alert('Errore aggiunta nota: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteIndex: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa nota?')) return;
    try {
      await api.delete(`/practices/${id}/notes/${noteIndex}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPractice();
    } catch {
      alert('Errore durante l\'eliminazione della nota');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Eliminare questa pratica? L\'azione è irreversibile.')) return;
    setDeleting(true);
    try {
      await api.delete(`/practices/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      router.push('/operator/practices/mobile');
    } catch (err: any) {
      alert('Errore: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeleting(false);
    }
  };

  const getOperationalStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVATED': return 'bg-emerald-500 text-white border-emerald-500';
      case 'REJECTED': return 'bg-rose-500 text-white border-rose-500';
      case 'IN_PROGRESS': return 'bg-blue-500 text-white border-blue-500';
      default: return 'bg-amber-500 text-white border-amber-500';
    }
  };

  const getOperationalStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVATED': return 'Attivata';
      case 'REJECTED': return 'KO';
      case 'IN_PROGRESS': return 'In Lavorazione';
      default: return 'In Attesa';
    }
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
      <OperatorLayout title="Dettaglio pratica mobile">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      </OperatorLayout>
    );
  }
  if (!practice) return null;

  const m = practice.mobileData || {};
  const customer = practice.customerSnapshot || practice.customer || {};
  const opStatus = practice.operationalStatus || 'PENDING';
  const d = offerDetails?.details || {};

  return (
    <OperatorLayout title={`Pratica ${practice.offerName || 'Mobile'}`}>
      <div className={`flex items-center justify-between mb-8 p-6 bg-slate-900/80 backdrop-blur-xl border ${getBorderColorByStatus(opStatus)} rounded-2xl`}>
        <div className="flex items-center gap-4">
          <Link href="/operator/practices/mobile">
            <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
              <ArrowLeft className="w-6 h-6" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-2">
              {practice.status === 'completed' && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-600/20 text-emerald-400 border border-emerald-600/20">
                  Completata
                </span>
              )}
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getOperationalStatusColor(opStatus)}`}>
                {getOperationalStatusLabel(opStatus)}
              </span>
              <span className="text-slate-500 text-sm">Step {practice.currentStep}/{practice.totalSteps || 7}</span>
            </div>
            <h1 className="text-3xl font-bold text-white">{practice.offerName || 'Pratica Mobile'}</h1>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-slate-400 mr-2">Cambia Stato:</span>
              {(['PENDING','IN_PROGRESS','ACTIVATED','REJECTED'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => updateOpStatus(s)}
                  disabled={statusLoading || opStatus === s}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    opStatus === s
                      ? getOperationalStatusColor(s)
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {getOperationalStatusLabel(s)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/operator/practices/mobile/new?edit=${practice.id}`}>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-600/30 rounded-xl transition-all">
              <PencilSimple className="w-4 h-4" /> Modifica
            </button>
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-600/30 rounded-xl transition-all disabled:opacity-50"
          >
            <Trash className="w-4 h-4" /> {deleting ? 'Eliminazione...' : 'Elimina'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Note & Cronologia */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Note & Cronologia</h2>
                <p className="text-xs text-slate-500 mt-1">{(practice.notesHistory?.length || 0)} note inserite</p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-slate-800/80 rounded-xl border border-slate-600">
              <label className="block text-sm text-slate-200 mb-2 font-medium">Aggiungi nuova nota</label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Scrivi qui la tua nota..."
                rows={4}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 resize-none text-sm transition-all"
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={addNote}
                  disabled={savingNote || !noteText.trim()}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    savingNote || !noteText.trim()
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-slate-700 dark:text-slate-400'
                      : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  {savingNote ? 'Salvataggio...' : 'Aggiungi Nota'}
                </button>
              </div>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {practice.notesHistory && practice.notesHistory.length > 0 ? (
                practice.notesHistory
                  .slice()
                  .reverse()
                  .map((note: any, index: number) => (
                    <div key={index} className="relative pl-6 pb-4 border-l-2 border-slate-700 last:border-0">
                      <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-amber-500" />
                      <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-amber-400">
                            {safeString(note.createdBy) || 'Operatore'}
                          </span>
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
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                          {safeString(note.text)}
                        </p>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <Note className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nessuna nota presente</p>
                  <p className="text-xs mt-1">Aggiungi la prima nota usando il form sopra</p>
                </div>
              )}
            </div>
          </div>

          <Section icon={User} title="Cliente">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              {showValue('Nome', customer.firstName)}
              {showValue('Cognome', customer.lastName)}
              {showValue('Codice fiscale', customer.fiscalCode)}
              {showValue('Telefono', customer.phonePrimary || customer.phone)}
              {showValue('Email', customer.email)}
              {customer.address && (customer.address.street || customer.address.city) && (
                <div className="col-span-2">
                  <dt className="text-xs text-slate-500 uppercase tracking-wider">Indirizzo</dt>
                  <dd className="text-slate-200 mt-1">
                    {safeString(customer.address.street)} {safeString(customer.address.number)}, {safeString(customer.address.zip)} {safeString(customer.address.city)} ({safeString(customer.address.province)})
                  </dd>
                </div>
              )}
            </dl>
          </Section>

          <Section icon={Phone} title="Numero & MNP">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              {showValue('Numero da portare', m.numeroDaPortare)}
              {showValue('CF vecchia linea', m.codiceFiscaleVecchiaLinea)}
              {showValue('Tipo linea', m.tipoLinea)}
              {showValue('Gestore provenienza', m.gestoreProvenienza === 'ALTRO' ? m.gestoreProvenienzaAltro : m.gestoreProvenienza)}
              {showValue('Note MNP', m.noteMnp)}
            </dl>
          </Section>

          <Section icon={CreditCard} title="Pagamento & Ricarica">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              {showValue('Ricarica', m.ricarica === 'ALTRO' ? m.ricaricaAltro : m.ricarica)}
              {showValue('IBAN / CDC', m.ibanCdc)}
              {showValue('Note pagamento', m.noteMetodoPagamento)}
            </dl>
          </Section>

          <Section icon={FileText} title="TIM Unica & Note">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              {showValue('TIM Unica', m.timUnica === 'ALTRO' ? m.timUnicaAltro : m.timUnica)}
              {showValue('Numero rete fissa TIM', m.numeroReteFissaTimUnica)}
              {showValue('Note generiche', m.noteGeneriche)}
              {showValue('Accordi cliente', m.accordiCliente)}
              {showValue('Lavorazioni post-attivazione', practice.lavorazioniPostAttivazione)}
            </dl>
          </Section>
        </div>

        <div className="space-y-6">
          {/* Card Dettaglio Offerta MOBILE */}
          {offerDetails && (
            <div className="bg-indigo-900/20 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  <Buildings className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">{offerDetails.name}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    offerDetails.type === 'business'
                      ? 'bg-purple-600/20 text-purple-400'
                      : 'bg-blue-600/20 text-blue-400'
                  }`}>
                    {offerDetails.type === 'business' ? 'Business' : 'Consumer'}
                  </span>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Canone:</span><span className="text-cyan-400 font-bold">{offerDetails.canone || '-'}</span></div>
                {d.attivazione && <div className="flex justify-between"><span className="text-slate-400">Attivazione:</span><span className="text-white">{d.attivazione}</span></div>}
                {d.minutes && <div className="flex justify-between"><span className="text-slate-400">Minuti:</span><span className="text-white">{d.minutes}</span></div>}
                {d.sms && <div className="flex justify-between"><span className="text-slate-400">SMS:</span><span className="text-white">{d.sms}</span></div>}
                {d.gb && <div className="flex justify-between"><span className="text-slate-400">GB:</span><span className="text-emerald-400 font-bold">{d.gb}</span></div>}
                <div className="flex justify-between"><span className="text-slate-400">5G:</span><span className={d.has_5g ? 'text-emerald-400' : 'text-rose-400'}>{d.has_5g ? 'SI' : 'NO'}</span></div>
                {d.abroad_gb && <div className="flex justify-between"><span className="text-slate-400">Estero:</span><span className="text-white">{d.abroad_gb}</span></div>}
                {d.postepay && <div className="flex justify-between"><span className="text-slate-400">PostePay:</span><span className="text-emerald-400">SI</span></div>}
                {d.vincolo && <div className="flex justify-between"><span className="text-slate-400">Vincolo:</span><span className="text-amber-400">{d.vincolo}</span></div>}
                {d.exit_costs && <div className="flex justify-between"><span className="text-slate-400">Costi disattivazione:</span><span className="text-rose-400">{d.exit_costs}</span></div>}
                {d.note_raw && (
                  <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800 mt-2">
                    <span className="text-slate-500 text-xs block mb-1">Note:</span>
                    <p className="text-slate-300 text-sm">{d.note_raw}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">Info Pratica</h2>
            </div>
            <div className="space-y-4">
              {showValue('Gestore', m.gestoreNuovaLinea === 'ALTRO' ? m.gestoreNuovaLineaAltro : m.gestoreNuovaLinea || practice.type)}
              {showValue('Offerta', practice.offerName)}
              {showValue('Data attivazione', m.dataAttivazione)}
              {showValue('Venduto da', practice.soldBy)}
              {showValue('Inserito da', practice.enteredBy)}
              <div className="pt-4 border-t border-slate-800">
                <label className="text-sm text-slate-500 block mb-1">Data Creazione</label>
                <p className="text-white text-sm">{formatDate(practice.createdAt)}</p>
              </div>
              {practice.updatedAt !== practice.createdAt && (
                <div>
                  <label className="text-sm text-slate-500 block mb-1">Ultima Modifica</label>
                  <p className="text-white text-sm">{formatDate(practice.updatedAt)}</p>
                </div>
              )}
            </div>
          </div>

          {practice.customerId && (
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
              <Link href={`/operator/customers/${practice.customerId}`}>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 border border-cyan-600/30 rounded-xl transition-all text-sm font-medium group">
                  <User className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  Vai al Cliente
                  <NavigationArrow className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </OperatorLayout>
  );
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
          <Icon className="w-5 h-5" weight="duotone" />
        </div>
        <h3 className="text-white font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function showValue(label: string, value: any) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div>
      <dt className="text-xs text-slate-500 uppercase tracking-wider">{label}</dt>
      <dd className="text-slate-200 mt-1">{String(value)}</dd>
    </div>
  );
}
