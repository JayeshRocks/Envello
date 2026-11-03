import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle, ArrowRight, RotateCcw } from 'lucide-react';
import type { EnvelopeWithAllocation } from '@/types/accounting.types';
import { toPaise, toRupees, formatINR } from '@/lib/accounting/currency';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { ModalPortal } from '@/components/common/ModalPortal';

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

  const { handleBackdropClick, handleBackdropTouchMove } = useModalDismiss(isOpen, onClose);

  useEffect(() => {
    if (envelope) {
      setRupeesInput(toRupees(envelope.allocatedPaise).toString());
      setError(null);
    }
  }, [envelope]);

  if (!isOpen || !envelope) return null;

  const currentEnteredPaise = toPaise(rupeesInput || '0');
  const initialAllocatedPaise = envelope.allocatedPaise;
  const hasChanged = currentEnteredPaise !== initialAllocatedPaise;
  const deltaPaise = currentEnteredPaise - initialAllocatedPaise;

  const handleShortcutAdd = (amountRupees: number) => {
    const current = parseFloat(rupeesInput) || 0;
    setRupeesInput((current + amountRupees).toString());
  };

  const handleResetToCurrent = () => {
    setRupeesInput(toRupees(initialAllocatedPaise).toString());
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
    <ModalPortal>
      <div
        onClick={handleBackdropClick}
        onTouchMove={handleBackdropTouchMove}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/65 backdrop-blur-md sm:backdrop-blur-lg modal-overlay animate-fade-in"
      >
        <div className="max-w-md w-full bg-neutral-900 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-4 sm:space-y-5 border border-white/15 shadow-2xl relative max-h-[90vh] sm:max-h-[88vh] overflow-y-auto modal-panel">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 sm:p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center active:scale-95 transition"
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
              <div className="flex items-center justify-between text-xs font-medium text-neutral-300">
                <span>Budget Amount (₹ INR)</span>
                <div className="flex items-center space-x-1.5 font-mono text-[11px]">
                  <span className="text-sky-400">{formatINR(currentEnteredPaise)}</span>
                  {hasChanged && (
                    <span
                      className={
                        deltaPaise > 0n
                          ? 'text-emerald-400 font-semibold'
                          : 'text-amber-400 font-semibold'
                      }
                    >
                      ({deltaPaise > 0n ? `+${formatINR(deltaPaise)}` : `-${formatINR(-deltaPaise)}`})
                    </span>
                  )}
                </div>
              </div>
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

            {/* Quick Increment Shortcuts & In-Modal Undo / Reset */}
            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
              <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5">
                <span className="text-[11px] text-neutral-500">Quick Add:</span>
                {[500, 1000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleShortcutAdd(amt)}
                    className="text-xs px-2.5 py-1.5 min-h-[36px] rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-white/5 text-neutral-300 hover:text-white font-mono transition active:scale-95 flex items-center"
                  >
                    +₹{amt.toLocaleString('en-IN')}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setRupeesInput('0')}
                  className="text-xs px-2 py-1.5 min-h-[36px] rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-white/5 text-neutral-400 hover:text-white transition active:scale-95 flex items-center"
                  title="Clear to ₹0"
                >
                  Clear
                </button>
              </div>

              {hasChanged && (
                <button
                  type="button"
                  onClick={handleResetToCurrent}
                  className="text-xs text-sky-400 hover:text-sky-300 flex items-center space-x-1.5 transition active:scale-95 px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 min-h-[36px]"
                  title="Undo uncommitted changes and revert to original budget"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Undo Edits</span>
                </button>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-semibold transition shadow-lg shadow-sky-500/25 active:scale-[0.98] min-h-[44px]"
              >
                <span>{isSubmitting ? 'Saving Allocation...' : 'Save Allocation'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};
