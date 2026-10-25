import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface BudgetPeriodSelectorProps {
  selectedPeriod: string; // YYYY-MM
  onPrev: () => void;
  onNext: () => void;
}

export const BudgetPeriodSelector: React.FC<BudgetPeriodSelectorProps> = ({
  selectedPeriod,
  onPrev,
  onNext,
}) => {
  const [yearStr, monthStr] = selectedPeriod.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;

  const date = new Date(year, month, 1);
  const formattedMonth = date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex items-center space-x-2">
      <div className="flex items-center space-x-1 p-1 rounded-xl bg-neutral-900 border border-white/10 shadow-inner">
        <button
          onClick={onPrev}
          title="Previous Month"
          aria-label="Previous Month"
          className="p-2 sm:p-1.5 min-h-[34px] min-w-[34px] sm:min-h-0 sm:min-w-0 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-2 px-3 py-1 text-xs font-semibold text-neutral-200">
          <Calendar className="w-3.5 h-3.5 text-sky-400" />
          <span>{formattedMonth}</span>
        </div>

        <button
          onClick={onNext}
          title="Next Month"
          aria-label="Next Month"
          className="p-2 sm:p-1.5 min-h-[34px] min-w-[34px] sm:min-h-0 sm:min-w-0 flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
