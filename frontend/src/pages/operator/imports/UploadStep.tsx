import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import axios from '../../../lib/axios';

interface Props {
  onComplete: (data: any) => void;
  onCancel: () => void;
}

export default function UploadStep({ onComplete, onCancel }: Props) {
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entities = [
    {
      id: 'CUSTOMER_ONLY',
      icon: '👤',
      name: 'Solo Anagrafica Clienti',
      description: 'Importa solo i dati dei clienti senza creare pratiche',
    },
    {
      id: 'FIXED_LINE_PRACTICE',
      icon: '📡',
      name: 'Pratiche Linea Fissa',
      description: 'Sky, TIM, Vodafone, WindTre (con indirizzo installazione)',
    },
    {
      id: 'MOBILE_PRACTICE',
      icon: '📱',
      name: 'Pratiche Mobile',
      description: 'SIM, Portabilità, Ricaricabili (con ICCID)',
      disabled: true,
    },
    {
      id: 'ENERGY_PRACTICE',
      icon: '⚡',
      name: 'Pratiche Luce & Gas',
      description: 'Subentri, Attivazioni (con POD/PDR)',
      disabled: true,
    },
  ];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    
    // Verifica estensione
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExt)) {
      setError('Formato file non valido. Usa Excel (.xlsx, .xls) o CSV.');
      return;
    }

    // Verifica dimensione (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File troppo grande. Dimensione massima: 10MB');
      return;
    }

    setFile(file);
  };

  const handleUpload = async () => {
    if (!selectedEntity) {
      setError('Seleziona il tipo di importazione');
      return;
    }

    if (!file) {
      setError('Seleziona un file da caricare');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetEntity', selectedEntity);

      const response = await axios.post('/api/imports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { job } = response.data;

      // Ottieni preview
      const previewResponse = await axios.get(`/api/imports/${job.id}/preview`);
      
      onComplete({
        jobId: job.id,
        targetEntity: selectedEntity,
        fileName: file.name,
        headers: previewResponse.data.headers,
        previewRows: previewResponse.data.previewRows,
        totalRows: previewResponse.data.totalRows,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore durante il caricamento');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Selezione Tipo */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Seleziona il tipo di importazione</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entities.map((entity) => (
            <button
              key={entity.id}
              onClick={() => !entity.disabled && setSelectedEntity(entity.id)}
              disabled={entity.disabled}
              className={`relative p-6 text-left border-2 rounded-lg transition-all ${
                selectedEntity === entity.id
                  ? 'border-blue-500 bg-blue-50'
                  : entity.disabled
                  ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              {entity.disabled && (
                <span className="absolute top-2 right-2 px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded">
                  Presto disponibile
                </span>
              )}
              <div className="flex items-start space-x-4">
                <div className="text-4xl">{entity.icon}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{entity.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{entity.description}</p>
                </div>
              </div>
              {selectedEntity === entity.id && (
                <div className="absolute top-2 right-2">
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Upload File */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Carica il file</h2>
        
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
          />
          
          {!file ? (
            <>
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="mt-4">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-500 font-medium">Carica un file</span>
                  <span className="text-gray-600"> o trascina qui</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">Excel (.xlsx, .xls) o CSV fino a 10MB</p>
            </>
          ) : (
            <div className="flex items-center justify-center space-x-3">
              <svg className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="text-left">
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                className="text-red-600 hover:text-red-800"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
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
        <Button onClick={onCancel} variant="outline">
          Annulla
        </Button>
        <Button
          onClick={handleUpload}
          disabled={!selectedEntity || !file || uploading}
          className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300"
        >
          {uploading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Caricamento...
            </>
          ) : (
            'Continua →'
          )}
        </Button>
      </div>
    </div>
  );
}