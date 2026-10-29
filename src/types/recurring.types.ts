export type RecurringSourceType = 'account' | 'card';

export interface RecurringRule {
  id: string;
  userId: string;
  title: string;
  amountPaise: bigint;
  sourceType: RecurringSourceType;
  accountId?: string;
  cardId?: string;
  envelopeId?: string | null;
  dayOfMonth: number; // 1 to 31
  isActive: boolean;
  lastLoggedYearMonth?: string; // Format: "YYYY-MM" (e.g., "2026-10")
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecurringRuleParams {
  title: string;
  amountPaise: bigint;
  sourceType: RecurringSourceType;
  accountId?: string;
  cardId?: string;
  envelopeId?: string | null;
  dayOfMonth: number;
}
