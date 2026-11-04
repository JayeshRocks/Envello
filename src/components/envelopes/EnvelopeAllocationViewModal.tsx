import React from 'react';
import { X, Landmark, Layers, ShieldCheck } from 'lucide-react';
import type { EnvelopeWithAllocation, AllocationSourceRecord } from '@/types/accounting.types';
import type { AccountItem } from '@/lib/api/accounts';
import { formatINR } from '@/lib/accounting/currency';
import { ModalPortal } from '@/components/common/ModalPortal';
import { useModalDismiss } from '@/hooks/useModalDismiss';

interface EnvelopeAllocationViewModalProps {
  isOpen: boolean;
  envelope: EnvelopeWithAllocation | null;
  accounts?: AccountItem[];
  onClose: () => void;
  onModifyBudget?: () => void;
}

export const EnvelopeAllocationViewModal: React.FC<EnvelopeAllocationViewModalProps> = ({
  isOpen,
  envelope,
  accounts = [],
  onClose,
  onModifyBudget,
}) => {
  const { handleBackdropClick, handleBackdropTouchMove } = useModalDismiss(isOpen, onClose);

  if (!isOpen || !envelope) return null;

  const sources: AllocationSourceRecord[] = envelope.sources || [];
  const totalAllocated = envelope.allocatedPaise;
  const isProtected = Boolean(envelope.isProtected ?? envelope.isSystemReserved);

  // Map account metadata for extra context
  const accMap = new Map(accounts.map((a) => [a.id, a]));

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleBackdropClick}
        onTouchMove={handleBackdropTouchMove}
      >
        <div
          className="bg-neutral-900 border border-white/10 rounded-2xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 text-white"
                style={{
                  backgroundColor: `${envelope.color || '#38bdf8'}25`,
                  color: envelope.color || '#38bdf8',
                }}
              >
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center space-x-1.5">
                  <span>{envelope.name}</span>
                  {isProtected && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                      Protected Reserve
                    </span>
                  )}
                </h3>
                <p className="text-xs text-neutral-400">Account Allocation Breakdown</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Allocation Metric Highlight */}
          <div className="p-4 rounded-2xl bg-neutral-950/70 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Total Budget Allocated
              </span>
              <span className="text-lg font-mono font-bold text-white">
                {formatINR(totalAllocated)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-400 border-t border-white/5 pt-2">
              <span>Available to spend:</span>
              <span className="font-mono text-emerald-400 font-semibold">
                {formatINR(envelope.availablePaise)}
              </span>
            </div>
          </div>

          {/* Backing Accounts List */}
          <div className="space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center space-x-1.5">
              <Landmark className="w-3.5 h-3.5 text-sky-400" />
              <span>
                Funding Account Sources ({totalAllocated > 0n && sources.length > 0 ? sources.length : 0})
              </span>
            </div>

            {totalAllocated === 0n || sources.length === 0 ? (
              <div className="p-5 rounded-2xl bg-neutral-950/60 border border-white/5 text-center space-y-1.5 animate-in fade-in">
                <div className="text-xs font-semibold text-neutral-300">
                  Currently no budget allocated
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed max-w-xs mx-auto">
                  This envelope has ₹0 allocated for the current month. Tap &quot;Modify Budget&quot; below to assign funds from your liquid accounts.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {sources.map((src) => {
                  const acc = accMap.get(src.accountId);
                  const sharePercent =
                    totalAllocated > 0n
                      ? Number((src.amountPaise * 100n) / totalAllocated)
                      : 100;

                  return (
                    <div
                      key={src.id}
                      className="p-3 rounded-xl border border-white/10 bg-neutral-800/60 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 flex-shrink-0">
                            <Landmark className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate">
                              {src.accountName || acc?.name || 'Liquid Account'}
                            </div>
                            {acc && (
                              <div className="text-[10px] text-neutral-400 font-mono">
                                Bank Total: {formatINR(acc.balancePaise)}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <div className="font-mono font-bold text-sky-400 text-sm">
                            {formatINR(src.amountPaise)}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-mono">
                            {sharePercent}% of budget
                          </div>
                        </div>
                      </div>

                      {/* Progress bar representing share */}
                      <div className="w-full h-1 rounded-full bg-neutral-900 overflow-hidden">
                        <div
                          className="h-full bg-sky-400 rounded-full"
                          style={{ width: `${Math.max(4, Math.min(100, sharePercent))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Guarantee info */}
          <div className="p-2.5 rounded-xl bg-neutral-950 border border-white/5 text-[11px] text-neutral-400 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>
              Funds allocated to this envelope place a hold on their respective bank accounts, keeping them safe from other spending.
            </span>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end space-x-2.5">
            {onModifyBudget && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onModifyBudget();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-base sm:text-sm font-semibold transition min-h-[44px] active:scale-95 flex items-center justify-center cursor-pointer shadow-lg shadow-sky-500/20"
              >
                Modify Budget
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
