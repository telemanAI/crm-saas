import { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/Button';
import axios from '../../../lib/axios';

interface TargetField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  category: 'customer' | 'practice';
}

interface Props {
  jobId: string;
  headers: string[];
  previewRows: any[];
  targetEntity: string;
  fileFormat?: 'flat' | 'relational';
  onComplete: (data: any) => void;
  onBack: () => void;
  onCancel: () => void;
}

export default function MappingStep({ jobId, headers, previewRows, targetEntity, fileFormat, onComplete, onBack, onCancel }: Props) {
 const [targetFields, setTargetFields] = useState<TargetField[]>([]);
  const [mapping, setMapping] = useState<any>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<'SKIP' | 'UPDATE' | 'CREATE_NEW'>('UPDATE');
  const [autoMapped, setAutoMapped] = useState(false);
  const [transformers, setTransformers] = useState<any>({});

  useEffect(() => {
    loadTargetFields();
    autoMapColumns();
  }, []);

  const loadTargetFields = async () => {
    try {
const response = await axios.get(`/imports/fields/UNIFIED_IMPORT`);
     setTargetFields(response.data.fields as TargetField[]);
    } catch (error) {
      console.error('Errore caricamento campi:', error);
    }
  };

  const autoMapColumns = () => {
    const newMapping: any = {};
    const newTransformers: any = {};

    headers.forEach((header) => {
      const normalized = header.toLowerCase().trim();
      
      if (normalized.includes('nome') && !normalized.includes('cognome')) {
        newMapping[header] = 'firstName';
      } else if (normalized.includes('cognome')) {
        newMapping[header] = 'lastName';
      } else if (normalized.includes('codice') && normalized.includes('fiscal')) {
        newMapping[header] = 'fiscalCode';
        newTransformers[header] = 'uppercase';
      } else if (normalized.includes('cf')) {
        newMapping[header] = 'fiscalCode';
        newTransformers[header] = 'uppercase';
      } else if (normalized.includes('telefono') || normalized.includes('phone')) {
        newMapping[header] = 'phonePrimary';
        newTransformers[header] = 'normalize_phone';
      } else if (normalized.includes('email') || normalized.includes('mail')) {
        newMapping[header] = 'email';
      } else if (normalized.includes('tipo') && normalized.includes('pratica')) {
        newMapping[header] = 'type';
        newTransformers[header] = 'uppercase';
      } else if (normalized.includes('offerta')) {
        newMapping[header] = 'offerName';
      } else if (normalized.includes('canone') || normalized.includes('prezzo')) {
        newMapping[header] = 'offerCanone';
        newTransformers[header] = 'extract_price';
      } else if (normalized.includes('tecnologia') || normalized.includes('tech')) {
        newMapping[header] = 'technology';
      } else if (normalized.includes('stato')) {
        if (normalized.includes('operativ')) {
          newMapping[header] = 'operationalStatus';
          newTransformers[header] = 'normalize_operational_status';
        } else {
          newMapping[header] = 'status';
          newTransformers[header] = 'normalize_status';
        }
      }
    });

    setMapping(newMapping);
    setTransformers(newTransformers);
    setAutoMapped(true);
  };

  const handleMappingChange = (sourceColumn: string, targetField: string) => {
    setMapping({ ...mapping, [sourceColumn]: targetField });
  };

  const handleTransformerChange = (sourceColumn: string, transformer: string) => {
    setTransformers({ ...transformers, [sourceColumn]: transformer });
  };

  const getPreviewValue = (row: any, sourceColumn: string) => {
    let value = row[sourceColumn];
    const transformer = transformers[sourceColumn];

    if (!value) return '-';

    if (transformer === 'uppercase') return String(value).toUpperCase();
    if (transformer === 'extract_price') {
      const match = String(value).match(/€?\s?(\d+[\.,]?\d*)/);
      return match ? match[1] : value;
    }
    if (transformer === 'normalize_phone') {
      return String(value).replace(/[\s\-\(\)]/g, '');
    }

    return value;
  };

  const availableTransformers = [
    { value: '', label: 'Nessuno' },
    { value: 'uppercase', label: 'Maiuscolo' },
    { value: 'extract_price', label: 'Estrai Prezzo (€)' },
    { value: 'normalize_phone', label: 'Normalizza Telefono' },
    { value: 'normalize_status', label: 'Normalizza Stato' },
    { value: 'normalize_operational_status', label: 'Normalizza Stato Operativo' },
    { value: 'parse_date', label: 'Parsa Data Italiana (GG/MM/AAAA)' },  // ✅ AGGIUNTO
  ];

  const handleContinue = () => {
    const mappingConfig = {
      columns: Object.entries(mapping)
        .filter(([source, target]) => target)
        .map(([source, target]) => ({
          source,
          target: target as string,
          transformer: transformers[source] || undefined,
        })),
      duplicateStrategy,
    };

    onComplete({ mappingConfig });
  };

  const getMappedCount = () => {
    return Object.values(mapping).filter((v) => v).length;
  };

  const getRequiredFields = () => {
    return targetFields.filter((f: any) => f.required);
  };

  const getMappedRequiredCount = () => {
    const requiredFieldNames = getRequiredFields().map((f: any) => f.name);
    const mappedTargets = Object.values(mapping);
    return requiredFieldNames.filter((name) => mappedTargets.includes(name)).length;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">2. Mappa le colonne</h2>
        <p className="text-gray-600">Collega le colonne del tuo file ai campi del CRM</p>
      </div>

      {autoMapped && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
          <svg className="h-5 w-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">Auto-mapping completato!</p>
            <p className="text-sm text-green-700 mt-1">
              Rilevate {getMappedCount()} corrispondenze su {headers.length} colonne. Verifica e modifica se necessario.
            </p>
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="font-medium text-gray-700">Campi Obbligatori Mappati</span>
          <span className="text-gray-900 font-semibold">{getMappedRequiredCount()} / {getRequiredFields().length}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${getRequiredFields().length > 0 ? (getMappedRequiredCount() / getRequiredFields().length) * 100 : 0}%` }}  // ✅ FIX divisione per zero
          />
        </div>
      </div>

      {/* Guida Trasformazioni - Tema Dark */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-6">
        <details className="group">
          <summary className="flex justify-between items-center cursor-pointer list-none">
            <h4 className="font-semibold text-cyan-400 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Guida alle Trasformazioni (clicca per espandere)
            </h4>
            <span className="transition group-open:rotate-180 text-slate-400">
              <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24">
                <path d="M6 9l6 6 6-6"></path>
              </svg>
            </span>
          </summary>
          <div className="text-sm text-slate-300 mt-3 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-900/50 p-3 rounded border border-slate-700">
                <span className="font-semibold text-cyan-400">Maiuscolo:</span>
                <code className="text-gray-300 ml-2 text-xs">"rossi" → "ROSSI"</code>
              </div>
              <div className="bg-slate-900/50 p-3 rounded border border-slate-700">
                <span className="font-semibold text-cyan-400">Estrai Prezzo (€):</span>
                <code className="text-gray-300 ml-2 text-xs">"€ 29,99/mese" → "29,99"</code>
              </div>
              <div className="bg-slate-900/50 p-3 rounded border border-slate-700">
                <span className="font-semibold text-cyan-400">Normalizza Telefono:</span>
                <code className="text-gray-300 ml-2 text-xs">"+39 340-123-4567" → "+393401234567"</code>
              </div>
              <div className="bg-slate-900/50 p-3 rounded border border-slate-700">
                <span className="font-semibold text-cyan-400">Normalizza Stato:</span>
                <code className="text-gray-300 ml-2 text-xs">"in lavorazione" → "IN_PROGRESS"</code>
              </div>
              <div className="bg-slate-900/50 p-3 rounded border border-slate-700 md:col-span-2">
                <span className="font-semibold text-cyan-400">Parsa Data Italiana:</span>
                <code className="text-gray-300 ml-2 text-xs">"15/03/2025" → "2025-03-15"</code>
              </div>
            </div>
          </div>
        </details>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Gestione Duplicati</h3>
        <p className="text-sm text-gray-600 mb-4">
          Se un cliente con lo stesso codice fiscale esiste già, cosa vuoi fare?
        </p>
        <div className="space-y-3">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="radio"
              name="duplicateStrategy"
              value="SKIP"
              checked={duplicateStrategy === 'SKIP'}
              onChange={(e) => setDuplicateStrategy(e.target.value as any)}
              className="mt-1"
            />
            <div>
              <span className="font-medium text-gray-900">Salta</span>
              <p className="text-sm text-gray-600">Non creare il cliente, crea solo la pratica collegata</p>
            </div>
          </label>
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="radio"
              name="duplicateStrategy"
              value="UPDATE"
              checked={duplicateStrategy === 'UPDATE'}
              onChange={(e) => setDuplicateStrategy(e.target.value as any)}
              className="mt-1"
            />
            <div>
              <span className="font-medium text-gray-900">Aggiorna</span>
              <p className="text-sm text-gray-600">Aggiorna i dati del cliente se più completi (consigliato)</p>
            </div>
          </label>
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="radio"
              name="duplicateStrategy"
              value="CREATE_NEW"
              checked={duplicateStrategy === 'CREATE_NEW'}
              onChange={(e) => setDuplicateStrategy(e.target.value as any)}
              className="mt-1"
            />
            <div>
              <span className="font-medium text-gray-900">Crea Sempre Nuovo</span>
              <p className="text-sm text-gray-600">Crea un nuovo cliente (rischio duplicati)</p>
            </div>
          </label>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 grid grid-cols-12 gap-4 text-sm font-semibold text-gray-700">
          <div className="col-span-3">Colonna File</div>
          <div className="col-span-3">Campo CRM</div>
          <div className="col-span-2">Trasformazione</div>
          <div className="col-span-4">Anteprima Dato</div>
        </div>
        
        <div className="bg-blue-50 px-6 py-2 border-b border-blue-100">
          <span className="text-sm font-semibold text-blue-900">👤 Dati Cliente</span>
        </div>
        <div className="divide-y divide-gray-100">
          {headers.map((header) => {
            const selectedField = targetFields.find((f: any) => f.name === mapping[header]);
            if (selectedField && selectedField.category === 'customer') {
              return (
                <div key={header} className="px-6 py-4 hover:bg-gray-50">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-3">
                      <span className="font-medium text-gray-900">{header}</span>
                    </div>
                    <div className="col-span-3">
                      <select
                        value={mapping[header] || ''}
                        onChange={(e) => handleMappingChange(header, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Non mappare --</option>
                        {targetFields.map((field: any) => (
                          <option key={field.name} value={field.name}>
                            {field.label} {field.required && '*'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <select
                        value={transformers[header] || ''}
                        onChange={(e) => handleTransformerChange(header, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        {availableTransformers.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-4">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded block truncate">
                        {previewRows[0] ? getPreviewValue(previewRows[0], header) : '-'}
                      </code>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>

        <div className="bg-purple-50 px-6 py-2 border-b border-purple-100">
          <span className="text-sm font-semibold text-purple-900">📋 Dati Pratica (Opzionali)</span>
          <span className="text-xs text-purple-700 ml-2">Se mappati, verrà creata una pratica</span>
        </div>
        <div className="divide-y divide-gray-100">
          {headers.map((header) => {
            const selectedField = targetFields.find((f: any) => f.name === mapping[header]);
            if (!selectedField || selectedField.category === 'practice') {
              return (
                <div key={header} className="px-6 py-4 hover:bg-gray-50">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-3">
                      <span className="font-medium text-gray-900">{header}</span>
                    </div>
                    <div className="col-span-3">
                      <select
                        value={mapping[header] || ''}
                        onChange={(e) => handleMappingChange(header, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Non mappare --</option>
                        {targetFields.map((field: any) => (
                          <option key={field.name} value={field.name}>
                            {field.label} {field.required && '*'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <select
                        value={transformers[header] || ''}
                        onChange={(e) => handleTransformerChange(header, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        {availableTransformers.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-4">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded block truncate">
                        {previewRows[0] ? getPreviewValue(previewRows[0], header) : '-'}
                      </code>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>

      <div className="flex justify-between pt-6 border-t">
        <Button onClick={onBack} variant="ghost">
          ← Indietro
        </Button>
        <div className="flex space-x-3">
          <Button onClick={onCancel} variant="ghost">
            Annulla
          </Button>
          <Button
            onClick={handleContinue}
            disabled={getMappedRequiredCount() < getRequiredFields().length}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300"
          >
            Valida Importazione →
          </Button>
        </div>
      </div>
    </div>
  );
}