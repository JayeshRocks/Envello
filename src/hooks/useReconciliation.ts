import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  reconcileAccount,
  fetchAccountAuditLogs,
  type AccountAuditLog,
  type ReconcileAccountParams,
} from '@/lib/api/reconciliation';

export function useReconciliation(initialAccountId?: string) {
  const { user } = useAuth();
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(initialAccountId);
  const [auditLogs, setAuditLogs] = useState<AccountAuditLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadAuditLogs = useCallback(
    async (accId?: string) => {
      const targetId = accId || selectedAccountId;
      if (!user || !targetId) {
        setAuditLogs([]);
        return;
      }

      setIsLoadingLogs(true);
      setError(null);
      try {
        const logs = await fetchAccountAuditLogs(targetId, user.id);
        setAuditLogs(logs);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to fetch audit logs.');
      } finally {
        setIsLoadingLogs(false);
      }
    },
    [user, selectedAccountId]
  );

  useEffect(() => {
    if (selectedAccountId) {
      loadAuditLogs(selectedAccountId);
    }
  }, [selectedAccountId, loadAuditLogs]);

  const submitReconciliation = async (
    params: Omit<ReconcileAccountParams, 'userId'>
  ): Promise<{ discrepancyPaise: bigint; adjustmentTransactionId?: string }> => {
    if (!user) throw new Error('User authentication required for account reconciliation.');

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await reconcileAccount({
        ...params,
        userId: user.id,
      });
      // Refresh audit logs for the reconciled account
      await loadAuditLogs(params.accountId);
      return res;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Reconciliation failed.';
      setError(msg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    selectedAccountId,
    setSelectedAccountId,
    auditLogs,
    isLoadingLogs,
    isSubmitting,
    error,
    setError,
    loadAuditLogs,
    submitReconciliation,
  };
}
