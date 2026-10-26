import React, { useState } from 'react';
import {
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Receipt,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type { TransactionRecord } from '@/lib/api/transactions';
import { formatINR } from '@/lib/accounting/currency';

interface TransactionTableProps {
  transactions: TransactionRecord[];
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
  isLoading,
  typeFilter,
  onTypeFilterChange,
  searchQuery,
  onSearchChange,
  onRecordTransactionClick,
  onDeleteTransaction,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
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
    <section className="space-y-4">
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

        <div className="flex flex-col xs:flex-row flex-wrap items-stretch xs:items-center gap-2">
          {/* Period Selector */}
          <div className="relative flex items-center flex-1 xs:flex-initial">
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as 'all' | 'this_month' | 'last_month')}
              className="w-full xs:w-auto px-3 py-2 sm:py-1.5 min-h-[44px] sm:min-h-[38px] rounded-xl bg-neutral-900 border border-white/10 text-xs sm:text-sm text-neutral-300 focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              <option value="all">All Dates</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 xs:flex-initial">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search payee..."
              className="w-full pl-8 pr-7 py-2 sm:py-1.5 min-h-[44px] sm:min-h-[38px] rounded-xl glass-input text-base sm:text-sm text-white placeholder-neutral-500 xs:w-36 sm:w-48"
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
          <div className="flex items-center p-1 rounded-xl bg-neutral-900 border border-white/10 text-xs sm:text-sm font-medium overflow-x-auto scrollbar-none">
            {[
              { id: 'all', label: 'All' },
              { id: 'expense', label: 'Expenses' },
              { id: 'income', label: 'Income' },
              { id: 'transfer', label: 'Transfers' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTypeFilterChange(tab.id)}
                className={`px-3 py-2 sm:py-1.5 min-h-[40px] sm:min-h-[32px] rounded-lg transition-all duration-200 active:scale-95 whitespace-nowrap flex items-center justify-center ${
                  typeFilter === tab.id
                    ? 'bg-neutral-800 text-white shadow-sm font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={onRecordTransactionClick}
            className="hidden sm:flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-medium transition shadow-sm active:scale-95 flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record</span>
          </button>
        </div>
      </div>

      {/* Mobile Card View (< md) */}
      <div className="block md:hidden space-y-2.5">
        {isLoading && filteredTransactions.length === 0 ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-4 border border-white/5 space-y-3 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="w-32 h-4 bg-neutral-800 rounded" />
                <div className="w-20 h-4 bg-neutral-800 rounded" />
              </div>
              <div className="w-48 h-3 bg-neutral-800 rounded" />
            </div>
          ))
        ) : filteredTransactions.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-neutral-400 border border-white/5">
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

            const envelopeEntry = tx.entries.find((e) => e.envelopeName);
            const accountEntry = tx.entries.find((e) => e.accountName);

            return (
              <div
                key={tx.id}
                className="glass-card rounded-2xl p-4 border border-white/5 space-y-2.5 active:bg-white/[0.02] transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-white tracking-tight text-sm">
                      {tx.description}
                    </div>
                    <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
                      {tx.transactionDate}
                    </div>
                  </div>
                  <div
                    className={`font-mono font-bold whitespace-nowrap tabular-nums text-base text-right ${
                      isIncome
                        ? 'text-emerald-400'
                        : isExpense
                        ? 'text-white'
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

                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none flex-nowrap py-0.5">
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

                    {envelopeEntry?.envelopeName && (
                      <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-sky-400 border border-white/5 text-[10px] flex-shrink-0">
                        {envelopeEntry.envelopeName}
                      </span>
                    )}
                    {accountEntry?.accountName && (
                      <span className="px-2 py-0.5 rounded-md bg-neutral-800/60 text-neutral-400 border border-white/5 text-[10px] flex-shrink-0">
                        {accountEntry.accountName}
                      </span>
                    )}
                  </div>

                  {/* Delete Action with 44px tap comfort */}
                  {confirmDeleteId === tx.id ? (
                    <div className="inline-flex items-center space-x-1.5 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg">
                      <span className="text-[10px] text-red-300 font-medium">Revert?</span>
                      <button
                        onClick={async () => {
                          if (!onDeleteTransaction) return;
                          setIsDeleting(true);
                          try {
                            await onDeleteTransaction(tx.id);
                          } finally {
                            setIsDeleting(false);
                            setConfirmDeleteId(null);
                          }
                        }}
                        disabled={isDeleting}
                        className="text-[11px] px-2.5 py-1.5 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 disabled:opacity-50 transition min-h-[36px]"
                      >
                        {isDeleting ? '...' : 'Yes'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={isDeleting}
                        className="text-[11px] px-2.5 py-1.5 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white transition min-h-[36px]"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(tx.id)}
                      title="Revert & Delete Transaction"
                      className="p-2 sm:p-2.5 rounded-xl hover:bg-red-500/10 text-neutral-500 hover:text-red-400 transition min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop / Tablet Table Surface (>= md) */}
      <div className="hidden md:block glass-card rounded-2xl border border-white/5 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-900/80 border-b border-white/5 text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Description / Payee</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Envelope / Account</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Actions</th>
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
                    <td className="py-4 px-4 text-center"><div className="w-6 h-3 bg-neutral-800 rounded mx-auto" /></td>
                  </tr>
                ))
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    <div className="w-10 h-10 rounded-xl bg-neutral-900 mx-auto flex items-center justify-center text-neutral-500 mb-2">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div className="text-sm font-medium text-white">No Transactions Recorded</div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {searchQuery || periodFilter !== 'all'
                        ? 'No transactions matched your search or period filter.'
                        : 'Record your first expense, income, or account transfer above.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isIncome = tx.type === 'income';
                  const isExpense = tx.type === 'expense';
                  const isTransfer = tx.type === 'transfer';

                  const envelopeEntry = tx.entries.find((e) => e.envelopeName);
                  const accountEntry = tx.entries.find((e) => e.accountName);

                  return (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Date */}
                      <td className="py-3.5 px-4 font-mono text-neutral-400 whitespace-nowrap">
                        {tx.transactionDate}
                      </td>

                      {/* Payee / Description */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white tracking-tight">
                          {tx.description}
                        </div>
                        {tx.notes && (
                          <div className="text-[11px] text-neutral-500 mt-0.5 truncate max-w-xs">
                            {tx.notes}
                          </div>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isExpense && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-medium">
                            <ArrowDownLeft className="w-3 h-3" />
                            <span>Expense</span>
                          </span>
                        )}
                        {isIncome && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>Income</span>
                          </span>
                        )}
                        {isTransfer && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[11px] font-medium">
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>Transfer</span>
                          </span>
                        )}
                      </td>

                      {/* Envelope / Account */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          {envelopeEntry?.envelopeName && (
                            <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-sky-400 border border-white/5 text-[11px]">
                              {envelopeEntry.envelopeName}
                            </span>
                          )}
                          {accountEntry?.accountName && (
                            <span className="px-2 py-0.5 rounded-md bg-neutral-800/60 text-neutral-400 border border-white/5 text-[11px]">
                              {accountEntry.accountName}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td
                        className={`py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap tabular-nums text-sm ${
                          isIncome
                            ? 'text-emerald-400'
                            : isExpense
                            ? 'text-white'
                            : 'text-indigo-300'
                        }`}
                      >
                        {isIncome ? `+${formatINR(tx.totalAmountPaise)}` : isExpense ? `-${formatINR(tx.totalAmountPaise)}` : formatINR(tx.totalAmountPaise)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {confirmDeleteId === tx.id ? (
                          <div className="inline-flex items-center space-x-1 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-lg">
                            <span className="text-[10px] text-red-300 font-medium">Revert?</span>
                            <button
                              onClick={async () => {
                                if (!onDeleteTransaction) return;
                                setIsDeleting(true);
                                try {
                                  await onDeleteTransaction(tx.id);
                                } finally {
                                  setIsDeleting(false);
                                  setConfirmDeleteId(null);
                                }
                              }}
                              disabled={isDeleting}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-white font-semibold hover:bg-red-600 disabled:opacity-50 transition"
                            >
                              {isDeleting ? '...' : 'Yes'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={isDeleting}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 hover:text-white transition"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(tx.id)}
                            title="Revert & Delete Transaction"
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-neutral-500 hover:text-red-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
