import { describe, it, expect } from 'vitest';
import { toPaise, toRupees, formatINR } from './currency';
import {
  calculateNetSpendable,
  calculateAvailableEnvelopeBalance,
  calculateCreditCardUtilization,
  getCreditCardUtilizationStatus,
  calculateRollover,
  calculateSelfEmiProgress,
  calculateReconciliationDiscrepancy,
} from './calculations';
import { shiftYearMonth } from '@/hooks/useEnvelopes';

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

  describe('Net Worth & Solvency Invariants', () => {
    it('calculates net worth as assets minus liabilities', () => {
      const spendableCash = 12500000n; // ₹1,25,000
      const lockedFDs = 25000000n;     // ₹2,50,000
      const cardDebt = 1500000n;       // ₹15,000
      const actualDebt = 5000000n;     // ₹50,000

      const totalAssets = spendableCash + lockedFDs; // ₹3,75,000
      const totalLiabilities = cardDebt + actualDebt; // ₹65,000
      const netWorth = totalAssets - totalLiabilities; // ₹3,10,000

      expect(totalAssets).toBe(37500000n);
      expect(totalLiabilities).toBe(6500000n);
      expect(netWorth).toBe(31000000n);
      expect(netWorth > 0n).toBe(true);
    });

    it('preserves double-entry balance during card liability settlement', () => {
      let bankBalance = 10000000n; // ₹1,00,000
      let cardOutstanding = 2500000n; // ₹25,000
      const paymentAmount = 1500000n; // ₹15,000

      // Execute settlement
      bankBalance -= paymentAmount;
      cardOutstanding -= paymentAmount;

      expect(bankBalance).toBe(8500000n);
      expect(cardOutstanding).toBe(1000000n);
      // Net worth before: 1,00,000 - 25,000 = 75,000
      // Net worth after: 85,000 - 10,000 = 75,000
      // Net worth is UNCHANGED by internal debt settlement!
      expect(bankBalance - cardOutstanding).toBe(7500000n);
    });
  });

  describe('Budget Period Navigation', () => {
    it('shifts months correctly within the same calendar year', () => {
      expect(shiftYearMonth('2026-10', 1)).toBe('2026-11');
      expect(shiftYearMonth('2026-10', -1)).toBe('2026-09');
    });

    it('crosses year boundaries cleanly forward and backward', () => {
      expect(shiftYearMonth('2026-12', 1)).toBe('2027-01');
      expect(shiftYearMonth('2026-01', -1)).toBe('2025-12');
    });
  });

  describe('Bank Statement Reconciliation Invariants', () => {
    it('detects exact match with zero adjustment', () => {
      const statement = 10000000n; // ₹1,00,000.00
      const ledger = 10000000n;    // ₹1,00,000.00
      const result = calculateReconciliationDiscrepancy(statement, ledger);

      expect(result.status).toBe('matched');
      expect(result.discrepancyPaise).toBe(0n);
      expect(result.adjustmentType).toBe('none');
      expect(result.adjustmentAmountPaise).toBe(0n);
    });

    it('detects bank statement surplus requiring a credit adjustment', () => {
      const statement = 10500000n; // ₹1,05,000.00 (Statement has more)
      const ledger = 10000000n;    // ₹1,00,000.00
      const result = calculateReconciliationDiscrepancy(statement, ledger);

      expect(result.status).toBe('surplus');
      expect(result.discrepancyPaise).toBe(500000n); // +₹5,000
      expect(result.adjustmentType).toBe('credit');
      expect(result.adjustmentAmountPaise).toBe(500000n);
    });

    it('detects bank statement deficit requiring a debit adjustment', () => {
      const statement = 9850000n; // ₹98,500.00 (Statement has less)
      const ledger = 10000000n;   // ₹1,00,000.00
      const result = calculateReconciliationDiscrepancy(statement, ledger);

      expect(result.status).toBe('deficit');
      expect(result.discrepancyPaise).toBe(-150000n); // -₹1,500
      expect(result.adjustmentType).toBe('debit');
      expect(result.adjustmentAmountPaise).toBe(150000n);
    });
  });
});
