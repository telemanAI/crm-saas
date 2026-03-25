import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { ADDITIONAL_PACKAGES } from '@/stores/practiceWizardStore';
import { Package, TelevisionSimple } from 'phosphor-react'; 
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
  Tag
} from 'phosphor-react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/axios';
import OperatorLayout from '@/components/layout/OperatorLayout';
import Link from 'next/link';

interface PracticeDetail {
  id: string;
  type: 'TIM_FIBRA' | 'SKY' | 'VODAFONE' | 'WINDTRE' | 'ILIAD' | 'OPTIMA' | 'IREN';
  offerName: string;
  offerCode: string;
  status: string;
  operationalStatus?: 'PENDING' | 'IN_PROGRESS' | 'ACTIVATED' | 'REJECTED';
  currentStep: number;
  completedSteps: number[];
  createdAt: string;
  updatedAt: string;
  customer: {
    firstName: string;
    lastName: string;
    fiscalCode?: string;
    phonePrimary?: string;
    email?: string;
  };
  customerSnapshot?: any;
  lineType?: string;
  installationAddress?: any;
  technology?: string;
  oldLineData?: any;
  paymentMethod?: any;
  soldBy?: string;
  enteredBy?: string;
  soldById?: string;
  enteredById?: string;
  notes?: string;
  newLineNotes?: string;
  appointmentData?: any;
  notesHistory?: Array<{
    text: string;
    createdAt: string;
    createdBy: string;
    createdById: string;
  }>;
  offerType?: 'business' | 'consumer';
  offerCanone?: string;
  offerAttivazione?: string;
  offerVincolo?: string;
  offerDisattivazione?: string;
  offerNote?: string;
  offerScadenza?: string;
  additionalPackages?: {
    selectedIds: string[];
    totalPrice: number;
  };
  washConfig?: {
    enabled: boolean;
    type: 'suspect' | 'none';
    suspectData?: {
      clientCode: string;
      action: 'disattiva' | 'mantieni';
    };
    timestamp?: Date;
  };
}

export default function PracticeDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { token } = useAuthStore();
  const [practice, setPractice] = useState<PracticeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  
  const [notes, setNotes] = useState('');
  const [notesLoading, setNotesLoading] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  
  const [operationalStatus, setOperationalStatus] = useState<string>('PENDING');

  useEffect(() => {
    if (id && token) fetchPractice();
  }, [id, token]);

  useEffect(() => {
    if (practice) setOperationalStatus(typeof practice.operationalStatus === 'string' ? practice.operationalStatus : 'PENDING');
  }, [practice]);

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

  const fetchPractice = async () => {
    try {
      const response = await api.get(`/practices/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const rawData = response.data;
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

  const handleOperationalStatusChange = async (newStatus: 'PENDING' | 'IN_PROGRESS' | 'ACTIVATED' | 'REJECTED') => {
    if (!practice || statusLoading) return;
    setStatusLoading(true);
    try {
      await api.put(`/practices/${id}/operational-status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setOperationalStatus(newStatus);
      fetchPractice();
    } catch (err) {
      console.error('Errore cambio stato:', err);
      alert('Errore durante il cambio stato');
    } finally {
      setStatusLoading(false);
    }
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

  return (
    <OperatorLayout title={`Pratica ${practice.offerCode || practice.id.slice(0,8)}`}>
      <div className={`flex items-center justify-between mb-8 p-6 bg-slate-900/80 backdrop-blur-xl border ${getBorderColorByStatus(operationalStatus)} rounded-2xl`}>
        <div className="flex items-center gap-4">
          <Link href="/operator/practices">
            <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
              <ArrowLeft className="w-6 h-6" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(practice.status)}`}>
                {getStatusLabel(practice.status)}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getOperationalStatusColor(operationalStatus)}`}>
                {getOperationalStatusLabel(operationalStatus)}
              </span>
              <span className="text-slate-500 text-sm">Step {practice.currentStep}/8</span>
            </div>
            <h1 className="text-3xl font-bold text-white">{practice.offerName}</h1>
            
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-slate-400 mr-2">Cambia Stato:</span>
              <button 
                onClick={() => handleOperationalStatusChange('PENDING')} 
                disabled={statusLoading || operationalStatus === 'PENDING'}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  operationalStatus === 'PENDING' 
                    ? 'bg-amber-500 text-white' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                In Attesa
              </button>
              <button 
                onClick={() => handleOperationalStatusChange('IN_PROGRESS')} 
                disabled={statusLoading || operationalStatus === 'IN_PROGRESS'}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  operationalStatus === 'IN_PROGRESS' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                In Lavorazione
              </button>
              <button 
                onClick={() => handleOperationalStatusChange('ACTIVATED')} 
                disabled={statusLoading || operationalStatus === 'ACTIVATED'}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  operationalStatus === 'ACTIVATED' 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                Attivata
              </button>
              <button 
                onClick={() => handleOperationalStatusChange('REJECTED')} 
                disabled={statusLoading || operationalStatus === 'REJECTED'}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  operationalStatus === 'REJECTED' 
                    ? 'bg-rose-500 text-white' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                KO
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
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
              className="flex items-center gap-2 px-4 py-2 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-600/30 rounded-xl transition-all"
            >
              <CheckCircle className="w-4 h-4" />
              Forza Completamento
            </button>
          )}
          
          <Link href={`/operator/practices/new?edit=${id}`}>
            <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-600/30 rounded-xl transition-all">
              <Pencil className="w-4 h-4" />
              Modifica Pratica
            </button>
          </Link>
          
          <button 
            onClick={handleDelete}
            disabled={deleteLoading}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-600/30 rounded-xl transition-all disabled:opacity-50"
          >
            <Trash className="w-4 h-4" />
            {deleteLoading ? 'Eliminazione...' : 'Elimina'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          
          {/* Pacchetti Aggiuntivi */}
          {practice.additionalPackages?.selectedIds?.some(id => id !== 'none') && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-indigo-900/20 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-6"
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

          {/* WASH Config */}
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
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-900/50 rounded-xl">
                        <span className="text-slate-500 text-xs block mb-1">Codice Cliente/CF</span>
                        <span className="text-white font-mono text-sm">{practice.washConfig.suspectData.clientCode || '-'}</span>
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
                  </>
                )}

                {practice.washConfig.timestamp && (
                  <div className="text-xs text-slate-500 bg-slate-900/30 p-2 rounded-lg border border-slate-800">
                    Registrato il: {new Date(practice.washConfig.timestamp).toLocaleString('it-IT')}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Note & Cronologia */}
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
                    {practice.notesHistory?.length || 0} note inserite
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
                  .map((note, index) => (
                    <div key={index} className="relative pl-6 pb-4 border-l-2 border-slate-700 last:border-0">
                      <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-amber-500" />
                      
                      <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-amber-400">
                            {note.createdBy || 'Operatore'}
                          </span>
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
                            onClick={() => handleDeleteNote(practice.notesHistory!.length - 1 - index)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors ml-2"
                            title="Elimina nota"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                          {note.text}
                        </p>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nessuna nota presente</p>
                  <p className="text-xs mt-1">Aggiungi la prima nota usando il form sopra</p>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">Dettagli Linea</h2>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-slate-500 block mb-1">Tipo Attivazione</label>
                <span className={`inline-flex px-3 py-1 rounded-lg text-sm font-medium ${
                  practice.lineType === 'NUOVA' 
                    ? 'bg-emerald-600/20 text-emerald-400' 
                    : 'bg-amber-600/20 text-amber-400'
                }`}>
                  {practice.lineType === 'NUOVA' ? 'Nuova Attivazione' : 'Migrazione'}
                </span>
              </div>
              {practice.technology && (
                <div>
                  <label className="text-sm text-slate-500 block mb-1">Tecnologia</label>
                  <p className="text-white font-medium">{practice.technology}</p>
                </div>
              )}
              {typeof practice.installationAddress?.street === 'string' && (
                <div className="col-span-2">
                  <label className="text-sm text-slate-500 block mb-1">Indirizzo Installazione</label>
                  <p className="text-white flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                    {practice.installationAddress.street}
                  </p>
                </div>
              )}
            </div>

            {practice.oldLineData && (
              <div className="mt-6 pt-6 border-t border-slate-800">
                <h3 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Dati Linea Precedente (Migrazione)
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm bg-amber-900/10 p-4 rounded-xl border border-amber-600/20">
                  {typeof practice.oldLineData.oldPhoneNumber === 'string' && (
                    <div>
                      <span className="text-slate-500 block text-xs mb-1">Numero Attuale</span>
                      <span className="text-white font-medium">{practice.oldLineData.oldPhoneNumber}</span>
                    </div>
                  )}
                  {practice.oldLineData.migrationCode && (
                    <div>
                      <span className="text-slate-500 block text-xs mb-1">Codice Migrazione</span>
                      <span className="text-white font-mono">{practice.oldLineData.migrationCode}</span>
                    </div>
                  )}
                  {practice.oldLineData?.gestore && (
                    <div>
                      <span className="text-slate-500 block text-xs mb-1">Gestore</span>
                      <span className="text-white font-medium">{practice.oldLineData.gestore}</span>
                    </div>
                  )}
                  {practice.oldLineData?.gestoreAltro && (
                    <div>
                      <span className="text-slate-500 block text-xs mb-1">Altro Gestore</span>
                      <span className="text-white font-medium">{practice.oldLineData.gestoreAltro}</span>
                    </div>
                  )}
                  {practice.oldLineData?.fiscalCodeOldLine && (
                    <div>
                      <span className="text-slate-500 block text-xs mb-1">CF Vecchia Linea</span>
                      <span className="text-white font-mono text-sm">{practice.oldLineData.fiscalCodeOldLine}</span>
                    </div>
                  )}
                  {practice.oldLineData?.prodottiRestituire && (
                    <div className="col-span-2">
                      <span className="text-slate-500 block text-xs mb-1">Prodotti da Restituire</span>
                      <span className="text-white">{practice.oldLineData.prodottiRestituire}</span>
                    </div>
                  )}
                  {practice.oldLineData?.notes && (
                    <div className="col-span-2">
                      <span className="text-slate-500 block text-xs mb-1">Note Vecchia Linea</span>
                      <p className="text-slate-300 text-sm">{practice.oldLineData.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
          
          {practice.appointmentData && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-slate-900/80 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-white">Appuntamento Installazione</h2>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {practice.appointmentData.data && (
                  <div>
                    <label className="text-sm text-slate-500 block mb-1">Data</label>
                    <p className="text-white font-medium text-lg">
                      {new Date(practice.appointmentData.data).toLocaleDateString('it-IT', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                )}
                {(practice.appointmentData.ora || practice.appointmentData.oraFine) && (
                  <div>
                    <label className="text-sm text-slate-500 block mb-1">Orario</label>
                    <p className="text-white font-medium text-lg">
                      {practice.appointmentData.ora || '--:--'} - {practice.appointmentData.oraFine || '--:--'}
                    </p>
                  </div>
                )}
              </div>
              
              {practice.appointmentData.accordi && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <label className="text-sm text-slate-500 block mb-2">Accordi con il Cliente</label>
                  <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-xl p-4">
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                      {practice.appointmentData.accordi}
                    </p>
                  </div>
                </div>
              )}
              
              {practice.appointmentData.lavorazioniPost && (
                <div className="mt-4">
                  <label className="text-sm text-slate-500 block mb-2">Lavorazioni Post Attivazione</label>
                  <div className="bg-slate-950/50 border border-slate-700 rounded-xl p-4">
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                      {practice.appointmentData.lavorazioniPost}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {practice.paymentMethod && Object.keys(practice.paymentMethod).length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-violet-600/20 text-violet-400 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-white">Pagamento</h2>
              </div>

              <div className="space-y-3">
                {typeof practice.paymentMethod.iban === 'string' && (
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                    <span className="text-slate-400">IBAN</span>
                    <span className="text-white font-mono text-sm">{practice.paymentMethod.iban}</span>
                  </div>
                )}
                {typeof practice.paymentMethod.postePay === 'string' && (
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                    <span className="text-slate-400">PostePay</span>
                    <span className="text-white">{practice.paymentMethod.postePay}</span>
                  </div>
                )}
                {practice.paymentMethod.bollettino && (
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                    <span className="text-slate-400">Metodo</span>
                    <span className="text-white flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Bollettino Postale
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
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
                  {practice.newLineNotes}
                </p>
              </div>
            </motion.div>
          )}
        </div>

        <div className="space-y-6">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-white">Info Pratica</h2>
            </div>

            <div className="space-y-4">
              {practice.offerName && (
                <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 mb-4">
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

                  <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    {practice.offerCanone && (
                      <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-700">
                        <span className="text-slate-400 text-xs block mb-1">Canone Mensile</span>
                        <span className="text-emerald-400 font-bold text-lg">{practice.offerCanone}</span>
                      </div>
                    )}
                    {practice.offerAttivazione && (
                      <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-700">
                        <span className="text-slate-400 text-xs block mb-1">Attivazione</span>
                        <span className="text-white font-semibold">{practice.offerAttivazione}</span>
                      </div>
                    )}
                    {practice.offerVincolo && (
                      <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-700">
                        <span className="text-slate-400 text-xs block mb-1">Vincolo</span>
                        <span className="text-amber-400 font-semibold">{practice.offerVincolo}</span>
                      </div>
                    )}
                    {practice.offerDisattivazione && (
                      <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-700">
                        <span className="text-slate-400 text-xs block mb-1">Disattivazione</span>
                        <span className="text-rose-400 text-sm font-semibold">{practice.offerDisattivazione}</span>
                      </div>
                    )}
                  </div>

                  {practice.offerNote && (
                    <div className="bg-amber-900/10 border border-amber-600/20 rounded-lg p-3 mb-3">
                      <span className="text-amber-500 text-xs block mb-1 font-medium">Note Importanti</span>
                      <p className="text-slate-300 text-sm leading-relaxed">{practice.offerNote}</p>
                    </div>
                  )}
                  
                  {practice.offerScadenza && (
                    <div className="flex items-center gap-2 text-sm bg-slate-900/50 rounded-lg p-2 border border-slate-800">
                      <Calendar className="w-4 h-4 text-amber-400" />
                      <span className="text-slate-400">Scadenza promo:</span>
                      <span className="text-amber-400 font-semibold">{practice.offerScadenza}</span>
                    </div>
                  )}

                  {/* Totale Mensile Completo */}
                  {practice.additionalPackages && (
                    <div className="mt-4 pt-4 border-t border-slate-700 bg-gradient-to-r from-emerald-900/20 to-indigo-900/20 rounded-xl p-4 border border-emerald-500/20">
                      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-emerald-400" />
                        Riepilogo Costi
                      </h4>
                      
                      <div className="space-y-2 text-sm mb-3">
                        <div className="flex justify-between text-slate-400">
                          <span>Canone Base:</span>
                          <span>{practice.offerCanone || '-'}</span>
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
                     practice.type}
                  </span>
                </div>
              </div>
              
              {practice.offerCode && (
                <div>
                  <label className="text-sm text-slate-500 block mb-1">Codice Offerta</label>
                  <p className="text-white font-mono text-sm bg-slate-800/50 px-2 py-1 rounded inline-block">
                    {practice.offerCode}
                  </p>
                </div>
              )}
              
              {practice.soldBy && (
                <div>
                  <label className="text-sm text-slate-500 block mb-1">Venduto Da</label>
                  <p className="text-white">{practice.soldBy}</p>
                </div>
              )}
              
              {practice.enteredBy && (
                <div>
                  <label className="text-sm text-slate-500 block mb-1">Inserito Da</label>
                  <p className="text-white">{practice.enteredBy}</p>
                </div>
              )}

              <div className="pt-4 border-t border-slate-800">
                <label className="text-sm text-slate-500 block mb-1">Data Creazione</label>
                <p className="text-white text-sm">
                  {new Date(practice.createdAt).toLocaleDateString('it-IT', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              
              {practice.updatedAt !== practice.createdAt && (
                <div>
                  <label className="text-sm text-slate-500 block mb-1">Ultima Modifica</label>
                  <p className="text-white text-sm">
                    {new Date(practice.updatedAt).toLocaleDateString('it-IT', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
            </div>
          </motion.div>

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
                <span className="text-emerald-400 text-sm font-medium">✓ Pratica Completata</span>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </OperatorLayout>
  );
}