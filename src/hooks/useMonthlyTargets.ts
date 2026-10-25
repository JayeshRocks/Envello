import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import {
  fetchMonthlyTargets,
  createMonthlyTarget,
  updateMonthlyTargetContribution,
  deleteMonthlyTarget,
  type MonthlyTargetRow,
} from '@/lib/api/monthlyTargets';

export interface MonthlyTargetWithProgress extends MonthlyTargetRow {
  progress_percent: number;
  remaining_paise: bigint;
}

export function useMonthlyTargets() {
  const { user } = useAuth();
  const [targets, setTargets] = useState<MonthlyTargetRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadTargets = useCallback(async () => {
    if (!user) {
      setTargets([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchMonthlyTargets(user.id);
      setTargets(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch monthly targets';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTargets();
  }, [loadTargets]);

  const targetsWithProgress: MonthlyTargetWithProgress[] = useMemo(() => {
    return targets.map((t) => {
      const targetPaise = BigInt(t.target_amount_paise);
      const contributedPaise = BigInt(t.current_contributed_paise);
      const remainingPaise = targetPaise > contributedPaise ? targetPaise - contributedPaise : 0n;
      const progressPercent =
        targetPaise > 0n
          ? Number((contributedPaise * 10000n) / targetPaise) / 100
          : 100;

      return {
        ...t,
        progress_percent: progressPercent,
        remaining_paise: remainingPaise,
      };
    });
  }, [targets]);

  const totalTargetAmountPaise = useMemo(() => {
    return targetsWithProgress
      .filter((t) => !t.is_achieved)
      .reduce((sum, t) => sum + BigInt(t.target_amount_paise), 0n);
  }, [targetsWithProgress]);

  const totalContributedPaise = useMemo(() => {
    return targetsWithProgress.reduce(
      (sum, t) => sum + BigInt(t.current_contributed_paise),
      0n
    );
  }, [targetsWithProgress]);

  const addTarget = async (params: {
    title: string;
    target_amount_paise: number;
    target_date: string;
    current_contributed_paise?: number;
  }) => {
    if (!user) throw new Error('Authentication required');
    const newTarget = await createMonthlyTarget(user.id, params);
    setTargets((prev) => [...prev, newTarget]);
    return newTarget;
  };

  const contributeToTarget = async (targetId: string, amountPaise: number) => {
    if (!user) throw new Error('Authentication required');
    const updated = await updateMonthlyTargetContribution(user.id, targetId, amountPaise);
    setTargets((prev) => prev.map((t) => (t.id === targetId ? updated : t)));
    return updated;
  };

  const removeTarget = async (targetId: string) => {
    if (!user) throw new Error('Authentication required');
    await deleteMonthlyTarget(user.id, targetId);
    setTargets((prev) => prev.filter((t) => t.id !== targetId));
  };

  return {
    targets: targetsWithProgress,
    totalTargetAmountPaise,
    totalContributedPaise,
    isLoading,
    error,
    refreshTargets: loadTargets,
    addTarget,
    contributeToTarget,
    removeTarget,
  };
}
