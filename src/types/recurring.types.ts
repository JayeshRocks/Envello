export type RecurringSourceType = 'account' | 'card';
export type RecurringFrequencyType = 'monthly_day' | 'interval_days';

export interface RecurringRule {
  id: string;
  userId: string;
  title: string;
  amountPaise: bigint;
  sourceType: RecurringSourceType;
  accountId?: string;
  cardId?: string;
  envelopeId?: string | null;

  // Reimagined Frequency & Scheduling
  frequencyType: RecurringFrequencyType; // 'monthly_day' (e.g. 5th of every month) | 'interval_days' (e.g. every 15 days)
  dayOfMonth?: number; // 1 to 31 (when frequencyType === 'monthly_day')
  intervalDays?: number; // Positive integer, e.g. 7, 14, 15, 30 (when frequencyType === 'interval_days')

  // Execution & due date tracking
  startDate?: string; // Format: "YYYY-MM-DD"
  lastLoggedDate?: string; // Format: "YYYY-MM-DD" (exact date last posted to ledger)
  lastLoggedYearMonth?: string; // Format: "YYYY-MM" (retained for backward compatibility)

  isActive: boolean;
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
  frequencyType: RecurringFrequencyType;
  dayOfMonth?: number;
  intervalDays?: number;
  startDate?: string;
}
