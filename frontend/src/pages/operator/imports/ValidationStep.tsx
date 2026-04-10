import { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/Button';
import axios from '../../../lib/axios';

interface Props {
  jobId: string;
  tenantId: string;
  mappingConfig: any;
  fileName: string;
  totalRows: number;
  onComplete: () => void;
  onBack: () => void;
  onCancel: () => void;
}

interface RowCorrection {
  rowNumber: number;
  originalData: any;
  correctedData: any;
  skipped: boolean;
}

export default function ValidationStep({ 
  jobId, 
  tenantId,
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
  
  // 🔥 STATO per modifica inline
  const [editingRow, setEditingRow] = useState<any>(null);
  const [rowCorrections, setRowCorrections] = useState<Record<number, RowCorrection>>({});
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    validateImport();
  }, []);

  const validateImport = async () => {
    try {
      const response = await axios.post(`/imports/${jobId}/validate`, {
        mappingConfig,
        rowCorrections: Object.values(rowCorrections) // Passa le correzioni al backend
      }, {
        params: { tenantId }
      });
      
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

  const handleExecute = async () => {
    setExecuting(true);
    setError(null);
    
    try {
      await axios.post('/imports/execute', {
        jobId,
        rowCorrections: Object.values(rowCorrections) // Passa le correzioni all'import
      }, {
        params: { tenantId }
      });
      
      onComplete();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore durante l\'importazione');
    } finally {
      setExecuting(false);
    }
  };

  // 🔥 APRI MODAL MODIFICA
  const openEditModal = (row: any) => {
    const existingCorrection = rowCorrections[row.rowNumber];
    setEditingRow({
      ...row,
      editData: existingCorrection?.correctedData || { ...row.data }
    });
    setShowEditModal(true);
  };

  // 🔥 SALVA MODIFICHE
  const saveRowEdit = () => {
    if (!editingRow) return;
    
    setRowCorrections(prev => ({
      ...prev,
      [editingRow.rowNumber]: {
        rowNumber: editingRow.rowNumber,
        originalData: editingRow.data,
        correctedData: editingRow.editData,
        skipped: false
      }
    }));
    
    setShowEditModal(false);
    setEditingRow(null);
    
    // Rivalida con le nuove correzioni
    setValidating(true);
    validateImport();
  };

  // 🔥 SALTA RIGA
  const skipRow = (rowNumber: number) => {
    setRowCorrections(prev => ({
      ...prev,
      [rowNumber]: {
        rowNumber,
        originalData: null,
        correctedData: null,
        skipped: true
      }
    }));
    
    // Rivalida
    setValidating(true);
    validateImport();
  };

  // 🔥 ANNULLA MODIFICA
  const cancelRowEdit = () => {
    setShowEditModal(false);
    setEditingRow(null);
  };

  // 🔥 CAMPO INPUT PER MODIFICA
  const updateEditField = (field: string, value: any) => {
    setEditingRow((prev: any) => ({
      ...prev,
      editData: {
        ...prev.editData,
        [field]: value
      }
    }));
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
  const skippedCount = Object.values(rowCorrections).filter(c => c.skipped).length;

  // Filtra le righe (escludi quelle saltate)
  const filteredRows = results.preview?.filter((row: any) => {
    if (rowCorrections[row.rowNumber]?.skipped) return false;
    if (selectedTab === 'valid') return row.valid && (row.warnings?.length === 0);
    if (selectedTab === 'warnings') return row.valid && (row.warnings?.length > 0);
    if (selectedTab === 'errors') return !row.valid;
    return true;
  }) || [];

  // Campi editabili
  const editableFields = [
    { key: 'firstName', label: 'Nome' },
    { key: 'lastName', label: 'Cognome' },
    { key: 'fiscalCode', label: 'Codice Fiscale' },
    { key: 'email', label: 'Email' },
    { key: 'phonePrimary', label: 'Telefono' },
    { key: 'type', label: 'Tipo Pratica' },
    { key: 'offerName', label: 'Nome Offerta' },
    { key: 'wash', label: 'WASH' },
    { key: 'iban', label: 'IBAN' },
    { key: 'appointmentData', label: 'Appuntamento' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
        {skippedCount > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-700">{skippedCount}</div>
            <div className="text-sm text-gray-600">Saltate</div>
          </div>
        )}
        <div className={`bg-blue-50 p-4 rounded-lg text-center ${skippedCount > 0 ? '' : 'col-span-2 md:col-span-1'}`}>
          <div className="text-2xl font-bold text-blue-700">
            {(results?.summary?.totalCustomers || results?.preview?.length || 0) - skippedCount}
          </div>
          <div className="text-sm text-blue-600">Da Importare</div>
        </div>
      </div>

      {hasErrors && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start text-red-800 text-sm">
          <svg className="h-5 w-5 mr-2 mt-0.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-semibold">Ci sono {results.errors} errori da correggere</p>
            <p className="mt-1">Clicca su "Modifica" per correggere la riga, o "Salta" per ignorarla.</p>
          </div>
        </div>
      )}

      {/* TABS */}
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
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Azioni</th>
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
                    {rowCorrections[row.rowNumber]?.correctedData ? (
                      <span className="text-blue-600">
                        {rowCorrections[row.rowNumber].correctedData.firstName} {rowCorrections[row.rowNumber].correctedData.lastName}
                        <span className="text-xs block">(modificato)</span>
                      </span>
                    ) : (
                      <span>{row.data?.firstName} {row.data?.lastName}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(row)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        ✏️ Modifica
                      </button>
                      {!row.valid && (
                        <button
                          onClick={() => skipRow(row.rowNumber)}
                          className="text-gray-500 hover:text-gray-700 text-xs font-medium"
                        >
                          ⏭️ Salta
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🔥 MODAL MODIFICA */}
      {showEditModal && editingRow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Modifica Riga {editingRow.rowNumber}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Correggi i dati e clicca "Salva" per applicare le modifiche.
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Errori evidenziati */}
              {editingRow.errors?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm font-medium text-red-800 mb-2">⚠️ Errori da correggere:</p>
                  {editingRow.errors.map((e: string, i: number) => (
                    <div key={i} className="text-red-600 text-xs">• {e}</div>
                  ))}
                </div>
              )}
              
              {/* Campi editabili */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {editableFields.map((field) => {
                  const hasError = editingRow.errors?.some((e: string) => 
                    e.toLowerCase().includes(field.label.toLowerCase()) ||
                    e.toLowerCase().includes(field.key.toLowerCase())
                  );
                  
                  return (
                    <div key={field.key} className={hasError ? 'bg-red-50 p-2 rounded' : ''}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                        {hasError && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <input
                        type="text"
                        value={editingRow.editData?.[field.key] || ''}
                        onChange={(e) => updateEditField(field.key, e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm ${
                          hasError 
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                        placeholder={field.label}
                      />
                      {hasError && (
                        <p className="text-xs text-red-500 mt-1">
                          ⚠️ Verifica questo campo
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
              <Button onClick={cancelRowEdit} variant="ghost">
                Annulla
              </Button>
              <Button onClick={saveRowEdit} className="bg-blue-600 hover:bg-blue-700 text-white">
                💾 Salva Modifiche
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-6 border-t">
        <div className="flex space-x-3">
          <Button onClick={onCancel} variant="ghost">Annulla</Button>
          <Button onClick={onBack} className="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
            ← Modifica mapping
          </Button>
        </div>
        
        <Button 
          onClick={handleExecute} 
          disabled={hasErrors || executing}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8"
        >
          {executing ? 'Importazione in corso...' : `Conferma Importazione →`}
        </Button>
      </div>
    </div>
  );
}