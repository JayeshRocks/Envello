import { describe, it, expect } from 'vitest';
import { getTransactionDisplayInfo } from './transactionDisplay';
import type { TransactionRecord } from '@/lib/api/transactions';

describe('getTransactionDisplayInfo', () => {
  const baseTx: TransactionRecord = {
    id: 'tx-1',
    userId: 'user-1',
    transactionDate: '2026-11-05',
    type: 'expense',
    totalAmountPaise: 250000n, // ₹2,500
    description: 'Groceries',
    notes: null,
    createdAt: '2026-11-05T10:00:00Z',
    entries: [],
  };

  it('renders expenses in red with negative prefix and Expense badge', () => {
    const tx: TransactionRecord = { ...baseTx, type: 'expense' };
    const info = getTransactionDisplayInfo(tx);

    expect(info.typeLabel).toBe('Expense');
    expect(info.amountColor).toBe('text-rose-400');
    expect(info.amountPrefix).toBe('-');
    expect(info.formattedAmount).toBe('-₹2,500.00');
    expect(info.badgeClassName).toContain('text-rose-400');
  });

  it('renders income in green with positive prefix and Income badge', () => {
    const tx: TransactionRecord = { ...baseTx, type: 'income', totalAmountPaise: 5000000n };
    const info = getTransactionDisplayInfo(tx);

    expect(info.typeLabel).toBe('Income');
    expect(info.amountColor).toBe('text-emerald-400');
    expect(info.amountPrefix).toBe('+');
    expect(info.formattedAmount).toBe('+₹50,000.00');
    expect(info.badgeClassName).toContain('text-emerald-400');
  });

  it('renders account transfers in neutral white without prefix', () => {
    const tx: TransactionRecord = { ...baseTx, type: 'transfer', totalAmountPaise: 1000000n };
    const info = getTransactionDisplayInfo(tx);

    expect(info.typeLabel).toBe('Transfer');
    expect(info.amountColor).toBe('text-white');
    expect(info.amountPrefix).toBe('');
    expect(info.formattedAmount).toBe('₹10,000.00');
  });

  it('renders envelope reallocations in neutral white without prefix and Reallocation badge', () => {
    const tx: TransactionRecord = { ...baseTx, type: 'envelope_allocation', totalAmountPaise: 150000n };
    const info = getTransactionDisplayInfo(tx);

    expect(info.typeLabel).toBe('Reallocation');
    expect(info.amountColor).toBe('text-white');
    expect(info.amountPrefix).toBe('');
    expect(info.formattedAmount).toBe('₹1,500.00');
    expect(info.badgeClassName).toContain('text-sky-400');
  });

  it('renders credit card payments in purple with negative prefix (liquid funds leave bank)', () => {
    const tx: TransactionRecord = {
      ...baseTx,
      type: 'credit_card_payment',
      description: 'Card payment: HDFC Millennia',
      totalAmountPaise: 1200000n,
    };
    const info = getTransactionDisplayInfo(tx);

    expect(info.typeLabel).toBe('Card Payment');
    expect(info.amountColor).toBe('text-purple-400');
    expect(info.amountPrefix).toBe('-');
    expect(info.formattedAmount).toBe('-₹12,000.00');
    expect(info.badgeClassName).toContain('text-purple-400');
  });

  it('renders credit card purchases in purple with negative prefix', () => {
    const tx: TransactionRecord = {
      ...baseTx,
      type: 'credit_card_purchase',
      description: 'Flight ticket',
      totalAmountPaise: 650000n,
    };
    const info = getTransactionDisplayInfo(tx);

    expect(info.typeLabel).toBe('Card Spend');
    expect(info.amountColor).toBe('text-purple-400');
    expect(info.amountPrefix).toBe('-');
    expect(info.formattedAmount).toBe('-₹6,500.00');
    expect(info.badgeClassName).toContain('text-purple-400');
  });

  it('renders FD deposits in amber with negative prefix (funds leave liquid bank into deposit)', () => {
    const tx: TransactionRecord = {
      ...baseTx,
      type: 'fd_movement',
      description: 'FD Placement: ICICI Bank',
      totalAmountPaise: 10000000n, // ₹1,00,000
      entries: [
        {
          id: 'e-1',
          accountId: 'acc-1',
          envelopeId: null,
          direction: 'credit', // funds leaving bank
          amountPaise: 10000000n,
        },
      ],
    };
    const info = getTransactionDisplayInfo(tx);

    expect(info.typeLabel).toBe('FD Deposit');
    expect(info.amountColor).toBe('text-amber-400');
    expect(info.amountPrefix).toBe('-');
    expect(info.formattedAmount).toBe('-₹1,00,000.00');
    expect(info.badgeClassName).toContain('text-amber-400');
  });

  it('renders RD deposits in amber with negative prefix and RD Deposit label', () => {
    const tx: TransactionRecord = {
      ...baseTx,
      type: 'fd_movement',
      description: 'RD Initial Deposit: SBI',
      totalAmountPaise: 500000n,
      entries: [
        {
          id: 'e-1',
          accountId: 'acc-1',
          envelopeId: null,
          direction: 'credit',
          amountPaise: 500000n,
        },
      ],
    };
    const info = getTransactionDisplayInfo(tx);

    expect(info.typeLabel).toBe('RD Deposit');
    expect(info.amountColor).toBe('text-amber-400');
    expect(info.amountPrefix).toBe('-');
    expect(info.formattedAmount).toBe('-₹5,000.00');
  });

  it('renders FD liquidations/redemptions in amber with positive prefix (funds return to bank)', () => {
    const tx: TransactionRecord = {
      ...baseTx,
      type: 'fd_movement',
      description: 'FD liquidated: ICICI Bank',
      totalAmountPaise: 10750000n, // ₹1,07,500
      entries: [
        {
          id: 'e-1',
          accountId: 'acc-1',
          envelopeId: null,
          direction: 'debit', // funds entering bank
          amountPaise: 10750000n,
        },
      ],
    };
    const info = getTransactionDisplayInfo(tx);

    expect(info.typeLabel).toBe('FD Return');
    expect(info.amountColor).toBe('text-amber-400');
    expect(info.amountPrefix).toBe('+');
    expect(info.formattedAmount).toBe('+₹1,07,500.00');
    expect(info.badgeClassName).toContain('text-amber-400');
  });

  it('renders RD liquidations in amber with positive prefix and RD Return label', () => {
    const tx: TransactionRecord = {
      ...baseTx,
      type: 'fd_movement',
      description: 'RD liquidated: SBI RD Account',
      totalAmountPaise: 6500000n,
      entries: [
        {
          id: 'e-1',
          accountId: 'acc-1',
          envelopeId: null,
          direction: 'debit',
          amountPaise: 6500000n,
        },
      ],
    };
    const info = getTransactionDisplayInfo(tx);

    expect(info.typeLabel).toBe('RD Return');
    expect(info.amountColor).toBe('text-amber-400');
    expect(info.amountPrefix).toBe('+');
    expect(info.formattedAmount).toBe('+₹65,000.00');
  });

  it('renders debt repayments in orange with negative prefix (funds leave bank)', () => {
    const tx: TransactionRecord = {
      ...baseTx,
      type: 'debt_repayment',
      description: 'Debt repayment: Ramesh',
      totalAmountPaise: 500000n,
    };
    const info = getTransactionDisplayInfo(tx);

    expect(info.typeLabel).toBe('Debt Payment');
    expect(info.amountColor).toBe('text-orange-400');
    expect(info.amountPrefix).toBe('-');
    expect(info.formattedAmount).toBe('-₹5,000.00');
    expect(info.badgeClassName).toContain('text-orange-400');
  });

  it('renders self EMI reimbursements in cyan with negative prefix', () => {
    const tx: TransactionRecord = {
      ...baseTx,
      type: 'self_emi_repayment',
      description: 'Self EMI Reimbursement: Laptop Upgrade',
      totalAmountPaise: 400000n,
    };
    const info = getTransactionDisplayInfo(tx);

    expect(info.typeLabel).toBe('Self EMI');
    expect(info.amountColor).toBe('text-cyan-400');
    expect(info.amountPrefix).toBe('-');
    expect(info.formattedAmount).toBe('-₹4,000.00');
    expect(info.badgeClassName).toContain('text-cyan-400');
  });

  it('renders reconciliation adjustments with appropriate surplus (+) or deficit (-) in teal', () => {
    const surplusTx: TransactionRecord = {
      ...baseTx,
      type: 'adjustment',
      description: 'Reconciliation Adjustment (+₹150.00): Monthly interest credit',
      totalAmountPaise: 15000n,
      entries: [{ id: 'e-1', accountId: 'acc-1', envelopeId: null, direction: 'debit', amountPaise: 15000n }],
    };
    const surplusInfo = getTransactionDisplayInfo(surplusTx);
    expect(surplusInfo.typeLabel).toBe('Reconciliation');
    expect(surplusInfo.amountColor).toBe('text-teal-400');
    expect(surplusInfo.amountPrefix).toBe('+');
    expect(surplusInfo.formattedAmount).toBe('+₹150.00');

    const deficitTx: TransactionRecord = {
      ...baseTx,
      type: 'adjustment',
      description: 'Reconciliation Adjustment (-₹250.00): Bank fee mismatch',
      totalAmountPaise: 25000n,
      entries: [{ id: 'e-2', accountId: 'acc-1', envelopeId: null, direction: 'credit', amountPaise: 25000n }],
    };
    const deficitInfo = getTransactionDisplayInfo(deficitTx);
    expect(deficitInfo.typeLabel).toBe('Reconciliation');
    expect(deficitInfo.amountColor).toBe('text-teal-400');
    expect(deficitInfo.amountPrefix).toBe('-');
    expect(deficitInfo.formattedAmount).toBe('-₹250.00');
  });
});
