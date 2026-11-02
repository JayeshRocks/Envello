import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import {
  fetchDebtsLoans,
  createDebtLoan,
  recordLoanPayment,
  updateDebtLoan as updateDebtLoanApi,
  deleteDebtLoan as deleteDebtLoanApi,
  type DebtLoanRow,
  type DebtLoanInsert,
} from '@/lib/api/debtsLoans';

export function useDebtsLoans() {
  const { user } = useAuth();
  const [debtsLoans, setDebtsLoans] = useState<DebtLoanRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDebtsLoans = useCallback(async () => {
    if (!user) {
      setDebtsLoans([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchDebtsLoans(user.id, true);
      setDebtsLoans(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch debts and loans';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadDebtsLoans();
  }, [loadDebtsLoans]);

  const activeDebtsLoans = useMemo(() => {
    return debtsLoans.filter((d) => !d.is_settled);
  }, [debtsLoans]);

  const settledDebtsLoans = useMemo(() => {
    return debtsLoans.filter((d) => d.is_settled);
  }, [debtsLoans]);

  const totalBorrowedPaise = useMemo(() => {
    return activeDebtsLoans.reduce((sum, d) => sum + BigInt(d.borrowed_amount_paise), 0n);
  }, [activeDebtsLoans]);

  const totalRemainingBalancePaise = useMemo(() => {
    return activeDebtsLoans.reduce((sum, d) => sum + BigInt(d.remaining_balance_paise), 0n);
  }, [activeDebtsLoans]);

  const totalRepaidPaise = useMemo(() => {
    return totalBorrowedPaise - totalRemainingBalancePaise;
  }, [totalBorrowedPaise, totalRemainingBalancePaise]);

  const addDebtLoan = async (params: {
    lender_name: string;
    borrowed_amount_paise: number;
    remaining_balance_paise?: number;
    interest_rate_percent?: number;
    due_date?: string;
    notes?: string;
    initial_deposit_account_id?: string;
  }) => {
    if (!user) throw new Error('Authentication required');
    const newDebt = await createDebtLoan(user.id, params);
    setDebtsLoans((prev) => [newDebt, ...prev]);
    return newDebt;
  };

  const payDebtLoan = async (params: {
    loanId: string;
    fromAccountId: string;
    amountPaise: number;
    paymentDate?: string;
    notes?: string;
  }) => {
    if (!user) throw new Error('Authentication required');
    await recordLoanPayment(user.id, params);
    await loadDebtsLoans();
  };

  const updateDebtLoan = async (loanId: string, updates: Partial<DebtLoanInsert>) => {
    if (!user) throw new Error('Authentication required');
    const updated = await updateDebtLoanApi(user.id, loanId, updates);
    setDebtsLoans((prev) => prev.map((d) => (d.id === loanId ? updated : d)));
    return updated;
  };

  const deleteDebtLoan = async (loanId: string) => {
    if (!user) throw new Error('Authentication required');
    await deleteDebtLoanApi(user.id, loanId);
    setDebtsLoans((prev) => prev.filter((d) => d.id !== loanId));
  };

  return {
    debtsLoans,
    activeDebtsLoans,
    settledDebtsLoans,
    totalBorrowedPaise,
    totalRemainingBalancePaise,
    totalRepaidPaise,
    isLoading,
    error,
    refreshDebtsLoans: loadDebtsLoans,
    addDebtLoan,
    payDebtLoan,
    updateDebtLoan,
    deleteDebtLoan,
  };
}
