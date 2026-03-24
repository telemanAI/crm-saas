// Recupera step visibili e corrente
const { 
  currentStepId, 
  getVisibleSteps, 
  getCurrentStepNumber,
  nextStep, 
  prevStep,
  goToStep,
  completeStep 
} = usePracticeWizardStore();

const visibleSteps = getVisibleSteps();
const currentStep = visibleSteps.find(s => s.id === currentStepId);
const currentNumber = getCurrentStepNumber();

// Nel render:
{visibleSteps.map((step, index) => {
  const isExpanded = step.id === currentStepId;
  const stepNumber = index + 1; // Numero progressivo per UI
  
  return (
    <motion.div key={step.id}> {/* USA step.id come key! */}
      <button onClick={() => goToStep(step.id)}>
        Step {stepNumber}: {step.title}
      </button>
      
      <AnimatePresence mode="wait">
        {isExpanded && (
          <motion.div 
            key={step.id} // Importante per animazioni
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
          >
            {/* Contenuto step specifico */}
            {step.id === 'packages' && <PackagesStep />}
            {step.id === 'wash' && <WashStep />}
            {/* ... altri step */}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
})}

// Navigazione:
<button onClick={() => { completeStep(currentStepId); prevStep(); }}>
  Indietro
</button>
<button onClick={() => { completeStep(currentStepId); nextStep(); }}>
  Avanti ({currentNumber} / {visibleSteps.length})
</button>