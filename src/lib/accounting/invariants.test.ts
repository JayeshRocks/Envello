import { describe, it, expect } from 'vitest';
import { toPaise, toRupees, formatINR } from './currency';
import {
  calculateNetSpendable,
  calculateAvailableEnvelopeBalance,
  calculateCreditCardUtilization,
  getCreditCardUtilizationStatus,
  calculateRollover,
  calculateSelfEmiProgress,
} from './calculations';

describe('Accounting Engine — Invariants & Precision', () => {
  describe('Zero Floating-Point Error Arithmetic', () => {
    it('accurately adds 0.1 + 0.2 in paise without IEEE-754 drift', () => {
      const p1 = toPaise(0.1); // 10 paise
      const p2 = toPaise(0.2); // 20 paise
      const sum = p1 + p2;
      expect(sum).toBe(30n);
      expect(toRupees(sum)).toBe(0.3);
    });

    it('safely parses string amounts with commas and decimals', () => {
      expect(toPaise('1,50,000.75')).toBe(15000075n);
      expect(toPaise('500')).toBe(50000n);
      expect(toPaise('0.05')).toBe(5n);
    });

    it('formats Indian numbers correctly with currency symbol', () => {
      const formatted = formatINR(15000000n); // ₹1,50,000.00
      expect(formatted).toContain('1,50,000.00');
    });
  });

  describe('Spendable Cash Invariants', () => {
    it('sums only active liquid accounts (checking, savings, cash)', () => {
      const accounts = [
        { balancePaise: 5000000n, accountType: 'checking', isActive: true },
        { balancePaise: 3000000n, accountType: 'savings', isActive: true },
        { balancePaise: 200000n, accountType: 'cash', isActive: true },
        { balancePaise: 10000000n, accountType: 'other', isActive: true }, // FD or locked
        { balancePaise: 9999999n, accountType: 'checking', isActive: false }, // Inactive
      ];

      const spendable = calculateNetSpendable(accounts);
      // 50,000 + 30,000 + 2,000 = 82,000 = 8200000 paise
      expect(spendable).toBe(8200000n);
    });
  });

  describe('Envelope Invariants & Rollover', () => {
    it('calculates available envelope balance correctly', () => {
      // Carried 500 + Allocated 2000 - Spent 1200 = 1300
      const available = calculateAvailableEnvelopeBalance(200000n, 50000n, 120000n);
      expect(available).toBe(130000n);
    });

    it('handles carry_forward rollover policy', () => {
      const result = calculateRollover(200000n, 0n, 150000n, 'carry_forward');
      expect(result.carryForwardPaise).toBe(50000n);
      expect(result.sweepToRegularPaise).toBe(0n);
    });

    it('handles sweep_to_regular rollover policy', () => {
      const result = calculateRollover(200000n, 0n, 120000n, 'sweep_to_regular');
      expect(result.carryForwardPaise).toBe(0n);
      expect(result.sweepToRegularPaise).toBe(80000n);
    });
  });

  describe('Credit Card Utilization Thresholds', () => {
    it('calculates utilization percent accurately', () => {
      // 25,000 balance on 1,00,000 limit = 25%
      const util = calculateCreditCardUtilization(2500000n, 10000000n);
      expect(util).toBe(25);
      expect(getCreditCardUtilizationStatus(util)).toBe('safe');
    });

    it('triggers warning status between 30% and 50%', () => {
      const util = calculateCreditCardUtilization(3500000n, 10000000n);
      expect(util).toBe(35);
      expect(getCreditCardUtilizationStatus(util)).toBe('warning');
    });

    it('triggers danger status above 50%', () => {
      const util = calculateCreditCardUtilization(5500000n, 10000000n);
      expect(util).toBe(55);
      expect(getCreditCardUtilizationStatus(util)).toBe('danger');
    });
  });

  describe('Self EMI Calculations', () => {
    it('tracks remaining reimbursement balance and progress percentage', () => {
      // Funded 50,000, Reimbursed 20,000 -> Remaining 30,000, Progress 40%
      const { remainingPaise, progressPercent, isFullyReimbursed } = calculateSelfEmiProgress(5000000n, 2000000n);
      expect(remainingPaise).toBe(3000000n);
      expect(progressPercent).toBe(40);
      expect(isFullyReimbursed).toBe(false);
    });
  });
});
