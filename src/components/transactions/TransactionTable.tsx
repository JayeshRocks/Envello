import React, { useState } from 'react';
import {
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Receipt,
  Plus,
  Trash2,
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

  return (
    <section className="space-y-4">
      {/* Table Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-semibold tracking-tight text-white flex items-center space-x-2">
              <Receipt className="w-5 h-5 text-indigo-400" />
              <span>Transaction Ledger</span>
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-white/5 font-mono">
              {transactions.length} records
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Double-entry financial journal. All movements are deterministically reconciled.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search payee..."
              className="pl-8 pr-3 py-1.5 rounded-xl glass-input text-xs text-white placeholder-neutral-500 w-36 sm:w-48"
            />
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center p-0.5 rounded-xl bg-neutral-900 border border-white/10 text-xs font-medium">
            {[
              { id: 'all', label: 'All' },
              { id: 'expense', label: 'Expenses' },
              { id: 'income', label: 'Income' },
              { id: 'transfer', label: 'Transfers' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTypeFilterChange(tab.id)}
                className={`px-2.5 py-1 rounded-lg transition ${
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
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-medium transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record</span>
          </button>
        </div>
      </div>

      {/* Table Surface */}
      <div className="glass-card rounded-2xl border border-white/5 overflow-hidden shadow-xl">
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
              {isLoading && transactions.length === 0 ? (
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
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    <div className="w-10 h-10 rounded-xl bg-neutral-900 mx-auto flex items-center justify-center text-neutral-500 mb-2">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div className="text-sm font-medium text-white">No Transactions Recorded</div>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {searchQuery
                        ? 'No transactions matched your search criteria.'
                        : 'Record your first expense, income, or account transfer above.'}
                    </p>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
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
