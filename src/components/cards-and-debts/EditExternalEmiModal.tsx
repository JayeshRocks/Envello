import React, { useState, useEffect } from 'react';
import { X, CalendarClock, ShieldAlert } from 'lucide-react';
import type { ActualDebtRow, ActualDebtInsert } from '@/lib/api/actualDebts';
import { toPaise } from '@/lib/accounting/currency';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { ModalPortal } from '@/components/common/ModalPortal';

interface EditExternalEmiModalProps {
  isOpen: boolean;
  debt: ActualDebtRow | null;
  onClose: () => void;
  onUpdate: (debtId: string, updates: Partial<ActualDebtInsert>) => Promise<void>;
}

export const EditExternalEmiModal: React.FC<EditExternalEmiModalProps> = ({
  isOpen,
  debt,
  onClose,
  onUpdate,
}) => {
  const [lenderName, setLenderName] = useState('');
  const [monthlyInstalmentRupees, setMonthlyInstalmentRupees] = useState('');
  const [remainingDebtRupees, setRemainingDebtRupees] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleBackdropClick, handleBackdropTouchMove } = useModalDismiss(isOpen, onClose);

  useEffect(() => {
    if (debt) {
      setLenderName(debt.lender_name);
      setMonthlyInstalmentRupees((debt.monthly_instalment_paise / 100).toString());
      setRemainingDebtRupees((debt.remaining_debt_paise / 100).toString());
      setDueDate(debt.due_date || '');
      setError(null);
    }
  }, [debt]);

  if (!isOpen || !debt) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!lenderName.trim()) {
      setError('Lender name or EMI title is required.');
      return;
    }

    const instalment = parseFloat(monthlyInstalmentRupees);
    const remaining = parseFloat(remainingDebtRupees);

    if (isNaN(instalment) || instalment <= 0 || isNaN(remaining) || remaining < 0) {
      setError('Please enter valid monthly instalment and remaining balance amounts.');
      return;
    }

    try {
      setIsSubmitting(true);
      const remainingPaise = Number(toPaise(remaining));
      await onUpdate(debt.id, {
        lender_name: lenderName.trim(),
        monthly_instalment_paise: Number(toPaise(instalment)),
        remaining_debt_paise: remainingPaise,
        due_date: dueDate || null,
        is_settled: remainingPaise === 0,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update external EMI';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal>
      <div
        onClick={handleBackdropClick}
        onTouchMove={handleBackdropTouchMove}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/65 backdrop-blur-md sm:backdrop-blur-lg modal-overlay animate-fade-in"
      >
        <div className="bg-neutral-900 border border-white/15 w-full max-w-md rounded-2xl sm:rounded-3xl p-6 space-y-5 shadow-2xl modal-panel max-h-[90vh] sm:max-h-[88vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Edit External EMI</h3>
                <p className="text-xs text-neutral-400">Update instalment details</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn active:scale-95 transition"
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
              <label className="block text-neutral-400 font-medium mb-1">
                Lender / EMI Name
              </label>
              <input
                type="text"
                value={lenderName}
                onChange={(e) => setLenderName(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-400 font-medium mb-1">
                  Remaining Debt (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={remainingDebtRupees}
                  onChange={(e) => setRemainingDebtRupees(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-medium mb-1">
                  Monthly Instalment (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={monthlyInstalmentRupees}
                  onChange={(e) => setMonthlyInstalmentRupees(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-neutral-400 font-medium mb-1">
                Next Monthly Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 min-h-[44px] rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition active:scale-95 cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export const EditDebtModal = EditExternalEmiModal;
