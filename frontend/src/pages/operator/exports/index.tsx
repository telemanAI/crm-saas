import { useState } from 'react';
import { Layout } from '../../../components/layout/Layout';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import axios from '../../../lib/axios';

export default function ExportsPage() {
  const [exportType, setExportType] = useState<'practices' | 'customers'>('practices');
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: [] as string[],
    type: [] as string[],
  });
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const endpoint = exportType === 'practices' ? '/api/exports/practices' : '/api/exports/customers';
      
      const response = await axios.post(
        endpoint,
        { filters, format },
        { responseType: 'blob' }
      );

      // Download file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `export_${exportType}_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Errore export:', error);
      alert('Errore durante l\'export');
    } finally {
      setExporting(false);
    }
  };

  const statusOptions = [
    { value: 'draft', label: 'Bozza' },
    { value: 'in_progress', label: 'In Lavorazione' },
    { value: 'completed', label: 'Completata' },
    { value: 'cancelled', label: 'Annullata' },
  ];

  const typeOptions = [
    { value: 'SKY', label: 'Sky' },
    { value: 'TIM_FIBRA', label: 'TIM Fibra' },
    { value: 'VODAFONE', label: 'Vodafone' },
    { value: 'WINDTRE', label: 'WindTre' },
    { value: 'ILIAD', label: 'Iliad' },
    { value: 'OPTIMA', label: 'Optima' },
    { value: 'IREN', label: 'Iren' },
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Esportazione Dati</h1>
          <p className="text-gray-600 mt-1">Esporta i tuoi dati in Excel o CSV</p>
        </div>

        <Card className="p-8">
          <div className="space-y-6">
            {/* Tipo Export */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Cosa vuoi esportare?
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setExportType('practices')}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    exportType === 'practices'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="text-3xl mb-2">📋</div>
                  <div className="font-semibold">Pratiche</div>
                  <div className="text-sm text-gray-600">Esporta tutte le pratiche</div>
                </button>
                <button
                  onClick={() => setExportType('customers')}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    exportType === 'customers'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="text-3xl mb-2">👥</div>
                  <div className="font-semibold">Clienti</div>
                  <div className="text-sm text-gray-600">Esporta anagrafica clienti</div>
                </button>
              </div>
            </div>

            {/* Formato */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Formato File
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value="xlsx"
                    checked={format === 'xlsx'}
                    onChange={(e) => setFormat(e.target.value as any)}
                  />
                  <span>Excel (.xlsx)</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={format === 'csv'}
                    onChange={(e) => setFormat(e.target.value as any)}
                  />
                  <span>CSV (.csv)</span>
                </label>
              </div>
            </div>

            {/* Filtri (solo per pratiche) */}
            {exportType === 'practices' && (
              <>
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Filtri (Opzionale)</h3>
                  
                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data Da
                      </label>
                      <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Data A
                      </label>
                      <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stato
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {statusOptions.map((opt) => (
                        <label key={opt.value} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={filters.status.includes(opt.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilters({ ...filters, status: [...filters.status, opt.value] });
                              } else {
                                setFilters({ ...filters, status: filters.status.filter(s => s !== opt.value) });
                              }
                            }}
                          />
                          <span className="text-sm">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo Pratica
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {typeOptions.map((opt) => (
                        <label key={opt.value} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={filters.type.includes(opt.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilters({ ...filters, type: [...filters.type, opt.value] });
                              } else {
                                setFilters({ ...filters, type: filters.type.filter(t => t !== opt.value) });
                              }
                            }}
                          />
                          <span className="text-sm">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Export Button */}
            <div className="pt-6 border-t">
              <Button
                onClick={handleExport}
                disabled={exporting}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 disabled:bg-gray-300"
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Esportazione in corso...
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Scarica Export
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1 text-sm text-blue-800">
              <p className="font-medium">Suggerimenti</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>L'export include tutti i dati visibili nel CRM</li>
                <li>Usa i filtri per esportare solo dati specifici</li>
                <li>Il formato Excel mantiene la formattazione</li>
                <li>Il formato CSV è più leggero e universale</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}