import React, { useState, useEffect } from 'react';
import { X, CreditCard, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { CreditCardWithDetails } from '@/lib/api/creditCards';
import type { AccountItem } from '@/lib/api/accounts';
import { formatINR, toPaise } from '@/lib/accounting/currency';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { ModalPortal } from '@/components/common/ModalPortal';

interface RecordCardPaymentModalProps {
  isOpen: boolean;
  cards: CreditCardWithDetails[];
  accounts: AccountItem[];
  preselectedCardId?: string;
  onClose: () => void;
  onRecordPayment: (params: {
    cardId: string;
    fromAccountId: string;
    amountPaise: number;
    paymentDate?: string;
    notes?: string;
  }) => Promise<void>;
}

export const RecordCardPaymentModal: React.FC<RecordCardPaymentModalProps> = ({
  isOpen,
  cards,
  accounts,
  preselectedCardId,
  onClose,
  onRecordPayment,
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string>(
    preselectedCardId || (cards[0]?.id ?? '')
  );
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts[0]?.id ?? ''
  );
  const [amountRupees, setAmountRupees] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { handleBackdropClick, handleBackdropTouchMove } = useModalDismiss(isOpen, onClose);

  // Helper to format paise to clean rupee string
  const toRupeesString = (paise: number) => {
    if (paise <= 0) return '0';
    const rupees = paise / 100;
    return Number.isInteger(rupees) ? rupees.toString() : rupees.toFixed(2);
  };

  // Synchronize selection and autofill due amount whenever modal opens or card list changes
  useEffect(() => {
    if (isOpen) {
      setError(null);

      // Select target card: prioritize preselected -> card with outstanding balance -> first card
      const targetCardId =
        (preselectedCardId && cards.some((c) => c.id === preselectedCardId) ? preselectedCardId : '') ||
        (selectedCardId && cards.some((c) => c.id === selectedCardId) ? selectedCardId : '') ||
        cards.find((c) => c.outstanding_balance_paise > 0)?.id ||
        cards[0]?.id ||
        '';
      setSelectedCardId(targetCardId);

      const targetAccId =
        (selectedAccountId && accounts.some((a) => a.id === selectedAccountId) ? selectedAccountId : '') ||
        accounts[0]?.id ||
        '';
      setSelectedAccountId(targetAccId);

      const targetCard = cards.find((c) => c.id === targetCardId) || cards[0];
      if (targetCard && targetCard.outstanding_balance_paise > 0) {
        setAmountRupees(toRupeesString(targetCard.outstanding_balance_paise));
      } else {
        setAmountRupees('0');
      }
    }
  }, [isOpen, preselectedCardId, cards, accounts]);

  if (!isOpen) return null;

  const effectiveCardId =
    (selectedCardId && cards.some((c) => c.id === selectedCardId) ? selectedCardId : '') ||
    (preselectedCardId && cards.some((c) => c.id === preselectedCardId) ? preselectedCardId : '') ||
    cards[0]?.id ||
    '';

  const effectiveAccountId =
    (selectedAccountId && accounts.some((a) => a.id === selectedAccountId) ? selectedAccountId : '') ||
    accounts[0]?.id ||
    '';

  const currentCard = cards.find((c) => c.id === effectiveCardId) || cards[0];
  const currentAccount = accounts.find((a) => a.id === effectiveAccountId) || accounts[0];

  const maxOutstandingRupees = currentCard ? currentCard.outstanding_balance_paise / 100 : 0;
  const isZeroDue = !currentCard || currentCard.outstanding_balance_paise <= 0;

  // Handle switching cards in dropdown -> automatically refresh autofilled amount to that card's due balance
  const handleCardChange = (cardId: string) => {
    setSelectedCardId(cardId);
    setError(null);
    const card = cards.find((c) => c.id === cardId);
    if (card && card.outstanding_balance_paise > 0) {
      setAmountRupees(toRupeesString(card.outstanding_balance_paise));
    } else {
      setAmountRupees('0');
    }
  };

  // Restrict payment amount from exceeding the amount due
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setAmountRupees('');
      setError(null);
      return;
    }

    const num = parseFloat(val);
    if (!isNaN(num) && num > maxOutstandingRupees) {
      // Auto-clamp to maximum allowed amount due
      setAmountRupees(maxOutstandingRupees.toString());
      setError(
        `Payment amount capped to total outstanding balance (${formatINR(currentCard.outstanding_balance_paise)}). You cannot pay more than the amount due.`
      );
      return;
    }

    setError(null);
    setAmountRupees(val);
  };

  const handleFillQuickAmount = (ratio: number) => {
    if (!currentCard || currentCard.outstanding_balance_paise <= 0) return;
    const paise = Math.round(currentCard.outstanding_balance_paise * ratio);
    const clampedPaise = Math.max(100, Math.min(paise, currentCard.outstanding_balance_paise));
    setAmountRupees(toRupeesString(clampedPaise));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cardIdToPay = effectiveCardId;
    if (!cardIdToPay) {
      setError('Please select a credit card.');
      return;
    }

    const accountIdToPayFrom = effectiveAccountId;
    if (!accountIdToPayFrom) {
      setError('Please select a bank account to pay from.');
      return;
    }

    if (isZeroDue) {
      setError('This credit card has zero outstanding liability. No payment is required.');
      return;
    }

    const amt = parseFloat(amountRupees);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid payment amount greater than zero.');
      return;
    }

    const amountPaise = Number(toPaise(amt));
    if (currentCard && amountPaise > currentCard.outstanding_balance_paise) {
      setError(
        `Payment cannot exceed the outstanding balance of ${formatINR(currentCard.outstanding_balance_paise)}.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await onRecordPayment({
        cardId: cardIdToPay,
        fromAccountId: accountIdToPayFrom,
        amountPaise,
        paymentDate,
        notes: notes.trim() || undefined,
      });

      setAmountRupees('');
      setNotes('');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record payment';
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
        <div className="bg-neutral-900 border border-white/15 w-full max-w-md rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl modal-panel max-h-[90vh] sm:max-h-[88vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Record Card Payment</h3>
                <p className="text-xs text-neutral-400">
                  Transfer funds to settle credit card liabilities
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 sm:p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center active:scale-95 transition"
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

          {isZeroDue && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>This credit card has ₹0 outstanding balance. All charges are fully settled.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Select Credit Card</label>
              <select
                value={effectiveCardId}
                onChange={(e) => handleCardChange(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-sky-500"
                required
              >
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.card_name} ({c.issuer}) — Outstanding: {formatINR(c.outstanding_balance_paise)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-neutral-400 font-medium mb-1">Pay From (Bank Account)</label>
              <select
                value={effectiveAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-sky-500"
                required
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.institution}) — Balance: {formatINR(a.balancePaise)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-neutral-400 font-medium">Payment Amount (₹)</label>
                {currentCard && currentCard.outstanding_balance_paise > 0 && (
                  <span className="text-[11px] font-mono text-neutral-400">
                    Max: {formatINR(currentCard.outstanding_balance_paise)}
                  </span>
                )}
              </div>

              <input
                type="number"
                step="0.01"
                min="0.01"
                max={maxOutstandingRupees > 0 ? maxOutstandingRupees.toString() : undefined}
                disabled={isZeroDue}
                required
                value={amountRupees}
                onChange={handleAmountChange}
                placeholder="0.00"
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-sky-500 font-mono text-base sm:text-sm disabled:opacity-50"
              />

              {/* Quick Select Chips */}
              {currentCard && currentCard.outstanding_balance_paise > 0 && (
                <div className="flex items-center space-x-1.5 pt-2">
                  <button
                    type="button"
                    onClick={() => handleFillQuickAmount(1.0)}
                    className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-[11px] font-medium transition active:scale-95"
                  >
                    Pay Full ({formatINR(currentCard.outstanding_balance_paise)})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFillQuickAmount(0.5)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 text-[11px] font-medium transition active:scale-95"
                  >
                    50%
                  </button>
                  {currentCard.outstanding_balance_paise >= 200000 && (
                    <button
                      type="button"
                      onClick={() => handleFillQuickAmount(0.05)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 text-[11px] font-medium transition active:scale-95"
                    >
                      Min Due (5%)
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-400 font-medium mb-1">Payment Date</label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-medium mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Monthly bill settlement"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {currentCard && currentAccount && (
              <div className="p-3 rounded-xl bg-neutral-800/60 border border-white/5 space-y-1 text-[11px] text-neutral-400">
                <div className="flex items-center space-x-1 font-medium text-neutral-300">
                  <span>{currentAccount.name}</span>
                  <ArrowRight className="w-3 h-3 text-sky-400" />
                  <span>{currentCard.card_name}</span>
                </div>
                <div>
                  This records a payment in your double-entry ledger: debiting the credit card liability and crediting your bank account.
                </div>
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 min-h-[44px] rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || cards.length === 0 || accounts.length === 0 || isZeroDue}
                className="flex-1 sm:flex-none px-5 py-2.5 min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium shadow-lg shadow-sky-600/20 disabled:opacity-50 transition active:scale-95"
              >
                {isSubmitting ? 'Recording...' : isZeroDue ? 'Zero Balance Due' : 'Record Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};
