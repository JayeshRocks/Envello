import { describe, it, expect } from 'vitest';
import {
  checkReversionEligibility,
  analyzeTransactionReversion,
} from './revertPolicy';
import type { TransactionRecord } from '@/lib/api/transactions';
import type { EnvelopeWithAllocation } from '@/types/accounting.types';

describe('Transaction Revert Policy & Eligibility Rules', () => {
  const refDateNov3 = new Date(2026, 10, 3); // 2026-11-03 (month index 10 = Nov)

  it('allows reverting any transaction recorded in the current active month', () => {
    const res1 = checkReversionEligibility('2026-11-01', refDateNov3);
    expect(res1.isReversible).toBe(true);
    expect(res1.isMonthEndGracePeriod).toBe(false);

    const res2 = checkReversionEligibility('2026-11-03', refDateNov3);
    expect(res2.isReversible).toBe(true);
  });

  it('allows reverting transactions recorded in the last 3 days of preceding month if within 3-day rollover window', () => {
    // Oct 31 is the last day of October
    const resOct31 = checkReversionEligibility('2026-10-31', refDateNov3);
    expect(resOct31.isReversible).toBe(true);
    expect(resOct31.isMonthEndGracePeriod).toBe(true);

    // Oct 30 is day 30 of 31 (within last 3 days: 29, 30, 31)
    const resOct30 = checkReversionEligibility('2026-10-30', refDateNov3);
    expect(resOct30.isReversible).toBe(true);
    expect(resOct30.isMonthEndGracePeriod).toBe(true);

    // Oct 29 is day 29 of 31 (within last 3 days)
    const resOct29 = checkReversionEligibility('2026-10-29', refDateNov3);
    expect(resOct29.isReversible).toBe(true);
    expect(resOct29.isMonthEndGracePeriod).toBe(true);
  });

  it('locks preceding month transactions that were NOT done at month-end', () => {
    // Oct 20 is mid-month
    const resOct20 = checkReversionEligibility('2026-10-20', refDateNov3);
    expect(resOct20.isReversible).toBe(false);
    expect(resOct20.reason).toContain('closed month');
  });

  it('locks month-end transactions if current date is past the 3-day rollover window', () => {
    const refDateNov6 = new Date(2026, 10, 6); // 2026-11-06 (6 days into new month)
    const res = checkReversionEligibility('2026-10-31', refDateNov6);
    expect(res.isReversible).toBe(false);
    expect(res.reason).toContain('closed month');
  });

  it('locks older transactions from 2 or more months ago', () => {
    const resSep = checkReversionEligibility('2026-09-15', refDateNov3);
    expect(resSep.isReversible).toBe(false);
  });
});

describe('analyzeTransactionReversion — Financial Ledger Impact & Negative Envelope Guards', () => {
  const refDate = new Date(2026, 10, 3); // 2026-11-03

  const mockEnvelopes: EnvelopeWithAllocation[] = [
    {
      id: 'env-groceries',
      name: 'Groceries',
      slug: 'groceries',
      isSystemReserved: false,
      rolloverPolicy: 'carry_forward',
      allocatedPaise: 1000000n, // ₹10,000
      carriedOverPaise: 0n,
      spentPaise: 350000n,      // ₹3,500 spent
      availablePaise: 650000n,  // ₹6,500 available
    },
    {
      id: 'env-dining',
      name: 'Dining Out',
      slug: 'dining',
      isSystemReserved: false,
      rolloverPolicy: 'carry_forward',
      allocatedPaise: 500000n, // ₹5,000
      carriedOverPaise: 0n,
      spentPaise: 450000n,     // ₹4,500 spent
      availablePaise: 50000n,  // ₹500 available
    },
  ];

  it('accurately previews expense reversion refunding both bank account and envelope', () => {
    const expenseTx: TransactionRecord = {
      id: 'tx-1',
      userId: 'user-1',
      transactionDate: '2026-11-02',
      type: 'expense',
      totalAmountPaise: 150000n, // ₹1,500
      description: 'Supermarket Groceries',
      notes: null,
      createdAt: '2026-11-02T10:00:00Z',
      entries: [
        {
          id: 'e-1',
          accountId: 'acc-bank',
          envelopeId: null,
          accountName: 'HDFC Savings',
          direction: 'credit',
          amountPaise: 150000n,
        },
        {
          id: 'e-2',
          accountId: null,
          envelopeId: 'env-groceries',
          envelopeName: 'Groceries',
          direction: 'debit',
          amountPaise: 150000n,
        },
      ],
    };

    const analysis = analyzeTransactionReversion(expenseTx, mockEnvelopes, refDate);
    expect(analysis.eligibility.isReversible).toBe(true);
    expect(analysis.canSafelyRevert).toBe(true);
    expect(analysis.impacts.length).toBe(2);

    // Bank account refund
    const bankImpact = analysis.impacts.find((i) => i.targetType === 'account');
    expect(bankImpact?.isRefund).toBe(true);
    expect(bankImpact?.action).toBe('credit');
    expect(bankImpact?.description).toContain('refunded back to HDFC Savings');

    // Envelope refund
    const envImpact = analysis.impacts.find((i) => i.targetType === 'envelope');
    expect(envImpact?.isRefund).toBe(true);
    expect(envImpact?.action).toBe('credit');
    expect(envImpact?.description).toContain('refunded back into available budget');
  });

  it('accurately previews card purchase reversion reducing debt and refunding envelope', () => {
    const cardTx: TransactionRecord = {
      id: 'tx-2',
      userId: 'user-1',
      transactionDate: '2026-11-02',
      type: 'credit_card_purchase',
      totalAmountPaise: 200000n, // ₹2,000
      description: 'Online Store Purchase',
      notes: '[card:card-1]',
      createdAt: '2026-11-02T11:00:00Z',
      entries: [
        {
          id: 'e-3',
          accountId: null,
          envelopeId: 'env-groceries',
          envelopeName: 'Groceries',
          direction: 'debit',
          amountPaise: 200000n,
        },
      ],
    };

    const analysis = analyzeTransactionReversion(cardTx, mockEnvelopes, refDate);
    expect(analysis.canSafelyRevert).toBe(true);

    const cardImpact = analysis.impacts.find((i) => i.targetType === 'card');
    expect(cardImpact?.isRefund).toBe(true);
    expect(cardImpact?.description).toContain('deducted from your unsettled credit card balance');

    const envImpact = analysis.impacts.find((i) => i.targetType === 'envelope');
    expect(envImpact?.isRefund).toBe(true);
  });

  it('blocks income reversion if allocated money has already been spent, preventing negative envelope balances', () => {
    // Income transaction that allocated ₹2,000 to Dining Out, but Dining Out only has ₹500 available (spent ₹4,500 of ₹5,000)
    const incomeTx: TransactionRecord = {
      id: 'tx-3',
      userId: 'user-1',
      transactionDate: '2026-11-01',
      type: 'income',
      totalAmountPaise: 200000n, // ₹2,000
      description: 'Freelance Payout',
      notes: null,
      createdAt: '2026-11-01T09:00:00Z',
      entries: [
        {
          id: 'e-4',
          accountId: 'acc-bank',
          envelopeId: null,
          accountName: 'HDFC Savings',
          direction: 'debit',
          amountPaise: 200000n,
        },
        {
          id: 'e-5',
          accountId: null,
          envelopeId: 'env-dining',
          envelopeName: 'Dining Out',
          direction: 'credit',
          amountPaise: 200000n,
        },
      ],
    };

    const analysis = analyzeTransactionReversion(incomeTx, mockEnvelopes, refDate);
    expect(analysis.canSafelyRevert).toBe(false);
    expect(analysis.blockingReason).toContain('negative balance');
    expect(analysis.blockingReason).toContain('Dining Out');
  });

  it('blocks internal reallocation reversion if recipient envelope has already spent the money', () => {
    // Reallocation transfer: ₹1,000 from Groceries -> Dining Out
    // Dining Out only has ₹500 unspent! Deducting ₹1,000 would cause negative available (-₹500)
    const reallocTx: TransactionRecord = {
      id: 'tx-4',
      userId: 'user-1',
      transactionDate: '2026-11-01',
      type: 'envelope_allocation',
      totalAmountPaise: 100000n, // ₹1,000
      description: 'Reallocation: Groceries → Dining Out',
      notes: null,
      createdAt: '2026-11-01T09:00:00Z',
      entries: [
        {
          id: 'e-6',
          accountId: null,
          envelopeId: 'env-groceries',
          envelopeName: 'Groceries',
          direction: 'credit',
          amountPaise: 100000n,
        },
        {
          id: 'e-7',
          accountId: null,
          envelopeId: 'env-dining',
          envelopeName: 'Dining Out',
          direction: 'debit',
          amountPaise: 100000n,
        },
      ],
    };

    const analysis = analyzeTransactionReversion(reallocTx, mockEnvelopes, refDate);
    expect(analysis.canSafelyRevert).toBe(false);
    expect(analysis.blockingReason).toContain('Dining Out');
    expect(analysis.blockingReason).toContain('already spent these funds');
  });
});
