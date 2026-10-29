import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchRecurringRules,
  createRecurringRule,
  updateRecurringRule,
  deleteRecurringRule,
  markRecurringRuleAsLogged,
} from '@/lib/api/recurring';
import type { RecurringRule, CreateRecurringRuleParams } from '@/types/recurring.types';

export function useRecurringRules() {
  const { user } = useAuth();
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const currentYearMonth = useMemo(() => {
    return new Date().toISOString().substring(0, 7); // "YYYY-MM"
  }, []);

  const refreshRules = useCallback(async () => {
    if (!user) {
      setRules([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await fetchRecurringRules(user.id);
      setRules(data);
    } catch (err) {
      console.error('[useRecurringRules] Failed to load rules:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshRules();
  }, [refreshRules]);

  // Compute active rules due for the current month
  const dueRules = useMemo(() => {
    return rules.filter(r => r.isActive && r.lastLoggedYearMonth !== currentYearMonth);
  }, [rules, currentYearMonth]);

  const totalDuePaise = useMemo(() => {
    return dueRules.reduce((sum, r) => sum + r.amountPaise, 0n);
  }, [dueRules]);

  const addRule = async (params: CreateRecurringRuleParams) => {
    if (!user) throw new Error('Authentication required.');
    const created = await createRecurringRule(user.id, params);
    setRules(prev => [created, ...prev]);
    return created;
  };

  const editRule = async (
    ruleId: string,
    updates: Partial<Omit<RecurringRule, 'id' | 'userId' | 'createdAt'>>
  ) => {
    if (!user) throw new Error('Authentication required.');
    const updated = await updateRecurringRule(user.id, ruleId, updates);
    setRules(prev => prev.map(r => (r.id === ruleId ? updated : r)));
    return updated;
  };

  const removeRule = async (ruleId: string) => {
    if (!user) throw new Error('Authentication required.');
    await deleteRecurringRule(user.id, ruleId);
    setRules(prev => prev.filter(r => r.id !== ruleId));
  };

  const toggleRuleActive = async (ruleId: string) => {
    const target = rules.find(r => r.id === ruleId);
    if (!target) return;
    await editRule(ruleId, { isActive: !target.isActive });
  };

  /**
   * Logs a single recurring rule into the ledger as an expense or credit card purchase
   * and marks it as logged for the month.
   */
  const logSingleRule = async (
    rule: RecurringRule,
    recordExpenseFn: (params: {
      accountId?: string | null;
      cardId?: string | null;
      envelopeId?: string | null;
      amountPaise: bigint;
      payee: string;
      date: string;
      notes?: string;
    }) => Promise<void>
  ) => {
    if (!user) throw new Error('Authentication required.');

    const todayDate = new Date().toISOString().split('T')[0];
    const isCard = rule.sourceType === 'card' || Boolean(rule.cardId);

    await recordExpenseFn({
      accountId: !isCard ? rule.accountId : undefined,
      cardId: isCard ? rule.cardId : undefined,
      envelopeId: rule.envelopeId || null,
      amountPaise: rule.amountPaise,
      payee: rule.title,
      date: todayDate,
      notes: `Standing Instruction (Day ${rule.dayOfMonth})`,
    });

    await markRecurringRuleAsLogged(user.id, rule.id, currentYearMonth);
    setRules(prev =>
      prev.map(r => (r.id === rule.id ? { ...r, lastLoggedYearMonth: currentYearMonth } : r))
    );
  };

  /**
   * Logs all due recurring rules sequentially in a deterministic loop.
   */
  const logAllDueRules = async (
    recordExpenseFn: (params: {
      accountId?: string | null;
      cardId?: string | null;
      envelopeId?: string | null;
      amountPaise: bigint;
      payee: string;
      date: string;
      notes?: string;
    }) => Promise<void>
  ): Promise<number> => {
    if (!user) throw new Error('Authentication required.');
    const targets = [...dueRules];
    let loggedCount = 0;

    for (const rule of targets) {
      await logSingleRule(rule, recordExpenseFn);
      loggedCount += 1;
    }

    return loggedCount;
  };

  return {
    rules,
    dueRules,
    totalDuePaise,
    currentYearMonth,
    isLoading,
    refreshRules,
    addRule,
    editRule,
    removeRule,
    toggleRuleActive,
    logSingleRule,
    logAllDueRules,
  };
}
