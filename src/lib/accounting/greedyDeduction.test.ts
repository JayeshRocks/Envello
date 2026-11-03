import { describe, it, expect } from 'vitest';
import { calculateGreedyAccountDeduction } from './greedyDeduction';
import {
  calculateAccountBalances,
  canSpendFromAccountDirect,
  aggregateAccountHolds,
} from './accountHolds';

describe('Greedy Account Deduction Engine', () => {
  it('deducts 100% from a single backing account when it has sufficient funds', () => {
    const sources = [
      { accountId: 'acc-1', accountName: 'HDFC Bank', remainingPaise: 500000n }, // ₹5,000
    ];

    const plan = calculateGreedyAccountDeduction(200000n, 500000n, sources); // ₹2,000 expense
    expect(plan.isSplit).toBe(false);
    expect(plan.totalDeductedPaise).toBe(200000n);
    expect(plan.deductions).toHaveLength(1);
    expect(plan.deductions[0].accountId).toBe('acc-1');
    expect(plan.deductions[0].deductedPaise).toBe(200000n);
    expect(plan.deductions[0].newRemainingPaise).toBe(300000n);
    expect(plan.summaryText).toContain('Pay ₹2,000.00 from HDFC Bank in real life');
  });

  it('selects the account that can cover the most first among multiple accounts', () => {
    const sources = [
      { accountId: 'acc-cash', accountName: 'Cash in Hand', remainingPaise: 150000n }, // ₹1,500
      { accountId: 'acc-sbi', accountName: 'SBI Bank', remainingPaise: 350000n },       // ₹3,500
    ];

    // Expense: ₹3,000. SBI has ₹3,500 and Cash has ₹1,500.
    // SBI can cover the most (and covers the entire ₹3,000).
    const plan = calculateGreedyAccountDeduction(300000n, 500000n, sources);
    expect(plan.isSplit).toBe(false);
    expect(plan.deductions).toHaveLength(1);
    expect(plan.deductions[0].accountId).toBe('acc-sbi');
    expect(plan.deductions[0].deductedPaise).toBe(300000n);
    expect(plan.deductions[0].newRemainingPaise).toBe(50000n); // ₹500 left in SBI
  });

  it('splits across multiple accounts in descending order when largest account cannot cover total', () => {
    const sources = [
      { accountId: 'acc-cash', accountName: 'Cash Wallet', remainingPaise: 150000n }, // ₹1,500
      { accountId: 'acc-hdfc', accountName: 'HDFC Bank', remainingPaise: 350000n },  // ₹3,500
    ];

    // Expense: ₹4,000. Total available = ₹5,000.
    // HDFC has ₹3,500 (covers the most), Cash has ₹1,500.
    // HDFC provides ₹3,500, Cash provides remaining ₹500.
    const plan = calculateGreedyAccountDeduction(400000n, 500000n, sources);
    expect(plan.isSplit).toBe(true);
    expect(plan.totalDeductedPaise).toBe(400000n);
    expect(plan.deductions).toHaveLength(2);

    expect(plan.deductions[0].accountId).toBe('acc-hdfc');
    expect(plan.deductions[0].deductedPaise).toBe(350000n);
    expect(plan.deductions[0].newRemainingPaise).toBe(0n);

    expect(plan.deductions[1].accountId).toBe('acc-cash');
    expect(plan.deductions[1].deductedPaise).toBe(50000n);
    expect(plan.deductions[1].newRemainingPaise).toBe(100000n); // ₹1,000 remaining in cash

    expect(plan.summaryText).toContain('Pay ₹3,500.00 from HDFC Bank and ₹500.00 from Cash Wallet in real life');
  });

  it('cascades across three accounts in greedy largest-first order', () => {
    const sources = [
      { accountId: 'acc-3', accountName: 'Account 3', remainingPaise: 100000n }, // ₹1,000
      { accountId: 'acc-1', accountName: 'Account 1', remainingPaise: 500000n }, // ₹5,000
      { accountId: 'acc-2', accountName: 'Account 2', remainingPaise: 300000n }, // ₹3,000
    ];

    // Expense: ₹7,500. Total = ₹9,000.
    // Order: Account 1 (₹5,000), Account 2 (₹2,500 of ₹3,000), Account 3 (₹0 of ₹1,000)
    const plan = calculateGreedyAccountDeduction(750000n, 900000n, sources);
    expect(plan.isSplit).toBe(true);
    expect(plan.deductions).toHaveLength(2);
    expect(plan.deductions[0].accountId).toBe('acc-1');
    expect(plan.deductions[0].deductedPaise).toBe(500000n);
    expect(plan.deductions[1].accountId).toBe('acc-2');
    expect(plan.deductions[1].deductedPaise).toBe(250000n);
    expect(plan.totalDeductedPaise).toBe(750000n);
  });

  it('throws an error if expense exceeds available envelope balance', () => {
    const sources = [{ accountId: 'acc-1', remainingPaise: 100000n }];
    expect(() => calculateGreedyAccountDeduction(200000n, 100000n, sources)).toThrow(
      /exceeds available envelope budget/
    );
  });

  it('throws an error if expense amount is zero or negative', () => {
    const sources = [{ accountId: 'acc-1', remainingPaise: 100000n }];
    expect(() => calculateGreedyAccountDeduction(0n, 100000n, sources)).toThrow(
      /must be greater than zero/
    );
    expect(() => calculateGreedyAccountDeduction(-500n, 100000n, sources)).toThrow(
      /must be greater than zero/
    );
  });

  it('throws an error if total backing across accounts is less than expense', () => {
    const sources = [
      { accountId: 'acc-1', remainingPaise: 50000n },
      { accountId: 'acc-2', remainingPaise: 50000n },
    ];
    // Envelope reports 200000n available but accounts only have 100000n backing
    expect(() => calculateGreedyAccountDeduction(150000n, 200000n, sources)).toThrow(
      /Insufficient funds reserved in backing liquid accounts/
    );
  });
});

describe('Account Holds & Balance Calculations', () => {
  it('correctly calculates total, allocated, and unallocated balances', () => {
    const total = 5000000n; // ₹50,000
    const allocated = 3000000n; // ₹30,000
    const metrics = calculateAccountBalances(total, allocated);

    expect(metrics.totalBalancePaise).toBe(5000000n);
    expect(metrics.allocatedPaise).toBe(3000000n);
    expect(metrics.unallocatedPaise).toBe(2000000n); // ₹20,000 free
  });

  it('prevents direct account spending that exceeds unallocated balance', () => {
    const total = 5000000n;     // ₹50,000
    const allocated = 3500000n; // ₹35,000 on hold for envelopes
    // Unallocated = ₹15,000

    // Direct spend of ₹10,000 is allowed
    expect(canSpendFromAccountDirect(total, allocated, 1000000n)).toBe(true);

    // Direct spend of exactly ₹15,000 is allowed
    expect(canSpendFromAccountDirect(total, allocated, 1500000n)).toBe(true);

    // Direct spend of ₹15,001 is BLOCKED (would encroach on envelope holds)
    expect(canSpendFromAccountDirect(total, allocated, 1500100n)).toBe(false);

    // Direct spend of ₹40,000 is BLOCKED even though bank has ₹50,000 total
    expect(canSpendFromAccountDirect(total, allocated, 4000000n)).toBe(false);
  });

  it('aggregates multiple envelope allocation sources by account ID', () => {
    const sources = [
      { accountId: 'acc-hdfc', amountPaise: 1500000n }, // ₹15,000 from HDFC for Rent
      { accountId: 'acc-sbi', amountPaise: 500000n },   // ₹5,000 from SBI for Groceries
      { accountId: 'acc-hdfc', amountPaise: 500000n },  // ₹5,000 from HDFC for Outing
    ];

    const map = aggregateAccountHolds(sources);
    expect(map.get('acc-hdfc')).toBe(2000000n); // ₹20,000 total on hold in HDFC
    expect(map.get('acc-sbi')).toBe(500000n);   // ₹5,000 total on hold in SBI
  });
});
