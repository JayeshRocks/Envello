import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Sparkles,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  ShieldAlert,
  Landmark,
  Plus,
  Trash2,
} from 'lucide-react';
import type { EnvelopeWithAllocation } from '@/types/accounting.types';
import type { AccountItem } from '@/lib/api/accounts';
import { toPaise, toRupees, formatINR } from '@/lib/accounting/currency';
import { useModalDismiss } from '@/hooks/useModalDismiss';
import { ModalPortal } from '@/components/common/ModalPortal';

export interface FundingRow {
  id: string;
  accountId: string;
  amountRupees: string;
}

interface AllocateModalProps {
  isOpen: boolean;
  envelope: EnvelopeWithAllocation | null;
  accounts?: AccountItem[];
  onRefreshAccounts?: () => Promise<void>;
  onClose: () => void;
  onAllocate: (
    envelopeId: string,
    amountPaise: bigint,
    fundingSources?: Array<{ accountId: string; amountPaise: bigint }>
  ) => Promise<void>;
}

export const AllocateModal: React.FC<AllocateModalProps> = ({
  isOpen,
  envelope,
  accounts = [],
  onRefreshAccounts,
  onClose,
  onAllocate,
}) => {
  const [fundingRows, setFundingRows] = useState<FundingRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleBackdropClick, handleBackdropTouchMove } = useModalDismiss(isOpen, onClose);

  const activeAccounts = useMemo(
    () => accounts.filter((a) => a.isActive !== false),
    [accounts]
  );

  // Trigger accounts refresh when modal opens to guarantee absolute latest balances
  useEffect(() => {
    if (isOpen) {
      onRefreshAccounts?.();
    }
  }, [isOpen, onRefreshAccounts]);

  // Calculate available headroom for a specific account for this envelope
  // Headroom = free unallocated balance + any existing hold this account already has on THIS envelope
  const getAccountHeadroomPaise = useCallback(
    (accId: string): bigint => {
      if (!envelope) return 0n;
      const acc = activeAccounts.find((a) => a.id === accId);
      if (!acc) return 0n;
      const existingHold =
        (envelope.sources || []).find((s) => s.accountId === accId)?.amountPaise ?? 0n;
      const freePaise = acc.unallocatedPaise ?? acc.balancePaise;
      const totalAvailable = freePaise + existingHold;
      return totalAvailable > acc.balancePaise ? acc.balancePaise : totalAvailable;
    },
    [envelope, activeAccounts]
  );

  // Helper to build initial rows from envelope
  const buildInitialRows = useCallback((): FundingRow[] => {
    if (!envelope) return [];

    const existingSources = (envelope.sources || []).filter((s) => s.amountPaise > 0n);
    if (existingSources.length > 0) {
      return existingSources.map((s) => ({
        id: s.id || Math.random().toString(36).substring(2, 9),
        accountId: s.accountId,
        amountRupees: toRupees(s.amountPaise).toString(),
      }));
    }

    // Default to primary liquid account (stable by created_at, NOT by balance)
    const primaryAcc = activeAccounts[0];
    const defaultAccId = primaryAcc?.id || '';

    return [
      {
        id: Math.random().toString(36).substring(2, 9),
        accountId: defaultAccId,
        amountRupees:
          envelope.allocatedPaise > 0n ? toRupees(envelope.allocatedPaise).toString() : '',
      },
    ];
  }, [envelope, activeAccounts]);

  // Reset/Initialize state when envelope changes or modal opens
  useEffect(() => {
    if (envelope && isOpen) {
      setError(null);
      setFundingRows(buildInitialRows());
    }
  }, [envelope, isOpen, buildInitialRows]);

  if (!isOpen || !envelope) return null;

  // Selected and unused accounts
  const selectedAccountIds = new Set(fundingRows.map((r) => r.accountId).filter(Boolean));
  const availableUnusedAccounts = activeAccounts.filter((a) => !selectedAccountIds.has(a.id));

  // Total budget entered across all rows
  const totalEnteredPaise = fundingRows.reduce(
    (sum, r) => sum + toPaise(r.amountRupees || '0'),
    0n
  );
  const initialAllocatedPaise = envelope.allocatedPaise;
  const hasChanged = totalEnteredPaise !== initialAllocatedPaise;
  const deltaPaise = totalEnteredPaise - initialAllocatedPaise;

  const minRequiredPaise =
    envelope.spentPaise > envelope.carriedOverPaise
      ? envelope.spentPaise - envelope.carriedOverPaise
      : 0n;
  const isBelowMin = totalEnteredPaise < minRequiredPaise;

  // Check if each row is valid (filled with valid amount > 0 and within headroom)
  const isRowFilledAndValid = (row: FundingRow): boolean => {
    if (!row.accountId) return false;
    const paise = toPaise(row.amountRupees || '0');
    if (paise <= 0n) return false;
    const headroom = getAccountHeadroomPaise(row.accountId);
    return paise <= headroom;
  };

  // Check headroom violation across all rows
  const hasAnyHeadroomViolation = fundingRows.some((r) => {
    const paise = toPaise(r.amountRupees || '0');
    const headroom = getAccountHeadroomPaise(r.accountId);
    return paise > headroom;
  });

  // "Add from another account" unlocks ONLY when:
  // 1. Current rows are all filled with valid amounts and within headroom
  // 2. There is at least one unused active liquid account remaining
  const canAddAnotherAccount =
    fundingRows.length > 0 &&
    fundingRows.every(isRowFilledAndValid) &&
    availableUnusedAccounts.length > 0;

  const handleAddAccountRow = () => {
    if (!canAddAnotherAccount || availableUnusedAccounts.length === 0) return;
    const nextAcc = availableUnusedAccounts[0];
    setFundingRows((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substring(2, 9),
        accountId: nextAcc.id,
        amountRupees: '',
      },
    ]);
  };

  const handleRemoveRow = (indexToRemove: number) => {
    if (fundingRows.length <= 1) return;
    setFundingRows((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAccountChange = (rowIndex: number, newAccountId: string) => {
    setFundingRows((prev) =>
      prev.map((row, idx) => (idx === rowIndex ? { ...row, accountId: newAccountId } : row))
    );
  };

  const handleAmountChange = (rowIndex: number, newAmountRupees: string) => {
    setFundingRows((prev) =>
      prev.map((row, idx) => (idx === rowIndex ? { ...row, amountRupees: newAmountRupees } : row))
    );
  };

  // Quick Add shortcuts apply to the last funding row
  const activeRowIndex = fundingRows.length - 1;
  const activeRow = fundingRows[activeRowIndex];

  const handleShortcutAdd = (amountRupees: number) => {
    if (!activeRow) return;
    const current = parseFloat(activeRow.amountRupees) || 0;
    handleAmountChange(activeRowIndex, (current + amountRupees).toString());
  };

  const handleShortcutClear = () => {
    if (!activeRow) return;
    handleAmountChange(activeRowIndex, '0');
  };

  const handleResetToCurrent = () => {
    setFundingRows(buildInitialRows());
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (totalEnteredPaise < 0n) {
      setError('Allocation amount cannot be negative.');
      return;
    }

    if (totalEnteredPaise < minRequiredPaise) {
      setError(
        `Cannot set allocation to ${formatINR(totalEnteredPaise)}. This envelope has already spent ${formatINR(envelope.spentPaise)} this month. Minimum allowable budget is ${formatINR(minRequiredPaise)}.`
      );
      return;
    }

    // Check row headroom violations
    for (const row of fundingRows) {
      const rowPaise = toPaise(row.amountRupees || '0');
      const headroom = getAccountHeadroomPaise(row.accountId);
      const acc = activeAccounts.find((a) => a.id === row.accountId);
      if (rowPaise > headroom) {
        setError(
          `Cannot allocate ${formatINR(rowPaise)} from ${acc?.name || 'this account'}. Maximum available headroom is ${formatINR(headroom)}.`
        );
        return;
      }
    }

    // Build backing fundingSources array
    const validSources = fundingRows
      .filter((r) => r.accountId && toPaise(r.amountRupees || '0') > 0n)
      .map((r) => ({
        accountId: r.accountId,
        amountPaise: toPaise(r.amountRupees || '0'),
      }));

    setIsSubmitting(true);
    try {
      await onAllocate(envelope.id, totalEnteredPaise, validSources);
      onClose();
      onRefreshAccounts?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update allocation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSave =
    !isBelowMin &&
    !hasAnyHeadroomViolation &&
    !isSubmitting &&
    (totalEnteredPaise > 0n || minRequiredPaise === 0n);

  return (
    <ModalPortal>
      <div
        onClick={handleBackdropClick}
        onTouchMove={handleBackdropTouchMove}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/65 backdrop-blur-md sm:backdrop-blur-lg modal-overlay animate-fade-in"
      >
        <div className="max-w-lg w-full bg-neutral-900 rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-4 sm:space-y-5 border border-white/15 shadow-2xl relative max-h-[90vh] sm:max-h-[88vh] overflow-y-auto modal-panel">
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
              Set the designated spending allowance for this category backed by holds on your liquid accounts.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Total Budget Summary Header Card */}
            <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-neutral-300">
                <span>Total Envelope Budget</span>
                <div className="flex items-center space-x-1.5 font-mono text-[11px]">
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
                  <span className="text-neutral-400">Previous: {formatINR(initialAllocatedPaise)}</span>
                </div>
              </div>

              <div className="flex items-baseline space-x-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight tabular-nums">
                  {formatINR(totalEnteredPaise)}
                </span>
                {envelope.spentPaise > 0n && (
                  <span className="text-xs text-neutral-400 font-mono">
                    (Spent: {formatINR(envelope.spentPaise)})
                  </span>
                )}
              </div>

              {isBelowMin && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                  <span>
                    Already spent {formatINR(envelope.spentPaise)}. Total budget cannot be lower than {formatINR(minRequiredPaise)}.
                  </span>
                </div>
              )}
            </div>

            {/* Funding Sources Section (Multi-Account Allocation) */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-200">
                <div className="flex items-center space-x-1.5">
                  <Landmark className="w-3.5 h-3.5 text-sky-400" />
                  <span>Funding Bank Accounts</span>
                </div>
                <span className="text-[11px] text-neutral-400 font-normal">
                  Puts an explicit hold on each bank
                </span>
              </div>

              {/* Funding Rows */}
              <div className="space-y-3">
                {fundingRows.map((row, index) => {
                  const isLocked = index < fundingRows.length - 1;
                  const rowPaise = toPaise(row.amountRupees || '0');
                  const headroomPaise = getAccountHeadroomPaise(row.accountId);
                  const isRowExceeding = rowPaise > headroomPaise;
                  const acc = activeAccounts.find((a) => a.id === row.accountId);

                  return (
                    <div
                      key={row.id}
                      className="p-3.5 rounded-xl bg-neutral-950/60 border border-white/10 space-y-2.5 transition-all"
                    >
                      {/* Row Header: Account Dropdown & Remove Button */}
                      <div className="flex items-center space-x-2">
                        <div className="flex-1">
                          <label className="text-[11px] font-medium text-neutral-400 block mb-1">
                            {index === 0 ? 'Primary Funding Account' : `Additional Account #${index + 1}`}
                          </label>
                          <select
                            value={row.accountId}
                            disabled={isLocked}
                            onChange={(e) => handleAccountChange(index, e.target.value)}
                            className={`w-full px-3 py-2 rounded-lg text-base sm:text-xs text-white border focus:ring-1 focus:ring-sky-500 ${
                              isLocked
                                ? 'bg-neutral-900/80 border-white/5 opacity-80 cursor-not-allowed text-neutral-300'
                                : 'bg-neutral-900 border-white/10'
                            }`}
                          >
                            {activeAccounts.map((a) => {
                              const isOtherRowSelected =
                                a.id !== row.accountId && selectedAccountIds.has(a.id);
                              const aHeadroom = getAccountHeadroomPaise(a.id);

                              return (
                                <option
                                  key={a.id}
                                  value={a.id}
                                  disabled={isOtherRowSelected}
                                  className="bg-neutral-900 text-white"
                                >
                                  {a.name}
                                  {isOtherRowSelected
                                    ? ' (Already selected)'
                                    : ` • Max: ${formatINR(aHeadroom)}`}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* Revert / Remove Row Button (Available for rows beyond the first) */}
                        {index > 0 && (
                          <div className="pt-5">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(index)}
                              title="Revert and remove this funding account"
                              className="p-2 sm:p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition active:scale-90 min-h-[44px] min-w-[44px] sm:min-h-[38px] sm:min-w-[38px] flex items-center justify-center cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Row Amount Input & Headroom Indicator */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-neutral-400">Amount to Allocate (₹ INR)</span>
                          <span className="text-neutral-400 font-mono">
                            Max Available: <span className="text-sky-400 font-semibold">{formatINR(headroomPaise)}</span>
                          </span>
                        </div>

                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-medium text-sm">
                            ₹
                          </span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            max={toRupees(headroomPaise)}
                            value={row.amountRupees}
                            onChange={(e) => handleAmountChange(index, e.target.value)}
                            placeholder="0.00"
                            required={index === 0}
                            className={`w-full pl-7 pr-3 py-2 rounded-lg glass-input text-base sm:text-sm font-mono text-white placeholder-neutral-500 focus:ring-1 tabular-nums ${
                              isRowExceeding
                                ? 'border-red-500/60 focus:ring-red-500'
                                : 'focus:ring-sky-500'
                            }`}
                          />
                        </div>

                        {isRowExceeding && (
                          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center space-x-2 animate-fade-in">
                            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-red-400" />
                            <span>
                              Exceeds available headroom in {acc?.name || 'account'} (Max: {formatINR(headroomPaise)}). Cannot over-allocate from this bank.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* "Add from another account" Action Button */}
              <div className="pt-1">
                <button
                  type="button"
                  disabled={!canAddAnotherAccount}
                  onClick={handleAddAccountRow}
                  title={
                    canAddAnotherAccount
                      ? 'Add funds from another liquid bank account'
                      : availableUnusedAccounts.length === 0
                      ? 'All active liquid bank accounts have been added'
                      : 'Fill in the current account amount to unlock adding another account'
                  }
                  className={`w-full py-2.5 px-3 rounded-xl border flex items-center justify-center space-x-2 text-xs font-semibold transition active:scale-95 min-h-[44px] ${
                    canAddAnotherAccount
                      ? 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border-sky-500/30 cursor-pointer shadow-sm shadow-sky-500/10'
                      : 'bg-neutral-900/40 text-neutral-500 border-white/5 cursor-not-allowed opacity-50'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Add from another account</span>
                </button>

                {!canAddAnotherAccount && (
                  <p className="text-[10px] text-neutral-500 text-center mt-1">
                    {availableUnusedAccounts.length === 0
                      ? 'All active liquid accounts have already been selected'
                      : 'Enter a valid amount within account headroom to unlock adding another account'}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Increment Shortcuts & In-Modal Reset */}
            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
              <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5">
                <span className="text-[11px] text-neutral-500">Quick Add:</span>
                {[500, 1000, 5000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleShortcutAdd(amt)}
                    className="text-xs px-2.5 py-1.5 min-h-[36px] rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-white/5 text-neutral-300 hover:text-white font-mono transition active:scale-95 flex items-center cursor-pointer"
                  >
                    +₹{amt.toLocaleString('en-IN')}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleShortcutClear}
                  className="text-xs px-2 py-1.5 min-h-[36px] rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-white/5 text-neutral-400 hover:text-white transition active:scale-95 flex items-center cursor-pointer"
                  title="Clear amount to ₹0"
                >
                  Clear
                </button>
              </div>

              {hasChanged && (
                <button
                  type="button"
                  onClick={handleResetToCurrent}
                  className="text-xs text-sky-400 hover:text-sky-300 flex items-center space-x-1.5 transition active:scale-95 px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 min-h-[36px] cursor-pointer"
                  title="Undo uncommitted changes and revert to original budget"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Undo Edits</span>
                </button>
              )}
            </div>

            {/* Protected Reserve Reduction Warning Banner */}
            {Boolean(envelope.isProtected || envelope.isSystemReserved) && deltaPaise < 0n && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs space-y-1">
                <div className="flex items-center space-x-1.5 font-semibold text-amber-300">
                  <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Reducing Protected Reserve</span>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  You are reducing your planned allocation for "{envelope.name}" by {formatINR(-deltaPaise)}.
                </p>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={!canSave}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 disabled:pointer-events-none text-white text-sm font-semibold transition shadow-lg shadow-sky-500/25 active:scale-[0.98] min-h-[44px] cursor-pointer"
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
