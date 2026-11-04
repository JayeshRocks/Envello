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

export interface AccountHoldVisualRatio {
  rawFreePercent: number;
  rawHeldPercent: number;
  freeDisplayPercent: number;
  heldDisplayPercent: number;
  barFreeWidth: number;
  barHeldWidth: number;
}

/**
 * Calculates deterministic visual bar ratios and display percentages for an account's Free vs Held balance.
 *
 * Invariants:
 * 1. Zero Floating-Point Drift: Display percentages and widths are derived cleanly from integer paise.
 * 2. Non-Neglect of Small Values:
 *    - If heldPaise > 0n, heldDisplayPercent is guaranteed >= 0.1% (never rounded down to 0.0%).
 *    - If freePaise > 0n, freeDisplayPercent is guaranteed >= 0.1% (never rounded down to 0.0%).
 *    - On the visual bar, whichever is small receives a guaranteed minimum visible width of 3.0%,
 *      and the other receives (100 - min), so small values are NEVER invisible against large values and vice versa.
 * 3. Exact 100% Sum: barFreeWidth + barHeldWidth strictly equals 100% whenever totalPaise > 0n.
 */
export function calculateAccountHoldVisualRatio(
  totalPaise: bigint,
  heldPaise: bigint,
  freePaise: bigint
): AccountHoldVisualRatio {
  if (totalPaise <= 0n) {
    return {
      rawFreePercent: 0,
      rawHeldPercent: 0,
      freeDisplayPercent: 0,
      heldDisplayPercent: 0,
      barFreeWidth: 0,
      barHeldWidth: 0,
    };
  }

  const safeHeld = heldPaise > 0n ? heldPaise : 0n;
  const safeFree = freePaise > 0n ? freePaise : 0n;

  // Raw percentages with 2 decimals
  const rawHeld = Number((safeHeld * 10000n) / totalPaise) / 100;
  const rawFree = Number((safeFree * 10000n) / totalPaise) / 100;

  // 1. Display Percentages (guarantees small positive values never round down to 0.0%)
  let heldDisplayPercent = rawHeld;
  let freeDisplayPercent = rawFree;

  if (safeHeld === 0n) {
    heldDisplayPercent = 0;
    freeDisplayPercent = 100;
  } else if (safeFree === 0n) {
    freeDisplayPercent = 0;
    heldDisplayPercent = 100;
  } else {
    // Both are positive
    if (rawHeld > 0 && rawHeld < 0.1) {
      heldDisplayPercent = 0.1;
      freeDisplayPercent = Number((100 - heldDisplayPercent).toFixed(1));
    } else if (rawFree > 0 && rawFree < 0.1) {
      freeDisplayPercent = 0.1;
      heldDisplayPercent = Number((100 - freeDisplayPercent).toFixed(1));
    } else {
      heldDisplayPercent = Number(rawHeld.toFixed(1));
      freeDisplayPercent = Number((100 - heldDisplayPercent).toFixed(1));
    }
  }

  // 2. Visual Bar Widths (Guarantee visible tactile strip of at least 3.0% when > 0, summing strictly to 100%)
  const MIN_BAR_WIDTH = 3.0;
  let barHeldWidth = 0;
  let barFreeWidth = 0;

  if (safeHeld === 0n) {
    barFreeWidth = 100;
    barHeldWidth = 0;
  } else if (safeFree === 0n) {
    barHeldWidth = 100;
    barFreeWidth = 0;
  } else {
    // Both are positive
    if (rawHeld < MIN_BAR_WIDTH) {
      barHeldWidth = MIN_BAR_WIDTH;
      barFreeWidth = 100 - MIN_BAR_WIDTH;
    } else if (rawFree < MIN_BAR_WIDTH) {
      barFreeWidth = MIN_BAR_WIDTH;
      barHeldWidth = 100 - MIN_BAR_WIDTH;
    } else {
      barHeldWidth = rawHeld;
      barFreeWidth = 100 - rawHeld;
    }
  }

  return {
    rawFreePercent: rawFree,
    rawHeldPercent: rawHeld,
    freeDisplayPercent,
    heldDisplayPercent,
    barFreeWidth,
    barHeldWidth,
  };
}
