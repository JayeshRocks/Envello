import React, { useState } from 'react';
import { X, RefreshCw, ShieldAlert } from 'lucide-react';
import { toPaise } from '@/lib/accounting/currency';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { ModalPortal } from '@/components/common/ModalPortal';

interface AddSelfEmiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEmi: (params: {
    description: string;
    total_funded_paise: number;
    monthly_reimbursement_paise: number;
    start_date?: string;
  }) => Promise<void>;
}

export const AddSelfEmiModal: React.FC<AddSelfEmiModalProps> = ({
  isOpen,
  onClose,
  onAddEmi,
}) => {
  const [description, setDescription] = useState('');
  const [totalFundedRupees, setTotalFundedRupees] = useState('');
  const [monthlyRupees, setMonthlyRupees] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleBackdropClick, handleBackdropTouchMove } = useModalDismiss(isOpen, onClose);

  if (!isOpen) return null;

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

      await onAddEmi({
        description: description.trim(),
        total_funded_paise: totalPaise,
        monthly_reimbursement_paise: monthlyPaise,
        start_date: startDate,
      });

      setDescription('');
      setTotalFundedRupees('');
      setMonthlyRupees('');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create self EMI';
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
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Add Self EMI</h3>
              <p className="text-xs text-neutral-400">Track personal capital reimbursement into savings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 sm:p-2 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn active:scale-95 transition"
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
            <label className="block text-neutral-400 font-medium mb-1">Item / Goal Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. MacBook Pro, Vacation Advance, Camera Lens"
              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Total Funded (₹)</label>
              <input
                type="number"
                step="any"
                value={totalFundedRupees}
                onChange={(e) => setTotalFundedRupees(e.target.value)}
                placeholder="60000"
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-neutral-400 font-medium mb-1">Monthly Reimbursement (₹)</label>
              <input
                type="number"
                step="any"
                value={monthlyRupees}
                onChange={(e) => setMonthlyRupees(e.target.value)}
                placeholder="5000"
                className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-neutral-400 font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 sm:py-2 text-base sm:text-sm text-white focus:outline-none focus:border-indigo-500"
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
              className="flex-1 sm:flex-none px-5 py-2.5 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition active:scale-95"
            >
              {isSubmitting ? 'Adding...' : 'Add Self EMI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  </ModalPortal>
);
};
