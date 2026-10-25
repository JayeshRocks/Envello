import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import {
  fetchActualDebts,
  createActualDebt,
  updateActualDebt,
  deleteActualDebt,
  recordDebtPayment,
  type ActualDebtRow,
  type ActualDebtInsert,
} from '@/lib/api/actualDebts';

export function useActualDebts() {
  const { user } = useAuth();
  const [actualDebts, setActualDebts] = useState<ActualDebtRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDebts = useCallback(async () => {
    if (!user) {
      setActualDebts([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchActualDebts(user.id);
      setActualDebts(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch actual debts';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDebts();
  }, [loadDebts]);

  const totalRemainingDebtPaise = useMemo(() => {
    return actualDebts
      .filter(d => !d.is_settled)
      .reduce((sum, d) => sum + BigInt(d.remaining_debt_paise), 0n);
  }, [actualDebts]);

  const addDebt = async (params: {
    lender_name: string;
    initial_debt_paise: number;
    monthly_instalment_paise: number;
    due_date?: string;
  }) => {
    if (!user) throw new Error('Authentication required');
    const newDebt = await createActualDebt(user.id, params);
    setActualDebts(prev => [newDebt, ...prev]);
    return newDebt;
  };

  const payDebt = async (params: {
    debtId: string;
    fromAccountId: string;
    amountPaise: number;
    paymentDate?: string;
    notes?: string;
  }) => {
    if (!user) throw new Error('Authentication required');
    await recordDebtPayment(user.id, params);
    await loadDebts();
  };

  return {
    actualDebts,
    totalRemainingDebtPaise,
    isLoading,
    error,
    refreshDebts: loadDebts,
    addDebt,
    payDebt,
    editDebt: async (debtId: string, updates: Partial<ActualDebtInsert>) => {
      if (!user) throw new Error('Authentication required');
      const updated = await updateActualDebt(user.id, debtId, updates);
      setActualDebts(prev => prev.map(d => (d.id === debtId ? updated : d)));
      return updated;
    },
    removeDebt: async (debtId: string) => {
      if (!user) throw new Error('Authentication required');
      await deleteActualDebt(user.id, debtId);
      await loadDebts();
    },
  };
}
