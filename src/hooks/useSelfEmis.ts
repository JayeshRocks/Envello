import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import {
  fetchSelfEmis,
  createSelfEmi,
  recordSelfEmiPayment,
  type SelfEmiRow,
} from '@/lib/api/selfEmis';
import { calculateSelfEmiProgress } from '@/lib/accounting/calculations';

export interface SelfEmiWithProgress extends SelfEmiRow {
  remaining_paise: bigint;
  progress_percent: number;
}

export function useSelfEmis() {
  const { user } = useAuth();
  const [selfEmis, setSelfEmis] = useState<SelfEmiRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadEmis = useCallback(async () => {
    if (!user) {
      setSelfEmis([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchSelfEmis(user.id);
      setSelfEmis(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch self EMIs';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadEmis();
  }, [loadEmis]);

  const emisWithProgress: SelfEmiWithProgress[] = useMemo(() => {
    return selfEmis.map(e => {
      const { remainingPaise, progressPercent } = calculateSelfEmiProgress(
        BigInt(e.total_funded_paise),
        BigInt(e.total_reimbursed_paise)
      );
      return {
        ...e,
        remaining_paise: remainingPaise,
        progress_percent: progressPercent,
      };
    });
  }, [selfEmis]);

  const totalRemainingPaise = useMemo(() => {
    return emisWithProgress
      .filter(e => !e.is_completed)
      .reduce((sum, e) => sum + e.remaining_paise, 0n);
  }, [emisWithProgress]);

  const addEmi = async (params: {
    description: string;
    total_funded_paise: number;
    monthly_reimbursement_paise: number;
    start_date?: string;
  }) => {
    if (!user) throw new Error('Authentication required');
    const newEmi = await createSelfEmi(user.id, params);
    setSelfEmis(prev => [newEmi, ...prev]);
    return newEmi;
  };

  const payEmi = async (params: {
    emiId: string;
    amountPaise: number;
    fromEnvelopeId?: string;
    date?: string;
  }) => {
    if (!user) throw new Error('Authentication required');
    await recordSelfEmiPayment(user.id, params);
    await loadEmis();
  };

  return {
    selfEmis: emisWithProgress,
    totalRemainingPaise,
    isLoading,
    error,
    refreshSelfEmis: loadEmis,
    addEmi,
    payEmi,
  };
}
