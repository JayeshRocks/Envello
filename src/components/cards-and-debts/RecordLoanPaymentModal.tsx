import React, { useState, useEffect } from 'react';
import { X, HandCoins, ShieldAlert, ArrowRight } from 'lucide-react';
import type { DebtLoanRow } from '@/lib/api/debtsLoans';
import type { AccountItem } from '@/lib/api/accounts';
import { formatINR, toPaise } from '@/lib/accounting/currency';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { ModalPortal } from '@/components/common/ModalPortal';

interface RecordLoanPaymentModalProps {
  isOpen: boolean;
  loans: DebtLoanRow[];
  accounts: AccountItem[];
  preselectedLoanId?: string;
  onClose: () => void;
  onRecordPayment: (params: {
    loanId: string;
    fromAccountId: string;
    amountPaise: number;
    paymentDate?: string;
    notes?: string;
  }) => Promise<void>;
}

export const RecordLoanPaymentModal: React.FC<RecordLoanPaymentModalProps> = ({
  isOpen,
  loans,
  accounts,
  preselectedLoanId,
  onClose,
  onRecordPayment,
}) => {
  const [selectedLoanId, setSelectedLoanId] = useState<string>(
    preselectedLoanId || loans[0]?.id || ''
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts[0]?.id || ''
  );
  const [amountRupees, setAmountRupees] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { isRendered, requestClose, handleBackdropClick, handleBackdropTouchMove, overlayClass, panelClass } = useModalDismiss(isOpen, onClose);

  const toRupeesString = (paise: number) => {
    if (paise <= 0) return '0';
    const rupees = paise / 100;
    return Number.isInteger(rupees) ? rupees.toString() : rupees.toFixed(2);
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      const targetLoanId =
        (preselectedLoanId && loans.some((l) => l.id === preselectedLoanId) ? preselectedLoanId : '') ||
        (selectedLoanId && loans.some((l) => l.id === selectedLoanId) ? selectedLoanId : '') ||
        loans.find((l) => l.remaining_balance_paise > 0)?.id ||
        loans[0]?.id ||
        '';
      setSelectedLoanId(targetLoanId);

      const targetAccId =
        (selectedAccountId && accounts.some((a) => a.id === selectedAccountId) ? selectedAccountId : '') ||
        accounts[0]?.id ||
        '';
      setSelectedAccountId(targetAccId);

      const targetLoan = loans.find((l) => l.id === targetLoanId) || loans[0];
      if (targetLoan && targetLoan.remaining_balance_paise > 0) {
        setAmountRupees(toRupeesString(targetLoan.remaining_balance_paise));
      } else {
        setAmountRupees('0');
      }
    }
  }, [isOpen, preselectedLoanId, loans, accounts]);

  if (!isRendered) return null;

  const currentLoan = loans.find((l) => l.id === selectedLoanId) || loans[0];
  const currentAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const maxOutstandingRupees = currentLoan ? currentLoan.remaining_balance_paise / 100 : 0;
  const isZeroDue = !currentLoan || currentLoan.remaining_balance_paise <= 0;

  const handleLoanChange = (loanId: string) => {
    setSelectedLoanId(loanId);
    setError(null);
    const loan = loans.find((l) => l.id === loanId);
    if (loan && loan.remaining_balance_paise > 0) {
      setAmountRupees(toRupeesString(loan.remaining_balance_paise));
    } else {
      setAmountRupees('0');
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setAmountRupees('');
      setError(null);
      return;
    }

    const num = parseFloat(val);
    if (!isNaN(num) && num > maxOutstandingRupees) {
      setAmountRupees(maxOutstandingRupees.toString());
      setError(
        `Payment amount capped to total outstanding balance (${formatINR(currentLoan.remaining_balance_paise)}). You cannot pay more than the balance owed.`
      );
      return;
    }

    setError(null);
    setAmountRupees(val);
  };

  const handleFillQuickAmount = (ratio: number) => {
    if (!currentLoan || currentLoan.remaining_balance_paise <= 0) return;
    const paise = Math.round(currentLoan.remaining_balance_paise * ratio);
    const clampedPaise = Math.max(100, Math.min(paise, currentLoan.remaining_balance_paise));
    setAmountRupees(toRupeesString(clampedPaise));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedLoanId) {
      setError('Please select a loan or debt to repay.');
      return;
    }

    if (!selectedAccountId) {
      setError('Please select a source bank account.');
      return;
    }

    const amt = parseFloat(amountRupees);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    const amountPaise = Number(toPaise(amt));
    if (amountPaise > currentLoan.remaining_balance_paise) {
      setError(
        `Payment amount (${formatINR(amountPaise)}) exceeds the total outstanding balance (${formatINR(currentLoan.remaining_balance_paise)}).`
      );
      return;
    }

    if (currentAccount && currentAccount.balancePaise < BigInt(amountPaise)) {
      setError(
        `Insufficient funds in ${currentAccount.name}. Available balance is ${formatINR(currentAccount.balancePaise)}, but payment is ${formatINR(amountPaise)}.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await onRecordPayment({
        loanId: selectedLoanId,
        fromAccountId: selectedAccountId,
        amountPaise,
        paymentDate,
        notes: notes.trim() || undefined,
      });
      requestClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record loan payment';
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
                <h3 className="text-base font-semibold text-white">Pay Debt / Loan</h3>
                <p className="text-xs text-neutral-400">Manual settlement from your liquid bank accounts</p>
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
            {/* Loan Selector */}
            <div>
              <label className="block text-neutral-400 font-medium mb-1">
                Select Debt / Loan
              </label>
              <select
                value={selectedLoanId}
                onChange={(e) => handleLoanChange(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-orange-500"
                required
              >
                {loans.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.lender_name} — Outstanding: {formatINR(l.remaining_balance_paise)}
                  </option>
                ))}
              </select>
            </div>

            {/* Source Account Selector */}
            <div>
              <label className="block text-neutral-400 font-medium mb-1">
                Pay From Bank Account
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-orange-500"
                required
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.institution}) — Balance: {formatINR(acc.balancePaise)}
                  </option>
                ))}
              </select>
            </div>

            {/* Outstanding Summary Hero */}
            {currentLoan && (
              <div className="p-3.5 rounded-xl bg-orange-500/5 border border-orange-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-neutral-400 block">Total Balance Owed</span>
                  <span className="text-lg font-bold font-mono text-orange-400">
                    {formatINR(currentLoan.remaining_balance_paise)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-neutral-400 block">Initial Borrowed</span>
                  <span className="text-xs font-mono text-neutral-300">
                    {formatINR(currentLoan.borrowed_amount_paise)}
                  </span>
                </div>
              </div>
            )}

            {/* Quick Amount Chips */}
            {!isZeroDue && (
              <div className="space-y-1.5">
                <div className="text-neutral-400 font-medium">Quick Amount Presets:</div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleFillQuickAmount(0.25)}
                    className="py-2 px-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-300 hover:text-white font-mono text-xs transition active:scale-95 cursor-pointer min-h-[38px]"
                  >
                    25%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFillQuickAmount(0.5)}
                    className="py-2 px-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-300 hover:text-white font-mono text-xs transition active:scale-95 cursor-pointer min-h-[38px]"
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFillQuickAmount(1.0)}
                    className="py-2 px-2 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-300 hover:text-orange-200 font-mono text-xs font-semibold transition active:scale-95 cursor-pointer min-h-[38px]"
                  >
                    Full Balance
                  </button>
                </div>
              </div>
            )}

            {/* Amount Input */}
            <div>
              <label className="block text-neutral-400 font-medium mb-1">
                Payment Amount (₹)
              </label>
              <input
                type="number"
                step="any"
                min="0.01"
                max={maxOutstandingRupees > 0 ? maxOutstandingRupees : undefined}
                value={amountRupees}
                onChange={handleAmountChange}
                placeholder="0.00"
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500 font-mono"
                required
              />
              <span className="text-[10px] text-neutral-500 mt-1 block">
                Payments reduce outstanding loan liability directly and debit your bank account.
              </span>
            </div>

            {/* Date & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-400 font-medium mb-1">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-neutral-400 font-medium mb-1">Notes / Reference (Optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. UPI Ref #48291"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
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
                disabled={isSubmitting || isZeroDue}
                className="flex-1 sm:flex-none px-5 py-2.5 min-h-[44px] rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-lg shadow-orange-600/20 disabled:opacity-50 transition active:scale-95 flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <span>{isSubmitting ? 'Recording...' : 'Record Payment'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};
