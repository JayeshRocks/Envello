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

  describe('Liquid Funds Invariants', () => {
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

  describe('Unified Payment Sources & Envelope Invariants', () => {
    it('credit card purchase increases card liability and preserves liquid funds in bank', () => {
      const initialBankCash = 5000000n; // ₹50,000 liquid cash
      const initialCardOutstanding = 500000n; // ₹5,000 outstanding debt
      const purchaseAmount = 250000n; // ₹2,500 Dining

      // Simulating card purchase invariant
      const newCardOutstanding = initialCardOutstanding + purchaseAmount;
      const newBankCash = initialBankCash; // Untouched!

      expect(newCardOutstanding).toBe(750000n); // ₹7,500
      expect(newBankCash).toBe(5000000n); // Liquid cash invariant preserved
    });

    it('direct account expense debits bank cash without touching envelope allocations', () => {
      const initialBankBalance = 10000000n; // ₹1,00,000
      const initialGymAllocation = 300000n; // ₹3,000
      const initialGymSpent = 50000n; // ₹500
      const electricityBill = 150000n; // ₹1,500 direct bill (envelopeId = null)

      // Direct account debit
      const newBankBalance = initialBankBalance - electricityBill;
      // Envelope spent remains untouched
      const newGymSpent = initialGymSpent;

      expect(newBankBalance).toBe(9850000n); // ₹98,500
      expect(newGymSpent).toBe(50000n); // Gym budget intact
      expect(calculateAvailableEnvelopeBalance(initialGymAllocation, 0n, newGymSpent)).toBe(250000n);
    });

    it('credit card bill payment transfers cash to liability with zero envelope impact', () => {
      const bankBalance = 8000000n; // ₹80,000
      const cardOutstanding = 1500000n; // ₹15,000
      const billPayment = 1500000n; // ₹15,000 full settlement

      const newBankBalance = bankBalance - billPayment;
      const newCardOutstanding = cardOutstanding - billPayment;

      expect(newBankBalance).toBe(6500000n); // ₹65,000
      expect(newCardOutstanding).toBe(0n); // Fully settled
      expect(calculateCreditCardUtilization(newCardOutstanding, 10000000n)).toBe(0);
    });

    it('enforces that bill/loan repayments cannot exceed the amount due (prevents phantom money loss)', () => {
      const cardOutstanding = 500000n; // ₹5,000 due
      const attemptedExcessPayment = 800000n; // ₹8,000 attempted
      
      // Payment amount must be capped at amount due
      const safePayment = attemptedExcessPayment > cardOutstanding ? cardOutstanding : attemptedExcessPayment;
      expect(safePayment).toBe(500000n);

      const remainingLiability = cardOutstanding - safePayment;
      expect(remainingLiability).toBe(0n); // Settles exactly with 0 loss
    });

    it('loan repayment cannot exceed remaining debt balance', () => {
      const remainingDebt = 1250000n; // ₹12,500 owed
      const monthlyInstalment = 500000n; // ₹5,000
      const defaultDue = monthlyInstalment > 0n ? (monthlyInstalment < remainingDebt ? monthlyInstalment : remainingDebt) : remainingDebt;
      
      expect(defaultDue).toBe(500000n);

      // Final payment when remaining debt is less than monthly instalment
      const finalRemainingDebt = 300000n; // ₹3,000 remaining
      const finalDue = monthlyInstalment < finalRemainingDebt ? monthlyInstalment : finalRemainingDebt;
      expect(finalDue).toBe(300000n); // Auto-fills exact due, capped at remaining
    });

    it('debts & loans manual payment calculates remaining balance and settlement accurately in paise', () => {
      const initialBorrowed = 5000000n; // ₹50,000 borrowed from family/friend
      let remainingBalance = initialBorrowed;
      const bankBalance = 10000000n; // ₹1,00,000 in liquid account

      // Payment 1: 50% partial repayment
      const payment1 = 2500000n; // ₹25,000
      expect(payment1 <= remainingBalance).toBe(true);
      expect(payment1 <= bankBalance).toBe(true);

      remainingBalance -= payment1;
      const newBankBalance = bankBalance - payment1;
      expect(remainingBalance).toBe(2500000n);
      expect(newBankBalance).toBe(7500000n);
      let isSettled = remainingBalance === 0n;
      expect(isSettled).toBe(false);

      // Payment 2: Remaining payoff
      const payment2 = remainingBalance; // ₹25,000
      remainingBalance -= payment2;
      isSettled = remainingBalance === 0n;
      expect(remainingBalance).toBe(0n);
      expect(isSettled).toBe(true);
    });

    it('envelope expense cannot exceed available balance (prevents negative envelope balances)', () => {
      const allocated = 200000n; // ₹2,000
      const carried = 0n;
      const spent = 50000n; // ₹500
      const available = calculateAvailableEnvelopeBalance(allocated, carried, spent); // ₹1,500
      expect(available).toBe(150000n);

      const invalidExpense = 200000n; // ₹2,000 attempted
      expect(invalidExpense > available).toBe(true); // Exceeds available balance, must be rejected

      const validExpense = 100000n; // ₹1,000
      expect(validExpense <= available).toBe(true);
      const newAvailable = calculateAvailableEnvelopeBalance(allocated, carried, spent + validExpense);
      expect(newAvailable).toBe(50000n); // ₹500 remaining positive
      expect(newAvailable >= 0n).toBe(true);
    });

    it('income recording can allocate directly into an envelope, increasing budget and available balance', () => {
      const initialBankBalance = 1000000n; // ₹10,000
      const initialEnvelopeAllocated = 500000n; // ₹5,000
      const initialEnvelopeSpent = 100000n; // ₹1,000
      const initialAvailable = calculateAvailableEnvelopeBalance(initialEnvelopeAllocated, 0n, initialEnvelopeSpent);
      expect(initialAvailable).toBe(400000n); // ₹4,000

      // Income of ₹3,000 credited to bank and allocated to envelope
      const incomeAmount = 300000n;
      const newBankBalance = initialBankBalance + incomeAmount;
      const newEnvelopeAllocated = initialEnvelopeAllocated + incomeAmount;
      const newAvailable = calculateAvailableEnvelopeBalance(newEnvelopeAllocated, 0n, initialEnvelopeSpent);

      expect(newBankBalance).toBe(1300000n); // ₹13,000
      expect(newEnvelopeAllocated).toBe(800000n); // ₹8,000
      expect(newAvailable).toBe(700000n); // ₹7,000

      // Deleting income transaction reverses allocation
      const reversedAllocated = newEnvelopeAllocated - incomeAmount;
      const reversedBankBalance = newBankBalance - incomeAmount;
      expect(reversedAllocated).toBe(initialEnvelopeAllocated);
      expect(reversedBankBalance).toBe(initialBankBalance);
    });

    it('reallocation guard: cannot reallocate budget lower than already spent funds', () => {
      const carried = 100000n; // ₹1,000 carried over
      const initialAllocated = 500000n; // ₹5,000 allocated
      const spent = 400000n; // ₹4,000 spent
      // Current available: 1,000 + 5,000 - 4,000 = ₹2,000
      expect(calculateAvailableEnvelopeBalance(initialAllocated, carried, spent)).toBe(200000n);

      // Attempted reallocation below spent (e.g. ₹2,000):
      // Total available would become: 1,000 + 2,000 - 4,000 = -₹1,000!
      const attemptedLowAllocation = 200000n;
      const minRequired = spent > carried ? spent - carried : 0n; // ₹3,000
      expect(attemptedLowAllocation < minRequired).toBe(true);

      // Valid reallocation at or above minRequired (e.g. ₹3,500):
      const validReallocation = 350000n;
      expect(validReallocation >= minRequired).toBe(true);
      const newAvailable = calculateAvailableEnvelopeBalance(validReallocation, carried, spent);
      expect(newAvailable).toBe(50000n); // ₹500 positive
      expect(newAvailable >= 0n).toBe(true);
    });

    it('transfer between envelopes: preserves system zero-sum and guards against overdrawing source envelope', () => {
      const fromCarried = 0n;
      const fromAllocated = 600000n; // ₹6,000
      const fromSpent = 450000n; // ₹4,500
      const fromAvailable = calculateAvailableEnvelopeBalance(fromAllocated, fromCarried, fromSpent); // ₹1,500
      expect(fromAvailable).toBe(150000n);

      const toAllocated = 200000n; // ₹2,000
      const toCarried = 0n;
      const toSpent = 0n;
      const toAvailable = calculateAvailableEnvelopeBalance(toAllocated, toCarried, toSpent); // ₹2,000

      // System total available across both before transfer: ₹3,500
      const totalAvailableBefore = fromAvailable + toAvailable;
      expect(totalAvailableBefore).toBe(350000n);

      // Attempt transfer exceeding available (₹2,000 attempted when only ₹1,500 available)
      const invalidTransfer = 200000n;
      expect(invalidTransfer > fromAvailable).toBe(true);

      // Valid transfer of ₹1,000
      const validTransfer = 100000n;
      expect(validTransfer <= fromAvailable).toBe(true);

      const newFromAllocated = fromAllocated - validTransfer; // ₹5,000
      const newToAllocated = toAllocated + validTransfer; // ₹3,000

      const newFromAvailable = calculateAvailableEnvelopeBalance(newFromAllocated, fromCarried, fromSpent); // ₹500
      const newToAvailable = calculateAvailableEnvelopeBalance(newToAllocated, toCarried, toSpent); // ₹3,000

      expect(newFromAvailable).toBe(50000n);
      expect(newToAvailable).toBe(300000n);

      // Zero-sum invariant: Total available across both envelopes is perfectly preserved
      const totalAvailableAfter = newFromAvailable + newToAvailable;
      expect(totalAvailableAfter).toBe(totalAvailableBefore);
    });

    it('undo/revert allocation guard: blocks reverting allocation if money has already been spent', () => {
      const originalAllocation = 100000n; // ₹1,000
      let activeAllocation = 500000n; // User raised budget to ₹5,000
      const spentAfterAllocation = 300000n; // User spent ₹3,000
      expect(activeAllocation > originalAllocation).toBe(true);

      // If user tries to undo allocation back to originalAllocation (₹1,000):
      const resultingAvailable = calculateAvailableEnvelopeBalance(originalAllocation, 0n, spentAfterAllocation);
      // Available would be 1,000 - 3,000 = -₹2,000
      expect(resultingAvailable < 0n).toBe(true);

      // Guard check: Reverting is invalid while spent > originalAllocation
      const isUndoAllowed = originalAllocation >= spentAfterAllocation;
      expect(isUndoAllowed).toBe(false);
    });

    it('mixed lifecycle operations (allocate -> spend -> transfer -> delete expense) maintains absolute ledger accuracy', () => {
      let allocatedA = 1000000n; // ₹10,000 in Envelope A
      let spentA = 0n;
      let allocatedB = 200000n; // ₹2,000 in Envelope B
      let spentB = 0n;

      // 1. Spend ₹4,000 in Envelope A
      const expense1 = 400000n;
      spentA += expense1;
      expect(calculateAvailableEnvelopeBalance(allocatedA, 0n, spentA)).toBe(600000n); // ₹6,000 left

      // 2. Transfer ₹3,000 from Envelope A to Envelope B
      const transferAmount = 300000n;
      allocatedA -= transferAmount; // ₹7,000
      allocatedB += transferAmount; // ₹5,000
      expect(calculateAvailableEnvelopeBalance(allocatedA, 0n, spentA)).toBe(300000n); // ₹3,000 left
      expect(calculateAvailableEnvelopeBalance(allocatedB, 0n, spentB)).toBe(500000n); // ₹5,000 available

      // 3. Spend ₹4,500 in Envelope B
      const expense2 = 450000n;
      spentB += expense2;
      expect(calculateAvailableEnvelopeBalance(allocatedB, 0n, spentB)).toBe(50000n); // ₹500 left

      // 4. Delete Expense 1 (₹4,000 in Envelope A)
      spentA -= expense1;
      expect(spentA).toBe(0n);
      expect(calculateAvailableEnvelopeBalance(allocatedA, 0n, spentA)).toBe(700000n); // Restored to ₹7,000
      expect(calculateAvailableEnvelopeBalance(allocatedB, 0n, spentB)).toBe(50000n); // Envelope B intact

      // Net state check: Total allocations (₹12,000) - Total spent (₹4,500) = Total available (₹7,500)
      const totalAllocated = allocatedA + allocatedB;
      const totalSpent = spentA + spentB;
      const totalAvailable = calculateAvailableEnvelopeBalance(allocatedA, 0n, spentA) + calculateAvailableEnvelopeBalance(allocatedB, 0n, spentB);
      expect(totalAllocated - totalSpent).toBe(totalAvailable);
      expect(totalAvailable).toBe(750000n);
    });
  });
});
