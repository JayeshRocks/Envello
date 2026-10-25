import React, { useState } from 'react';
import { CalendarClock, Check, ArrowRight, Loader2, Settings } from 'lucide-react';
import { formatINR } from '@/lib/accounting/currency';
import type { RecurringRule } from '@/types/recurring.types';

interface RecurringAlertBannerProps {
  dueRules: RecurringRule[];
  totalDuePaise: bigint;
  onLogAll: () => Promise<void>;
  onOpenManageModal: () => void;
}

export const RecurringAlertBanner: React.FC<RecurringAlertBannerProps> = ({
  dueRules,
  totalDuePaise,
  onLogAll,
  onOpenManageModal,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (dueRules.length === 0) return null;

  const handleLogAll = async () => {
    try {
      setIsSubmitting(true);
      await onLogAll();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-sky-950/40 border border-indigo-500/30 shadow-xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 animate-slide-down">
      <div className="flex items-start space-x-3.5">
        <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 flex-shrink-0 mt-0.5 border border-indigo-500/30">
          <CalendarClock className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-semibold text-white">
              {dueRules.length} Standing Recurring {dueRules.length === 1 ? 'Expense' : 'Expenses'} Due
            </h3>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {formatINR(totalDuePaise)}
            </span>
          </div>
          <p className="text-xs text-neutral-300">
            Monthly schedule detected expenses ready to be logged into your ledger.
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {dueRules.slice(0, 4).map((rule) => (
              <span
                key={rule.id}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-neutral-900/80 text-neutral-300 border border-white/10"
              >
                {rule.title} ({formatINR(rule.amountPaise)})
              </span>
            ))}
            {dueRules.length > 4 && (
              <span className="text-[10px] text-neutral-400 self-center">
                +{dueRules.length - 4} more
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0 w-full md:w-auto">
        <button
          onClick={onOpenManageModal}
          className="px-3.5 py-2.5 sm:py-2 min-h-[38px] rounded-xl bg-neutral-900/80 hover:bg-neutral-800 text-xs font-medium text-neutral-300 border border-white/10 transition flex items-center justify-center space-x-1.5"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Manage</span>
        </button>
        <button
          onClick={handleLogAll}
          disabled={isSubmitting}
          className="px-4 py-2.5 sm:py-2 min-h-[38px] rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-xs transition flex items-center justify-center space-x-1.5 shadow-lg shadow-indigo-500/25 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Logging...</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>1-Click Log All ({formatINR(totalDuePaise)})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
