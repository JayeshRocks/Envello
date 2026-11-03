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
function getCurrentYearMonth(): string {
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
  const [selectedPeriod, setSelectedPeriod] = useState<string>(getCurrentYearMonth());
  const [envelopes, setEnvelopes] = useState<EnvelopeWithAllocation[]>([]);
  const [undoStack, setUndoStack] = useState<AllocationHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadEnvelopes = useCallback(async () => {
    if (!user) {
      setEnvelopes([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchEnvelopesWithAllocations(user.id, selectedPeriod);
      // Auto-generalize any legacy envelope names (e.g. 'Savings (Super.Money)')
      const sanitized = data.map((env) => {
        if (env.name.toLowerCase().includes('super.money')) {
          updateEnvelope(env.id, user.id, { name: 'Savings & Fixed Deposits' }).catch(() => {});
          return { ...env, name: 'Savings & Fixed Deposits' };
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

  const allocateFunds = async (envelopeId: string, amountPaise: bigint) => {
    if (!user) throw new Error('User is not authenticated.');
    setError(null);
    const target = envelopes.find((e) => e.id === envelopeId);
    const prevAllocated = target ? target.allocatedPaise : 0n;

    try {
      await upsertEnvelopeAllocation(envelopeId, user.id, selectedPeriod, amountPaise);

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

      await loadEnvelopes();
    } catch (err: unknown) {
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
    refresh: loadEnvelopes,
    undoLastAllocation,
    canUndoAllocation: undoStack.length > 0,
    lastAllocation: undoStack[0] ?? null,
  };
}
