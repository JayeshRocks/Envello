/**
 * Envello - Account Holds & Allocation Reservations Engine
 * Calculates authoritative account-level envelope holds and free unallocated balances.
 * All arithmetic uses integer paise (BigInt) with zero floating-point drift.
 */

export interface AccountHoldMetrics {
  totalBalancePaise: bigint;
  allocatedPaise: bigint;
  unallocatedPaise: bigint;
}

/**
 * Calculates the three-tier balance breakdown for a liquid account:
 * 1. Total Physical Ledger Balance
 * 2. Allocated (Reserved) in Envelopes for the period
 * 3. Unallocated (Free Spendable) = Total - Allocated
 */
export function calculateAccountBalances(
  totalBalancePaise: bigint,
  allocatedPaise: bigint = 0n
): AccountHoldMetrics {
  const safeAllocated = allocatedPaise > 0n ? allocatedPaise : 0n;
  const unallocatedPaise = totalBalancePaise - safeAllocated;

  return {
    totalBalancePaise,
    allocatedPaise: safeAllocated,
    unallocatedPaise,
  };
}

/**
 * Checks whether an account has sufficient unallocated (free) balance
 * to cover a direct outlay (direct expense without envelope, credit card bill, debt repayment, transfer).
 */
export function canSpendFromAccountDirect(
  totalBalancePaise: bigint,
  allocatedPaise: bigint,
  requestedAmountPaise: bigint
): boolean {
  if (requestedAmountPaise <= 0n) return false;
  const { unallocatedPaise } = calculateAccountBalances(totalBalancePaise, allocatedPaise);
  return unallocatedPaise >= requestedAmountPaise;
}

/**
 * Aggregates all allocation sources by accountId to compute total holds per account.
 */
export function aggregateAccountHolds(
  sources: Array<{ accountId: string; amountPaise: bigint }>
): Map<string, bigint> {
  const map = new Map<string, bigint>();
  for (const src of sources) {
    if (src.amountPaise <= 0n) continue;
    const current = map.get(src.accountId) ?? 0n;
    map.set(src.accountId, current + src.amountPaise);
  }
  return map;
}
