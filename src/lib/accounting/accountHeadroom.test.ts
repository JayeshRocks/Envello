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
