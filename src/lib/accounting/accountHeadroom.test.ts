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
