import { describe, it, expect } from 'vitest';

/**
 * Calculates available headroom for a liquid account when funding an envelope.
 * Formula:
 * Headroom = min(account.balancePaise, account.unallocatedPaise + existingHoldOnThisEnvelope)
 */
export function calculateAccountHeadroomPaise(
  account: { balancePaise: bigint; unallocatedPaise: bigint },
  existingHoldOnThisEnvelope: bigint
): bigint {
  const available = account.unallocatedPaise + existingHoldOnThisEnvelope;
  return available > account.balancePaise ? account.balancePaise : available;
}

describe('Account Headroom Calculation Invariant', () => {
  it('caps headroom to free balance when envelope has no previous hold', () => {
    const account = {
      balancePaise: 10000000n, // ₹1,00,000.00
      unallocatedPaise: 6000000n, // ₹60,000.00
    };
    const headroom = calculateAccountHeadroomPaise(account, 0n);
    expect(headroom).toBe(6000000n); // exactly ₹60,000.00
  });

  it('restores existing hold into headroom when re-budgeting the same envelope', () => {
    const account = {
      balancePaise: 10000000n, // ₹1,00,000.00
      unallocatedPaise: 6000000n, // ₹60,000.00 (₹40,000 on hold across all envelopes)
    };
    // If ₹20,000 is held on THIS envelope, re-budgeting this envelope can reuse that ₹20,000
    const headroom = calculateAccountHeadroomPaise(account, 2000000n);
    expect(headroom).toBe(8000000n); // ₹80,000.00 max
  });

  it('never exceeds total physical bank balance even with hold calculations', () => {
    const account = {
      balancePaise: 10000000n, // ₹1,00,000.00
      unallocatedPaise: 10000000n, // ₹1,00,000.00
    };
    const headroom = calculateAccountHeadroomPaise(account, 500000n);
    expect(headroom).toBe(10000000n); // strictly capped at physical balance
  });

  it('strictly rejects over-allocation when entered amount exceeds headroom (reproducing screenshot scenario)', () => {
    // User had ₹1,00,000 total balance, ₹1,00,000 free, and tried to allocate ₹1,05,500
    const account = {
      balancePaise: 10000000n, // ₹1,00,000.00 (10000000 paise)
      unallocatedPaise: 10000000n, // ₹1,00,000.00
    };
    const headroom = calculateAccountHeadroomPaise(account, 0n);
    const attemptedAllocationPaise = 10550000n; // ₹1,05,500.00

    const isExceeding = attemptedAllocationPaise > headroom;
    expect(isExceeding).toBe(true);
    expect(headroom).toBe(10000000n);
  });
});

describe('Account Holds Protection Invariants', () => {
  function canUpdateAccountBalance(balancePaise: bigint, activeHoldPaise: bigint): boolean {
    return balancePaise >= activeHoldPaise;
  }

  function canDeleteAccount(activeHoldPaise: bigint): boolean {
    return activeHoldPaise === 0n;
  }

  it('rejects decreasing bank balance below active envelope holds', () => {
    const activeHoldPaise = 5000000n; // ₹50,000.00 reserved in envelopes
    
    // Attempting to lower balance to ₹40,000.00 should fail
    expect(canUpdateAccountBalance(4000000n, activeHoldPaise)).toBe(false);
    
    // Setting balance to exactly ₹50,000.00 should succeed (0 free)
    expect(canUpdateAccountBalance(5000000n, activeHoldPaise)).toBe(true);

    // Setting balance to ₹60,000.00 should succeed (₹10,000 free)
    expect(canUpdateAccountBalance(6000000n, activeHoldPaise)).toBe(true);
  });

  it('strictly rejects deleting an account while it has active holds', () => {
    // Account with ₹1,00,000 hold cannot be deleted
    expect(canDeleteAccount(10000000n)).toBe(false);

    // Account with ₹1 paise hold cannot be deleted
    expect(canDeleteAccount(1n)).toBe(false);

    // Account with 0 holds can be deleted
    expect(canDeleteAccount(0n)).toBe(true);
  });
});

describe('Account Holds Stability & Non-Migration Invariants', () => {
  interface AccountWithHolds {
    id: string;
    name: string;
    balancePaise: bigint;
    allocatedPaise: bigint;
    unallocatedPaise: bigint;
  }

  interface AllocationSourceRecord {
    allocationId: string;
    accountId: string;
    amountPaise: bigint;
  }

  function computeAccountHolds(
    accounts: Array<{ id: string; name: string; balancePaise: bigint; createdAt: string }>,
    sources: AllocationSourceRecord[]
  ): AccountWithHolds[] {
    const holdsMap = new Map<string, bigint>();
    for (const src of sources) {
      const current = holdsMap.get(src.accountId) ?? 0n;
      holdsMap.set(src.accountId, current + src.amountPaise);
    }

    return accounts.map((acc) => {
      const allocatedPaise = holdsMap.get(acc.id) ?? 0n;
      const unallocatedPaise = acc.balancePaise >= allocatedPaise ? acc.balancePaise - allocatedPaise : 0n;
      return {
        id: acc.id,
        name: acc.name,
        balancePaise: acc.balancePaise,
        allocatedPaise,
        unallocatedPaise,
      };
    });
  }

  it('guarantees existing account holds NEVER move when a new liquid account with a higher balance is added', () => {
    // Initial State: Account A has ₹50,000 balance with ₹40,000 hold for Rent
    const initialAccounts = [
      { id: 'acc-1', name: 'Primary Account', balancePaise: 5000000n, createdAt: '2026-01-01T00:00:00Z' },
    ];
    const initialSources: AllocationSourceRecord[] = [
      { allocationId: 'alloc-rent', accountId: 'acc-1', amountPaise: 4000000n },
    ];

    const stateBefore = computeAccountHolds(initialAccounts, initialSources);
    expect(stateBefore[0].allocatedPaise).toBe(4000000n);
    expect(stateBefore[0].unallocatedPaise).toBe(1000000n);

    // User adds Account B with a massive ₹5,00,000 balance (10x higher than Account A)
    const accountsAfterNewAccount = [
      ...initialAccounts,
      { id: 'acc-2', name: 'Wealth Account', balancePaise: 50000000n, createdAt: '2026-02-01T00:00:00Z' },
    ];

    // Compute holds again
    const stateAfter = computeAccountHolds(accountsAfterNewAccount, initialSources);

    // CRITICAL: Account A's holds must strictly stay on Account A!
    const accountA = stateAfter.find((a) => a.id === 'acc-1')!;
    expect(accountA.allocatedPaise).toBe(4000000n); // MUST NOT DROP TO ZERO
    expect(accountA.unallocatedPaise).toBe(1000000n);

    // New Account B must have ZERO holds and 100% free unallocated balance
    const accountB = stateAfter.find((a) => a.id === 'acc-2')!;
    expect(accountB.allocatedPaise).toBe(0n); // MUST NOT INHERIT ACCOUNT A'S HOLDS
    expect(accountB.unallocatedPaise).toBe(50000000n);
  });

  it('guarantees existing account holds NEVER move when another account balance is edited to be higher', () => {
    // Two accounts: Account A has ₹30,000 hold, Account B has ₹10,000 balance
    const accounts = [
      { id: 'acc-1', name: 'Checking', balancePaise: 5000000n, createdAt: '2026-01-01T00:00:00Z' },
      { id: 'acc-2', name: 'Savings', balancePaise: 1000000n, createdAt: '2026-01-02T00:00:00Z' },
    ];
    const sources: AllocationSourceRecord[] = [
      { allocationId: 'alloc-groceries', accountId: 'acc-1', amountPaise: 3000000n },
    ];

    // User updates Account B balance from ₹10,000 to ₹10,00,000 (now highest balance)
    const updatedAccounts = [
      accounts[0],
      { ...accounts[1], balancePaise: 100000000n }, // ₹10,00,000
    ];

    const state = computeAccountHolds(updatedAccounts, sources);

    // Account A's hold must remain unchanged
    const accA = state.find((a) => a.id === 'acc-1')!;
    expect(accA.allocatedPaise).toBe(3000000n);
    expect(accA.unallocatedPaise).toBe(2000000n);

    // Account B must NOT take over Account A's hold
    const accB = state.find((a) => a.id === 'acc-2')!;
    expect(accB.allocatedPaise).toBe(0n);
    expect(accB.unallocatedPaise).toBe(100000000n);
  });
});
