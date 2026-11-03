import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Trash2, Save, AlertCircle } from 'lucide-react';
import type { SelfEmiRow, SelfEmiInsert } from '@/lib/api/selfEmis';
import { toPaise } from '@/lib/accounting/currency';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { ModalPortal } from '@/components/common/ModalPortal';

interface EditSelfEmiModalProps {
  emi: SelfEmiRow | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (emiId: string, updates: Partial<SelfEmiInsert>) => Promise<void>;
  onDelete: (emiId: string) => Promise<void>;
}

export const EditSelfEmiModal: React.FC<EditSelfEmiModalProps> = ({
  emi,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [description, setDescription] = useState('');
  const [totalFundedRupees, setTotalFundedRupees] = useState('');
  const [monthlyRupees, setMonthlyRupees] = useState('');
  const [startDate, setStartDate] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleBackdropClick, handleBackdropTouchMove } = useModalDismiss(isOpen, onClose);

  useEffect(() => {
    if (emi) {
      setDescription(emi.description);
      setTotalFundedRupees((emi.total_funded_paise / 100).toString());
      setMonthlyRupees((emi.monthly_reimbursement_paise / 100).toString());
      setStartDate(emi.start_date || '');
      setIsCompleted(emi.is_completed);
      setShowConfirmDelete(false);
      setError(null);
    }
  }, [emi]);

  if (!isOpen || !emi) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError('Description is required.');
      return;
    }

    const total = parseFloat(totalFundedRupees);
    const monthly = parseFloat(monthlyRupees);

    if (isNaN(total) || total <= 0 || isNaN(monthly) || monthly <= 0) {
      setError('Please enter valid total funded and monthly reimbursement amounts.');
      return;
    }

    try {
      setIsSubmitting(true);
      const totalPaise = Number(toPaise(total));
      const monthlyPaise = Number(toPaise(monthly));

      await onUpdate(emi.id, {
        description: description.trim(),
        total_funded_paise: totalPaise,
        monthly_reimbursement_paise: monthlyPaise,
        start_date: startDate || undefined,
        is_completed: isCompleted,
      });

      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update Self EMI.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setError(null);
    try {
      setIsDeleting(true);
      await onDelete(emi.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete Self EMI.');
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  return (
    <ModalPortal>
      <div
        onClick={handleBackdropClick}
        onTouchMove={handleBackdropTouchMove}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/65 backdrop-blur-md sm:backdrop-blur-lg modal-overlay animate-fade-in"
      >
        <div className="max-w-md w-full bg-neutral-900 rounded-2xl sm:rounded-3xl p-6 sm:p-7 space-y-5 border border-white/15 shadow-2xl relative modal-panel max-h-[90vh] sm:max-h-[88vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 sm:p-2 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn active:scale-95 transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Manage Self EMI</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">Edit Self EMI Schedule</h2>
          <p className="text-xs text-neutral-400">
            Adjust reimbursement rate, target amounts, or cancel this repayment plan.
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
            <label className="text-xs font-medium text-neutral-300">Purchase Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. MacBook Pro, Dental Surgery"
              required
              className="w-full px-3 py-2.5 sm:py-2 rounded-xl glass-input text-base sm:text-sm text-white placeholder-neutral-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">Total Funded (₹)</label>
              <input
                type="number"
                value={totalFundedRupees}
                onChange={(e) => setTotalFundedRupees(e.target.value)}
                placeholder="e.g. 120000"
                step="any"
                min="1"
                required
                className="w-full px-3 py-2.5 sm:py-2 rounded-xl glass-input text-base sm:text-sm text-white placeholder-neutral-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">Monthly Repayment (₹)</label>
              <input
                type="number"
                value={monthlyRupees}
                onChange={(e) => setMonthlyRupees(e.target.value)}
                placeholder="e.g. 10000"
                step="any"
                min="1"
                required
                className="w-full px-3 py-2.5 sm:py-2 rounded-xl glass-input text-base sm:text-sm text-white placeholder-neutral-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 sm:py-2 rounded-xl glass-input text-base sm:text-sm text-white focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center space-x-2.5 pt-1 min-h-[36px]">
            <input
              type="checkbox"
              id="isCompletedEmi"
              checked={isCompleted}
              onChange={(e) => setIsCompleted(e.target.checked)}
              className="w-4 h-4 rounded accent-emerald-500"
            />
            <label htmlFor="isCompletedEmi" className="text-xs text-neutral-300 select-none cursor-pointer">
              Mark this Self EMI plan as completed
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-semibold transition shadow-lg shadow-emerald-500/25 active:scale-[0.98] min-h-[44px]"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>

        {/* Delete Self EMI */}
        <div className="pt-3 border-t border-white/5 space-y-2">
          {!showConfirmDelete ? (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              className="w-full py-2.5 px-3 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium flex items-center justify-center space-x-1.5 transition min-h-[44px] active:scale-[0.98]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Self EMI Schedule</span>
            </button>
          ) : (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 space-y-2.5">
              <p className="text-xs text-red-300 font-medium leading-relaxed">
                Are you sure you want to delete <span className="font-bold underline">{emi.description}</span>?
              </p>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2 px-3 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold transition min-h-[40px]"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs transition min-h-[40px]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </ModalPortal>
);
};
