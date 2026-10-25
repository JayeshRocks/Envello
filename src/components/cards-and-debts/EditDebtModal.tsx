import React, { useState, useEffect } from 'react';
import { X, CalendarClock, Trash2, Save, AlertCircle } from 'lucide-react';
import type { ActualDebtRow, ActualDebtInsert } from '@/lib/api/actualDebts';
import { toPaise } from '@/lib/accounting/currency';

interface EditDebtModalProps {
  debt: ActualDebtRow | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (debtId: string, updates: Partial<ActualDebtInsert>) => Promise<void>;
  onDelete: (debtId: string) => Promise<void>;
}

export const EditDebtModal: React.FC<EditDebtModalProps> = ({
  debt,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [lenderName, setLenderName] = useState('');
  const [remainingRupees, setRemainingRupees] = useState('');
  const [monthlyInstalmentRupees, setMonthlyInstalmentRupees] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSettled, setIsSettled] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (debt) {
      setLenderName(debt.lender_name);
      setRemainingRupees((debt.remaining_debt_paise / 100).toString());
      setMonthlyInstalmentRupees((debt.monthly_instalment_paise / 100).toString());
      setDueDate(debt.due_date || '');
      setIsSettled(debt.is_settled);
      setShowConfirmDelete(false);
      setError(null);
    }
  }, [debt]);

  if (!isOpen || !debt) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!lenderName.trim()) {
      setError('Lender / counterparty name is required.');
      return;
    }

    const remNum = parseFloat(remainingRupees);
    if (isNaN(remNum) || remNum < 0) {
      setError('Please enter a valid remaining debt amount.');
      return;
    }

    const instNum = parseFloat(monthlyInstalmentRupees) || 0;

    try {
      setIsSubmitting(true);
      const remPaise = Number(toPaise(remNum));
      const instPaise = Number(toPaise(instNum));

      await onUpdate(debt.id, {
        lender_name: lenderName.trim(),
        remaining_debt_paise: remPaise,
        monthly_instalment_paise: instPaise,
        due_date: dueDate || null,
        is_settled: remPaise === 0 || isSettled,
      });

      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update debt.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setError(null);
    try {
      setIsDeleting(true);
      await onDelete(debt.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete debt.');
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="max-w-md w-full glass-card rounded-2xl p-6 sm:p-7 space-y-5 border border-white/10 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 font-medium">
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Manage Debt</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">Edit Debt Details</h2>
          <p className="text-xs text-neutral-400">
            Adjust counterparty terms, outstanding principal, or remove this liability.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300">Lender / Counterparty</label>
            <input
              type="text"
              value={lenderName}
              onChange={(e) => setLenderName(e.target.value)}
              placeholder="e.g. Bank Loan, Relative, Friend"
              required
              className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white placeholder-neutral-500 focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">Remaining Debt (₹)</label>
              <input
                type="number"
                value={remainingRupees}
                onChange={(e) => setRemainingRupees(e.target.value)}
                placeholder="e.g. 50000"
                step="any"
                min="0"
                required
                className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white placeholder-neutral-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">Monthly EMI (₹)</label>
              <input
                type="number"
                value={monthlyInstalmentRupees}
                onChange={(e) => setMonthlyInstalmentRupees(e.target.value)}
                placeholder="e.g. 5000"
                step="any"
                min="0"
                className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white placeholder-neutral-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300">Target Payoff Date (Optional)</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs text-white focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="isSettled"
              checked={isSettled}
              onChange={(e) => setIsSettled(e.target.checked)}
              className="rounded accent-orange-500"
            />
            <label htmlFor="isSettled" className="text-xs text-neutral-300 select-none cursor-pointer">
              Mark this debt as fully settled
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-xs font-semibold transition shadow-lg shadow-orange-500/25"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>

        {/* Delete Debt */}
        <div className="pt-3 border-t border-white/5 space-y-2">
          {!showConfirmDelete ? (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              className="w-full py-2 px-3 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium flex items-center justify-center space-x-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Debt Record</span>
            </button>
          ) : (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 space-y-2.5">
              <p className="text-xs text-red-300 font-medium leading-relaxed">
                Are you sure you want to delete <span className="font-bold underline">{debt.lender_name}</span>? Existing payment logs will remain safely recorded in your ledger.
              </p>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold transition"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="py-1.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
