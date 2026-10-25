import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchAccounts, createAccount, type AccountItem } from '@/lib/api/accounts';
import { calculateNetSpendable } from '@/lib/accounting/calculations';
import type { AccountType } from '@/types/accounting.types';

export function useAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    if (!user) {
      setAccounts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAccounts(user.id);
      setAccounts(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load accounts.';
      console.error('[useAccounts] Error:', err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const addAccount = async (params: {
    name: string;
    institution: string;
    accountType: AccountType;
    initialBalancePaise?: bigint;
  }) => {
    if (!user) throw new Error('User not authenticated');
    setError(null);
    try {
      const created = await createAccount(user.id, params);
      await loadAccounts();
      return created;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create account.';
      setError(message);
      throw err;
    }
  };

  // Authoritative calculateNetSpendable across active checking, savings, and cash accounts
  const totalSpendableCashPaise = useMemo(() => {
    return calculateNetSpendable(
      accounts.map((acc) => ({
        balancePaise: acc.balancePaise,
        accountType: acc.accountType,
        isActive: acc.isActive,
      }))
    );
  }, [accounts]);

  return {
    accounts,
    isLoading,
    error,
    totalSpendableCashPaise,
    addAccount,
    refreshAccounts: loadAccounts,
  };
}
