import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, Lock } from 'lucide-react';

interface BudgetPeriodSelectorProps {
  selectedPeriod: string; // YYYY-MM
  onPrev: () => void;
  onNext: () => void;
  isPastPeriod?: boolean;
}

export const BudgetPeriodSelector: React.FC<BudgetPeriodSelectorProps> = ({
  selectedPeriod,
  onPrev,
  onNext,
  isPastPeriod = false,
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
          className="p-2 sm:p-1.5 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 active:scale-95 transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-1.5 px-3 py-1 text-xs sm:text-sm font-semibold text-neutral-200">
          <Calendar className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
          <span>{formattedMonth}</span>
          {isPastPeriod && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25 font-mono font-medium flex items-center space-x-1"
              title="Historical month — Read-only balances before rollover"
            >
              <Lock className="w-2.5 h-2.5" />
              <span>Past</span>
            </span>
          )}
        </div>

        <button
          onClick={onNext}
          title="Next Month"
          aria-label="Next Month"
          className="p-2 sm:p-1.5 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 active:scale-95 transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
