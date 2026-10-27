import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  AlertCircle,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import type { AccountItem } from '@/lib/api/accounts';
import type { EnvelopeWithAllocation } from '@/types/accounting.types';
import { toPaise, formatINR } from '@/lib/accounting/currency';
import { useModalDismiss } from '@/hooks/useModalDismiss';

interface RecordTransactionModalProps {
  isOpen: boolean;
  accounts: AccountItem[];
  envelopes: EnvelopeWithAllocation[];
  onClose: () => void;
  onRecordExpense: (params: {
    accountId: string;
    envelopeId: string;
    amountPaise: bigint;
    payee: string;
    date: string;
    notes?: string;
  }) => Promise<void>;
  onRecordIncome: (params: {
    accountId: string;
    amountPaise: bigint;
    source: string;
    date: string;
    notes?: string;
  }) => Promise<void>;
  onRecordTransfer: (params: {
    fromAccountId: string;
    toAccountId: string;
    amountPaise: bigint;
    description: string;
    date: string;
  }) => Promise<void>;
}

type TxMode = 'expense' | 'income' | 'transfer';

export const RecordTransactionModal: React.FC<RecordTransactionModalProps> = ({
  isOpen,
  accounts,
  envelopes,
  onClose,
  onRecordExpense,
  onRecordIncome,
  onRecordTransfer,
}) => {
  const [mode, setMode] = useState<TxMode>('expense');
  const [amountRupees, setAmountRupees] = useState('');
  const [payeeOrSource, setPayeeOrSource] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { handleBackdropClick } = useModalDismiss(isOpen, onClose);

  // Initialize selected dropdowns when modal opens or lists load
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
      if (accounts.length > 1) {
        setToAccountId(accounts[1].id);
      }
    }
    if (envelopes.length > 0 && !selectedEnvelopeId) {
      const regularEnv = envelopes.find((e) => e.slug === 'regular');
      setSelectedEnvelopeId(regularEnv?.id || envelopes[0].id);
    }
  }, [accounts, envelopes, selectedAccountId, selectedEnvelopeId, isOpen]);

  if (!isOpen) return null;

  const currentEnteredPaise = toPaise(amountRupees || '0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (currentEnteredPaise <= 0n) {
      setError('Please enter an amount greater than zero.');
      return;
    }

    if (!selectedAccountId) {
      setError('Please select an account.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'expense') {
        if (!selectedEnvelopeId) {
          setError('Please select a budget envelope.');
          return;
        }
        await onRecordExpense({
          accountId: selectedAccountId,
          envelopeId: selectedEnvelopeId,
          amountPaise: currentEnteredPaise,
          payee: payeeOrSource.trim() || 'Expense',
          date,
          notes: notes.trim() || undefined,
        });
      } else if (mode === 'income') {
        await onRecordIncome({
          accountId: selectedAccountId,
          amountPaise: currentEnteredPaise,
          source: payeeOrSource.trim() || 'Income',
          date,
          notes: notes.trim() || undefined,
        });
      } else if (mode === 'transfer') {
        if (!toAccountId || toAccountId === selectedAccountId) {
          setError('Please choose a different destination account.');
          return;
        }
        await onRecordTransfer({
          fromAccountId: selectedAccountId,
          toAccountId,
          amountPaise: currentEnteredPaise,
          description: payeeOrSource.trim() || 'Account Transfer',
          date,
        });
      }

      // Reset and close
      setAmountRupees('');
      setPayeeOrSource('');
      setNotes('');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Transaction failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in"
    >
      <div className="max-w-lg w-full glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-7 space-y-4 sm:space-y-5 border border-white/15 shadow-2xl relative max-h-[90vh] sm:max-h-[88vh] overflow-y-auto modal-panel">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 sm:p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/5 modal-close-btn min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">Record Transaction</h2>
          <p className="text-xs text-neutral-400">
            Double-entry ledger entry. Affects accounts and category envelopes accurately.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-neutral-900 border border-white/5 text-xs sm:text-sm font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('expense');
              setError(null);
            }}
            className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-lg transition min-h-[44px] active:scale-95 ${
              mode === 'expense'
                ? 'bg-rose-500 text-white shadow-sm font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Expense</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('income');
              setError(null);
            }}
            className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-lg transition min-h-[44px] active:scale-95 ${
              mode === 'income'
                ? 'bg-emerald-500 text-white shadow-sm font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Income</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('transfer');
              setError(null);
            }}
            className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-lg transition min-h-[44px] active:scale-95 ${
              mode === 'transfer'
                ? 'bg-indigo-500 text-white shadow-sm font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Transfer</span>
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300 flex items-center justify-between">
              <span>Amount (₹ INR)</span>
              <span
                className={`text-xs font-mono font-bold ${
                  mode === 'income'
                    ? 'text-emerald-400'
                    : mode === 'expense'
                    ? 'text-rose-400'
                    : 'text-indigo-400'
                }`}
              >
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
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                placeholder="0.00"
                required
                autoFocus
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl glass-input text-base font-mono text-white placeholder-neutral-500 focus:ring-1 focus:ring-sky-500 tabular-nums"
              />
            </div>

            {/* Quick Amount Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
              {[100, 200, 500, 1000, 2000, 5000].map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => {
                    const current = parseFloat(amountRupees) || 0;
                    setAmountRupees((current + quick).toString());
                  }}
                  className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-[11px] font-mono font-medium text-neutral-300 hover:text-white border border-white/5 active:scale-95 transition flex-shrink-0"
                >
                  +₹{quick}
                </button>
              ))}
              {amountRupees && (
                <button
                  type="button"
                  onClick={() => setAmountRupees('')}
                  className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-[10px] text-red-400 font-medium border border-red-500/20 active:scale-95 transition flex-shrink-0"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Payee / Description / Source */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-300">
              {mode === 'expense' ? 'Payee / Store' : mode === 'income' ? 'Income Source / Payer' : 'Transfer Note'}
            </label>
            <input
              type="text"
              value={payeeOrSource}
              onChange={(e) => setPayeeOrSource(e.target.value)}
              placeholder={
                mode === 'expense'
                  ? 'e.g. Swiggy, Groceries, Amazon'
                  : mode === 'income'
                  ? 'e.g. Monthly Salary, Freelance, Dividend'
                  : 'e.g. ATM Cash Withdrawal, Account to Account'
              }
              required
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white placeholder-neutral-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Expense: Category Envelope & Paid From Account */}
          {mode === 'expense' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">Budget Envelope</label>
                <select
                  value={selectedEnvelopeId}
                  onChange={(e) => setSelectedEnvelopeId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white bg-neutral-900 border border-white/10 focus:ring-1 focus:ring-sky-500"
                >
                  {envelopes.map((env) => (
                    <option key={env.id} value={env.id} className="bg-neutral-900 text-white">
                      {env.name} ({formatINR(env.availablePaise)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">Paid From Account</label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white bg-neutral-900 border border-white/10 focus:ring-1 focus:ring-sky-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id} className="bg-neutral-900 text-white">
                      {acc.name} ({formatINR(acc.balancePaise)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Income: Deposited In Account */}
          {mode === 'income' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">Deposited In Account</label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white bg-neutral-900 border border-white/10 focus:ring-1 focus:ring-sky-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id} className="bg-neutral-900 text-white">
                    {acc.name} ({formatINR(acc.balancePaise)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Transfer: From Account & To Account */}
          {mode === 'transfer' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">From Account</label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white bg-neutral-900 border border-white/10 focus:ring-1 focus:ring-sky-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id} className="bg-neutral-900 text-white">
                      {acc.name} ({formatINR(acc.balancePaise)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300">To Account</label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white bg-neutral-900 border border-white/10 focus:ring-1 focus:ring-sky-500"
                >
                  {accounts
                    .filter((a) => a.id !== selectedAccountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id} className="bg-neutral-900 text-white">
                        {acc.name} ({formatINR(acc.balancePaise)})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}

          {/* Date & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300 flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                <span>Transaction Date</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white bg-neutral-900 border border-white/10 focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-300">Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional details..."
                className="w-full px-3 py-2.5 rounded-xl glass-input text-base sm:text-sm text-white placeholder-neutral-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-white text-sm font-semibold transition shadow-lg active:scale-[0.98] min-h-[44px] disabled:opacity-50 ${
                mode === 'income'
                  ? 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/25'
                  : mode === 'expense'
                  ? 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/25'
                  : 'bg-indigo-500 hover:bg-indigo-400 shadow-indigo-500/25'
              }`}
            >
              <span>
                {isSubmitting
                  ? 'Recording...'
                  : mode === 'expense'
                  ? 'Record Expense'
                  : mode === 'income'
                  ? 'Record Income'
                  : 'Execute Transfer'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
