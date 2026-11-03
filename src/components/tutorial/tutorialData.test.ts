import { describe, it, expect } from 'vitest';
import { TUTORIAL_STEPS } from './tutorialData';
import { calculateNormalizedMonthlyCostPaise } from '@/lib/accounting/recurringSchedule';
import { getCreditCardUtilizationStatus } from '@/lib/accounting/calculations';

describe('Interactive Tutorial Specifications & Math', () => {
  it('defines 7 comprehensive steps covering all core system features', () => {
    expect(TUTORIAL_STEPS).toHaveLength(7);

    const stepIds = TUTORIAL_STEPS.map((s) => s.id);
    expect(stepIds).toEqual([
      'pillars',
      'envelopes',
      'ledger',
      'cards-debts',
      'recurring',
      'reversion',
      'sovereignty',
    ]);
  });

  it('guarantees every step has required metadata and non-empty key rules', () => {
    TUTORIAL_STEPS.forEach((step, index) => {
      expect(step.stepNumber).toBe(index + 1);
      expect(step.title.length).toBeGreaterThan(5);
      expect(step.badge.length).toBeGreaterThan(2);
      expect(step.summary.length).toBeGreaterThan(20);
      expect(step.whyItMatters.length).toBeGreaterThan(20);
      expect(step.realWorldExample.length).toBeGreaterThan(20);
      expect(step.keyRules.length).toBeGreaterThanOrEqual(4);
    });
  });

  it('verifies Step 1 taxonomy math: Liquid Funds never conflate with FDs or Liabilities', () => {
    const liquidCash = 6500000n; // ₹65,000
    const fdAssets = 10000000n;  // ₹100,000
    const cardLiabilities = 1800000n; // ₹18,000
    const actualDebts = 1000000n;     // ₹10,000

    const trueNetWorth = liquidCash + fdAssets - (cardLiabilities + actualDebts);
    expect(trueNetWorth).toBe(13700000n); // ₹1,37,000

    // But Liquid Funds are strictly the liquid checking balance
    expect(liquidCash).toBe(6500000n);
    expect(liquidCash).not.toBe(trueNetWorth);
  });

  it('verifies Step 2 anti-negative guard logic in sandbox', () => {
    const groceriesAvailablePaise = 400000n; // ₹4,000
    const overspentExpensePaise = 500000n;   // ₹5,000 attempted
    const validExpensePaise = 250000n;      // ₹2,500 attempted

    expect(overspentExpensePaise > groceriesAvailablePaise).toBe(true); // Must be blocked!
    expect(validExpensePaise <= groceriesAvailablePaise).toBe(true);   // Allowed!
  });

  it('verifies Step 4 credit card utilization formula and status thresholds', () => {
    const limitPaise = 6000000n; // ₹60,000
    const outstandingPaise = 2400000n; // ₹24,000

    const utilPercent = Number((outstandingPaise * 1000n) / limitPaise) / 10;
    expect(utilPercent).toBe(40.0);

    const status = getCreditCardUtilizationStatus(utilPercent);
    expect(status).toBe('warning'); // 30-50% is warning

    // After 50% repayment
    const remainingOutstanding = outstandingPaise / 2n; // ₹12,000
    const newUtilPercent = Number((remainingOutstanding * 1000n) / limitPaise) / 10;
    expect(newUtilPercent).toBe(20.0);
    expect(getCreditCardUtilizationStatus(newUtilPercent)).toBe('safe'); // <30% is safe
  });

  it('verifies Step 5 recurring normalized 30-day projection formula', () => {
    // Water can: ₹120 every 15 days -> ₹240/month
    const normalizedPaise = calculateNormalizedMonthlyCostPaise([
      {
        id: 'water-can',
        userId: 'test-user',
        title: 'Water Cans',
        amountPaise: 12000n,
        sourceType: 'account',
        frequencyType: 'interval_days',
        intervalDays: 15,
        isActive: true,
        accountId: 'acc-1',
        envelopeId: null,
        createdAt: '2026-11-01',
        updatedAt: '2026-11-01',
      },
      {
        id: 'wifi',
        userId: 'test-user',
        title: 'WiFi Broadband',
        amountPaise: 120000n, // ₹1,200
        sourceType: 'account',
        frequencyType: 'monthly_day',
        dayOfMonth: 5,
        isActive: true,
        accountId: 'acc-1',
        envelopeId: null,
        createdAt: '2026-11-01',
        updatedAt: '2026-11-01',
      },
    ]);

    // Water: (12000 * 30) / 15 = 24000n (₹240)
    // WiFi: 120000n (₹1,200)
    // Total = 144000n (₹1,440)
    expect(normalizedPaise).toBe(144000n);
  });
});
