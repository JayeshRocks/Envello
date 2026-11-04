import React, { useState } from 'react';
import {
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Receipt,
  Plus,
  X,
  Layers,
  RotateCcw,
  Lock,
} from 'lucide-react';
import type { TransactionRecord } from '@/lib/api/transactions';
import type { EnvelopeWithAllocation } from '@/types/accounting.types';
import type { AccountItem } from '@/lib/api/accounts';
import { formatINR } from '@/lib/accounting/currency';
import { checkReversionEligibility } from '@/lib/accounting/revertPolicy';
import { useDevice } from '@/hooks/useDevice';
import { RevertTransactionModal } from './RevertTransactionModal';

interface TransactionTableProps {
  transactions: TransactionRecord[];
  envelopes?: EnvelopeWithAllocation[];
  accounts?: AccountItem[];
  isLoading: boolean;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onRecordTransactionClick: () => void;
  onDeleteTransaction?: (transactionId: string) => Promise<void>;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  envelopes = [],
  accounts = [],
  isLoading,
  typeFilter,
  onTypeFilterChange,
  searchQuery,
  onSearchChange,
  onRecordTransactionClick,
  onDeleteTransaction,
}) => {
  const { isMobileOrTablet, isDesktop, isLandscape } = useDevice();
  const [revertingTx, setRevertingTx] = useState<TransactionRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'all' | 'this_month' | 'last_month'>('all');

  const filteredTransactions = transactions.filter((tx) => {
    if (periodFilter === 'all') return true;
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    if (periodFilter === 'this_month') {
      return tx.transactionDate.startsWith(currentYearMonth);
    }
    if (periodFilter === 'last_month') {
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevYearMonth = `${prevDate.getFullYear()}-${(prevDate.getMonth() + 1).toString().padStart(2, '0')}`;
      return tx.transactionDate.startsWith(prevYearMonth);
    }
    return true;
  });

  return (
    <section id="transaction-ledger" className="space-y-4 max-w-full overflow-hidden scroll-mt-20">
      {/* Table Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-white flex items-center space-x-2">
              <Receipt className="w-5 h-5 text-indigo-400" />
              <span>Transaction Ledger</span>
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-white/5 font-mono">
              {filteredTransactions.length} records
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Double-entry financial journal. All movements are deterministically reconciled.
          </p>
        </div>

        {/* Controls Toolbar: Period, Search, Filter pills, and Record button */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Period Selector */}
          <div className="relative flex items-center">
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as 'all' | 'this_month' | 'last_month')}
              className="px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-[38px] rounded-xl bg-neutral-900 border border-white/10 text-xs sm:text-sm text-neutral-300 focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              <option value="all">All Dates</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:flex-initial min-w-[130px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search payee..."
              className="w-full pl-8 pr-7 py-2 sm:py-1.5 min-h-[44px] sm:min-h-[38px] rounded-xl glass-input text-base sm:text-sm text-white placeholder-neutral-500 sm:w-44"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md text-neutral-400 hover:text-white transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center p-1 rounded-xl bg-neutral-900 border border-white/10 text-xs sm:text-sm font-medium">
            {[
              { id: 'all', label: 'All' },
              { id: 'expense', label: 'Expenses' },
              { id: 'income', label: 'Income' },
              { id: 'transfer', label: 'Transfers' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTypeFilterChange(tab.id)}
                className={`px-2.5 sm:px-3 py-1.5 min-h-[36px] sm:min-h-[32px] rounded-lg transition-all duration-200 active:scale-95 text-center flex items-center justify-center ${
                  typeFilter === tab.id
                    ? 'bg-neutral-800 text-white shadow-sm font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Record button — refined, sleek, never stretches to 100% width */}
          <button
            onClick={onRecordTransactionClick}
            className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 sm:py-1.5 min-h-[44px] sm:min-h-[38px] rounded-xl bg-sky-500 hover:bg-sky-400 text-neutral-950 font-bold text-xs sm:text-sm transition-all shadow-sm active:scale-95 flex-shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Record</span>
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Card View (Unified Touch Surface for Phones & Tablets in Vertical & Horizontal Orientations) */}
      {isMobileOrTablet && (
        <div
          className={
            isLandscape
              ? 'grid grid-cols-1 md:grid-cols-2 gap-3'
              : 'space-y-2.5'
          }
        >
          {isLoading && filteredTransactions.length === 0 ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-card rounded-2xl p-4 border border-white/5 space-y-3 animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="w-32 h-4 bg-neutral-800 rounded" />
                  <div className="w-20 h-4 bg-neutral-800 rounded" />
                </div>
                <div className="w-48 h-3 bg-neutral-800 rounded" />
              </div>
            ))
          ) : filteredTransactions.length === 0 ? (
            <div className="col-span-full glass-card rounded-2xl p-8 text-center text-neutral-400 border border-white/5">
              <div className="w-10 h-10 rounded-xl bg-neutral-900 mx-auto flex items-center justify-center text-neutral-500 mb-2">
                <Receipt className="w-5 h-5" />
              </div>
              <div className="text-sm font-medium text-white">No Transactions Recorded</div>
              <p className="text-xs text-neutral-500 mt-1">
                {searchQuery || periodFilter !== 'all'
                  ? 'No transactions match your search.'
                  : 'Tap + at bottom right to record a transaction.'}
              </p>
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const isIncome = tx.type === 'income';
              const isExpense = tx.type === 'expense';
              const isTransfer = tx.type === 'transfer';
              const isEnvelopeAllocation = tx.type === 'envelope_allocation';

              const envelopeEntry = tx.entries.find((e) => e.envelopeName);
              const accountEntry = tx.entries.find((e) => e.accountName);

              return (
                <div
                  key={tx.id}
                  className="bg-[#0f1011] rounded-2xl p-4 border border-white/10 space-y-2.5 active:bg-white/[0.02] transition shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-white tracking-tight text-sm truncate">
                        {tx.description}
                      </div>
                      <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
                        {tx.transactionDate}
                      </div>
                    </div>
                    <div
                      className={`font-mono font-bold whitespace-nowrap tabular-nums text-base text-right flex-shrink-0 ${
                        isIncome
                          ? 'text-emerald-400'
                          : isExpense
                          ? 'text-white'
                          : isEnvelopeAllocation
                          ? 'text-sky-300'
                          : 'text-indigo-300'
                      }`}
                    >
                      {isIncome
                        ? `+${formatINR(tx.totalAmountPaise)}`
                        : isExpense
                        ? `-${formatINR(tx.totalAmountPaise)}`
                        : formatINR(tx.totalAmountPaise)}
                    </div>
                  </div>

                  {tx.notes && (
                    <p className="text-xs text-neutral-400 line-clamp-2">
                      {tx.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-white/5 gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 py-0.5 min-w-0">
                      {/* Type Badge */}
                      {isExpense && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-medium flex-shrink-0">
                          <ArrowDownLeft className="w-2.5 h-2.5" />
                          <span>Expense</span>
                        </span>
                      )}
                      {isIncome && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium flex-shrink-0">
                          <ArrowUpRight className="w-2.5 h-2.5" />
                          <span>Income</span>
                        </span>
                      )}
                      {isTransfer && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-medium flex-shrink-0">
                          <ArrowRightLeft className="w-2.5 h-2.5" />
                          <span>Transfer</span>
                        </span>
                      )}
                      {isEnvelopeAllocation && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-medium flex-shrink-0">
                          <Layers className="w-2.5 h-2.5" />
                          <span>Reallocation</span>
                        </span>
                      )}

                      {envelopeEntry?.envelopeName && (
                        <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-sky-400 border border-white/5 text-[10px] flex-shrink-0 max-w-[120px] truncate">
                          {envelopeEntry.envelopeName}
                        </span>
                      )}
                      {accountEntry?.accountName && (
                        <span className="px-2 py-0.5 rounded-md bg-neutral-800/60 text-neutral-400 border border-white/5 text-[10px] flex-shrink-0 max-w-[120px] truncate">
                          {accountEntry.accountName}
                        </span>
                      )}
                    </div>

                    {/* Revert Action */}
                    {(() => {
                      const eligibility = checkReversionEligibility(tx.transactionDate);
                      return (
                        <button
                          onClick={() => setRevertingTx(tx)}
                          title={
                            eligibility.isReversible
                              ? 'Revert Transaction'
                              : 'Historical Transaction Locked (Closed month)'
                          }
                          className={`p-2 sm:p-2.5 rounded-xl transition min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 flex-shrink-0 cursor-pointer ${
                            eligibility.isReversible
                              ? 'hover:bg-amber-500/10 text-neutral-400 hover:text-amber-400'
                              : 'text-neutral-600 hover:text-neutral-500 hover:bg-white/5'
                          }`}
                        >
                          {eligibility.isReversible ? (
                            <RotateCcw className="w-4 h-4" />
                          ) : (
                            <Lock className="w-3.5 h-3.5" />
                          )}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Desktop Table Surface (Shown only on Desktop-class devices) */}
      {isDesktop && (
        <div className="bg-[#0f1011] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
          <div className="w-full overflow-x-auto">
            <table className="table-fixed w-full min-w-[800px] text-left text-xs">
              <thead className="bg-[#0b0c0e] border-b border-white/10 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-[12%]">Date</th>
                  <th className="py-3 px-4 w-[31%]">Description / Payee</th>
                  <th className="py-3 px-4 w-[12%]">Type</th>
                  <th className="py-3 px-4 w-[21%]">Envelope / Account</th>
                  <th className="py-3 px-4 text-right w-[14%]">Amount</th>
                  <th className="py-3 pr-6 pl-2 text-center w-[10%] min-w-[80px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-neutral-300">
                {isLoading && filteredTransactions.length === 0 ? (
                  [1, 2, 3, 4].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-4"><div className="w-16 h-3 bg-neutral-800 rounded" /></td>
                      <td className="py-4 px-4"><div className="w-32 h-3 bg-neutral-800 rounded" /></td>
                      <td className="py-4 px-4"><div className="w-14 h-3 bg-neutral-800 rounded" /></td>
                      <td className="py-4 px-4"><div className="w-24 h-3 bg-neutral-800 rounded" /></td>
                      <td className="py-4 px-4 text-right"><div className="w-20 h-3 bg-neutral-800 rounded ml-auto" /></td>
                      <td className="py-4 pr-6 pl-2 text-center"><div className="w-7 h-3 bg-neutral-800 rounded mx-auto" /></td>
                    </tr>
                  ))
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-neutral-400">
                      <div className="w-10 h-10 rounded-xl bg-neutral-900 mx-auto flex items-center justify-center text-neutral-500 mb-2">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div className="text-sm font-medium text-white">No Transactions Recorded</div>
                      <p className="text-xs text-neutral-500 mt-1">
                        {searchQuery || periodFilter !== 'all'
                          ? 'No transactions match your search.'
                          : 'Click Record Transaction in the header to get started.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isIncome = tx.type === 'income';
                    const isExpense = tx.type === 'expense';
                    const isTransfer = tx.type === 'transfer';
                    const isEnvelopeAllocation = tx.type === 'envelope_allocation';

                    const envelopeEntry = tx.entries.find((e) => e.envelopeName);
                    const accountEntry = tx.entries.find((e) => e.accountName);

                    return (
                      <tr key={tx.id} className="hover:bg-white/[0.02] transition">
                        {/* Date */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-400 truncate">
                          {tx.transactionDate}
                        </td>

                        {/* Description */}
                        <td className="py-3.5 px-4 font-medium text-white truncate">
                          <div className="truncate">{tx.description}</div>
                          {tx.notes && <div className="text-[11px] text-neutral-500 truncate">{tx.notes}</div>}
                        </td>

                        {/* Type */}
                        <td className="py-3.5 px-4 truncate">
                          {isExpense && (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-medium">
                              <ArrowDownLeft className="w-2.5 h-2.5" />
                              <span>Expense</span>
                            </span>
                          )}
                          {isIncome && (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium">
                              <ArrowUpRight className="w-2.5 h-2.5" />
                              <span>Income</span>
                            </span>
                          )}
                          {isTransfer && (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-medium">
                              <ArrowRightLeft className="w-2.5 h-2.5" />
                              <span>Transfer</span>
                            </span>
                          )}
                          {isEnvelopeAllocation && (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-medium">
                              <Layers className="w-2.5 h-2.5" />
                              <span>Reallocation</span>
                            </span>
                          )}
                        </td>

                        {/* Envelope & Account */}
                        <td className="py-3.5 px-4 truncate">
                          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            {envelopeEntry?.envelopeName && (
                              <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-sky-400 border border-white/5 text-[10px] max-w-[120px] truncate">
                                {envelopeEntry.envelopeName}
                              </span>
                            )}
                            {accountEntry?.accountName && (
                              <span className="px-2 py-0.5 rounded-md bg-neutral-800/60 text-neutral-400 border border-white/5 text-[10px] max-w-[120px] truncate">
                                {accountEntry.accountName}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Amount */}
                        <td
                          className={`py-3.5 px-4 text-right font-mono font-bold truncate tabular-nums ${
                            isIncome
                              ? 'text-emerald-400'
                              : isExpense
                              ? 'text-white'
                              : isEnvelopeAllocation
                              ? 'text-sky-300'
                              : 'text-indigo-300'
                          }`}
                        >
                          {isIncome
                            ? `+${formatINR(tx.totalAmountPaise)}`
                            : isExpense
                            ? `-${formatINR(tx.totalAmountPaise)}`
                            : formatINR(tx.totalAmountPaise)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 pr-6 pl-2 text-center whitespace-nowrap">
                          {(() => {
                            const eligibility = checkReversionEligibility(tx.transactionDate);
                            return (
                              <button
                                onClick={() => setRevertingTx(tx)}
                                title={
                                  eligibility.isReversible
                                    ? 'Revert Transaction'
                                    : 'Historical Transaction Locked (Closed month)'
                                }
                                className={`p-2 rounded-xl transition cursor-pointer min-h-[36px] min-w-[36px] inline-flex items-center justify-center active:scale-95 ${
                                  eligibility.isReversible
                                    ? 'hover:bg-amber-500/10 text-neutral-400 hover:text-amber-400'
                                    : 'text-neutral-600 hover:text-neutral-500 hover:bg-white/5'
                                }`}
                              >
                                {eligibility.isReversible ? (
                                  <RotateCcw className="w-3.5 h-3.5" />
                                ) : (
                                  <Lock className="w-3.5 h-3.5" />
                                )}
                              </button>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revert Transaction Modal with Full Impact Details */}
      <RevertTransactionModal
        isOpen={Boolean(revertingTx)}
        transaction={revertingTx}
        envelopes={envelopes}
        accounts={accounts}
        isDeleting={isDeleting}
        onClose={() => setRevertingTx(null)}
        onConfirmRevert={async (txId) => {
          if (!onDeleteTransaction) return;
          setIsDeleting(true);
          try {
            await onDeleteTransaction(txId);
            setRevertingTx(null);
          } finally {
            setIsDeleting(false);
          }
        }}
      />
    </section>
  );
};
