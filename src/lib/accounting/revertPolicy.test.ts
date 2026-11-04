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

  it('accurately previews multi-account ghost bank expense reversion refunding each backing account', () => {
    const multiAccExpenseTx: TransactionRecord = {
      id: 'tx-5',
      userId: 'user-1',
      transactionDate: '2026-11-02',
      type: 'expense',
      totalAmountPaise: 500000n, // ₹5,000 total
      description: 'Big Supermarket Order',
      notes: '[ghost_bank] Paid via envelope',
      createdAt: '2026-11-02T12:00:00Z',
      entries: [
        {
          id: 'e-8',
          accountId: 'acc-hdfc',
          envelopeId: null,
          accountName: 'HDFC Bank',
          direction: 'credit',
          amountPaise: 350000n, // ₹3,500 from HDFC
        },
        {
          id: 'e-9',
          accountId: 'acc-cash',
          envelopeId: null,
          accountName: 'Cash in Hand',
          direction: 'credit',
          amountPaise: 150000n, // ₹1,500 from Cash
        },
        {
          id: 'e-10',
          accountId: null,
          envelopeId: 'env-groceries',
          envelopeName: 'Groceries',
          direction: 'debit',
          amountPaise: 500000n, // ₹5,000 to envelope
        },
      ],
    };

    const analysis = analyzeTransactionReversion(multiAccExpenseTx, mockEnvelopes, refDate);
    expect(analysis.eligibility.isReversible).toBe(true);
    expect(analysis.canSafelyRevert).toBe(true);
    expect(analysis.impacts.length).toBe(3);

    const hdfcImpact = analysis.impacts.find((i) => i.targetName === 'HDFC Bank');
    expect(hdfcImpact?.isRefund).toBe(true);
    expect(hdfcImpact?.amountPaise).toBe(350000n);
    expect(hdfcImpact?.description).toContain('refunded back to HDFC Bank');

    const cashImpact = analysis.impacts.find((i) => i.targetName === 'Cash in Hand');
    expect(cashImpact?.isRefund).toBe(true);
    expect(cashImpact?.amountPaise).toBe(150000n);
    expect(cashImpact?.description).toContain('refunded back to Cash in Hand');

    const envImpact = analysis.impacts.find((i) => i.targetName === 'Groceries');
    expect(envImpact?.isRefund).toBe(true);
    expect(envImpact?.amountPaise).toBe(500000n);
    expect(envImpact?.description).toContain('refunded back into available budget');
  });

  describe('Reconciliation (Adjustment) Reversion Guard & Impact', () => {
    it('accurately previews reconciliation surplus reversion by deducting the surplus from account', () => {
      const surplusTx: TransactionRecord = {
        id: 'tx-adj-surplus',
        userId: 'user-1',
        transactionDate: '2026-11-02',
        type: 'adjustment',
        totalAmountPaise: 250000n, // ₹2,500 surplus
        description: 'Reconcile Primary Savings (+₹2,500.00)',
        notes: null,
        createdAt: '2026-11-02T10:00:00Z',
        entries: [
          {
            id: 'e-adj-1',
            accountId: 'acc-savings',
            envelopeId: null,
            accountName: 'Primary Savings',
            direction: 'credit', // surplus credited to account
            amountPaise: 250000n,
          },
        ],
      };

      const accounts = [
        {
          id: 'acc-savings',
          name: 'Primary Savings',
          balancePaise: 10000000n, // ₹1,00,000
          unallocatedPaise: 8000000n, // ₹80,000 free
        },
      ];

      const analysis = analyzeTransactionReversion(surplusTx, mockEnvelopes, refDate, accounts);
      expect(analysis.eligibility.isReversible).toBe(true);
      expect(analysis.canSafelyRevert).toBe(true);
      expect(analysis.impacts.length).toBe(1);

      const impact = analysis.impacts[0];
      expect(impact.action).toBe('debit');
      expect(impact.isRefund).toBe(false);
      expect(impact.amountPaise).toBe(250000n);
      expect(impact.description).toContain('reconciliation surplus will be deducted');
    });

    it('blocks reconciliation surplus reversion when account lacks free unallocated funds due to envelope holds', () => {
      const surplusTx: TransactionRecord = {
        id: 'tx-adj-surplus-2',
        userId: 'user-1',
        transactionDate: '2026-11-02',
        type: 'adjustment',
        totalAmountPaise: 500000n, // ₹5,000 surplus
        description: 'Reconcile Primary Savings (+₹5,000.00)',
        notes: null,
        createdAt: '2026-11-02T10:00:00Z',
        entries: [
          {
            id: 'e-adj-2',
            accountId: 'acc-savings',
            envelopeId: null,
            accountName: 'Primary Savings',
            direction: 'credit',
            amountPaise: 500000n,
          },
        ],
      };

      const accounts = [
        {
          id: 'acc-savings',
          name: 'Primary Savings',
          balancePaise: 500000n,    // ₹5,000 total balance
          unallocatedPaise: 100000n, // only ₹1,000 unallocated (₹4,000 on hold)
        },
      ];

      const analysis = analyzeTransactionReversion(surplusTx, mockEnvelopes, refDate, accounts);
      expect(analysis.eligibility.isReversible).toBe(true);
      expect(analysis.canSafelyRevert).toBe(false);
      expect(analysis.blockingReason).toContain('active envelope holds');
      expect(analysis.blockingReason).toContain('exceeds free unallocated balance');
    });

    it('accurately previews reconciliation deficit reversion by refunding the deficit to account', () => {
      const deficitTx: TransactionRecord = {
        id: 'tx-adj-deficit',
        userId: 'user-1',
        transactionDate: '2026-11-02',
        type: 'adjustment',
        totalAmountPaise: 150000n, // ₹1,500 deficit
        description: 'Reconcile Primary Savings (-₹1,500.00)',
        notes: null,
        createdAt: '2026-11-02T10:00:00Z',
        entries: [
          {
            id: 'e-adj-3',
            accountId: 'acc-savings',
            envelopeId: null,
            accountName: 'Primary Savings',
            direction: 'debit', // deficit debited from account
            amountPaise: 150000n,
          },
        ],
      };

      const analysis = analyzeTransactionReversion(deficitTx, mockEnvelopes, refDate);
      expect(analysis.eligibility.isReversible).toBe(true);
      expect(analysis.canSafelyRevert).toBe(true);
      expect(analysis.impacts.length).toBe(1);

      const impact = analysis.impacts[0];
      expect(impact.action).toBe('credit');
      expect(impact.isRefund).toBe(true);
      expect(impact.amountPaise).toBe(150000n);
      expect(impact.description).toContain('reconciliation deficit will be restored');
    });
  });

  describe('Transfer Reversion Guard & Impact', () => {
    it('accurately previews transfer reversion refunding origin and debiting destination', () => {
      const transferTx: TransactionRecord = {
        id: 'tx-transfer-1',
        userId: 'user-1',
        transactionDate: '2026-11-02',
        type: 'transfer',
        totalAmountPaise: 300000n, // ₹3,000
        description: 'Transfer from Checking to Savings',
        notes: null,
        createdAt: '2026-11-02T10:00:00Z',
        entries: [
          {
            id: 'e-xfer-from',
            accountId: 'acc-checking',
            envelopeId: null,
            accountName: 'Checking Account',
            direction: 'credit',
            amountPaise: 300000n,
          },
          {
            id: 'e-xfer-to',
            accountId: 'acc-savings',
            envelopeId: null,
            accountName: 'Primary Savings',
            direction: 'debit',
            amountPaise: 300000n,
          },
        ],
      };

      const accounts = [
        {
          id: 'acc-checking',
          name: 'Checking Account',
          balancePaise: 500000n,
          unallocatedPaise: 500000n,
        },
        {
          id: 'acc-savings',
          name: 'Primary Savings',
          balancePaise: 1000000n,
          unallocatedPaise: 1000000n,
        },
      ];

      const analysis = analyzeTransactionReversion(transferTx, mockEnvelopes, refDate, accounts);
      expect(analysis.eligibility.isReversible).toBe(true);
      expect(analysis.canSafelyRevert).toBe(true);
      expect(analysis.impacts.length).toBe(2);

      const refundImpact = analysis.impacts.find((i) => i.targetName === 'Checking Account');
      expect(refundImpact?.action).toBe('credit');
      expect(refundImpact?.isRefund).toBe(true);

      const debitImpact = analysis.impacts.find((i) => i.targetName === 'Primary Savings');
      expect(debitImpact?.action).toBe('debit');
      expect(debitImpact?.isRefund).toBe(false);
    });

    it('blocks transfer reversion if destination account has insufficient unallocated balance', () => {
      const transferTx: TransactionRecord = {
        id: 'tx-transfer-2',
        userId: 'user-1',
        transactionDate: '2026-11-02',
        type: 'transfer',
        totalAmountPaise: 500000n, // ₹5,000
        description: 'Transfer to Savings',
        notes: null,
        createdAt: '2026-11-02T10:00:00Z',
        entries: [
          {
            id: 'e-xfer-from',
            accountId: 'acc-checking',
            envelopeId: null,
            accountName: 'Checking',
            direction: 'credit',
            amountPaise: 500000n,
          },
          {
            id: 'e-xfer-to',
            accountId: 'acc-savings',
            envelopeId: null,
            accountName: 'Savings',
            direction: 'debit',
            amountPaise: 500000n,
          },
        ],
      };

      const accounts = [
        {
          id: 'acc-savings',
          name: 'Savings',
          balancePaise: 500000n,
          unallocatedPaise: 200000n, // only ₹2,000 unallocated (₹3,000 held by envelopes)
        },
      ];

      const analysis = analyzeTransactionReversion(transferTx, mockEnvelopes, refDate, accounts);
      expect(analysis.canSafelyRevert).toBe(false);
      expect(analysis.blockingReason).toContain('exceeds free unallocated balance');
    });
  });

  describe('Income Reversion Guard with Account Holds', () => {
    it('blocks income reversion if receiving account has reserved the money in envelope holds', () => {
      const incomeTx: TransactionRecord = {
        id: 'tx-income-held',
        userId: 'user-1',
        transactionDate: '2026-11-02',
        type: 'income',
        totalAmountPaise: 1000000n, // ₹10,000
        description: 'Consulting Fee',
        notes: null,
        createdAt: '2026-11-02T10:00:00Z',
        entries: [
          {
            id: 'e-inc-acc',
            accountId: 'acc-savings',
            envelopeId: null,
            accountName: 'Primary Savings',
            direction: 'debit', // income debits account
            amountPaise: 1000000n,
          },
        ],
      };

      const accounts = [
        {
          id: 'acc-savings',
          name: 'Primary Savings',
          balancePaise: 1000000n,    // ₹10,000 total balance
          unallocatedPaise: 200000n, // only ₹2,000 free (₹8,000 put on hold in envelopes!)
        },
      ];

      const analysis = analyzeTransactionReversion(incomeTx, mockEnvelopes, refDate, accounts);
      expect(analysis.canSafelyRevert).toBe(false);
      expect(analysis.blockingReason).toContain('active envelope holds');
    });
  });

  describe('FD Movement & Self EMI Reversion Impacts', () => {
    it('accurately previews term deposit funding reversion refunding bank account', () => {
      const fdFundingTx: TransactionRecord = {
        id: 'tx-fd-funding',
        userId: 'user-1',
        transactionDate: '2026-11-02',
        type: 'fd_movement',
        totalAmountPaise: 5000000n, // ₹50,000
        description: 'FD Placement: HDFC Bank',
        notes: null,
        createdAt: '2026-11-02T10:00:00Z',
        entries: [
          {
            id: 'e-fd-1',
            accountId: 'acc-savings',
            envelopeId: null,
            accountName: 'Primary Savings',
            direction: 'credit', // money left bank
            amountPaise: 5000000n,
          },
        ],
      };

      const analysis = analyzeTransactionReversion(fdFundingTx, mockEnvelopes, refDate);
      expect(analysis.canSafelyRevert).toBe(true);
      expect(analysis.impacts[0].action).toBe('credit');
      expect(analysis.impacts[0].isRefund).toBe(true);
      expect(analysis.impacts[0].description).toContain('will be refunded back to Primary Savings');
    });

    it('accurately previews term deposit liquidation reversion debiting proceeds from account', () => {
      const fdLiquidationTx: TransactionRecord = {
        id: 'tx-fd-liq',
        userId: 'user-1',
        transactionDate: '2026-11-02',
        type: 'fd_movement',
        totalAmountPaise: 5500000n, // ₹55,000
        description: 'FD liquidated: HDFC Bank',
        notes: null,
        createdAt: '2026-11-02T10:00:00Z',
        entries: [
          {
            id: 'e-fd-2',
            accountId: 'acc-savings',
            envelopeId: null,
            accountName: 'Primary Savings',
            direction: 'debit', // money entered bank
            amountPaise: 5500000n,
          },
        ],
      };

      const accounts = [
        {
          id: 'acc-savings',
          name: 'Primary Savings',
          balancePaise: 6000000n,
          unallocatedPaise: 6000000n,
        },
      ];

      const analysis = analyzeTransactionReversion(fdLiquidationTx, mockEnvelopes, refDate, accounts);
      expect(analysis.canSafelyRevert).toBe(true);
      expect(analysis.impacts[0].action).toBe('debit');
      expect(analysis.impacts[0].isRefund).toBe(false);
      expect(analysis.impacts[0].description).toContain('liquidation deposit will be deducted');
    });

    it('accurately previews self EMI repayment reversion', () => {
      const selfEmiTx: TransactionRecord = {
        id: 'tx-self-emi',
        userId: 'user-1',
        transactionDate: '2026-11-02',
        type: 'self_emi_repayment',
        totalAmountPaise: 300000n, // ₹3,000
        description: 'Self EMI Reimbursement: Laptop Upgrade',
        notes: null,
        createdAt: '2026-11-02T10:00:00Z',
        entries: [],
      };

      const analysis = analyzeTransactionReversion(selfEmiTx, mockEnvelopes, refDate);
      expect(analysis.canSafelyRevert).toBe(true);
      expect(analysis.impacts[0].targetType).toBe('loan');
      expect(analysis.impacts[0].description).toContain('will be deducted from your reimbursed Self EMI progress');
    });
  });
});
