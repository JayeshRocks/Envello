import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import {
  fetchFixedDeposits,
  createFixedDeposit,
  liquidateFixedDeposit,
  type FixedDepositRow,
} from '@/lib/api/fixedDeposits';

export function useFixedDeposits() {
  const { user } = useAuth();
  const [fixedDeposits, setFixedDeposits] = useState<FixedDepositRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadFDs = useCallback(async () => {
    if (!user) {
      setFixedDeposits([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchFixedDeposits(user.id);
      setFixedDeposits(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch fixed deposits';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadFDs();
  }, [loadFDs]);

  const totalPrincipalPaise = useMemo(() => {
    return fixedDeposits
      .filter(fd => !fd.is_liquidated)
      .reduce((sum, fd) => sum + BigInt(fd.principal_paise), 0n);
  }, [fixedDeposits]);

  const totalMaturityPaise = useMemo(() => {
    return fixedDeposits
      .filter(fd => !fd.is_liquidated)
      .reduce((sum, fd) => sum + BigInt(fd.maturity_amount_paise), 0n);
  }, [fixedDeposits]);

  const addFD = async (params: {
    institution: string;
    principal_paise: number;
    interest_rate_percent: number;
    start_date: string;
    maturity_date: string;
    maturity_amount_paise: number;
    funding_account_id?: string;
  }) => {
    if (!user) throw new Error('Authentication required');
    const newFd = await createFixedDeposit(user.id, params);
    setFixedDeposits(prev => [...prev, newFd]);
    return newFd;
  };

  const liquidateFD = async (params: {
    fdId: string;
    destinationAccountId: string;
    liquidatedAmountPaise?: number;
    liquidationDate?: string;
  }) => {
    if (!user) throw new Error('Authentication required');
    await liquidateFixedDeposit(user.id, params);
    await loadFDs();
  };

  return {
    fixedDeposits,
    totalPrincipalPaise,
    totalMaturityPaise,
    isLoading,
    error,
    refreshFDs: loadFDs,
    addFD,
    liquidateFD,
  };
}
