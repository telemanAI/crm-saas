import { motion } from 'framer-motion';
import { Check, Circle } from 'phosphor-react';

interface Step {
  number: number;
  title: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  completedSteps: number[];
  onStepClick?: (step: number) => void;
}

export function Stepper({ steps, currentStep, completedSteps, onStepClick }: StepperProps) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.number);
          const isCurrent = currentStep === step.number;
          const isClickable = isCompleted || step.number <= currentStep;
          
          return (
            <div key={step.number} className="flex flex-col items-center flex-1">
              {/* Linea di collegamento */}
              {index > 0 && (
                <div 
                  className={`absolute left-0 right-0 top-4 h-0.5 -translate-y-1/2
                    ${isCompleted ? 'bg-indigo-500' : 'bg-slate-800'}`}
                  style={{ 
                    left: `${((index - 1) / (steps.length - 1)) * 100}%`,
                    right: `${(1 - index / (steps.length - 1)) * 100}%`
                  }}
                />
              )}
              
              {/* Cerchio step */}
              <motion.button
                whileHover={isClickable ? { scale: 1.1 } : {}}
                whileTap={isClickable ? { scale: 0.95 } : {}}
                onClick={() => isClickable && onStepClick?.(step.number)}
                disabled={!isClickable}
                className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center
                  transition-all duration-300
                  ${isCompleted ? 'bg-indigo-500 text-white' : 
                    isCurrent ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/30' : 
                    'bg-slate-800 text-slate-500 border border-slate-700'}`}
              >
                {isCompleted ? (
                  <Check weight="bold" className="w-5 h-5" />
                ) : (
                  <span className="font-semibold text-sm">{step.number}</span>
                )}
              </motion.button>
              
              {/* Label */}
              <div className="mt-2 text-center">
                <p className={`text-sm font-medium ${isCurrent ? 'text-indigo-400' : 'text-slate-400'}`}>
                  {step.title}
                </p>
                {step.description && (
                  <p className="text-xs text-slate-600 mt-0.5">{step.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
