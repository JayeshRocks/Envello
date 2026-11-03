import type { RecurringRule, CreateRecurringRuleParams, RecurringFrequencyType } from '@/types/recurring.types';

const STORAGE_KEY_PREFIX = 'envello_recurring_rules_';

interface SerializedRecurringRule {
  id: string;
  userId: string;
  title: string;
  amountPaise: string; // Serialized BigInt
  sourceType?: 'account' | 'card';
  accountId?: string;
  cardId?: string;
  envelopeId?: string | null;
  frequencyType?: RecurringFrequencyType;
  dayOfMonth?: number;
  intervalDays?: number;
  startDate?: string;
  lastLoggedDate?: string;
  lastLoggedYearMonth?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function deserializeRule(item: SerializedRecurringRule): RecurringRule {
  return {
    ...item,
    sourceType: item.sourceType || 'account',
    amountPaise: BigInt(item.amountPaise),
    envelopeId: item.envelopeId || null,
    frequencyType: item.frequencyType || 'monthly_day',
    dayOfMonth: item.dayOfMonth ?? 1,
    intervalDays: item.intervalDays ?? 30,
    startDate: item.startDate || item.createdAt.split('T')[0],
    lastLoggedDate: item.lastLoggedDate,
    lastLoggedYearMonth: item.lastLoggedYearMonth,
  };
}

function serializeRule(rule: RecurringRule): SerializedRecurringRule {
  return {
    ...rule,
    sourceType: rule.sourceType || 'account',
    amountPaise: rule.amountPaise.toString(),
    envelopeId: rule.envelopeId || null,
    frequencyType: rule.frequencyType || 'monthly_day',
    dayOfMonth: rule.dayOfMonth ?? 1,
    intervalDays: rule.intervalDays ?? 30,
    startDate: rule.startDate,
    lastLoggedDate: rule.lastLoggedDate,
    lastLoggedYearMonth: rule.lastLoggedYearMonth,
  };
}

/**
 * Fetches all recurring rules defined by the user.
 */
export async function fetchRecurringRules(userId: string): Promise<RecurringRule[]> {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    const parsed: SerializedRecurringRule[] = JSON.parse(raw);
    return parsed.map(deserializeRule);
  } catch (err) {
    console.error('[Envello Recurring API] Error reading recurring rules:', err);
    return [];
  }
}

/**
 * Creates a new recurring rule.
 */
export async function createRecurringRule(
  userId: string,
  params: CreateRecurringRuleParams
): Promise<RecurringRule> {
  const existing = await fetchRecurringRules(userId);
  const now = new Date().toISOString();
  const todayStr = now.split('T')[0];

  const frequencyType = params.frequencyType || 'monthly_day';
  const newRule: RecurringRule = {
    id: crypto.randomUUID(),
    userId,
    title: params.title.trim(),
    amountPaise: params.amountPaise,
    sourceType: params.sourceType || 'account',
    accountId: params.accountId,
    cardId: params.cardId,
    envelopeId: params.envelopeId || null,
    frequencyType,
    dayOfMonth: frequencyType === 'monthly_day' ? Math.min(31, Math.max(1, params.dayOfMonth || 1)) : undefined,
    intervalDays: frequencyType === 'interval_days' ? Math.max(1, params.intervalDays || 30) : undefined,
    startDate: params.startDate || todayStr,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const updated = [newRule, ...existing];
  localStorage.setItem(getStorageKey(userId), JSON.stringify(updated.map(serializeRule)));
  return newRule;
}

/**
 * Updates an existing recurring rule.
 */
export async function updateRecurringRule(
  userId: string,
  ruleId: string,
  updates: Partial<Omit<RecurringRule, 'id' | 'userId' | 'createdAt'>>
): Promise<RecurringRule> {
  const existing = await fetchRecurringRules(userId);
  const index = existing.findIndex((r) => r.id === ruleId);

  if (index === -1) {
    throw new Error('Recurring rule not found.');
  }

  const current = existing[index];
  const updatedRule: RecurringRule = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  existing[index] = updatedRule;
  localStorage.setItem(getStorageKey(userId), JSON.stringify(existing.map(serializeRule)));
  return updatedRule;
}

/**
 * Marks a recurring rule as logged for a given date (e.g. "2026-11-03").
 */
export async function markRecurringRuleAsLogged(
  userId: string,
  ruleId: string,
  loggedDateStr: string
): Promise<void> {
  const yearMonth = loggedDateStr.substring(0, 7);
  await updateRecurringRule(userId, ruleId, {
    lastLoggedDate: loggedDateStr,
    lastLoggedYearMonth: yearMonth,
  });
}

/**
 * Deletes a recurring rule.
 */
export async function deleteRecurringRule(userId: string, ruleId: string): Promise<void> {
  const existing = await fetchRecurringRules(userId);
  const filtered = existing.filter((r) => r.id !== ruleId);
  localStorage.setItem(getStorageKey(userId), JSON.stringify(filtered.map(serializeRule)));
}
