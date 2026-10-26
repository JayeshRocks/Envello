import React, { useState, useEffect } from 'react';
import { X, CreditCard, Trash2, Save, AlertCircle } from 'lucide-react';
import type { CreditCardWithDetails, CreditCardRow } from '@/lib/api/creditCards';
import { toPaise } from '@/lib/accounting/currency';
import { useModalDismiss } from '@/hooks/useModalDismiss';

interface EditCreditCardModalProps {
  card: CreditCardWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (cardId: string, updates: Partial<CreditCardRow>) => Promise<void>;
  onDelete: (cardId: string) => Promise<void>;
}

export const EditCreditCardModal: React.FC<EditCreditCardModalProps> = ({
  card,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}) => {
  const [cardName, setCardName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [creditLimitRupees, setCreditLimitRupees] = useState('');
  const [statementDay, setStatementDay] = useState(15);
  const [paymentDueDay, setPaymentDueDay] = useState(5);
  const [warningThreshold, setWarningThreshold] = useState(30);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleBackdropClick } = useModalDismiss(isOpen, onClose);

  useEffect(() => {
    if (card) {
      setCardName(card.card_name);
      setIssuer(card.issuer);
      setCreditLimitRupees((card.credit_limit_paise / 100).toString());
      setStatementDay(card.statement_day);
      setPaymentDueDay(card.payment_due_day);
      setWarningThreshold(card.warning_threshold_percent ?? 30);
      setShowConfirmDelete(false);
      setError(null);
    }
  }, [card]);

  if (!isOpen || !card) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!cardName.trim() || !issuer.trim()) {
      setError('Card name and issuer are required.');
      return;
    }

    const limitNum = parseFloat(creditLimitRupees);
    if (isNaN(limitNum) || limitNum <= 0) {
      setError('Please enter a valid credit limit.');
      return;
    }

    try {
      setIsSubmitting(true);
      const limitPaise = Number(toPaise(limitNum));

      await onUpdate(card.id, {
        card_name: cardName.trim(),
        issuer: issuer.trim(),
        credit_limit_paise: limitPaise,
        statement_day: statementDay,
        payment_due_day: paymentDueDay,
        warning_threshold_percent: warningThreshold,
      });

      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update credit card.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setError(null);
    try {
      setIsDeleting(true);
      await onDelete(card.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete credit card.');
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
    >
      <div className="max-w-md w-full glass-card rounded-t-3xl sm:rounded-2xl p-6 sm:p-7 space-y-5 border border-white/10 shadow-2xl relative modal-panel max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Mobile drag handle */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto -mt-1 mb-2 sm:hidden flex-shrink-0" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 sm:p-2 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn active:scale-95 transition"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Manage Credit Card</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">Edit Card Details</h2>
          <p className="text-xs text-neutral-400">
            Update credit limits, billing statements, or archive this card liability.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">Issuer / Bank</label>
              <input
                type="text"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                placeholder="e.g. HDFC, ICICI, SBI"
                required
                className="w-full px-3 py-2.5 sm:py-2 rounded-xl glass-input text-base sm:text-sm text-white placeholder-neutral-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">Card Name / Variant</label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="e.g. Regalia, Amazon Pay"
                required
                className="w-full px-3 py-2.5 sm:py-2 rounded-xl glass-input text-base sm:text-sm text-white placeholder-neutral-500 focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300">Credit Limit (₹)</label>
            <input
              type="number"
              value={creditLimitRupees}
              onChange={(e) => setCreditLimitRupees(e.target.value)}
              placeholder="e.g. 150000"
              step="any"
              min="1"
              required
              className="w-full px-3 py-2.5 sm:py-2 rounded-xl glass-input text-base sm:text-sm text-white placeholder-neutral-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">Statement Day (1–31)</label>
              <input
                type="number"
                value={statementDay}
                onChange={(e) => setStatementDay(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                min="1"
                max="31"
                required
                className="w-full px-3 py-2.5 sm:py-2 rounded-xl glass-input text-base sm:text-sm text-white focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">Payment Due Day (1–31)</label>
              <input
                type="number"
                value={paymentDueDay}
                onChange={(e) => setPaymentDueDay(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                min="1"
                max="31"
                required
                className="w-full px-3 py-2.5 sm:py-2 rounded-xl glass-input text-base sm:text-sm text-white focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-neutral-300">Warning Threshold</span>
              <span className="font-mono text-purple-400 font-bold">{warningThreshold}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="50"
              step="5"
              value={warningThreshold}
              onChange={(e) => setWarningThreshold(parseInt(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-white text-sm font-semibold transition shadow-lg shadow-purple-500/25 active:scale-[0.98] min-h-[44px]"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>

        {/* Delete Card */}
        <div className="pt-3 border-t border-white/5 space-y-2">
          {!showConfirmDelete ? (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              className="w-full py-2.5 px-3 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium flex items-center justify-center space-x-1.5 transition min-h-[44px] active:scale-[0.98]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete / Archive Card</span>
            </button>
          ) : (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 space-y-2.5">
              <p className="text-xs text-red-300 font-medium leading-relaxed">
                Are you sure you want to remove <span className="font-bold underline">{card.card_name}</span>? Existing payment transactions will remain safely recorded in your ledger.
              </p>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2 px-3 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold transition min-h-[40px]"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Remove'}
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
  );
};
