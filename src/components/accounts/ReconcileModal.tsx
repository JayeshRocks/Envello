import React, { useState, useEffect } from 'react';
import {
  Scale,
  X,
  CheckCircle2,
  AlertTriangle,
  History,
  TrendingUp,
  TrendingDown,
  Loader2,
  Calendar,
  FileText,
} from 'lucide-react';
import { formatINR, toPaise, toRupees } from '@/lib/accounting/currency';
import { calculateReconciliationDiscrepancy } from '@/lib/accounting/calculations';
import { useReconciliation } from '@/hooks/useReconciliation';
import type { AccountItem } from '@/lib/api/accounts';

interface ReconcileModalProps {
  accounts: AccountItem[];
  initialAccountId?: string;
  isOpen: boolean;
  onClose: () => void;
  onReconciliationComplete: () => Promise<void>;
}

export const ReconcileModal: React.FC<ReconcileModalProps> = ({
  accounts,
  initialAccountId,
  isOpen,
  onClose,
  onReconciliationComplete,
}) => {
  const activeAccounts = accounts.filter(acc => acc.isActive);
  const defaultAccountId = initialAccountId || (activeAccounts[0]?.id ?? '');

  const [selectedAccountId, setSelectedAccountId] = useState<string>(defaultAccountId);
  const [statementBalanceStr, setStatementBalanceStr] = useState<string>('');
  const [statementDate, setStatementDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [reason, setReason] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'reconcile' | 'history'>('reconcile');

  const {
    auditLogs,
    isLoadingLogs,
    isSubmitting,
    error,
    setError,
    loadAuditLogs,
    submitReconciliation,
  } = useReconciliation(defaultAccountId);

  useEffect(() => {
    if (initialAccountId) {
      setSelectedAccountId(initialAccountId);
    } else if (activeAccounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(activeAccounts[0].id);
    }
  }, [initialAccountId, activeAccounts, selectedAccountId]);

  useEffect(() => {
    if (selectedAccountId) {
      loadAuditLogs(selectedAccountId);
      const acc = activeAccounts.find(a => a.id === selectedAccountId);
      if (acc) {
        setStatementBalanceStr(toRupees(acc.balancePaise).toString());
      }
    }
  }, [selectedAccountId, loadAuditLogs]);

  if (!isOpen) return null;

  const currentAccount = activeAccounts.find(a => a.id === selectedAccountId);
  const currentLedgerPaise = currentAccount ? currentAccount.balancePaise : 0n;

  // Calculate live discrepancy
  let statementPaise: bigint = currentLedgerPaise;
  try {
    if (statementBalanceStr.trim() !== '') {
      statementPaise = toPaise(statementBalanceStr);
    }
  } catch {
    statementPaise = currentLedgerPaise;
  }

  const discrepancyResult = calculateReconciliationDiscrepancy(statementPaise, currentLedgerPaise);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount) return;
    setError(null);

    if (discrepancyResult.status !== 'matched' && !reason.trim()) {
      setError('Please provide a reason for the discrepancy adjustment.');
      return;
    }

    try {
      await submitReconciliation({
        accountId: currentAccount.id,
        statementBalancePaise: statementPaise,
        statementDate,
        reason: reason.trim() || 'Verified statement match',
      });

      await onReconciliationComplete();
      onClose();
    } catch {
      // Error handled by hook
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="max-w-xl w-full glass-card rounded-2xl p-6 sm:p-7 space-y-5 border border-white/10 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          aria-label="Close Reconciliation Modal"
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
            <Scale className="w-3.5 h-3.5" />
            <span>Bank Statement Reconciliation</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">Reconcile Account Balance</h2>
          <p className="text-xs text-neutral-400">
            Compare calculated ledger balance to your physical bank statement. Discrepancies are audit-logged and never silently mutated.
          </p>
        </div>

        {/* Tab switcher: Reconcile vs Audit History */}
        <div className="flex items-center space-x-1 p-1 rounded-xl bg-neutral-900 border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('reconcile')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'reconcile'
                ? 'bg-sky-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Reconciliation</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center space-x-1.5 ${
              activeTab === 'history'
                ? 'bg-sky-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Audit History ({auditLogs.length})</span>
          </button>
        </div>

        {/* Account Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-300">Select Account</label>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-neutral-900/80 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-500"
          >
            {activeAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.institution}) — Current: {formatINR(acc.balancePaise)}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {activeTab === 'reconcile' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Balance Comparison Surface */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-neutral-900/50 border border-white/5 space-y-1">
                <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                  Calculated Ledger Balance
                </span>
                <div className="text-xl font-bold font-mono text-sky-400 tabular-nums">
                  {formatINR(currentLedgerPaise)}
                </div>
                <p className="text-[10px] text-neutral-500">Sum of all persisted transactions</p>
              </div>

              <div className="p-3.5 rounded-xl bg-neutral-900/50 border border-white/5 space-y-1">
                <label className="text-[11px] font-medium text-neutral-300 uppercase tracking-wider block">
                  Statement Closing Balance (₹)
                </label>
                <input
                  type="text"
                  value={statementBalanceStr}
                  onChange={(e) => setStatementBalanceStr(e.target.value)}
                  placeholder="e.g. 125000.50"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-white/10 text-base font-bold font-mono text-white focus:outline-none focus:border-sky-500 tabular-nums"
                  required
                />
                <p className="text-[10px] text-neutral-500">From bank netbanking / PDF</p>
              </div>
            </div>

            {/* Statement Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>Statement Date</span>
              </label>
              <input
                type="date"
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-900/80 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>

            {/* Discrepancy Status Card */}
            {discrepancyResult.status === 'matched' ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 space-y-1 flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold">Ledger Matches Bank Statement!</div>
                  <p className="text-xs text-emerald-300/80">
                    Discrepancy is ₹0.00. Submitting will record a verified reconciliation checkpoint in the audit trail without modifying account balances.
                  </p>
                </div>
              </div>
            ) : discrepancyResult.status === 'surplus' ? (
              <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-300 space-y-1 flex items-start space-x-3">
                <TrendingUp className="w-5 h-5 flex-shrink-0 text-sky-400 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold">
                    Statement Surplus: +{formatINR(discrepancyResult.adjustmentAmountPaise)}
                  </div>
                  <p className="text-xs text-neutral-300">
                    Bank has more funds than the ledger. An audited positive adjustment transaction will be recorded to bring the ledger into exact alignment.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-1 flex items-start space-x-3">
                <TrendingDown className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold">
                    Statement Deficit: -{formatINR(discrepancyResult.adjustmentAmountPaise)}
                  </div>
                  <p className="text-xs text-neutral-300">
                    Bank has less funds than the ledger. An audited negative adjustment transaction will be recorded to bring the ledger into exact alignment.
                  </p>
                </div>
              </div>
            )}

            {/* Reason for Discrepancy (Required if discrepancy != 0) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  <span>
                    Reason for Adjustment{' '}
                    {discrepancyResult.status !== 'matched' && <span className="text-red-400">*</span>}
                  </span>
                </span>
                {discrepancyResult.status === 'matched' && (
                  <span className="text-[10px] text-neutral-500">Optional</span>
                )}
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  discrepancyResult.status === 'matched'
                    ? 'e.g. End of month statement check'
                    : 'e.g. Bank SMS charge, interest credited, forgotten UPI'
                }
                className="w-full px-3 py-2 rounded-xl bg-neutral-900/80 border border-white/10 text-sm text-white focus:outline-none focus:border-sky-500"
                required={discrepancyResult.status !== 'matched'}
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-neutral-950 font-semibold text-xs transition flex items-center space-x-2 shadow-lg shadow-sky-500/20 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Applying Adjustment...</span>
                  </>
                ) : (
                  <>
                    <Scale className="w-4 h-4" />
                    <span>
                      {discrepancyResult.status === 'matched'
                        ? 'Confirm Match'
                        : `Reconcile & Apply ${discrepancyResult.status === 'surplus' ? '+' : '-'}${formatINR(discrepancyResult.adjustmentAmountPaise)}`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Audit History Tab */
          <div className="space-y-3">
            {isLoadingLogs ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-2 text-neutral-400">
                <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
                <span className="text-xs">Loading audit trail...</span>
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-neutral-900/30 border border-white/5 space-y-1">
                <History className="w-8 h-8 text-neutral-600 mx-auto" />
                <p className="text-xs font-medium text-neutral-300">No reconciliation logs found</p>
                <p className="text-[11px] text-neutral-500">
                  When you reconcile this account, all balance changes and reasons will be logged here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {auditLogs.map((log) => {
                  const oldBal = log.oldState?.balance_paise ? Number(log.oldState.balance_paise) : 0;
                  const newBal = log.newState?.balance_paise ? Number(log.newState.balance_paise) : 0;
                  const discrepancy = log.newState?.discrepancy_paise !== undefined
                    ? Number(log.newState.discrepancy_paise)
                    : newBal - oldBal;

                  return (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-neutral-900/60 border border-white/5 space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white">
                          {log.reason || 'Reconciliation Checkpoint'}
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          {new Date(log.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-neutral-400 font-mono text-[11px]">
                        <span>Previous: {formatINR(BigInt(oldBal))}</span>
                        <span>→</span>
                        <span className="text-sky-300 font-semibold">New: {formatINR(BigInt(newBal))}</span>
                        {discrepancy !== 0 && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] ${
                              discrepancy > 0
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {discrepancy > 0 ? '+' : ''}
                            {formatINR(BigInt(discrepancy))}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
