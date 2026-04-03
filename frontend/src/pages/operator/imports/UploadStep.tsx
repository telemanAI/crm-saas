import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import axios from '../../../lib/axios';

interface Props {
  onComplete: (data: any) => void;
  onCancel: () => void;
}

export default function UploadStep({ onComplete, onCancel }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (droppedFile) validateAndSetFile(droppedFile);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExt)) {
      setError('Formato non valido. Usa Excel o CSV.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File troppo grande (max 10MB)');
      return;
    }
    setFile(file);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Seleziona un file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetEntity', 'UNIFIED_IMPORT');

      const response = await axios.post('/api/imports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { job } = response.data;
      const previewResponse = await axios.get(`/api/imports/${job.id}/preview`);
      
      onComplete({
        jobId: job.id,
        targetEntity: 'UNIFIED_IMPORT',
        fileName: file.name,
        headers: previewResponse.data.headers,
        previewRows: previewResponse.data.previewRows,
        totalRows: previewResponse.data.totalRows,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore caricamento');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-slate-50 to-gray-100 border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Importazione Intelligente</h2>
        <p className="text-gray-600 leading-relaxed">
          Carica il tuo file Excel. Il sistema riconosce automaticamente:
          <span className="block mt-2 ml-4 text-sm text-gray-500 space-y-1">
            <span className="flex items-center"><span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>Clienti (nome, cognome, CF/Email/Tel)</span>
            <span className="flex items-center"><span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>Pratiche (se presenti colonna "Tipo" e "Offerta")</span>
            <span className="flex items-center"><span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>Duplicati (aggiorna cliente se già esistente)</span>
          </span>
        </p>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all bg-white ${
          dragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input type="file" id="file-upload" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} />
        
        {!file ? (
          <>
            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <label htmlFor="file-upload" className="cursor-pointer block">
              <span className="text-blue-600 hover:text-blue-700 font-semibold text-lg">Carica file</span>
              <span className="text-gray-500"> o trascina qui</span>
            </label>
            <p className="text-sm text-gray-400 mt-2">Excel o CSV, max 10MB</p>
          </>
        ) : (
          <div className="flex items-center justify-center space-x-4">
            <div className="bg-green-100 p-3 rounded-full">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
            </div>
            <button onClick={() => setFile(null)} className="text-gray-400 hover:text-red-500 p-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center text-red-800 text-sm">
          <svg className="h-5 w-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      <div className="flex justify-between pt-6 border-t">
        <Button onClick={onCancel} variant="ghost">Annulla</Button>
        <Button onClick={handleUpload} disabled={!file || uploading} className="bg-slate-900 hover:bg-slate-800 text-white px-8">
          {uploading ? 'Analisi...' : 'Continua →'}
        </Button>
      </div>
    </div>
  );
}