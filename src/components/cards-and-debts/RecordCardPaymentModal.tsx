import React, { useState } from 'react';
import { X, CreditCard, ArrowRight, ShieldAlert } from 'lucide-react';
import type { CreditCardWithDetails } from '@/lib/api/creditCards';
import type { AccountRow } from '@/lib/api/accounts';
import { formatINR, toPaise } from '@/lib/accounting/currency';

interface RecordCardPaymentModalProps {
  isOpen: boolean;
  cards: CreditCardWithDetails[];
  accounts: AccountRow[];
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

  if (!isOpen) return null;

  const currentCard = cards.find((c) => c.id === selectedCardId) || cards[0];
  const currentAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const handleFillOutstanding = () => {
    if (currentCard) {
      setAmountRupees((currentCard.outstanding_balance_paise / 100).toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCardId) {
      setError('Please select a credit card.');
      return;
    }
    if (!selectedAccountId) {
      setError('Please select a bank account to pay from.');
      return;
    }

    const amt = parseFloat(amountRupees);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid payment amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      const amountPaise = Number(toPaise(amt));

      await onRecordPayment({
        cardId: selectedCardId,
        fromAccountId: selectedAccountId,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-card w-full max-w-md rounded-2xl border border-white/10 p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Record Card Payment</h3>
              <p className="text-xs text-neutral-400">Internal debt settlement (not counted as expense)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition"
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
            <label className="block text-neutral-400 font-medium mb-1">Select Credit Card</label>
            <select
              value={selectedCardId}
              onChange={(e) => setSelectedCardId(e.target.value)}
              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-sky-500"
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
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-sky-500"
              required
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.institution}) — Balance: {formatINR(a.balance_paise)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-neutral-400 font-medium">Payment Amount (₹)</label>
              {currentCard && currentCard.outstanding_balance_paise > 0 && (
                <button
                  type="button"
                  onClick={handleFillOutstanding}
                  className="text-[11px] text-sky-400 hover:underline"
                >
                  Pay Full ({formatINR(currentCard.outstanding_balance_paise)})
                </button>
              )}
            </div>
            <input
              type="number"
              step="any"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              placeholder="0.00"
              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-neutral-500 focus:outline-none focus:border-sky-500 font-mono text-sm"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Statement settled via UPI"
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {currentCard && currentAccount && (
            <div className="p-3 rounded-xl bg-neutral-900/80 border border-white/5 space-y-1 text-[11px] text-neutral-400">
              <div className="flex items-center space-x-1.5 text-neutral-300">
                <span>{currentAccount.name}</span>
                <ArrowRight className="w-3 h-3 text-sky-400" />
                <span>{currentCard.card_name}</span>
              </div>
              <div>Decreases bank spendable cash and reduces credit liability equally.</div>
            </div>
          )}

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
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium shadow-lg shadow-sky-600/20 disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
