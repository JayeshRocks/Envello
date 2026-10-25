/**
 * Envello - Pure Domain Accounting Calculations
 * Framework-agnostic, deterministic business logic functions.
 */

import type { EnvelopeRolloverPolicy } from '@/types/accounting.types';

/**
 * Calculates net spendable cash across all active liquid accounts (checking, savings, cash).
 * Excludes fixed deposits and credit cards.
 */
export function calculateNetSpendable(
  accounts: { balancePaise: bigint; accountType: string; isActive: boolean }[]
): bigint {
  return accounts
    .filter(acc => acc.isActive && (acc.accountType === 'checking' || acc.accountType === 'savings' || acc.accountType === 'cash'))
    .reduce((sum, acc) => sum + acc.balancePaise, 0n);
}

/**
 * Calculates available spendable balance for an envelope.
 * Available = Carried Over + Allocated - Spent.
 */
export function calculateAvailableEnvelopeBalance(
  allocatedPaise: bigint,
  carriedOverPaise: bigint,
  spentPaise: bigint
): bigint {
  return carriedOverPaise + allocatedPaise - spentPaise;
}

/**
 * Calculates credit card utilization percentage with 2-decimal precision.
 * Formula: (Outstanding Balance / Credit Limit) * 100
 */
export function calculateCreditCardUtilization(
  outstandingBalancePaise: bigint,
  creditLimitPaise: bigint
): number {
  if (creditLimitPaise <= 0n) return 0;
  if (outstandingBalancePaise <= 0n) return 0;

  // Perform calculation with 10000x multiplier to maintain 2 decimal places in integer math
  const basisPoints = (outstandingBalancePaise * 10000n) / creditLimitPaise;
  return Number(basisPoints) / 100;
}

/**
 * Returns credit health status for credit card utilization.
 * - Safe: < 30% (Recommended owner guideline)
 * - Warning: 30% - 50%
 * - Danger: > 50%
 */
export function getCreditCardUtilizationStatus(
  utilizationPercent: number
): 'safe' | 'warning' | 'danger' {
  if (utilizationPercent < 30) return 'safe';
  if (utilizationPercent <= 50) return 'warning';
  return 'danger';
}

/**
 * Calculates monthly rollover results at the boundary of a budget period.
 */
export function calculateRollover(
  allocatedPaise: bigint,
  carriedOverPaise: bigint,
  spentPaise: bigint,
  policy: EnvelopeRolloverPolicy
): {
  carryForwardPaise: bigint;
  sweepToRegularPaise: bigint;
} {
  const surplus = calculateAvailableEnvelopeBalance(allocatedPaise, carriedOverPaise, spentPaise);

  switch (policy) {
    case 'carry_forward':
      return { carryForwardPaise: surplus, sweepToRegularPaise: 0n };
    case 'sweep_to_regular':
      return { carryForwardPaise: 0n, sweepToRegularPaise: surplus > 0n ? surplus : 0n };
    case 'reset':
      return { carryForwardPaise: 0n, sweepToRegularPaise: 0n };
    default:
      return { carryForwardPaise: surplus, sweepToRegularPaise: 0n };
  }
}

/**
 * Calculates repayment progress for a Self EMI (reimbursing upfront savings).
 */
export function calculateSelfEmiProgress(
  totalFundedPaise: bigint,
  totalReimbursedPaise: bigint
): {
  remainingPaise: bigint;
  progressPercent: number;
  isFullyReimbursed: boolean;
} {
  const remaining = totalFundedPaise > totalReimbursedPaise ? totalFundedPaise - totalReimbursedPaise : 0n;
  const progress = totalFundedPaise > 0n ? Number((totalReimbursedPaise * 10000n) / totalFundedPaise) / 100 : 100;

  return {
    remainingPaise: remaining,
    progressPercent: Math.min(100, Math.max(0, progress)),
    isFullyReimbursed: remaining === 0n,
  };
}
