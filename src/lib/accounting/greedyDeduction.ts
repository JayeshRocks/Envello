/**
 * Envello - Greedy Deduction Engine for Ghost-Bank Envelope Transactions
 *
 * When an expense is paid from an envelope backed by one or more liquid accounts,
 * this algorithm chooses the liquid account(s) that can cover the most in descending order,
 * deducts that money, and outputs the real-life account-by-account breakdown.
 */

import { formatINR } from './currency';

export interface BackingAccountSource {
  accountId: string;
  accountName?: string;
  remainingPaise: bigint;
}

export interface AccountDeductionItem {
  accountId: string;
  accountName: string;
  deductedPaise: bigint;
  previousRemainingPaise: bigint;
  newRemainingPaise: bigint;
}

export interface GreedyDeductionPlan {
  expenseAmountPaise: bigint;
  deductions: AccountDeductionItem[];
  isSplit: boolean;
  totalDeductedPaise: bigint;
  summaryText: string;
}

/**
 * Executes the Greedy Largest-First account deduction algorithm.
 *
 * Invariants:
 * 1. Expense amount must be positive.
 * 2. Expense amount must not exceed envelope available balance.
 * 3. Total backing remaining funds across accounts must cover the expense.
 * 4. Sum of all deductions strictly equals expenseAmountPaise with zero drift.
 */
export function calculateGreedyAccountDeduction(
  expenseAmountPaise: bigint,
  envelopeAvailablePaise: bigint,
  backingSources: BackingAccountSource[]
): GreedyDeductionPlan {
  if (expenseAmountPaise <= 0n) {
    throw new Error('Expense amount must be greater than zero.');
  }

  if (expenseAmountPaise > envelopeAvailablePaise) {
    throw new Error(
      `Expense of ${formatINR(expenseAmountPaise)} exceeds available envelope budget (${formatINR(envelopeAvailablePaise)}).`
    );
  }

  // Filter sources with positive backing and calculate total backing
  const activeSources = backingSources.filter((s) => s.remainingPaise > 0n);
  const totalBackingPaise = activeSources.reduce((sum, s) => sum + s.remainingPaise, 0n);

  if (expenseAmountPaise > totalBackingPaise) {
    throw new Error(
      `Insufficient funds reserved in backing liquid accounts (${formatINR(totalBackingPaise)}) to cover ${formatINR(expenseAmountPaise)}.`
    );
  }

  // Sort descending by remainingPaise (largest first); tie-break by accountId for pure determinism
  const sorted = [...activeSources].sort((a, b) => {
    if (b.remainingPaise !== a.remainingPaise) {
      return b.remainingPaise > a.remainingPaise ? 1 : -1;
    }
    return a.accountId.localeCompare(b.accountId);
  });

  let needed = expenseAmountPaise;
  const deductions: AccountDeductionItem[] = [];

  for (const source of sorted) {
    if (needed <= 0n) break;

    const deduct = source.remainingPaise >= needed ? needed : source.remainingPaise;
    deductions.push({
      accountId: source.accountId,
      accountName: source.accountName || 'Liquid Account',
      deductedPaise: deduct,
      previousRemainingPaise: source.remainingPaise,
      newRemainingPaise: source.remainingPaise - deduct,
    });

    needed -= deduct;
  }

  // Double check invariant: sum of deductions == expenseAmountPaise
  const totalDeducted = deductions.reduce((sum, d) => sum + d.deductedPaise, 0n);
  if (totalDeducted !== expenseAmountPaise) {
    throw new Error(
      `Deduction math mismatch: allocated ${formatINR(totalDeducted)} for expense of ${formatINR(expenseAmountPaise)}.`
    );
  }

  // Build human-readable breakdown text for real-life payout prompt
  const breakdownParts = deductions.map(
    (d) => `${formatINR(d.deductedPaise)} from ${d.accountName}`
  );
  const summaryText =
    deductions.length === 1
      ? `Pay ${breakdownParts[0]} in real life.`
      : `Pay ${breakdownParts.slice(0, -1).join(', ')} and ${breakdownParts[breakdownParts.length - 1]} in real life.`;

  return {
    expenseAmountPaise,
    deductions,
    isSplit: deductions.length > 1,
    totalDeductedPaise: totalDeducted,
    summaryText,
  };
}
