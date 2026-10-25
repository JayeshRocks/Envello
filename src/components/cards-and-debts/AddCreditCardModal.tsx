import React, { useState } from 'react';
import { X, CreditCard, ShieldAlert } from 'lucide-react';
import { toPaise } from '@/lib/accounting/currency';

interface AddCreditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCard: (data: {
    card_name: string;
    issuer: string;
    credit_limit_paise: number;
    outstanding_balance_paise?: number;
    statement_day: number;
    payment_due_day: number;
    warning_threshold_percent?: number;
  }) => Promise<void>;
}

export const AddCreditCardModal: React.FC<AddCreditCardModalProps> = ({
  isOpen,
  onClose,
  onAddCard,
}) => {
  const [cardName, setCardName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [creditLimitRupees, setCreditLimitRupees] = useState('');
  const [outstandingRupees, setOutstandingRupees] = useState('');
  const [statementDay, setStatementDay] = useState(15);
  const [paymentDueDay, setPaymentDueDay] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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
      const outstandingNum = parseFloat(outstandingRupees) || 0;
      const outstandingPaise = Number(toPaise(outstandingNum));

      await onAddCard({
        card_name: cardName.trim(),
        issuer: issuer.trim(),
        credit_limit_paise: limitPaise,
        outstanding_balance_paise: outstandingPaise,
        statement_day: statementDay,
        payment_due_day: paymentDueDay,
        warning_threshold_percent: 30,
      });

      // Reset
      setCardName('');
      setIssuer('');
      setCreditLimitRupees('');
      setOutstandingRupees('');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add card';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="glass-card w-full max-w-md rounded-2xl border border-white/10 p-6 space-y-5 shadow-2xl modal-panel">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Add Credit Card</h3>
              <p className="text-xs text-neutral-400">Track limits, cycles, and safe utilization (&lt;30%)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn"
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
            <label className="block text-neutral-400 font-medium mb-1">Card Name</label>
            <input
              type="text"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="e.g. Amazon Pay ICICI, Infinia, Coral"
              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-neutral-400 font-medium mb-1">Bank / Issuer</label>
            <input
              type="text"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              placeholder="e.g. ICICI Bank, HDFC, SBI, Axis"
              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Credit Limit (₹)</label>
              <input
                type="number"
                step="any"
                value={creditLimitRupees}
                onChange={(e) => setCreditLimitRupees(e.target.value)}
                placeholder="100000"
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Current Outstanding (₹)</label>
              <input
                type="number"
                step="any"
                value={outstandingRupees}
                onChange={(e) => setOutstandingRupees(e.target.value)}
                placeholder="0"
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Statement Day (1-31)</label>
              <input
                type="number"
                min={1}
                max={31}
                value={statementDay}
                onChange={(e) => setStatementDay(parseInt(e.target.value) || 1)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Payment Due Day (1-31)</label>
              <input
                type="number"
                min={1}
                max={31}
                value={paymentDueDay}
                onChange={(e) => setPaymentDueDay(parseInt(e.target.value) || 1)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 font-mono"
                required
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-lg shadow-purple-600/20 disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Adding...' : 'Add Credit Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
