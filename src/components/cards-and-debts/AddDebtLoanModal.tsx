import React, { useState } from 'react';
import { X, HandCoins, ShieldAlert } from 'lucide-react';
import type { AccountItem } from '@/lib/api/accounts';
import { toPaise, formatINR } from '@/lib/accounting/currency';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { ModalPortal } from '@/components/common/ModalPortal';

interface AddDebtLoanModalProps {
  isOpen: boolean;
  accounts: AccountItem[];
  onClose: () => void;
  onAddDebtLoan: (params: {
    lender_name: string;
    borrowed_amount_paise: number;
    remaining_balance_paise?: number;
    interest_rate_percent?: number;
    due_date?: string;
    notes?: string;
    initial_deposit_account_id?: string;
  }) => Promise<void>;
}

export const AddDebtLoanModal: React.FC<AddDebtLoanModalProps> = ({
  isOpen,
  accounts,
  onClose,
  onAddDebtLoan,
}) => {
  const [lenderName, setLenderName] = useState('');
  const [borrowedRupees, setBorrowedRupees] = useState('');
  const [remainingRupees, setRemainingRupees] = useState('');
  const [interestRate, setInterestRate] = useState('0');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [depositAccountId, setDepositAccountId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isRendered, requestClose, handleBackdropClick, handleBackdropTouchMove, overlayClass, panelClass } = useModalDismiss(isOpen, onClose);

  if (!isRendered) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!lenderName.trim()) {
      setError('Lender / Counterparty name is required.');
      return;
    }

    const borrowedAmt = parseFloat(borrowedRupees);
    if (isNaN(borrowedAmt) || borrowedAmt <= 0) {
      setError('Please enter a valid borrowed amount.');
      return;
    }

    const remainingAmt = remainingRupees ? parseFloat(remainingRupees) : borrowedAmt;
    if (isNaN(remainingAmt) || remainingAmt < 0) {
      setError('Please enter a valid remaining balance.');
      return;
    }

    if (remainingAmt > borrowedAmt) {
      setError('Current remaining balance cannot be higher than initial borrowed amount.');
      return;
    }

    const rate = parseFloat(interestRate) || 0;
    if (rate < 0) {
      setError('Interest rate cannot be negative.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onAddDebtLoan({
        lender_name: lenderName.trim(),
        borrowed_amount_paise: Number(toPaise(borrowedAmt)),
        remaining_balance_paise: Number(toPaise(remainingAmt)),
        interest_rate_percent: rate,
        due_date: dueDate || undefined,
        notes: notes.trim() || undefined,
        initial_deposit_account_id: depositAccountId || undefined,
      });

      setLenderName('');
      setBorrowedRupees('');
      setRemainingRupees('');
      setNotes('');
      requestClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record debt/loan';
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
        <div className={`bg-neutral-900 border border-white/15 w-full max-w-lg rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl modal-panel max-h-[90vh] sm:max-h-[88vh] overflow-y-auto ${panelClass}`}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                <HandCoins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Add Debt / Loan</h3>
                <p className="text-xs text-neutral-400">Borrowings from friends, family, or lenders</p>
              </div>
            </div>
            <button
              onClick={requestClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center active:scale-95 transition"
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
                Lender / Creditor Name
              </label>
              <input
                type="text"
                value={lenderName}
                onChange={(e) => setLenderName(e.target.value)}
                placeholder="e.g. Rohit (Friend), Dad, HDFC Personal Loan"
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-400 font-medium mb-1">
                  Initial Borrowed Amount (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  value={borrowedRupees}
                  onChange={(e) => {
                    setBorrowedRupees(e.target.value);
                    if (!remainingRupees) {
                      setRemainingRupees(e.target.value);
                    }
                  }}
                  placeholder="50000"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-neutral-400 font-medium mb-1">
                  Current Balance Owed (₹)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={remainingRupees}
                  onChange={(e) => setRemainingRupees(e.target.value)}
                  placeholder="Defaults to borrowed amount"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-400 font-medium mb-1">
                  Interest Rate (% p.a.)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  placeholder="0 (0% for interest-free friends/family)"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-neutral-400 font-medium mb-1">
                  Target Repayment Date (Optional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-neutral-400 font-medium mb-1">
                Purpose / Terms / Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Emergency medical advance, promised return by next quarter"
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            {accounts.length > 0 && (
              <div>
                <label className="block text-neutral-400 font-medium mb-1">
                  Deposit Funds Into Account (Optional)
                </label>
                <select
                  value={depositAccountId}
                  onChange={(e) => setDepositAccountId(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="">None (Already in cash or spent directly)</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      Credit to {acc.name} ({acc.institution}) — Balance: {formatINR(acc.balancePaise)}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  Select an account if you deposited this borrowed money into your bank today.
                </span>
              </div>
            )}

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
                className="flex-1 sm:flex-none px-5 py-2.5 min-h-[44px] rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-lg shadow-orange-600/20 disabled:opacity-50 transition active:scale-95 cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : 'Add Debt / Loan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};
