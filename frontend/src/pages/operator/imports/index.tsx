import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '../../../components/layout/Layout';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import axios from '../../../lib/axios';

export default function ImportsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const response = await axios.get('/api/imports/jobs');
      setJobs(response.data.jobs);
    } catch (error) {
      console.error('Errore caricamento import:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getEntityLabel = (entity: string) => {
    const labels = {
      CUSTOMER_ONLY: '👤 Solo Clienti',
      FIXED_LINE_PRACTICE: '📡 Pratiche Linea Fissa',
      MOBILE_PRACTICE: '📱 Pratiche Mobile',
      ENERGY_PRACTICE: '⚡ Pratiche Energia',
    };
    return labels[entity] || entity;
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Importazioni</h1>
            <p className="text-gray-600 mt-1">Gestisci le tue importazioni dati</p>
          </div>
          <Button
            onClick={() => router.push('/operator/imports/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            + Nuova Importazione
          </Button>
        </div>

        {/* Jobs List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Caricamento...</p>
          </div>
        ) : jobs.length === 0 ? (
          <Card className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nessuna importazione</h3>
            <p className="mt-1 text-sm text-gray-500">Inizia caricando un file Excel o CSV</p>
            <div className="mt-6">
              <Button onClick={() => router.push('/operator/imports/new')}>
                Nuova Importazione
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((job: any) => (
              <Card key={job.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/operator/imports/${job.id}`)}>
                <div className="flex items-center justify-between p-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{getEntityLabel(job.targetEntity).split(' ')[0]}</div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{job.fileName}</h3>
                        <p className="text-sm text-gray-500">{getEntityLabel(job.targetEntity).split(' ').slice(1).join(' ')}</p>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    {job.status === 'processing' && (
                      <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Elaborazione in corso...</span>
                          <span>{job.stats.processedRows} / {job.stats.totalRows}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${(job.stats.processedRows / job.stats.totalRows) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Stats */}
                    {job.status === 'completed' && (
                      <div className="mt-4 flex space-x-6 text-sm">
                        <div className="flex items-center text-green-600">
                          <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>{job.stats.successfulRows} riuscite</span>
                        </div>
                        {job.stats.failedRows > 0 && (
                          <div className="flex items-center text-red-600">
                            <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <span>{job.stats.failedRows} fallite</span>
                          </div>
                        )}
                        <div className="text-gray-600">
                          {job.stats.createdPractices > 0 && <span>{job.stats.createdPractices} pratiche create</span>}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(job.status)}`}>
                      {job.status === 'pending' && 'In Attesa'}
                      {job.status === 'processing' && 'Elaborazione'}
                      {job.status === 'completed' && 'Completato'}
                      {job.status === 'failed' && 'Fallito'}
                      {job.status === 'cancelled' && 'Annullato'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(job.createdAt).toLocaleDateString('it-IT', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}