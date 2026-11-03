import { describe, it, expect } from 'vitest';
import {
  getRecurringRuleDueStatus,
  formatFrequencyLabel,
  calculateNormalizedMonthlyCostPaise,
  formatOrdinal,
} from './recurringSchedule';
import type { RecurringRule } from '@/types/recurring.types';

describe('Recurring Schedule & Due Triggers', () => {
  const baseRule: RecurringRule = {
    id: 'test-rule-1',
    userId: 'user-1',
    title: 'Water Cans (20L)',
    amountPaise: 80000n, // ₹800.00
    sourceType: 'account',
    accountId: 'acc-hdfc',
    frequencyType: 'interval_days',
    intervalDays: 15,
    isActive: true,
    startDate: '2026-11-01',
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
  };

  describe('Interval in Days Frequency (e.g. every 15 days)', () => {
    it('is NOT due when current date is before the interval deadline', () => {
      // Start date: 2026-11-01 + 15 days = Due 2026-11-16
      const refDate = new Date(2026, 10, 10); // Nov 10, 2026
      const status = getRecurringRuleDueStatus(baseRule, refDate);

      expect(status.isDue).toBe(false);
      expect(status.isOverdue).toBe(false);
      expect(status.daysUntilDue).toBe(6);
      expect(status.formattedDueDate).toContain('Due in 6 days');
    });

    it('triggers as Due Tomorrow when 1 day remains', () => {
      const refDate = new Date(2026, 10, 15); // Nov 15, 2026
      const status = getRecurringRuleDueStatus(baseRule, refDate);

      expect(status.isDue).toBe(false);
      expect(status.daysUntilDue).toBe(1);
      expect(status.formattedDueDate).toBe('Due Tomorrow');
    });

    it('triggers as Due Today exactly on the 15th day', () => {
      const refDate = new Date(2026, 10, 16); // Nov 16, 2026
      const status = getRecurringRuleDueStatus(baseRule, refDate);

      expect(status.isDue).toBe(true);
      expect(status.isOverdue).toBe(false);
      expect(status.daysUntilDue).toBe(0);
      expect(status.formattedDueDate).toBe('Due Today');
    });

    it('triggers as Overdue when past the interval deadline without being logged', () => {
      const refDate = new Date(2026, 10, 18); // Nov 18, 2026 (2 days late)
      const status = getRecurringRuleDueStatus(baseRule, refDate);

      expect(status.isDue).toBe(true);
      expect(status.isOverdue).toBe(true);
      expect(status.daysUntilDue).toBe(-2);
      expect(status.formattedDueDate).toContain('Overdue by 2 days');
    });

    it('shifts next due date forward after being logged on a date', () => {
      const loggedRule: RecurringRule = {
        ...baseRule,
        lastLoggedDate: '2026-11-16',
      };

      // Checked on Nov 17 (day after logging)
      const refDate = new Date(2026, 10, 17);
      const status = getRecurringRuleDueStatus(loggedRule, refDate);

      expect(status.isDue).toBe(false);
      // Next due should be Nov 16 + 15 days = Dec 1
      expect(status.daysUntilDue).toBe(14);
      expect(status.formattedDueDate).toContain('Due in 14 days');
    });
  });

  describe('Monthly Day Frequency (e.g. 5th of every month)', () => {
    const monthlyRule: RecurringRule = {
      id: 'test-rule-2',
      userId: 'user-1',
      title: 'Broadband WiFi',
      amountPaise: 119900n, // ₹1,199.00
      sourceType: 'card',
      cardId: 'card-icici',
      frequencyType: 'monthly_day',
      dayOfMonth: 5,
      isActive: true,
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-01T10:00:00.000Z',
    };

    it('is upcoming before the 5th of the month', () => {
      const refDate = new Date(2026, 10, 2); // Nov 2, 2026
      const status = getRecurringRuleDueStatus(monthlyRule, refDate);

      expect(status.isDue).toBe(false);
      expect(status.daysUntilDue).toBe(3);
      expect(status.formattedDueDate).toContain('Due in 3 days');
    });

    it('triggers as Due Today on the 5th of the month', () => {
      const refDate = new Date(2026, 10, 5); // Nov 5, 2026
      const status = getRecurringRuleDueStatus(monthlyRule, refDate);

      expect(status.isDue).toBe(true);
      expect(status.isOverdue).toBe(false);
      expect(status.formattedDueDate).toBe('Due Today');
    });

    it('triggers as Overdue after the 5th if unlogged', () => {
      const refDate = new Date(2026, 10, 8); // Nov 8, 2026 (3 days past due)
      const status = getRecurringRuleDueStatus(monthlyRule, refDate);

      expect(status.isDue).toBe(true);
      expect(status.isOverdue).toBe(true);
      expect(status.daysUntilDue).toBe(-3);
      expect(status.formattedDueDate).toContain('Overdue by 3 days');
    });

    it('marks as Logged for month and points to next month when logged', () => {
      const loggedRule: RecurringRule = {
        ...monthlyRule,
        lastLoggedYearMonth: '2026-11',
        lastLoggedDate: '2026-11-05',
      };

      const refDate = new Date(2026, 10, 8); // Nov 8, 2026
      const status = getRecurringRuleDueStatus(loggedRule, refDate);

      expect(status.isDue).toBe(false);
      expect(status.isLoggedCurrentPeriod).toBe(true);
      expect(status.formattedDueDate).toContain('Logged for 2026-11');
      expect(status.formattedDueDate).toContain('5 Dec');
    });
  });

  describe('Paused Rules', () => {
    it('returns dormant non-due status for paused rules', () => {
      const pausedRule: RecurringRule = {
        ...baseRule,
        isActive: false,
      };

      const refDate = new Date(2026, 10, 20); // Well past due
      const status = getRecurringRuleDueStatus(pausedRule, refDate);

      expect(status.isDue).toBe(false);
      expect(status.isOverdue).toBe(false);
      expect(status.formattedDueDate).toBe('Paused');
    });
  });

  describe('Normalized Monthly Cost Calculations', () => {
    it('normalizes interval and monthly frequencies to a 30-day budget projection', () => {
      const rules: RecurringRule[] = [
        // ₹1,000 every 15 days = ₹2,000/month
        {
          ...baseRule,
          id: 'r1',
          amountPaise: 100000n,
          frequencyType: 'interval_days',
          intervalDays: 15,
          isActive: true,
        },
        // ₹700 every 7 days = ₹3,000/month (700 * 30 / 7)
        {
          ...baseRule,
          id: 'r2',
          amountPaise: 70000n,
          frequencyType: 'interval_days',
          intervalDays: 7,
          isActive: true,
        },
        // ₹20,000 monthly
        {
          ...baseRule,
          id: 'r3',
          amountPaise: 2000000n,
          frequencyType: 'monthly_day',
          dayOfMonth: 1,
          isActive: true,
        },
        // Paused rule should not be counted
        {
          ...baseRule,
          id: 'r4',
          amountPaise: 500000n,
          isActive: false,
        },
      ];

      const normalized = calculateNormalizedMonthlyCostPaise(rules);
      // r1: (100000 * 30) / 15 = 200000
      // r2: (70000 * 30) / 7 = 300000
      // r3: 2000000
      // total: 200000 + 300000 + 2000000 = 2500000 paise (₹25,000.00)
      expect(normalized).toBe(2500000n);
    });
  });

  describe('Formatting Helpers', () => {
    it('formats ordinal dates correctly', () => {
      expect(formatOrdinal(1)).toBe('1st');
      expect(formatOrdinal(2)).toBe('2nd');
      expect(formatOrdinal(3)).toBe('3rd');
      expect(formatOrdinal(5)).toBe('5th');
      expect(formatOrdinal(21)).toBe('21st');
      expect(formatOrdinal(22)).toBe('22nd');
      expect(formatOrdinal(23)).toBe('23rd');
      expect(formatOrdinal(31)).toBe('31st');
    });

    it('formats frequency labels clearly', () => {
      expect(formatFrequencyLabel({ frequencyType: 'interval_days', intervalDays: 7 })).toBe('Every 7 days (Weekly)');
      expect(formatFrequencyLabel({ frequencyType: 'interval_days', intervalDays: 14 })).toBe('Every 14 days (Fortnightly)');
      expect(formatFrequencyLabel({ frequencyType: 'interval_days', intervalDays: 15 })).toBe('Every 15 days');
      expect(formatFrequencyLabel({ frequencyType: 'monthly_day', dayOfMonth: 5 })).toBe('5th of every month');
    });
  });
});
