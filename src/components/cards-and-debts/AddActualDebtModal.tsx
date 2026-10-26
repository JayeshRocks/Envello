import React, { useState } from 'react';
import { X, CalendarClock, ShieldAlert } from 'lucide-react';
import { toPaise } from '@/lib/accounting/currency';
import { useModalDismiss } from '@/hooks/useModalDismiss';

interface AddActualDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddDebt: (params: {
    lender_name: string;
    initial_debt_paise: number;
    monthly_instalment_paise: number;
    due_date?: string;
  }) => Promise<void>;
}

export const AddActualDebtModal: React.FC<AddActualDebtModalProps> = ({
  isOpen,
  onClose,
  onAddDebt,
}) => {
  const [lenderName, setLenderName] = useState('');
  const [initialDebtRupees, setInitialDebtRupees] = useState('');
  const [monthlyInstalmentRupees, setMonthlyInstalmentRupees] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleBackdropClick } = useModalDismiss(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!lenderName.trim()) {
      setError('Lender name / entity is required.');
      return;
    }

    const debt = parseFloat(initialDebtRupees);
    const instalment = parseFloat(monthlyInstalmentRupees);

    if (isNaN(debt) || debt <= 0 || isNaN(instalment) || instalment <= 0) {
      setError('Please enter valid total debt and monthly instalment amounts.');
      return;
    }

    try {
      setIsSubmitting(true);
      const debtPaise = Number(toPaise(debt));
      const instalmentPaise = Number(toPaise(instalment));

      await onAddDebt({
        lender_name: lenderName.trim(),
        initial_debt_paise: debtPaise,
        monthly_instalment_paise: instalmentPaise,
        due_date: dueDate || undefined,
      });

      setLenderName('');
      setInitialDebtRupees('');
      setMonthlyInstalmentRupees('');
      setDueDate('');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record actual debt';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
    >
      <div className="glass-card w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-white/10 p-6 space-y-5 shadow-2xl modal-panel max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Mobile drag handle */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto -mt-1 mb-2 sm:hidden flex-shrink-0" />

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Add Actual Debt</h3>
              <p className="text-xs text-neutral-400">Track loans owed to friends, family, or lenders</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 sm:p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-neutral-400 font-medium mb-1">Lender / Creditor Name</label>
            <input
              type="text"
              value={lenderName}
              onChange={(e) => setLenderName(e.target.value)}
              placeholder="e.g. Ramesh, Uncle Sharma, Personal Loan"
              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Total Debt Amount (₹)</label>
              <input
                type="number"
                step="any"
                value={initialDebtRupees}
                onChange={(e) => setInitialDebtRupees(e.target.value)}
                placeholder="50000"
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Monthly Instalment (₹)</label>
              <input
                type="number"
                step="any"
                value={monthlyInstalmentRupees}
                onChange={(e) => setMonthlyInstalmentRupees(e.target.value)}
                placeholder="5000"
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-neutral-400 font-medium mb-1">Final Repayment Target Date (Optional)</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 sm:py-2 text-base sm:text-sm text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 min-h-[44px] rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-5 py-2.5 min-h-[44px] rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-medium shadow-lg shadow-orange-600/20 disabled:opacity-50 transition active:scale-95"
            >
              {isSubmitting ? 'Recording...' : 'Add Debt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
