import { useState } from 'react';
import { useRouter } from 'next/router';
import { Layout } from '../../../components/layout/Layout';
import { Card } from '../../../components/ui/Card';
import UploadStep from '../../../components/imports/UploadStep';
import MappingStep from '../../../components/imports/MappingStep';
import ValidationStep from '../../../components/imports/ValidationStep';

export default function NewImportPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [importData, setImportData] = useState({
    jobId: null,
    targetEntity: null,
    fileName: null,
    headers: [],
    previewRows: [],
    totalRows: 0,
    mappingConfig: null,
    validationResults: null,
  });

  const steps = [
    { number: 1, name: 'Upload', description: 'Carica il file' },
    { number: 2, name: 'Mapping', description: 'Mappa le colonne' },
    { number: 3, name: 'Validazione', description: 'Verifica i dati' },
  ];

  const handleStepComplete = (data: any) => {
    setImportData({ ...importData, ...data });
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCancel = () => {
    if (confirm('Sei sicuro di voler annullare? I progressi andranno persi.')) {
      router.push('/operator/imports');
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Nuova Importazione</h1>
          <p className="text-gray-600 mt-1">Importa dati da file Excel o CSV</p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <nav aria-label="Progress">
            <ol className="flex items-center">
              {steps.map((step, stepIdx) => (
                <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20 flex-1' : ''}`}>
                  {step.number < currentStep ? (
                    <>
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="h-0.5 w-full bg-blue-600" />
                      </div>
                      <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-900">
                        <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </>
                  ) : step.number === currentStep ? (
                    <>
                      {stepIdx !== 0 && (
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                          <div className="h-0.5 w-full bg-gray-200" />
                        </div>
                      )}
                      <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-blue-600 bg-white">
                        <span className="text-blue-600 font-semibold">{step.number}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {stepIdx !== 0 && (
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                          <div className="h-0.5 w-full bg-gray-200" />
                        </div>
                      )}
                      <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white">
                        <span className="text-gray-500">{step.number}</span>
                      </div>
                    </>
                  )}
                  <span className="mt-2 block text-xs font-medium text-gray-900 text-center">
                    {step.name}
                  </span>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* Content */}
        <Card className="p-8">
          {currentStep === 1 && (
            <UploadStep
              onComplete={handleStepComplete}
              onCancel={handleCancel}
            />
          )}

          {currentStep === 2 && (
            <MappingStep
              jobId={importData.jobId}
              headers={importData.headers}
              previewRows={importData.previewRows}
              targetEntity={importData.targetEntity}
              onComplete={handleStepComplete}
              onBack={handleBack}
              onCancel={handleCancel}
            />
          )}

          {currentStep === 3 && (
            <ValidationStep
              jobId={importData.jobId}
              mappingConfig={importData.mappingConfig}
              fileName={importData.fileName}
              totalRows={importData.totalRows}
              onComplete={() => router.push('/operator/imports')}
              onBack={handleBack}
              onCancel={handleCancel}
            />
          )}
        </Card>
      </div>
    </Layout>
  );
}