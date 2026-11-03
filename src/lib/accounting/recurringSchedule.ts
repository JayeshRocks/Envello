import type { RecurringRule } from '@/types/recurring.types';

export interface RecurringDueStatus {
  isDue: boolean;
  isOverdue: boolean;
  daysUntilDue: number; // 0 = due today, negative = overdue by X days, positive = due in X days
  nextDueDate: Date;
  formattedDueDate: string; // e.g. "Due Today", "Overdue by 2 days", "Due in 5 days (Nov 8)"
  isLoggedCurrentPeriod: boolean;
}

/**
 * Strips time to return midnight (00:00:00.000) for clean day-diff calculations.
 */
function toMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Formats a Date into a clean readable string (e.g. "8 Nov" or "8 Nov 2026").
 */
export function formatShortDate(date: Date, includeYear = false): string {
  const day = date.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[date.getMonth()];
  if (includeYear) {
    return `${day} ${monthName} ${date.getFullYear()}`;
  }
  return `${day} ${monthName}`;
}

/**
 * Formats an ordinal day number (e.g. 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 21 -> "21st").
 */
export function formatOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Returns a human-readable frequency description for a recurring item.
 */
export function formatFrequencyLabel(rule: Partial<RecurringRule>): string {
  if (rule.frequencyType === 'interval_days') {
    const days = rule.intervalDays || 30;
    if (days === 7) return 'Every 7 days (Weekly)';
    if (days === 14) return 'Every 14 days (Fortnightly)';
    if (days === 15) return 'Every 15 days';
    if (days === 30) return 'Every 30 days';
    if (days === 60) return 'Every 60 days (Bi-monthly)';
    return `Every ${days} days`;
  }

  const day = rule.dayOfMonth || 1;
  return `${formatOrdinal(day)} of every month`;
}

/**
 * Computes the authoritative next due date and real-time due status for a recurring rule.
 */
export function getRecurringRuleDueStatus(
  rule: RecurringRule,
  referenceDate?: Date
): RecurringDueStatus {
  const today = toMidnight(referenceDate || new Date());
  const year = today.getFullYear();
  const month = today.getMonth();
  const currentYearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;

  // If paused, return dormant status
  if (!rule.isActive) {
    const fallbackDate = new Date(today);
    return {
      isDue: false,
      isOverdue: false,
      daysUntilDue: 999,
      nextDueDate: fallbackDate,
      formattedDueDate: 'Paused',
      isLoggedCurrentPeriod: false,
    };
  }

  // MODE A: Specific day of every month
  if (rule.frequencyType !== 'interval_days') {
    const targetDay = Math.min(31, Math.max(1, rule.dayOfMonth || 1));
    const daysInCurMonth = new Date(year, month + 1, 0).getDate();
    const actualDayThisMonth = Math.min(targetDay, daysInCurMonth);
    const dueDateThisMonth = new Date(year, month, actualDayThisMonth);

    // Check if rule was already logged for the current month
    const isLoggedThisMonth =
      rule.lastLoggedYearMonth === currentYearMonth ||
      Boolean(rule.lastLoggedDate && rule.lastLoggedDate.startsWith(currentYearMonth));

    if (isLoggedThisMonth) {
      // Next due is in the subsequent month
      const daysInNextMonth = new Date(year, month + 2, 0).getDate();
      const actualDayNextMonth = Math.min(targetDay, daysInNextMonth);
      const nextDueDate = new Date(year, month + 1, actualDayNextMonth);
      const diffDays = Math.round((nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      return {
        isDue: false,
        isOverdue: false,
        daysUntilDue: diffDays,
        nextDueDate,
        formattedDueDate: `Logged for ${currentYearMonth} • Next: ${formatShortDate(nextDueDate)}`,
        isLoggedCurrentPeriod: true,
      };
    }

    // Not yet logged this month: compare today against due date this month
    const diffDays = Math.round((dueDateThisMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const overdueDays = Math.abs(diffDays);
      return {
        isDue: true,
        isOverdue: true,
        daysUntilDue: diffDays,
        nextDueDate: dueDateThisMonth,
        formattedDueDate: `Overdue by ${overdueDays} ${overdueDays === 1 ? 'day' : 'days'} (${formatShortDate(dueDateThisMonth)})`,
        isLoggedCurrentPeriod: false,
      };
    }

    if (diffDays === 0) {
      return {
        isDue: true,
        isOverdue: false,
        daysUntilDue: 0,
        nextDueDate: dueDateThisMonth,
        formattedDueDate: 'Due Today',
        isLoggedCurrentPeriod: false,
      };
    }

    if (diffDays === 1) {
      return {
        isDue: false,
        isOverdue: false,
        daysUntilDue: 1,
        nextDueDate: dueDateThisMonth,
        formattedDueDate: 'Due Tomorrow',
        isLoggedCurrentPeriod: false,
      };
    }

    return {
      isDue: false,
      isOverdue: false,
      daysUntilDue: diffDays,
      nextDueDate: dueDateThisMonth,
      formattedDueDate: `Due in ${diffDays} days (${formatShortDate(dueDateThisMonth)})`,
      isLoggedCurrentPeriod: false,
    };
  }

  // MODE B: Interval in number of days (e.g. every 15 days)
  const interval = Math.max(1, rule.intervalDays || 30);

  // Determine anchor date
  let anchorDate: Date;
  if (rule.lastLoggedDate) {
    const [y, m, d] = rule.lastLoggedDate.split('-').map(Number);
    anchorDate = new Date(y, m - 1, d);
  } else if (rule.startDate) {
    const [y, m, d] = rule.startDate.split('-').map(Number);
    anchorDate = new Date(y, m - 1, d);
  } else if (rule.createdAt) {
    anchorDate = toMidnight(new Date(rule.createdAt));
  } else {
    anchorDate = new Date(today);
  }

  // Calculate next due date: anchor + interval in days
  const nextDueDate = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), anchorDate.getDate() + interval);
  const diffDays = Math.round((nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      isDue: true,
      isOverdue: true,
      daysUntilDue: diffDays,
      nextDueDate,
      formattedDueDate: `Overdue by ${overdueDays} ${overdueDays === 1 ? 'day' : 'days'} (${formatShortDate(nextDueDate)})`,
      isLoggedCurrentPeriod: false,
    };
  }

  if (diffDays === 0) {
    return {
      isDue: true,
      isOverdue: false,
      daysUntilDue: 0,
      nextDueDate,
      formattedDueDate: 'Due Today',
      isLoggedCurrentPeriod: false,
    };
  }

  if (diffDays === 1) {
    return {
      isDue: false,
      isOverdue: false,
      daysUntilDue: 1,
      nextDueDate,
      formattedDueDate: 'Due Tomorrow',
      isLoggedCurrentPeriod: Boolean(rule.lastLoggedDate),
    };
  }

  return {
    isDue: false,
    isOverdue: false,
    daysUntilDue: diffDays,
    nextDueDate,
    formattedDueDate: `Due in ${diffDays} days (${formatShortDate(nextDueDate)})`,
    isLoggedCurrentPeriod: Boolean(rule.lastLoggedDate),
  };
}

/**
 * Normalizes all active recurring rules to a 30-day monthly commitment.
 * - Monthly day rules: exactly amountPaise per month.
 * - Interval days rules: (amountPaise * 30) / intervalDays.
 */
export function calculateNormalizedMonthlyCostPaise(rules: RecurringRule[]): bigint {
  return rules
    .filter((r) => r.isActive)
    .reduce((sum, r) => {
      if (r.frequencyType === 'interval_days' && r.intervalDays && r.intervalDays > 0) {
        return sum + (r.amountPaise * 30n) / BigInt(r.intervalDays);
      }
      return sum + r.amountPaise;
    }, 0n);
}
