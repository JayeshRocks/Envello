import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import type { EnvelopeWithAllocation } from '@/types/accounting.types';
import { toPaise, toRupees, formatINR } from '@/lib/accounting/currency';
import { useModalDismiss } from '@/hooks/useModalDismiss';

interface AllocateModalProps {
  isOpen: boolean;
  envelope: EnvelopeWithAllocation | null;
  onClose: () => void;
  onAllocate: (envelopeId: string, amountPaise: bigint) => Promise<void>;
}

export const AllocateModal: React.FC<AllocateModalProps> = ({
  isOpen,
  envelope,
  onClose,
  onAllocate,
}) => {
  const [rupeesInput, setRupeesInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleBackdropClick } = useModalDismiss(isOpen, onClose);

  useEffect(() => {
    if (envelope) {
      setRupeesInput(toRupees(envelope.allocatedPaise).toString());
      setError(null);
    }
  }, [envelope]);

  if (!isOpen || !envelope) return null;

  const currentEnteredPaise = toPaise(rupeesInput || '0');

  const handleShortcutAdd = (amountRupees: number) => {
    const current = parseFloat(rupeesInput) || 0;
    setRupeesInput((current + amountRupees).toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (currentEnteredPaise < 0n) {
      setError('Allocation amount cannot be negative.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAllocate(envelope.id, currentEnteredPaise);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update allocation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="max-w-md w-full glass-card rounded-t-3xl sm:rounded-2xl p-5 sm:p-7 space-y-4 sm:space-y-5 border-t sm:border border-white/10 shadow-2xl relative max-h-[92vh] sm:max-h-[90vh] overflow-y-auto modal-panel">
        <div className="w-12 h-1 rounded-full bg-white/20 mx-auto -mt-1 mb-2 sm:hidden flex-shrink-0" />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 sm:p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn min-h-[38px] min-w-[38px] flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Monthly Budgeting</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Allocate to {envelope.name}
          </h2>
          <p className="text-xs text-neutral-400">
            Set the designated spending allowance for this category for the active month.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300 flex items-center justify-between">
              <span>Budget Amount (₹ INR)</span>
              <span className="text-[11px] font-mono text-sky-400">
                {formatINR(currentEnteredPaise)}
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-medium text-sm">
                ₹
              </span>
              <input
                type="number"
                step="any"
                min="0"
                value={rupeesInput}
                onChange={(e) => setRupeesInput(e.target.value)}
                placeholder="0.00"
                required
                autoFocus
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl glass-input text-base font-mono text-white placeholder-neutral-500 focus:ring-1 focus:ring-sky-500 tabular-nums"
              />
            </div>
          </div>

          {/* Quick Increment Shortcuts */}
          <div className="flex items-center space-x-2 pt-1">
            <span className="text-[11px] text-neutral-500">Quick Add:</span>
            {[500, 1000, 5000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => handleShortcutAdd(amt)}
                className="text-xs px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-white/5 text-neutral-300 hover:text-white font-mono transition"
              >
                +₹{amt.toLocaleString('en-IN')}
              </button>
            ))}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-semibold transition shadow-lg shadow-sky-500/25"
            >
              <span>{isSubmitting ? 'Saving Allocation...' : 'Save Allocation'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
