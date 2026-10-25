import type { RecurringRule, CreateRecurringRuleParams } from '@/types/recurring.types';

const STORAGE_KEY_PREFIX = 'envello_recurring_rules_';

interface SerializedRecurringRule {
  id: string;
  userId: string;
  title: string;
  amountPaise: string; // Serialized BigInt
  accountId: string;
  envelopeId: string;
  dayOfMonth: number;
  isActive: boolean;
  lastLoggedYearMonth?: string;
  createdAt: string;
  updatedAt: string;
}

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function deserializeRule(item: SerializedRecurringRule): RecurringRule {
  return {
    ...item,
    amountPaise: BigInt(item.amountPaise),
  };
}

function serializeRule(rule: RecurringRule): SerializedRecurringRule {
  return {
    ...rule,
    amountPaise: rule.amountPaise.toString(),
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

  const newRule: RecurringRule = {
    id: crypto.randomUUID(),
    userId,
    title: params.title.trim(),
    amountPaise: params.amountPaise,
    accountId: params.accountId,
    envelopeId: params.envelopeId,
    dayOfMonth: Math.min(31, Math.max(1, params.dayOfMonth)),
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
  const index = existing.findIndex(r => r.id === ruleId);

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
 * Marks a recurring rule as logged for a given budget cycle (e.g. "2026-10").
 */
export async function markRecurringRuleAsLogged(
  userId: string,
  ruleId: string,
  yearMonth: string
): Promise<void> {
  await updateRecurringRule(userId, ruleId, { lastLoggedYearMonth: yearMonth });
}

/**
 * Deletes a recurring rule.
 */
export async function deleteRecurringRule(userId: string, ruleId: string): Promise<void> {
  const existing = await fetchRecurringRules(userId);
  const filtered = existing.filter(r => r.id !== ruleId);
  localStorage.setItem(getStorageKey(userId), JSON.stringify(filtered.map(serializeRule)));
}
