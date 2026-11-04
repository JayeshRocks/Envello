import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { EnvelopeWithAllocation, EnvelopeRolloverPolicy } from '@/types/accounting.types';
import {
  fetchEnvelopesWithAllocations,
  upsertEnvelopeAllocation,
  transferBetweenEnvelopes,
  createCustomEnvelope,
  updateEnvelope,
  deleteEnvelope,
  updateEnvelopeSortOrders,
} from '@/lib/api/envelopes';

export interface AllocationHistoryEntry {
  id: string;
  envelopeId: string;
  envelopeName: string;
  previousAllocatedPaise: bigint;
  newAllocatedPaise: bigint;
  periodKey: string;
  timestamp: number;
}

/**
 * Returns the current date in YYYY-MM format.
 */
export function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Steps a YYYY-MM string forward or backward by the specified number of months.
 */
export function shiftYearMonth(yearMonth: string, deltaMonths: number): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed

  const date = new Date(year, month + deltaMonths, 1);
  const nextYear = date.getFullYear();
  const nextMonth = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${nextYear}-${nextMonth}`;
}

export function useEnvelopes() {
  const { user } = useAuth();
  const currentPeriod = useMemo(() => getCurrentYearMonth(), []);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(currentPeriod);
  const [envelopes, setEnvelopes] = useState<EnvelopeWithAllocation[]>([]);
  const [undoStack, setUndoStack] = useState<AllocationHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const isCurrentPeriod = selectedPeriod === currentPeriod;
  const isPastPeriod = selectedPeriod < currentPeriod;

  const goToCurrentPeriod = useCallback(() => {
    setSelectedPeriod(getCurrentYearMonth());
  }, []);

  const loadEnvelopes = useCallback(async (silent = false) => {
    if (!user) {
      setEnvelopes([]);
      setIsLoading(false);
      return;
    }

    if (!silent) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const data = await fetchEnvelopesWithAllocations(user.id, selectedPeriod);
      // Auto-generalize any legacy envelope names to 'Savings' and filter out deprecated card/emi envelopes
      const sanitized = data
        .filter((env) => env.slug !== 'credit-cards' && env.slug !== 'emis' && env.slug !== 'monthly-targets')
        .map((env) => {
          if (
            (env.slug === 'savings' && env.name !== 'Savings') ||
            env.name.toLowerCase().includes('super.money') ||
            env.name.toLowerCase().includes('fixed deposit')
          ) {
            updateEnvelope(env.id, user.id, { name: 'Savings' }).catch(() => {});
            return { ...env, name: 'Savings' };
          }
          return env;
        });
      setEnvelopes(sanitized);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load envelopes.';
      console.error('[useEnvelopes] Error loading envelopes:', err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedPeriod]);

  useEffect(() => {
    loadEnvelopes();
  }, [loadEnvelopes]);

  const prevPeriod = useCallback(() => {
    setSelectedPeriod((current) => shiftYearMonth(current, -1));
  }, []);

  const nextPeriod = useCallback(() => {
    setSelectedPeriod((current) => shiftYearMonth(current, 1));
  }, []);

  const allocateFunds = async (
    envelopeId: string,
    amountPaise: bigint,
    fundingSources?: Array<{ accountId: string; amountPaise: bigint }>
  ) => {
    if (!user) throw new Error('User is not authenticated.');
    if (selectedPeriod < currentPeriod) {
      throw new Error('Previous months are locked. Move to the current month to allocate funds.');
    }
    setError(null);
    const target = envelopes.find((e) => e.id === envelopeId);
    const prevAllocated = target ? target.allocatedPaise : 0n;
    const prevEnvelopes = envelopes;

    // Fast Optimistic Update: instantly update the envelope card without waiting for network round-trip
    if (target) {
      const delta = amountPaise - prevAllocated;
      const newAvailable = target.availablePaise + delta;
      setEnvelopes((prev) =>
        prev.map((e) =>
          e.id === envelopeId
            ? {
                ...e,
                allocatedPaise: amountPaise,
                availablePaise: newAvailable,
                sources: fundingSources
                  ? fundingSources.map((s, idx) => ({
                      id: `temp-${idx}`,
                      allocationId: e.allocationId || 'temp',
                      accountId: s.accountId,
                      accountName: 'Liquid Account',
                      amountPaise: s.amountPaise,
                    }))
                  : e.sources,
              }
            : e
        )
      );
    }

    try {
      await upsertEnvelopeAllocation(
        envelopeId,
        user.id,
        selectedPeriod,
        amountPaise,
        fundingSources
      );

      // Record in undo stack if allocation actually changed
      if (prevAllocated !== amountPaise) {
        const historyEntry: AllocationHistoryEntry = {
          id: Math.random().toString(36).substring(2, 9),
          envelopeId,
          envelopeName: target?.name ?? 'Envelope',
          previousAllocatedPaise: prevAllocated,
          newAllocatedPaise: amountPaise,
          periodKey: selectedPeriod,
          timestamp: Date.now(),
        };
        setUndoStack((prev) => [historyEntry, ...prev].slice(0, 10));
      }

      await loadEnvelopes(true);
    } catch (err: unknown) {
      setEnvelopes(prevEnvelopes);
      const message = err instanceof Error ? err.message : 'Failed to update allocation.';
      setError(message);
      throw err;
    }
  };

  const undoLastAllocation = async (): Promise<AllocationHistoryEntry | null> => {
    if (!user || undoStack.length === 0) return null;
    const [entryToUndo, ...remaining] = undoStack;
    setError(null);
    try {
      await upsertEnvelopeAllocation(
        entryToUndo.envelopeId,
        user.id,
        entryToUndo.periodKey,
        entryToUndo.previousAllocatedPaise
      );
      setUndoStack(remaining);
      await loadEnvelopes();
      return entryToUndo;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to undo allocation.';
      setError(message);
      throw err;
    }
  };

  const transferFunds = async (fromId: string, toId: string, amountPaise: bigint) => {
    if (!user) throw new Error('User is not authenticated.');
    if (selectedPeriod < currentPeriod) {
      throw new Error('Previous months are locked. Move to the current month to transfer funds.');
    }
    setError(null);
    try {
      await transferBetweenEnvelopes(user.id, selectedPeriod, fromId, toId, amountPaise);
      await loadEnvelopes();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to transfer funds between envelopes.';
      setError(message);
      throw err;
    }
  };

  const createEnvelope = async (data: {
    name: string;
    slug?: string;
    icon?: string;
    color?: string;
    rolloverPolicy: EnvelopeRolloverPolicy;
    isProtected?: boolean;
  }) => {
    if (!user) throw new Error('User is not authenticated.');
    setError(null);
    try {
      await createCustomEnvelope(user.id, data);
      await loadEnvelopes();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create envelope.';
      setError(message);
      throw err;
    }
  };

  const editEnvelope = async (
    envelopeId: string,
    data: {
      name?: string;
      icon?: string;
      color?: string;
      rolloverPolicy?: EnvelopeRolloverPolicy;
      isProtected?: boolean;
    }
  ) => {
    if (!user) throw new Error('User is not authenticated.');
    setError(null);
    try {
      await updateEnvelope(envelopeId, user.id, data);
      await loadEnvelopes();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update envelope.';
      setError(message);
      throw err;
    }
  };

  const removeEnvelope = async (envelopeId: string) => {
    if (!user) throw new Error('User is not authenticated.');
    setError(null);
    try {
      await deleteEnvelope(envelopeId, user.id);
      await loadEnvelopes();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete envelope.';
      setError(message);
      throw err;
    }
  };

  const reorderEnvelopes = useCallback(
    async (orderedIds: string[]) => {
      if (!user) return;

      // Optimistically update local envelopes state for instant 0ms UI feedback
      setEnvelopes((prev) => {
        const idMap = new Map(prev.map((e) => [e.id, e]));
        const reordered: EnvelopeWithAllocation[] = [];
        for (const id of orderedIds) {
          const item = idMap.get(id);
          if (item) {
            reordered.push({ ...item, sortOrder: reordered.length });
            idMap.delete(id);
          }
        }
        for (const remaining of idMap.values()) {
          reordered.push({ ...remaining, sortOrder: reordered.length });
        }
        return reordered;
      });

      try {
        await updateEnvelopeSortOrders(user.id, orderedIds);
      } catch (err: unknown) {
        console.error('[useEnvelopes] Failed to persist reordering:', err);
      }
    },
    [user]
  );

  // Aggregated totals across all envelopes in the period
  const totalAllocatedPaise = useMemo(
    () => envelopes.reduce((sum, env) => sum + env.allocatedPaise, 0n),
    [envelopes]
  );

  const totalSpentPaise = useMemo(
    () => envelopes.reduce((sum, env) => sum + env.spentPaise, 0n),
    [envelopes]
  );

  const totalAvailablePaise = useMemo(
    () => envelopes.reduce((sum, env) => sum + env.availablePaise, 0n),
    [envelopes]
  );

  return {
    envelopes,
    isLoading,
    error,
    selectedPeriod,
    setSelectedPeriod,
    currentPeriod,
    isCurrentPeriod,
    isPastPeriod,
    goToCurrentPeriod,
    prevPeriod,
    nextPeriod,
    totalAllocatedPaise,
    totalSpentPaise,
    totalAvailablePaise,
    allocateFunds,
    transferFunds,
    createEnvelope,
    editEnvelope,
    removeEnvelope,
    reorderEnvelopes,
    refresh: loadEnvelopes,
    undoLastAllocation,
    canUndoAllocation: undoStack.length > 0,
    lastAllocation: undoStack[0] ?? null,
  };
}
