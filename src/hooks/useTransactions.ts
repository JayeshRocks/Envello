import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchTransactions,
  recordExpenseTransaction,
  recordIncomeTransaction,
  recordAccountTransfer,
  deleteTransaction,
  type TransactionRecord,
} from '@/lib/api/transactions';

export function useTransactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchTransactions(user.id, {
        type: typeFilter !== 'all' ? typeFilter : undefined,
        search: searchQuery.trim() || undefined,
        limit: 50,
      });
      setTransactions(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load transactions.';
      console.error('[useTransactions] Error:', err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [user, typeFilter, searchQuery]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const addExpense = async (params: {
    accountId?: string | null;
    cardId?: string | null;
    envelopeId?: string | null;
    amountPaise: bigint;
    payee: string;
    date: string;
    notes?: string;
  }) => {
    if (!user) throw new Error('User not authenticated');
    setError(null);
    try {
      const txId = await recordExpenseTransaction(user.id, params);
      await loadTransactions();
      return txId;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to record expense.';
      setError(message);
      throw err;
    }
  };

  const addIncome = async (params: {
    accountId: string;
    amountPaise: bigint;
    source: string;
    date: string;
    notes?: string;
  }) => {
    if (!user) throw new Error('User not authenticated');
    setError(null);
    try {
      const txId = await recordIncomeTransaction(user.id, params);
      await loadTransactions();
      return txId;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to record income.';
      setError(message);
      throw err;
    }
  };

  const addTransfer = async (params: {
    fromAccountId: string;
    toAccountId: string;
    amountPaise: bigint;
    description: string;
    date: string;
  }) => {
    if (!user) throw new Error('User not authenticated');
    setError(null);
    try {
      const txId = await recordAccountTransfer(user.id, params);
      await loadTransactions();
      return txId;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to record transfer.';
      setError(message);
      throw err;
    }
  };

  const removeTransaction = async (transactionId: string) => {
    if (!user) throw new Error('User not authenticated');
    setError(null);
    try {
      await deleteTransaction(transactionId, user.id);
      await loadTransactions();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete transaction.';
      setError(message);
      throw err;
    }
  };

  return {
    transactions,
    isLoading,
    error,
    typeFilter,
    setTypeFilter,
    searchQuery,
    setSearchQuery,
    addExpense,
    addIncome,
    addTransfer,
    removeTransaction,
    refreshTransactions: loadTransactions,
  };
}
