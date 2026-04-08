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

export default function ValidationStep({ jobId, tenantId, mappingConfig, fileName, totalRows, onComplete, onBack, onCancel }: Props) {  // ✅ AGGIUNTO tenantId
  const [validating, setValidating] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState<'valid' | 'warnings' | 'errors'>('valid');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    validateImport();
  }, []);

  const validateImport = async () => {
    try {
      const response = await axios.post(`/imports/${jobId}/validate`, {
  mappingConfig: mappingConfig 
      }, {
        params: { tenantId: tenantId }  // ✅ AGGIUNTO
      });
      setValidationResults(response.data.validationResults || response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore durante la validazione');
    } finally {
      setValidating(false);
    }
  };

  const executeImport = async () => {
    if (!confirm(`Sei sicuro di voler importare ${totalRows} righe?`)) {
      return;
    }

    setExecuting(true);
    setError(null);

    try {
      await axios.post('/imports/execute', {  // ✅ Tolto /api se necessario, usa lo stesso pattern degli altri
        jobId 
      }, {
        params: { tenantId }  // ✅ AGGIUNTO per supporto SuperAdmin
      });
      onComplete();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore durante l\'importazione');
      setExecuting(false);
    }
  };

  const getFilteredPreview = () => {
    if (!validationResults?.preview) return [];
    
    return validationResults.preview.filter((row: any) => {
      if (selectedTab === 'valid') return row.valid && row.warnings.length === 0;
      if (selectedTab === 'warnings') return row.warnings.length > 0;
      if (selectedTab === 'errors') return !row.valid;
      return true;
    });
  };

  if (validating) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
        <h3 className="mt-4 text-lg font-semibold text-gray-900">Validazione in corso...</h3>
        <p className="text-gray-600 mt-2">Stiamo verificando i dati prima dell'importazione</p>
      </div>
    );
  }

  if (error && !validationResults) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="mt-4 text-lg font-semibold text-gray-900">Errore di validazione</h3>
        <p className="text-gray-600 mt-2">{error}</p>
        <div className="mt-6 space-x-3">
          <Button onClick={onBack}>← Torna al Mapping</Button>
          <Button onClick={validateImport} variant="ghost">Riprova</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">3. Verifica i dati</h2>
        <p className="text-gray-600">Controlla i risultati della validazione prima di procedere</p>
      </div>

      {/* Stats Preview */}
      {validationResults?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-slate-900">{validationResults.summary.totalCustomers || 0}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Clienti Totali</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">{validationResults.summary.customersWithPractice || 0}</div>
            <div className="text-xs text-blue-600 uppercase tracking-wide mt-1">Con Pratica</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-700">{validationResults.summary.onlyCustomers || 0}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">Solo Anagrafica</div>
          </div>
          <div className={`rounded-xl p-4 text-center border ${
            validationResults.errors === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className={`text-2xl font-bold ${validationResults.errors === 0 ? 'text-green-700' : 'text-red-700'}`}>
              {validationResults.errors === 0 ? '✓' : validationResults.errors || 0}
            </div>
            <div className={`text-xs uppercase tracking-wide mt-1 ${validationResults.errors === 0 ? 'text-green-600' : 'text-red-600'}`}>
              {validationResults.errors === 0 ? 'Pronto' : 'Errori'}
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      {validationResults?.errors > 0 ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <svg className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Attenzione! Ci sono errori bloccanti</p>
            <p className="text-sm text-red-700 mt-1">
              {validationResults.errors} righe contengono errori che impediscono l'importazione. Correggi il file o torna al mapping per modificare le impostazioni.
            </p>
          </div>
        </div>
      ) : validationResults?.warnings > 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
          <svg className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800">Ci sono alcuni warning</p>
            <p className="text-sm text-yellow-700 mt-1">
              {validationResults.warnings} righe hanno warning (es. campi opzionali mancanti). L'importazione può procedere, ma verifica i dati.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
          <svg className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">Tutto pronto per l'importazione!</p>
            <p className="text-sm text-green-700 mt-1">
              Tutte le {validationResults?.valid || 0} righe sono valide e pronte per essere importate.
            </p>
          </div>
        </div>
      )}

      {/* Preview Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            Anteprima {selectedTab === 'valid' ? 'Righe Valide' : selectedTab === 'warnings' ? 'Warning' : 'Errori'}
          </h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {getFilteredPreview().length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nessuna riga in questa categoria
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Riga
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dati
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Note
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getFilteredPreview().slice(0, 20).map((row: any) => (
                  <tr key={row.rowNumber} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{row.rowNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {row.valid && row.warnings.length === 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Valido
                        </span>
                      )}
                      {row.warnings.length > 0 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          ⚠ Warning
                        </span>
                      )}
                      {!row.valid && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          ✗ Errore
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="space-y-1">
                        {row.data.firstName && <div><span className="font-medium">Nome:</span> {row.data.firstName}</div>}
                        {row.data.lastName && <div><span className="font-medium">Cognome:</span> {row.data.lastName}</div>}
                        {row.data.fiscalCode && <div><span className="font-medium">CF:</span> {row.data.fiscalCode}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {row.errors.length > 0 && (
                        <div className="space-y-1">
                          {row.errors.map((err: string, idx: number) => (
                            <div key={idx} className="text-red-600 text-xs">• {err}</div>
                          ))}
                        </div>
                      )}
                      {row.warnings.length > 0 && (
                        <div className="space-y-1">
                          {row.warnings.map((warn: string, idx: number) => (
                            <div key={idx} className="text-yellow-600 text-xs">• {warn}</div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {getFilteredPreview().length > 20 && (
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 text-sm text-gray-600 text-center">
            Mostrate prime 20 righe di {getFilteredPreview().length}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <svg className="h-5 w-5 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-6 border-t">
        <Button onClick={onBack} variant="ghost" disabled={executing}>
          ← Indietro
        </Button>
        <div className="flex space-x-3">
          <Button onClick={onCancel} variant="ghost" disabled={executing}>
            Annulla
          </Button>
          <Button
            onClick={executeImport}
            disabled={validationResults?.errors > 0 || executing}
            className="bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300"
          >
            {executing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Importazione in corso...
              </>
            ) : (
              <>✓ Conferma e Importa</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}