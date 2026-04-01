import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '../../../components/layout/Layout';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import axios from '../../../lib/axios';

export default function SuperAdminImportsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadAllJobs();
    const interval = setInterval(loadAllJobs, 5000); // Polling ogni 5 secondi
    return () => clearInterval(interval);
  }, []);

  const loadAllJobs = async () => {
    try {
      // Endpoint super admin che carica job di tutti i tenant
      const response = await axios.get('/api/super-admin/imports/jobs');
      setJobs(response.data.jobs);
    } catch (error) {
      console.error('Errore caricamento jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePauseJob = async (jobId: string) => {
    if (!confirm('Vuoi mettere in pausa questo import?')) return;
    setActionLoading(true);
    try {
      await axios.post(`/api/super-admin/imports/${jobId}/pause`);
      loadAllJobs();
    } catch (error) {
      alert('Errore durante la pausa');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeJob = async (jobId: string) => {
    setActionLoading(true);
    try {
      await axios.post(`/api/super-admin/imports/${jobId}/resume`);
      loadAllJobs();
    } catch (error) {
      alert('Errore durante il resume');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSkipRow = async (jobId: string, rowNumber: number) => {
    if (!confirm(`Vuoi saltare la riga ${rowNumber} e continuare?`)) return;
    setActionLoading(true);
    try {
      await axios.post(`/api/super-admin/imports/${jobId}/skip-row`, { rowNumber });
      loadAllJobs();
    } catch (error) {
      alert('Errore durante lo skip');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRollback = async (jobId: string, mode: 'partial' | 'full') => {
    const msg = mode === 'full' 
      ? 'ATTENZIONE: Questo cancellerà TUTTI i dati importati da questo job. Confermi?'
      : 'Vuoi annullare le pratiche/clienti creati da questo import?';
    
    if (!confirm(msg)) return;
    
    setActionLoading(true);
    try {
      await axios.post(`/api/super-admin/imports/${jobId}/rollback`, { mode });
      alert('Rollback completato');
      loadAllJobs();
    } catch (error) {
      alert('Errore durante il rollback');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800 animate-pulse',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      paused: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getCriticalJobs = () => {
    return jobs.filter((job: any) => 
      job.status === 'processing' && 
      (Date.now() - new Date(job.startedAt).getTime() > 5 * 60 * 1000) // Più di 5 minuti
    );
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">🎛️ Import Control Center</h1>
          <p className="text-gray-600 mt-1">Monitoraggio e controllo in tempo reale di tutti gli import</p>
        </div>

        {/* Critical Alerts */}
        {getCriticalJobs().length > 0 && (
          <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <svg className="h-6 w-6 text-red-600 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="font-bold text-red-900">⚠️ Attenzione: {getCriticalJobs().length} import bloccati da più di 5 minuti</p>
                <p className="text-sm text-red-700">Intervento manuale richiesto</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-sm text-gray-600">Totale Import</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{jobs.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">In Elaborazione</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">
              {jobs.filter((j: any) => j.status === 'processing').length}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">Completati Oggi</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {jobs.filter((j: any) => j.status === 'completed' && new Date(j.completedAt).toDateString() === new Date().toDateString()).length}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-600">Falliti</div>
            <div className="text-2xl font-bold text-red-600 mt-1">
              {jobs.filter((j: any) => j.status === 'failed').length}
            </div>
          </Card>
        </div>

        {/* Jobs List */}
        <div className="space-y-4">
          {loading ? (
            <Card className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Caricamento...</p>
            </Card>
          ) : jobs.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-gray-600">Nessun import attivo</p>
            </Card>
          ) : (
            jobs.map((job: any) => (
              <Card key={job.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(job.status)}`}>
                        {job.status.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-600">Tenant: {job.tenant?.name || job.tenantId}</span>
                      <span className="text-sm text-gray-500">ID: {job.id.substring(0, 8)}</span>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900">{job.fileName}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Tipo: {job.targetEntity} • Creato: {new Date(job.createdAt).toLocaleString('it-IT')}
                    </p>

                    {/* Progress Bar */}
                    {job.status === 'processing' && (
                      <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Elaborazione: Riga {job.stats.processedRows} / {job.stats.totalRows}</span>
                          <span>{Math.round((job.stats.processedRows / job.stats.totalRows) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-blue-600 h-3 rounded-full transition-all"
                            style={{ width: `${(job.stats.processedRows / job.stats.totalRows) * 100}%` }}
                          />
                        </div>
                        {job.currentRow && (
                          <div className="mt-2 text-xs text-gray-500">
                            Ultima riga elaborata: #{job.currentRow.number} - {job.currentRow.status}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Stats */}
                    {(job.status === 'completed' || job.stats.processedRows > 0) && (
                      <div className="mt-4 flex space-x-6 text-sm">
                        <div className="text-green-600">
                          ✓ {job.stats.successfulRows} successi
                        </div>
                        {job.stats.failedRows > 0 && (
                          <div className="text-red-600">
                            ✗ {job.stats.failedRows} fallite
                          </div>
                        )}
                        <div className="text-gray-600">
                          {job.stats.createdPractices} pratiche • {job.stats.createdCustomers} clienti
                        </div>
                      </div>
                    )}

                    {/* Error Info */}
                    {job.errorLog && job.errorLog.length > 0 && (
                      <div className="mt-4 bg-red-50 border border-red-200 rounded p-3">
                        <p className="text-sm font-medium text-red-800">Ultimo errore:</p>
                        <p className="text-xs text-red-700 mt-1">
                          Riga {job.errorLog[job.errorLog.length - 1].row}: {job.errorLog[job.errorLog.length - 1].error}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="ml-6 flex flex-col space-y-2">
                    {job.status === 'processing' && (
                      <>
                        <Button
                          onClick={() => handlePauseJob(job.id)}
                          disabled={actionLoading}
                          className="bg-orange-600 hover:bg-orange-700 text-white text-sm"
                        >
                          ⏸️ Pausa
                        </Button>
                        {job.errorLog && job.errorLog.length > 0 && (
                          <Button
                            onClick={() => handleSkipRow(job.id, job.errorLog[job.errorLog.length - 1].row)}
                            disabled={actionLoading}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm"
                          >
                            ⏭️ Skip Riga
                          </Button>
                        )}
                        <Button
                          onClick={() => handleRollback(job.id, 'partial')}
                          disabled={actionLoading}
                          className="bg-red-600 hover:bg-red-700 text-white text-sm"
                        >
                          🛑 Annulla
                        </Button>
                      </>
                    )}
                    
                    {job.status === 'paused' && (
                      <Button
                        onClick={() => handleResumeJob(job.id)}
                        disabled={actionLoading}
                        className="bg-green-600 hover:bg-green-700 text-white text-sm"
                      >
                        ▶️ Riprendi
                      </Button>
                    )}

                    {(job.status === 'completed' || job.status === 'failed') && job.stats.createdPractices > 0 && (
                      <Button
                        onClick={() => handleRollback(job.id, 'full')}
                        disabled={actionLoading}
                        className="bg-red-600 hover:bg-red-700 text-white text-sm"
                      >
                        🔙 Rollback
                      </Button>
                    )}

                    <Button
                      onClick={() => setSelectedJob(job)}
                      variant="ghost"
                      className="text-sm"
                    >
                      👁️ Dettagli
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Dettagli Import</h2>
                <button onClick={() => setSelectedJob(null)} className="text-gray-500 hover:text-gray-700">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Tenant</p>
                  <p className="font-medium">{selectedJob.tenant?.name || selectedJob.tenantId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">File</p>
                  <p className="font-medium">{selectedJob.fileName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tipo</p>
                  <p className="font-medium">{selectedJob.targetEntity}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Stato</p>
                  <p className="font-medium">{selectedJob.status}</p>
                </div>
              </div>

              {/* Error Log */}
              {selectedJob.errorLog && selectedJob.errorLog.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Log Errori ({selectedJob.errorLog.length})</h3>
                  <div className="bg-gray-50 rounded p-4 max-h-60 overflow-y-auto">
                    {selectedJob.errorLog.map((err: any, idx: number) => (
                      <div key={idx} className="text-sm mb-2 pb-2 border-b border-gray-200">
                        <span className="font-medium text-red-600">Riga {err.row}:</span> {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mapping Config */}
              {selectedJob.mappingConfig && (
                <div>
                  <h3 className="font-semibold mb-2">Configurazione Mapping</h3>
                  <pre className="bg-gray-50 rounded p-4 text-xs overflow-x-auto">
                    {JSON.stringify(selectedJob.mappingConfig, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}