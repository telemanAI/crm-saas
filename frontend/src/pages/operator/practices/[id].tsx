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
import QuickEditModal from '@/components/practices/QuickEditModal';

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

  // ===== SPRINT — Stato globale pratica (NON_COMPLETATA / COMPLETATA) =====
  const [globalStatusLoading, setGlobalStatusLoading] = useState(false);
  const [completionBlockers, setCompletionBlockers] = useState<string[]>([]);
  const [showCompletionError, setShowCompletionError] = useState(false);

  // ===== SPRINT — Quick Edit dal dettaglio pratica =====
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [teamUsers, setTeamUsers] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);

  useEffect(() => {
    if (!canEditPractices) return;
    (async () => {
      try {
        const res = await api.get('/users/team');
        setTeamUsers(res.data || []);
      } catch { /* ignore */ }
    })();
  }, [canEditPractices]);

  const handleMarkCompleted = async () => {
    if (!id) return;
    setGlobalStatusLoading(true);
    setShowCompletionError(false);
    try {
      await api.patch(`/practices/${id}/global-status`, { status: 'COMPLETATA' });
      setCompletionBlockers([]);
      fetchPractice();
    } catch (err: any) {
      const errs = err?.response?.data?.errors || err?.response?.data?.message?.errors;
      if (Array.isArray(errs) && errs.length > 0) {
        setCompletionBlockers(errs);
        setShowCompletionError(true);
      } else {
        setCompletionBlockers(['Impossibile completare la pratica. Verifica i vincoli.']);
        setShowCompletionError(true);
      }
    } finally {
      setGlobalStatusLoading(false);
    }
  };

  const handleMarkNotCompleted = async () => {
    if (!id) return;
    setGlobalStatusLoading(true);
    try {
      await api.patch(`/practices/${id}/global-status`, { status: 'NON_COMPLETATA' });
      setShowCompletionError(false);
      setCompletionBlockers([]);
      fetchPractice();
    } catch {
      // ignore
    } finally {
      setGlobalStatusLoading(false);
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

              {/* ===== SPRINT — Badge stato globale separato (NON_COMPLETATA/COMPLETATA) ===== */}
              <span
                data-testid="global-status-badge"
                className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-medium border ${
                  practice.globalStatus === 'COMPLETATA'
                    ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-700/40 text-slate-300 border-slate-600/40'
                }`}
              >
                {practice.globalStatus === 'COMPLETATA' ? '✓ Pratica completata' : 'Pratica non completata'}
              </span>

              <span className="text-slate-500 text-[10px] md:text-sm">Step {practice.currentStep}/9</span>
            </div>
            <h1 className="text-lg md:text-3xl font-bold text-white break-words">{practice.offerName}</h1>

            {/* ===== SPRINT — Pulsanti gestione stato globale + banner vincoli ===== */}
            {canEditPractices && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {practice.globalStatus !== 'COMPLETATA' ? (
                  <button
                    onClick={handleMarkCompleted}
                    disabled={globalStatusLoading}
                    data-testid="mark-completed-btn"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs md:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {globalStatusLoading ? 'Verifica...' : 'Segna come completata'}
                  </button>
                ) : (
                  <button
                    onClick={handleMarkNotCompleted}
                    disabled={globalStatusLoading}
                    data-testid="mark-not-completed-btn"
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 text-xs md:text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    Riapri come non completata
                  </button>
                )}
              </div>
            )}

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
            <button
              data-testid="practice-quick-edit-btn"
              onClick={() => setQuickEditOpen(true)}
              className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-600/30 rounded-xl transition-all text-xs md:text-sm"
            >
              <Pencil className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Modifica veloce</span>
              <span className="sm:hidden">Veloce</span>
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
                {practice.soldBy && (
                  <div>
                    <label className="text-sm text-slate-500 block mb-1">Venduto Da</label>
                    <p className="text-white">{safeString(practice.soldBy)}</p>
                  </div>
                )}
                
                {practice.enteredBy && (
                  <div>
                    <label className="text-sm text-slate-500 block mb-1">Inserito Da</label>
                    <p className="text-white">{safeString(practice.enteredBy)}</p>
                  </div>
                )}
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

          {(practice.lineType || practice.technology || safeString(practice.installationAddress?.street) || (practice.oldLineData && Object.keys(practice.oldLineData).length > 0)) && (
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {practice.lineType && (
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
                )}
                {practice.technology && (
                  <div>
                    <label className="text-sm text-slate-500 block mb-1">Tecnologia</label>
                    <p className="text-white font-medium">{safeString(practice.technology)}</p>
                  </div>
                )}

                {safeString(practice.installationAddress?.street) && (
                  <div className="col-span-2">
                    <label className="text-sm text-slate-500 block mb-1">Indirizzo Installazione</label>
                    <p className="text-white flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                      {safeString(practice.installationAddress?.street)}
                      {safeString(practice.installationAddress?.comune) && `, ${safeString(practice.installationAddress?.comune)}`}
                      {safeString(practice.installationAddress?.citta) && ` (${safeString(practice.installationAddress?.citta)})`}
                      {safeString(practice.installationAddress?.cap) && ` - ${safeString(practice.installationAddress?.cap)}`}
                    </p>
                  </div>
                )}

                {practice.lavorazioniPostAttivazione && (
                  <div className="col-span-2">
                    <label className="text-sm text-slate-500 block mb-1">Lavorazioni Post Attivazione</label>
                    <p className="text-sm text-slate-300 bg-slate-950/50 p-3 rounded-lg border border-slate-800 whitespace-pre-wrap">
                      {safeString(practice.lavorazioniPostAttivazione)}
                    </p>
                  </div>
                )}
              </div>

              {practice.oldLineData && Object.keys(practice.oldLineData).length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-800">
                  <h3 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Dati Linea Precedente (Migrazione)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-amber-900/10 p-4 rounded-xl border border-amber-600/20">
                    {/* ===== SPRINT — Stato vecchia linea (solo Migrazione) ===== */}
                    {practice.lineType === 'MIGRAZIONE' && (
                      <div data-testid="old-line-status-detail">
                        <span className="text-slate-500 block text-xs mb-1">Stato Vecchia Linea</span>
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
                      </div>
                    )}
                    {/* ===== SPRINT — Tecnologia provenienza ===== */}
                    {practice.lineType === 'MIGRAZIONE' && (
                      <div data-testid="old-line-technology-detail">
                        <span className="text-slate-500 block text-xs mb-1">Tecnologia Provenienza</span>
                        <span className="text-white font-medium">{practice.oldLineTechnology || '—'}</span>
                      </div>
                    )}
                    {safeString(practice.oldLineData.oldPhoneNumber) && (
                      <div>
                        <span className="text-slate-500 block text-xs mb-1">Numero Attuale</span>
                        <span className="text-white font-medium">{safeString(practice.oldLineData.oldPhoneNumber)}</span>
                      </div>
                    )}
                    {safeString(practice.oldLineData.migrationCode) && (
                      <div>
                        <span className="text-slate-500 block text-xs mb-1">Codice Migrazione</span>
                        <span className="text-white font-mono">{safeString(practice.oldLineData.migrationCode)}</span>
                      </div>
                    )}
                    {safeString(practice.oldLineData.gestore) && (
                      <div>
                        <span className="text-slate-500 block text-xs mb-1">Gestore</span>
                        <span className="text-white font-medium">{safeString(practice.oldLineData.gestore)}</span>
                      </div>
                    )}
                    {safeString(practice.oldLineData.gestoreAltro) && (
                      <div>
                        <span className="text-slate-500 block text-xs mb-1">Altro Gestore</span>
                        <span className="text-white font-medium">{safeString(practice.oldLineData.gestoreAltro)}</span>
                      </div>
                    )}
                    {safeString(practice.oldLineData.fiscalCodeOldLine) && (
                      <div>
                        <span className="text-slate-500 block text-xs mb-1">CF Vecchia Linea</span>
                        <span className="text-white font-mono text-sm">{safeString(practice.oldLineData.fiscalCodeOldLine)}</span>
                      </div>
                    )}
                    {safeString(practice.oldLineData.prodottiRestituire) && (
                      <div className="col-span-2">
                        <span className="text-slate-500 block text-xs mb-1">Prodotti da Restituire</span>
                        <span className="text-white">{safeString(practice.oldLineData.prodottiRestituire)}</span>
                      </div>
                    )}
                    {safeString(practice.oldLineData.notes) && (
                      <div className="col-span-2">
                        <span className="text-slate-500 block text-xs mb-1">Note Vecchia Linea</span>
                        <p className="text-slate-300 text-sm">{safeString(practice.oldLineData.notes)}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
          
          {/* ===== SPRINT (point 10) — Card unificata: Indirizzo Installazione + Appuntamento =====
              Sostituisce la card "Appuntamento Installazione" separata che era
              presente nella colonna destra. Ora indirizzo e appuntamento sono
              raggruppati in un unico blocco centrale per coerenza visiva
              con il gruppo "Informazioni indirizzo di installazione e appuntamento"
              della Quick Edit. */}
          {(practice.appointmentData || hasAddressData) && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              data-testid="install-and-appointment-card"
              className="bg-slate-900/80 backdrop-blur-xl border border-indigo-500/30 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-white">Indirizzo di Installazione e Appuntamento</h2>
              </div>

              {/* Blocco indirizzo */}
              {hasAddressData && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Indirizzo Installazione
                  </h3>
                  <div className="space-y-3 text-sm bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                    {safeString(practice.installationAddress?.street) && (
                      <div className="flex items-start gap-2">
                        <span className="text-slate-400 w-20 flex-shrink-0">Indirizzo:</span>
                        <span className="text-white font-medium">{safeString(practice.installationAddress?.street)}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                      {safeString(practice.installationAddress?.comune) && (
                        <div>
                          <span className="text-slate-500 text-xs block mb-1">Comune</span>
                          <span className="text-white font-medium">{safeString(practice.installationAddress?.comune)}</span>
                        </div>
                      )}
                      {safeString(practice.installationAddress?.citta) && (
                        <div>
                          <span className="text-slate-500 text-xs block mb-1">Città</span>
                          <span className="text-white font-medium">{safeString(practice.installationAddress?.citta)}</span>
                        </div>
                      )}
                      {safeString(practice.installationAddress?.cap) && (
                        <div>
                          <span className="text-slate-500 text-xs block mb-1">CAP</span>
                          <span className="text-white font-mono bg-slate-800/50 px-2 py-0.5 rounded">{safeString(practice.installationAddress?.cap)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Blocco appuntamento */}
              {practice.appointmentData && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Appuntamento Installazione
                  </h3>
                  <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {practice.appointmentData.data && (
                        <div>
                          <label className="text-sm text-slate-500 block mb-1">Data</label>
                          <p className="text-white font-medium">
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
                          <label className="text-sm text-slate-500 block mb-1">Fascia oraria</label>
                          <p className="text-white font-medium">
                            {safeString(practice.appointmentData.ora) || '--:--'} — {safeString(practice.appointmentData.oraFine) || '--:--'}
                          </p>
                        </div>
                      )}
                    </div>
                    {safeString(practice.appointmentData.accordi) && (
                      <div className="pt-3 border-t border-slate-800">
                        <label className="text-sm text-slate-500 block mb-2">Note / Accordi</label>
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                          {safeString(practice.appointmentData.accordi)}
                        </p>
                      </div>
                    )}
                    {safeString(practice.appointmentData.lavorazioniPost) && (
                      <div className="pt-3 border-t border-slate-800">
                        <label className="text-sm text-slate-500 block mb-2">Lavorazioni Post Attivazione</label>
                        <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                          {safeString(practice.appointmentData.lavorazioniPost)}
                        </p>
                      </div>
                    )}
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
                <h2 className="text-xl font-semibold text-white">Metodo di Pagamento</h2>
              </div>

              <div className="space-y-3">
                {safeString(practice.paymentMethod.iban) && (
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                    <span className="text-slate-400">IBAN</span>
                    <span className="text-white font-mono text-sm">{safeString(practice.paymentMethod.iban)}</span>
                  </div>
                )}
                {safeString(practice.paymentMethod.postePay) && (
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                    <span className="text-slate-400">PostePay</span>
                    <span className="text-white">{safeString(practice.paymentMethod.postePay)}</span>
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

          {/* SPRINT (point 9) — Se la pratica è globalmente COMPLETATA,
              nascondo lo stepper di Progresso e mostro un badge verde dedicato. */}
          {practice.globalStatus === 'COMPLETATA' ? (
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
                  <h3 className="text-emerald-200 font-semibold">Pratica completata</h3>
                  <p className="text-emerald-300/70 text-xs mt-0.5">Tutti i vincoli sono soddisfatti.</p>
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

      {/* ===== SPRINT — Quick Edit Modal ===== */}
      <QuickEditModal
        isOpen={quickEditOpen}
        onClose={() => setQuickEditOpen(false)}
        practice={practice}
        teamUsers={teamUsers}
        canEdit={canEditPractices}
        onSaved={() => { setQuickEditOpen(false); fetchPractice(); }}
      />
    </OperatorLayout>
  );
}