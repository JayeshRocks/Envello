import React, { useState } from 'react';
import { X, CalendarClock, ShieldAlert } from 'lucide-react';
import { toPaise } from '@/lib/accounting/currency';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { ModalPortal } from '@/components/common/ModalPortal';

interface AddExternalEmiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEmi: (params: {
    lender_name: string;
    initial_debt_paise: number;
    monthly_instalment_paise: number;
    due_date?: string;
  }) => Promise<void>;
}

export const AddExternalEmiModal: React.FC<AddExternalEmiModalProps> = ({
  isOpen,
  onClose,
  onAddEmi,
}) => {
  const [lenderName, setLenderName] = useState('');
  const [initialDebtRupees, setInitialDebtRupees] = useState('');
  const [monthlyInstalmentRupees, setMonthlyInstalmentRupees] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isRendered, requestClose, handleBackdropClick, handleBackdropTouchMove, overlayClass, panelClass } = useModalDismiss(isOpen, onClose);

  if (!isRendered) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!lenderName.trim()) {
      setError('Lender name or EMI title is required.');
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

      await onAddEmi({
        lender_name: lenderName.trim(),
        initial_debt_paise: debtPaise,
        monthly_instalment_paise: instalmentPaise,
        due_date: dueDate || undefined,
      });

      setLenderName('');
      setInitialDebtRupees('');
      setMonthlyInstalmentRupees('');
      setDueDate('');
      requestClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record external EMI';
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
        className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/65 backdrop-blur-md sm:backdrop-blur-lg modal-overlay ${overlayClass}`}
      >
        <div className={`bg-neutral-900 border border-white/15 w-full max-w-md rounded-2xl sm:rounded-3xl p-6 space-y-5 shadow-2xl modal-panel max-h-[90vh] sm:max-h-[88vh] overflow-y-auto ${panelClass}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Add External EMI</h3>
                <p className="text-xs text-neutral-400">Bank loans, auto loans, or retail instalment plans</p>
              </div>
            </div>
            <button
              onClick={requestClose}
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
                placeholder="e.g. SBI Car Loan, iPhone 16 No-Cost EMI, HDFC Education EMI"
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-400 font-medium mb-1">
                  Total Loan / Principal (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  value={initialDebtRupees}
                  onChange={(e) => setInitialDebtRupees(e.target.value)}
                  placeholder="120000"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-medium mb-1">
                  Monthly Instalment (₹ / mo)
                </label>
                <input
                  type="number"
                  step="any"
                  value={monthlyInstalmentRupees}
                  onChange={(e) => setMonthlyInstalmentRupees(e.target.value)}
                  placeholder="10000"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-neutral-400 font-medium mb-1">
                Next Monthly Due Date (Optional)
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
                onClick={requestClose}
                className="flex-1 sm:flex-none px-4 py-2.5 min-h-[44px] rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition active:scale-95 cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : 'Add External EMI'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export const AddActualDebtModal = AddExternalEmiModal;
