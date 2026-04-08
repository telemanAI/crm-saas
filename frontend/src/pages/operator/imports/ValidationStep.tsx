import { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/Button';
import axios from '../../../lib/axios';

interface Props {
  jobId: string;
  tenantId: string;  // ✅ AGGIUNTO
  mappingConfig: any;
  fileName: string;
  totalRows: number;
  onComplete: () => void;
  onBack: () => void;
  onCancel: () => void;
}

export default function ValidationStep({ 
  jobId, 
  tenantId,  // ✅ AGGIUNTO
  mappingConfig, 
  fileName, 
  totalRows,
  onComplete, 
  onBack, 
  onCancel 
}: Props) {
  const [validating, setValidating] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'valid' | 'warnings' | 'errors'>('valid');

  useEffect(() => {
    validateImport();
  }, []);

  const validateImport = async () => {
    try {
      const response = await axios.post(`/imports/${jobId}/validate`, {
        mappingConfig 
      }, {
        params: { tenantId }  // ✅ AGGIUNTO
      });
      
      // Fix per summary mancante
      const results = response.data.validationResults || response.data;
      if (!results.summary && results.preview) {
        results.summary = {
          totalCustomers: results.preview.length,
          customersWithPractice: results.preview.filter((r: any) => r.data?.hasPractice).length,
          onlyCustomers: results.preview.filter((r: any) => !r.data?.hasPractice).length,
        };
      }
      
      setValidationResults(results);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore validazione');
    } finally {
      setValidating(false);
    }
  };

  // ✅ FIX EXECUTE: Aggiunto params tenantId
  const handleExecute = async () => {
    setExecuting(true);
    setError(null);
    
    try {
      await axios.post('/imports/execute', {
        jobId,
      }, {
        params: { tenantId }  // ✅ AGGIUNTO
      });
      
      onComplete();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore durante l\'importazione');
    } finally {
      setExecuting(false);
    }
  };

  if (validating) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Validazione in corso...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800">{error}</p>
        <Button onClick={onBack} className="mt-4">Torna indietro</Button>
      </div>
    );
  }

  const results = validationResults || {};
  const hasErrors = (results.errors || 0) > 0;
  const hasWarnings = (results.warnings || 0) > 0;

  // Filtra le righe in base al tab selezionato
  const filteredRows = results.preview?.filter((row: any) => {
    if (selectedTab === 'valid') return row.valid && (row.warnings?.length === 0);
    if (selectedTab === 'warnings') return row.valid && (row.warnings?.length > 0);
    if (selectedTab === 'errors') return !row.valid;
    return true;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-700">{results.valid || 0}</div>
          <div className="text-sm text-green-600">Valide</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-700">{results.warnings || 0}</div>
          <div className="text-sm text-yellow-600">Warning</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-700">{results.errors || 0}</div>
          <div className="text-sm text-red-600">Errori</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-700">
            {results?.summary?.totalCustomers || results?.preview?.length || 0}
          </div>
          <div className="text-sm text-blue-600">Clienti Totali</div>
        </div>
      </div>

      {hasErrors && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start text-red-800 text-sm">
          <svg className="h-5 w-5 mr-2 mt-0.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-semibold">Ci sono {results.errors} errori da correggere</p>
            <p className="mt-1">Vai alla tab "Errori" qui sotto per vedere i dettagli e correggere il mapping.</p>
          </div>
        </div>
      )}

      {/* ✅ TABS per filtrare */}
      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setSelectedTab('valid')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            selectedTab === 'valid' 
              ? 'border-green-500 text-green-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          ✅ Valide ({results.valid || 0})
        </button>
        <button
          onClick={() => setSelectedTab('warnings')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            selectedTab === 'warnings' 
              ? 'border-yellow-500 text-yellow-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          ⚠️ Warning ({results.warnings || 0})
        </button>
        <button
          onClick={() => setSelectedTab('errors')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            selectedTab === 'errors' 
              ? 'border-red-500 text-red-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          ❌ Errori ({results.errors || 0})
        </button>
      </div>

      {/* Preview Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-900">
            {selectedTab === 'valid' ? 'Righe Valide' : selectedTab === 'warnings' ? 'Righe con Warning' : 'Righe con Errori'}
          </h3>
          <span className="text-xs text-gray-500">Prime 100 righe</span>
        </div>
        
        <div className="max-h-96 overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Riga</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Stato</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Dettagli</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Cliente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRows.map((row: any, idx: number) => (
                <tr key={idx} className={!row.valid ? 'bg-red-50' : row.warnings?.length > 0 ? 'bg-yellow-50' : ''}>
                  <td className="px-4 py-2 text-sm text-gray-900">{row.rowNumber}</td>
                  <td className="px-4 py-2">
                    {!row.valid ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        Errore
                      </span>
                    ) : row.warnings?.length > 0 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        Warning
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        OK
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {row.errors?.map((e: string, i: number) => (
                      <div key={i} className="text-red-600 text-xs">❌ {e}</div>
                    ))}
                    {row.warnings?.map((w: string, i: number) => (
                      <div key={i} className="text-yellow-600 text-xs">⚠️ {w}</div>
                    ))}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {row.data?.firstName} {row.data?.lastName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between pt-6 border-t">
        <div className="flex space-x-3">
          <Button onClick={onCancel} variant="ghost">Annulla</Button>
          <Button onClick={onBack} variant="outline">← Modifica mapping</Button>
        </div>
        
        <Button 
          onClick={handleExecute} 
          disabled={hasErrors || executing}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8"
        >
          {executing ? 'Importazione in corso...' : 'Conferma Importazione →'}
        </Button>
      </div>
    </div>
  );
}