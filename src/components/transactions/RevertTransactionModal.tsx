import React, { useMemo } from 'react';
import {
  RotateCcw,
  X,
  AlertTriangle,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Landmark,
  Scale,
} from 'lucide-react';
import type { TransactionRecord } from '@/lib/api/transactions';
import type { EnvelopeWithAllocation } from '@/types/accounting.types';
import type { AccountItem } from '@/lib/api/accounts';
import { formatINR } from '@/lib/accounting/currency';
import { analyzeTransactionReversion } from '@/lib/accounting/revertPolicy';
import { ModalPortal } from '@/components/common/ModalPortal';
import { useModalDismiss } from '@/hooks/useModalDismiss';

interface RevertTransactionModalProps {
  isOpen: boolean;
  transaction: TransactionRecord | null;
  envelopes: EnvelopeWithAllocation[];
  accounts?: AccountItem[];
  isDeleting: boolean;
  onClose: () => void;
  onConfirmRevert: (transactionId: string) => Promise<void>;
}

export const RevertTransactionModal: React.FC<RevertTransactionModalProps> = ({
  isOpen,
  transaction,
  envelopes,
  accounts = [],
  isDeleting,
  onClose,
  onConfirmRevert,
}) => {
  const { handleBackdropClick, handleBackdropTouchMove } = useModalDismiss(isOpen, onClose);

  const analysis = useMemo(() => {
    if (!transaction) return null;
    return analyzeTransactionReversion(transaction, envelopes, new Date(), accounts);
  }, [transaction, envelopes, accounts]);

  if (!isOpen || !transaction || !analysis) return null;

  const { eligibility, impacts, canSafelyRevert, blockingReason } = analysis;

  const handleConfirm = async () => {
    if (!canSafelyRevert || isDeleting) return;
    await onConfirmRevert(transaction.id);
  };

  const getTypeBadge = (type: TransactionRecord['type']) => {
    switch (type) {
      case 'income':
        return {
          label: 'Income',
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          icon: ArrowDownLeft,
        };
      case 'expense':
        return {
          label: 'Expense',
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          icon: ArrowUpRight,
        };
      case 'transfer':
        return {
          label: 'Transfer',
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          icon: ArrowRight,
        };
      case 'envelope_allocation':
        return {
          label: 'Reallocation',
          bg: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
          icon: Layers,
        };
      case 'credit_card_purchase':
        return {
          label: 'Card Purchase',
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          icon: CreditCard,
        };
      case 'credit_card_payment':
        return {
          label: 'Card Payment',
          bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          icon: CreditCard,
        };
      case 'debt_repayment':
        return {
          label: 'Debt Repayment',
          bg: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
          icon: Landmark,
        };
      case 'adjustment':
        return {
          label: 'Reconciliation',
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          icon: Scale,
        };
      default:
        return {
          label: type,
          bg: 'bg-neutral-800 text-neutral-300 border-neutral-700',
          icon: ArrowRight,
        };
    }
  };

  const badge = getTypeBadge(transaction.type);
  const BadgeIcon = badge.icon;

  return (
    <ModalPortal>
      <div
        onClick={handleBackdropClick}
        onTouchMove={handleBackdropTouchMove}
        className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md modal-overlay animate-fade-in"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="revert-modal-title"
          className="bg-neutral-900 border border-amber-500/30 shadow-[0_0_40px_-10px_rgba(245,158,11,0.2)] w-full max-w-lg rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl modal-panel max-h-[90vh] sm:max-h-[88vh] overflow-y-auto transform animate-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center flex-shrink-0 shadow-inner">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 id="revert-modal-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Revert Transaction
                </h3>
                <p className="text-xs text-neutral-400">Review exact ledger impacts before undoing</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="p-2 min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 active:scale-95 transition cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Transaction Summary Card */}
          <div className="p-4 rounded-2xl bg-neutral-950/80 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs text-neutral-400">
                <Calendar className="w-3.5 h-3.5" />
                <span className="font-mono">{transaction.transactionDate}</span>
              </div>
              <span
                className={`inline-flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badge.bg}`}
              >
                <BadgeIcon className="w-3 h-3" />
                <span>{badge.label}</span>
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="text-sm sm:text-base font-semibold text-white truncate max-w-[240px] sm:max-w-[300px]">
                {transaction.description}
              </div>
              <div className="text-lg sm:text-xl font-mono font-bold text-white">
                {formatINR(transaction.totalAmountPaise)}
              </div>
            </div>

            {transaction.notes && (
              <p className="text-xs text-neutral-400 italic bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5 truncate">
                "{transaction.notes}"
              </p>
            )}
          </div>

          {/* Month-End Grace Period or Locked Notice */}
          {eligibility.isMonthEndGracePeriod && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center space-x-2.5">
              <RotateCcw className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span>
                <strong>Month-End Grace Window:</strong> This transaction was recorded at the end of the previous month and is within the 3-day reversal window. Reverted envelope funds will update the previous month and immediately follow the envelope&apos;s rollover policy.
              </span>
            </div>
          )}

          {!eligibility.isReversible && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs flex items-start space-x-2.5">
              <Lock className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-red-200">Historical Transaction Locked</div>
                <div className="text-red-300/90 leading-relaxed">
                  {eligibility.reason ||
                    'Transactions from closed historical months cannot be reverted to protect rollover balances and accounting integrity.'}
                </div>
              </div>
            </div>
          )}

          {/* Blocking Reason for Negative Envelope Risk */}
          {eligibility.isReversible && !canSafelyRevert && blockingReason && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start space-x-2.5 shadow-inner">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-rose-100">Cannot Revert (Negative Envelope Risk)</div>
                <div className="text-rose-200/90 leading-relaxed">{blockingReason}</div>
              </div>
            </div>
          )}

          {/* Detailed Impact Breakdown */}
          {eligibility.isReversible && (
            <div className="space-y-2.5">
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>Exact Ledger Impacts Upon Reversion</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {impacts.map((imp, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                      imp.isRefund
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                        : 'bg-neutral-800/60 border-white/10 text-neutral-300'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold flex items-center space-x-1.5">
                        {imp.isRefund ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        ) : (
                          <ArrowRight className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                        )}
                        <span className="text-white font-medium">{imp.targetName}</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-snug">{imp.description}</p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span
                        className={`font-mono font-bold ${
                          imp.isRefund ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {imp.action === 'credit' ? '+' : '-'}
                        {formatINR(imp.amountPaise)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Safety Guarantee */}
          <div className="p-2.5 rounded-xl bg-neutral-950 border border-white/5 text-[11px] text-neutral-400 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <span>Reversion atomically restores balances with zero calculation drift.</span>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col-reverse xs:flex-row items-stretch xs:items-center justify-end gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="w-full xs:w-auto px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-white/10 text-neutral-300 hover:text-white text-base sm:text-sm font-medium transition min-h-[44px] active:scale-95 flex items-center justify-center cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            {canSafelyRevert ? (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isDeleting}
                className="w-full xs:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-base sm:text-sm font-semibold shadow-lg shadow-rose-950/40 transition min-h-[44px] active:scale-95 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Reverting...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Confirm &amp; Revert</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="w-full xs:w-auto px-5 py-2.5 rounded-xl bg-neutral-800 border border-white/10 text-neutral-500 text-base sm:text-sm font-semibold min-h-[44px] cursor-not-allowed flex items-center justify-center space-x-2"
                title={blockingReason || 'Cannot revert this transaction.'}
              >
                <Lock className="w-4 h-4" />
                <span>Reversion Blocked</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
