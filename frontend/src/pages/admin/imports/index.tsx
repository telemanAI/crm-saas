import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '../../../components/layout/Layout';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import axios from '../../../lib/axios';
import { 
  Play, 
  Pause, 
  SkipForward, 
  ArrowCounterClockwise, 
  FileSearch, 
  TrendUp, 
  TrendDown, 
  Activity,
  CheckCircle,
  XCircle,
  Warning,
  Clock,
  Database,
  ArrowsClockwise,
  Download,
  Eye,
  Calendar,
 Faders
} from 'phosphor-react';

interface Job {
  id: string;
  tenantId: string;
  tenant?: { name: string };
  fileName: string;
  targetEntity: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused' | 'rolled_back';
  stats: {
    totalRows: number;
    processedRows: number;
    successfulRows: number;
    failedRows: number;
    createdCustomers: number;
    updatedCustomers: number;
    createdPractices: number;
    matchedByCache?: number;
    matchedByDB?: number;
  };
  validationResults?: {
    valid: number;
    warnings: number;
    errors: number;
    summary?: {
      totalCustomers: number;
      customersWithPractice: number;
    };
  };
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  errorLog?: any[];
}

interface GlobalStats {
  total: number;
  completed: number;
  failed: number;
  processing: number;
  paused: number;
  activeNow: number;
  successRate: number;
  failureRate: number;
}

export default function SuperAdminImportsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [statsDays, setStatsDays] = useState(7);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dryRunResult, setDryRunResult] = useState<any>(null);
  const [showDryRun, setShowDryRun] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Poll ogni 10s
    return () => clearInterval(interval);
  }, [statsDays, filterStatus]);

  const loadData = async () => {
    try {
      // Carica job e stats in parallelo
      const [jobsRes, statsRes] = await Promise.all([
        axios.get('/api/admin/imports/jobs', {
          params: filterStatus !== 'all' ? { status: filterStatus } : {}
        }),
        axios.get(`/api/admin/imports/stats?days=${statsDays}`)
      ]);
      
      setJobs(jobsRes.data.jobs);
      setGlobalStats(statsRes.data.stats);
    } catch (error) {
      console.error('Errore caricamento:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, jobId: string, params?: any) => {
    setActionLoading(`${action}-${jobId}`);
    try {
      switch (action) {
        case 'pause':
          await axios.post(`/api/admin/imports/${jobId}/pause`);
          break;
        case 'resume':
          await axios.post(`/api/admin/imports/${jobId}/resume`);
          break;
        case 'skip':
          await axios.post(`/api/admin/imports/${jobId}/skip-row`, { rowNumber: params.row });
          break;
        case 'rollback':
          if (!confirm('Rollback: eliminare i dati importati?')) return;
          await axios.post(`/api/admin/imports/${jobId}/rollback`, { 
            mode: 'full',
            reason: 'SuperAdmin rollback' 
          });
          break;
        case 'retry':
          const retryRes = await axios.post(`/api/admin/imports/${jobId}/retry`);
          alert(`Nuovo job creato: ${retryRes.data.newJobId}`);
          break;
        case 'dryrun':
          const dryRes = await axios.post(`/api/admin/imports/${jobId}/dry-run`);
          setDryRunResult(dryRes.data.simulation);
          setShowDryRun(true);
          break;
      }
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Errore azione');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock, label: 'In Attesa' },
      processing: { color: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse', icon: Activity, label: 'Elaborazione' },
      completed: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle, label: 'Completato' },
      failed: { color: 'bg-rose-100 text-rose-800 border-rose-200', icon: XCircle, label: 'Fallito' },
      paused: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Pause, label: 'In Pausa' },
      rolled_back: { color: 'bg-gray-100 text-gray-600 border-gray-200', icon: ArrowCounterClockwise, label: 'Annullato' },
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  const getCriticalJobs = () => jobs.filter(j => 
    j.status === 'processing' && 
    j.startedAt && 
    (Date.now() - new Date(j.startedAt).getTime() > 5 * 60 * 1000)
  );

  const formatNumber = (n: number) => new Intl.NumberFormat('it-IT').format(n || 0);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-8 h-8 text-blue-600" weight="fill" />
              Controllo Importazioni
            </h1>
            <p className="text-slate-500 mt-1">Monitoraggio e gestione dati cross-tenant</p>
          </div>
          <div className="flex gap-2">
            <select 
              value={statsDays} 
              onChange={(e) => setStatsDays(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value={1}>Ultime 24h</option>
              <option value={7}>Ultimi 7 giorni</option>
              <option value={30}>Ultimi 30 giorni</option>
            </select>
            <Button onClick={loadData} variant="ghost" className="border border-slate-200">
              <ArrowsClockwise className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats Globali */}
        {globalStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            <Card className="p-4 border-l-4 border-blue-500 bg-gradient-to-br from-white to-blue-50/30">
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Totali</div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{formatNumber(globalStats.total)}</div>
            </Card>
            
            <Card className="p-4 border-l-4 border-emerald-500 bg-gradient-to-br from-white to-emerald-50/30">
              <div className="text-xs text-emerald-600 uppercase tracking-wider font-semibold flex items-center gap-1">
                <TrendUp className="w-3 h-3" /> Completati
              </div>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                {formatNumber(globalStats.completed)}
                <span className="text-xs font-normal text-emerald-600 ml-1">({globalStats.successRate}%)</span>
              </div>
            </Card>

            <Card className="p-4 border-l-4 border-rose-500 bg-gradient-to-br from-white to-rose-50/30">
              <div className="text-xs text-rose-600 uppercase tracking-wider font-semibold flex items-center gap-1">
                <TrendDown className="w-3 h-3" /> Falliti
              </div>
              <div className="text-2xl font-bold text-rose-700 mt-1">
                {formatNumber(globalStats.failed)}
                <span className="text-xs font-normal text-rose-600 ml-1">({globalStats.failureRate}%)</span>
              </div>
            </Card>

            <Card className="p-4 border-l-4 border-blue-400 bg-gradient-to-br from-white to-blue-50/30">
              <div className="text-xs text-blue-600 uppercase tracking-wider font-semibold">In Corso</div>
              <div className="text-2xl font-bold text-blue-700 mt-1">
                {formatNumber(globalStats.processing)}
                {globalStats.activeNow > 0 && (
                  <span className="ml-2 inline-flex h-2 w-2 animate-pulse rounded-full bg-blue-600"></span>
                )}
              </div>
            </Card>

            <Card className="p-4 border-l-4 border-amber-400 bg-gradient-to-br from-white to-amber-50/30">
              <div className="text-xs text-amber-600 uppercase tracking-wider font-semibold">In Pausa</div>
              <div className="text-2xl font-bold text-amber-700 mt-1">{formatNumber(globalStats.paused)}</div>
            </Card>

            <Card className="p-4 border-l-4 border-slate-400 bg-gradient-to-br from-white to-slate-50/30">
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Attivi Ora</div>
              <div className="text-2xl font-bold text-slate-700 mt-1 flex items-center gap-2">
                {formatNumber(globalStats.activeNow)}
                {globalStats.activeNow > 0 && <Activity className="w-4 h-4 text-blue-500 animate-pulse" />}
              </div>
            </Card>
          </div>
        )}

        {/* Alert Critici */}
        {getCriticalJobs().length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-rose-50 to-red-50 border-l-4 border-rose-500 rounded-r-lg p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <Warning className="h-6 w-6 text-rose-600 flex-shrink-0 mt-0.5" weight="fill" />
              <div>
                <h3 className="font-bold text-rose-900">
                  ⚠️ {getCriticalJobs().length} import bloccati da più di 5 minuti
                </h3>
                <p className="text-sm text-rose-700 mt-1">
                  Potrebbero richiedere intervento manuale (skip riga o rollback)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filtri */}
        <div className="flex flex-wrap gap-2 mb-6 items-center">
         <Faders className="w-4 h-4 text-slate-400" />
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="all">Tutti gli stati</option>
            <option value="processing">In elaborazione</option>
            <option value="completed">Completati</option>
            <option value="failed">Falliti</option>
            <option value="pending">In attesa</option>
            <option value="paused">In pausa</option>
          </select>
          <span className="text-sm text-slate-500 ml-auto">
            {jobs.length} job visualizzati
          </span>
        </div>

        {/* Lista Job */}
        <div className="space-y-4">
          {loading ? (
            <Card className="p-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-slate-500 mt-4">Caricamento importazioni...</p>
            </Card>
          ) : jobs.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2">
              <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nessuna importazione trovata</p>
            </Card>
          ) : (
            jobs.map((job) => {
              const StatusIcon = getStatusConfig(job.status).icon;
              const isUnified = job.targetEntity === 'UNIFIED_IMPORT';
              
              return (
                <Card key={job.id} className="overflow-hidden hover:shadow-md transition-shadow border border-slate-200">
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      
                      {/* Info Principali */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${getStatusConfig(job.status).color}`}>
                            <StatusIcon className="w-3.5 h-3.5" weight="fill" />
                            {getStatusConfig(job.status).label}
                          </span>
                          
                          {isUnified && (
                            <span className="px-2 py-1 rounded bg-indigo-100 text-indigo-700 text-xs font-medium">
                              UNIFIED
                            </span>
                          )}
                          
                          <span className="text-sm text-slate-500 font-mono">
                            {job.id.substring(0, 8)}
                          </span>
                          
                          <span className="text-sm text-slate-400">•</span>
                          
                          <span className="text-sm text-slate-600">
                            Tenant: <span className="font-medium text-slate-900">{job.tenant?.name || job.tenantId}</span>
                          </span>
                        </div>

                        <h3 className="text-lg font-semibold text-slate-900 mb-1 truncate" title={job.fileName}>
                          {job.fileName}
                        </h3>
                        
                        <p className="text-sm text-slate-500 mb-4">
                          {new Date(job.createdAt).toLocaleString('it-IT', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                          {job.targetEntity && ` • ${job.targetEntity.replace(/_/g, ' ')}`}
                        </p>

                        {/* Stats Preview */}
                        {job.stats && (
                          <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <span className="font-medium text-slate-900">{formatNumber(job.stats.totalRows)}</span>
                              <span>righe</span>
                            </div>
                            
                            {job.stats.createdCustomers > 0 && (
                              <div className="flex items-center gap-1.5 text-blue-600">
                                <span className="font-medium">{formatNumber(job.stats.createdCustomers)}</span>
                                <span>clienti nuovi</span>
                              </div>
                            )}
                            
                            {job.stats.updatedCustomers > 0 && (
                              <div className="flex items-center gap-1.5 text-amber-600">
                                <span className="font-medium">{formatNumber(job.stats.updatedCustomers)}</span>
                                <span>aggiornati</span>
                              </div>
                            )}
                            
                            {job.stats.createdPractices > 0 && (
                              <div className="flex items-center gap-1.5 text-purple-600">
                                <span className="font-medium">{formatNumber(job.stats.createdPractices)}</span>
                                <span>pratiche</span>
                              </div>
                            )}

                            {(job.stats.matchedByCache || 0) > 0 && (
                              <div className="flex items-center gap-1.5 text-emerald-600 text-xs bg-emerald-50 px-2 py-1 rounded-full">
                                <span>⚡ {formatNumber(job.stats.matchedByCache)} cache hit</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Validazione Preview (se disponibile) */}
                        {job.validationResults && (
                          <div className="mt-4 flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1 text-emerald-600">
                              <CheckCircle className="w-3.5 h-3.5" weight="fill" />
                              {job.validationResults.valid}
                            </div>
                            {job.validationResults.warnings > 0 && (
                              <div className="flex items-center gap-1 text-amber-600">
                                <Warning className="w-3.5 h-3.5" weight="fill" />
                                {job.validationResults.warnings}
                              </div>
                            )}
                            {job.validationResults.errors > 0 && (
                              <div className="flex items-center gap-1 text-rose-600">
                                <XCircle className="w-3.5 h-3.5" weight="fill" />
                                {job.validationResults.errors}
                              </div>
                            )}
                            {job.validationResults.summary && (
                              <span className="text-slate-400 ml-2">
                                ({job.validationResults.summary.totalCustomers} clienti totali, {job.validationResults.summary.customersWithPractice} con pratica)
                              </span>
                            )}
                          </div>
                        )}

                        {/* Progress Bar per processing */}
                        {job.status === 'processing' && job.stats?.totalRows > 0 && (
                          <div className="mt-4">
                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                              <span>Progresso</span>
                              <span>{Math.round((job.stats.processedRows / job.stats.totalRows) * 100)}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${(job.stats.processedRows / job.stats.totalRows) * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Azioni */}
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        
                        {/* Azioni per stato Processing */}
                        {job.status === 'processing' && (
                          <>
                            <Button
                              onClick={() => handleAction('pause', job.id)}
                              disabled={actionLoading === `pause-${job.id}`}
                              className="bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-200 text-sm justify-center"
                            >
                              <Pause className="w-4 h-4 mr-2" weight="fill" />
                              Pausa
                            </Button>
                            
                            {job.errorLog && job.errorLog.length > 0 && (
                              <Button
                                onClick={() => handleAction('skip', job.id, { row: job.errorLog[job.errorLog.length - 1]?.row })}
                                disabled={actionLoading === `skip-${job.id}`}
                                className="bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-200 text-sm justify-center"
                              >
                                <SkipForward className="w-4 h-4 mr-2" weight="fill" />
                                Salta Riga {job.errorLog[job.errorLog.length - 1]?.row}
                              </Button>
                            )}
                          </>
                        )}

                        {/* Azioni per stato Paused */}
                        {job.status === 'paused' && (
                          <Button
                            onClick={() => handleAction('resume', job.id)}
                            disabled={actionLoading === `resume-${job.id}`}
                            className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-200 text-sm justify-center"
                          >
                            <Play className="w-4 h-4 mr-2" weight="fill" />
                            Riprendi
                          </Button>
                        )}

                        {/* Azioni per stato Pending */}
                        {job.status === 'pending' && (
                          <>
                            <Button
                              onClick={() => handleAction('dryrun', job.id)}
                              disabled={actionLoading === `dryrun-${job.id}`}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-sm justify-center"
                            >
                              <FileSearch className="w-4 h-4 mr-2" />
                              Simula (Dry Run)
                            </Button>
                          </>
                        )}

                        {/* Azioni per stato Failed */}
                        {job.status === 'failed' && (
                          <Button
                            onClick={() => handleAction('retry', job.id)}
                            disabled={actionLoading === `retry-${job.id}`}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-200 text-sm justify-center"
                          >
                            <ArrowsClockwise className="w-4 h-4 mr-2" />
                            Riprova (Retry)
                          </Button>
                        )}

                        {/* Rollback (per completed/failed) */}
                        {(job.status === 'completed' || job.status === 'failed') && (
                          <Button
                            onClick={() => handleAction('rollback', job.id)}
                            disabled={actionLoading === `rollback-${job.id}`}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-sm justify-center"
                          >
                            <ArrowCounterClockwise className="w-4 h-4 mr-2" />
                            Rollback
                          </Button>
                        )}

                        {/* Dettagli */}
                        <Button
                          onClick={() => setSelectedJob(job)}
                          variant="ghost"
                          className="text-slate-600 text-sm justify-center border border-slate-200 hover:bg-slate-50"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Dettagli
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Modal Dettaglio */}
        {selectedJob && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Dettagli Import</h2>
                  <p className="text-sm text-slate-500">ID: {selectedJob.id}</p>
                </div>
                <button 
                  onClick={() => setSelectedJob(null)}
                  className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <XCircle className="w-6 h-6" weight="fill" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
                {/* Info Generali */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <div className="text-xs text-slate-500 uppercase">File</div>
                    <div className="font-medium text-slate-900 truncate">{selectedJob.fileName}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <div className="text-xs text-slate-500 uppercase">Tipo</div>
                    <div className="font-medium text-slate-900">{selectedJob.targetEntity}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <div className="text-xs text-slate-500 uppercase">Tenant</div>
                    <div className="font-medium text-slate-900">{selectedJob.tenant?.name || selectedJob.tenantId}</div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <div className="text-xs text-slate-500 uppercase">Stato</div>
                    <div className="font-medium text-slate-900">{getStatusConfig(selectedJob.status).label}</div>
                  </div>
                </div>

                {/* Statistiche */}
                {selectedJob.stats && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Risultati Elaborazione
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-slate-600">Righe Totali:</span>
                        <span className="ml-2 font-bold text-slate-900">{formatNumber(selectedJob.stats.totalRows)}</span>
                      </div>
                      <div>
                        <span className="text-emerald-600">Successo:</span>
                        <span className="ml-2 font-bold text-emerald-700">{formatNumber(selectedJob.stats.successfulRows)}</span>
                      </div>
                      <div>
                        <span className="text-rose-600">Fallite:</span>
                        <span className="ml-2 font-bold text-rose-700">{formatNumber(selectedJob.stats.failedRows)}</span>
                      </div>
                      <div>
                        <span className="text-blue-600">Clienti Nuovi:</span>
                        <span className="ml-2 font-bold text-blue-700">{formatNumber(selectedJob.stats.createdCustomers)}</span>
                      </div>
                      <div>
                        <span className="text-amber-600">Clienti Aggiornati:</span>
                        <span className="ml-2 font-bold text-amber-700">{formatNumber(selectedJob.stats.updatedCustomers)}</span>
                      </div>
                      <div>
                        <span className="text-purple-600">Pratiche Create:</span>
                        <span className="ml-2 font-bold text-purple-700">{formatNumber(selectedJob.stats.createdPractices)}</span>
                      </div>
                    </div>
                    
                    {(selectedJob.stats.matchedByCache || 0) > 0 && (
                      <div className="mt-3 pt-3 border-t border-blue-200 text-xs text-blue-700 flex items-center gap-2">
                        <span className="bg-blue-200 px-2 py-1 rounded">⚡ Ottimizzazione</span>
                        {formatNumber(selectedJob.stats.matchedByCache)} clienti trovati in cache (velocità +{Math.round((selectedJob.stats.matchedByCache / (selectedJob.stats.createdCustomers + selectedJob.stats.updatedCustomers)) * 100)}%)
                      </div>
                    )}
                  </div>
                )}

                {/* Error Log */}
                {selectedJob.errorLog && selectedJob.errorLog.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-rose-900 mb-2 flex items-center gap-2">
                      <Warning className="w-4 h-4" weight="fill" />
                      Log Errori ({selectedJob.errorLog.length})
                    </h3>
                    <div className="bg-rose-50 rounded-lg p-3 max-h-48 overflow-y-auto text-sm space-y-2">
                      {selectedJob.errorLog.map((err, idx) => (
                        <div key={idx} className="flex gap-2 text-rose-800 border-b border-rose-200 last:border-0 pb-2 last:pb-0">
                          <span className="font-mono text-xs bg-rose-200 px-1.5 rounded">R{err.row}</span>
                          <span className="flex-1">{err.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Configurazione */}
                {selectedJob.mappingConfig && (
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">Configurazione Mapping</h3>
                    <pre className="bg-slate-50 rounded-lg p-3 text-xs overflow-x-auto text-slate-700">
                      {JSON.stringify(selectedJob.mappingConfig, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                <Button onClick={() => setSelectedJob(null)} variant="ghost">
                  Chiudi
                </Button>
                {selectedJob.status === 'failed' && (
                  <Button 
                    onClick={() => { handleAction('retry', selectedJob.id); setSelectedJob(null); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <ArrowsClockwise className="w-4 h-4 mr-2" />
                    Crea Retry
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Dry Run Results */}
        {showDryRun && dryRunResult && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl">
              <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                  <FileSearch className="w-6 h-6" />
                  Risultato Simulazione
                </h2>
                <p className="text-blue-700 text-sm mt-1">Nessun dato è stato salvato</p>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl text-center">
                    <div className="text-3xl font-bold text-slate-900">{dryRunResult.wouldCreateCustomers}</div>
                    <div className="text-sm text-slate-600 mt-1">Clienti da creare/aggiornare</div>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-xl text-center border border-indigo-100">
                    <div className="text-3xl font-bold text-indigo-700">{dryRunResult.wouldCreatePractices}</div>
                    <div className="text-sm text-indigo-600 mt-1">Pratiche da creare</div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Qualità Dati: {dryRunResult.quality === 'excellent' ? 'Eccellente' : dryRunResult.quality === 'good' ? 'Buona' : 'Da verificare'}
                  </h4>
                  <p className="text-sm text-amber-800">
                    Strategia duplicati: <span className="font-semibold uppercase">{dryRunResult.strategy}</span> • 
                    Righe totali: {dryRunResult.totalRows}
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button onClick={() => setShowDryRun(false)} variant="ghost">
                    Chiudi
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}