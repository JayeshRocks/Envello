import React, { useState } from 'react';
import { X, Target, ShieldAlert } from 'lucide-react';
import { toPaise } from '@/lib/accounting/currency';
import { useModalDismiss } from '@/hooks/useModalDismiss';

interface AddMonthlyTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTarget: (params: {
    title: string;
    target_amount_paise: number;
    target_date: string;
    current_contributed_paise?: number;
  }) => Promise<void>;
}

export const AddMonthlyTargetModal: React.FC<AddMonthlyTargetModalProps> = ({
  isOpen,
  onClose,
  onAddTarget,
}) => {
  const [title, setTitle] = useState('');
  const [targetAmountRupees, setTargetAmountRupees] = useState('');
  const [initialContributedRupees, setInitialContributedRupees] = useState('');
  const [targetDate, setTargetDate] = useState(() => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.toISOString().split('T')[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleBackdropClick } = useModalDismiss(isOpen, onClose);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Target title is required.');
      return;
    }

    const amt = parseFloat(targetAmountRupees);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid target amount.');
      return;
    }

    try {
      setIsSubmitting(true);
      const targetPaise = Number(toPaise(amt));
      const initialContribNum = parseFloat(initialContributedRupees) || 0;
      const initialContribPaise = Number(toPaise(initialContribNum));

      await onAddTarget({
        title: title.trim(),
        target_amount_paise: targetPaise,
        target_date: targetDate,
        current_contributed_paise: initialContribPaise,
      });

      setTitle('');
      setTargetAmountRupees('');
      setInitialContributedRupees('');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add target';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in"
    >
      <div className="glass-card w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-white/10 p-6 space-y-5 shadow-2xl modal-panel max-h-[92vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Mobile drag handle */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto -mt-1 mb-2 sm:hidden flex-shrink-0" />

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Add Monthly Target</h3>
              <p className="text-xs text-neutral-400">Pillar 6: Future planning goals (not yet deducted)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 sm:p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn"
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
            <label className="block text-neutral-400 font-medium mb-1">Target Goal Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Next Month Rent, New Phone, Annual Insurance"
              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Target Amount (₹)</label>
              <input
                type="number"
                step="any"
                value={targetAmountRupees}
                onChange={(e) => setTargetAmountRupees(e.target.value)}
                placeholder="25000"
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Initial Saved (₹)</label>
              <input
                type="number"
                step="any"
                value={initialContributedRupees}
                onChange={(e) => setInitialContributedRupees(e.target.value)}
                placeholder="0"
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-neutral-400 font-medium mb-1">Target Date</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 min-h-[44px] rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-5 py-2.5 min-h-[44px] rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-lg shadow-cyan-600/20 disabled:opacity-50 transition active:scale-95"
            >
              {isSubmitting ? 'Adding...' : 'Create Target'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
