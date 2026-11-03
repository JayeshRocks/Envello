import React, { useState } from 'react';
import {
  CheckCircle2,
  X,
  RotateCcw,
  Landmark,
  Layers,
  ShieldCheck,
  Receipt,
  AlertCircle,
} from 'lucide-react';
import { formatINR } from '@/lib/accounting/currency';
import type { GreedyDeductionPlan } from '@/lib/accounting/greedyDeduction';
import { ModalPortal } from '@/components/common/ModalPortal';
import { useModalDismiss } from '@/hooks/useModalDismiss';

export interface EnvelopePaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string;
  payee: string;
  totalAmountPaise: bigint;
  envelopeName: string;
  deductionPlan?: GreedyDeductionPlan;
  onRevert: (transactionId: string) => Promise<void>;
}

export const EnvelopePaymentReceiptModal: React.FC<EnvelopePaymentReceiptModalProps> = ({
  isOpen,
  onClose,
  transactionId,
  payee,
  totalAmountPaise,
  envelopeName,
  deductionPlan,
  onRevert,
}) => {
  const [isReverting, setIsReverting] = useState(false);
  const [revertError, setRevertError] = useState<string | null>(null);

  const { handleBackdropClick, handleBackdropTouchMove } = useModalDismiss(isOpen, onClose);

  if (!isOpen) return null;

  const handleRevertClick = async () => {
    setIsReverting(true);
    setRevertError(null);
    try {
      await onRevert(transactionId);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to revert transaction.';
      setRevertError(msg);
      setIsReverting(false);
    }
  };

  const deductions = deductionPlan?.deductions || [];

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleBackdropClick}
        onTouchMove={handleBackdropTouchMove}
      >
        <div
          className="bg-neutral-900 border border-white/10 rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Real-Life Settlement Receipt
                </h3>
                <p className="text-xs text-neutral-400">
                  Recorded via <span className="text-emerald-400 font-medium">{envelopeName}</span> envelope
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isReverting}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Transaction Summary Card */}
          <div className="p-3.5 rounded-2xl bg-neutral-950/70 border border-white/5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Expense Payee
              </span>
              <div className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-xs">
                {payee || 'Expense'}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Total Paid
              </span>
              <div className="text-base sm:text-lg font-mono font-bold text-rose-400">
                -{formatINR(totalAmountPaise)}
              </div>
            </div>
          </div>

          {/* Real-World Guidance Banner */}
          <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-200 text-xs space-y-1">
            <div className="font-semibold flex items-center space-x-1.5 text-sky-100">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>How to complete this in real life:</span>
            </div>
            <p className="text-[11px] text-sky-200/90 leading-relaxed">
              Your digital envelope is funded across liquid accounts. To keep your real bank balances matched with Envello, pay or withdraw from:
            </p>
          </div>

          {/* Account Breakdown List */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center space-x-1.5">
              <Landmark className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bank Deductions ({deductions.length} account{deductions.length > 1 ? 's' : ''})</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {deductions.map((d, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-white/10 bg-neutral-800/60 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                      <Landmark className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">{d.accountName}</div>
                      <div className="text-[11px] text-neutral-400 flex items-center space-x-1">
                        <span>Take from this bank:</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="font-mono font-bold text-emerald-400 text-sm">
                      {formatINR(d.deductedPaise)}
                    </div>
                    <div className="text-[10px] text-neutral-400 font-mono">
                      Remaining hold: {formatINR(d.newRemainingPaise)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Revert error message if any */}
          {revertError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{revertError}</span>
            </div>
          )}

          {/* Invariant guarantee badge */}
          <div className="p-2.5 rounded-xl bg-neutral-950 border border-white/5 text-[11px] text-neutral-400 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <span>Digital ledger updated. Account balances and envelope holds synchronized.</span>
          </div>

          {/* Dual Action Buttons */}
          <div className="pt-2 flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={handleRevertClick}
              disabled={isReverting}
              className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-rose-950/40 border border-rose-500/20 text-rose-400 hover:text-rose-300 text-base sm:text-sm font-medium transition min-h-[44px] active:scale-95 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              {isReverting ? (
                <>
                  <span className="w-4 h-4 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin" />
                  <span>Reverting...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Revert this Transaction</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isReverting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-base sm:text-sm font-semibold shadow-lg shadow-emerald-950/40 transition min-h-[44px] active:scale-95 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark as completed</span>
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
