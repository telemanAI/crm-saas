// Card espandibile per un singolo step del wizard. Stesso look&feel delle
// pratiche rete fissa (gradient indigo, check emerald, numerazione step/totale).
import { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CaretDown, CaretUp, Check, CheckCircle } from 'phosphor-react';

interface Props {
  id: number;
  total: number;
  title: string;
  icon: any;
  isExpanded: boolean;
  isCompleted: boolean;
  canAccess: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function PracticeStepCard({
  id,
  total,
  title,
  icon: Icon,
  isExpanded,
  isCompleted,
  canAccess,
  onToggle,
  children,
}: Props) {
  return (
    <motion.div
      className={`bg-slate-900/80 backdrop-blur-xl border rounded-2xl overflow-hidden transition-all ${
        isExpanded ? 'border-indigo-600/50' : 'border-slate-800'
      } ${!canAccess ? 'opacity-50' : ''}`}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={!canAccess}
        className="w-full p-6 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isCompleted
                ? 'bg-emerald-600/20 text-emerald-400'
                : isExpanded
                ? 'bg-indigo-600/20 text-indigo-400'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {isCompleted ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">
                Step {id}/{total}
              </span>
              {isCompleted && <CheckCircle className="w-4 h-4 text-emerald-400" />}
            </div>
            <h3 className={`font-semibold ${isExpanded ? 'text-white' : 'text-slate-300'}`}>
              {title}
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <CaretUp className="w-5 h-5 text-slate-400" />
          ) : (
            <CaretDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      <AnimatePresence mode="wait">
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-800"
          >
            <div className="p-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface NavProps {
  canAdvance: boolean;
  isLast: boolean;
  onBack?: () => void;
  onAdvance: () => void;
  loading?: boolean;
  advanceLabel?: string;
}

export function WizardStepNav({
  canAdvance,
  isLast,
  onBack,
  onAdvance,
  loading,
  advanceLabel,
}: NavProps) {
  return (
    <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-800">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 text-slate-400 hover:text-slate-200 text-sm font-medium"
        >
          Indietro
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={onAdvance}
        disabled={!canAdvance || loading}
        className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-600/25 transition-all"
      >
        {loading ? 'Salvataggio...' : advanceLabel || (isLast ? 'Completa pratica' : 'Continua')}
      </button>
    </div>
  );
}
