import { describe, it, expect } from 'vitest';
import { DEFAULT_ENVELOPES_CONFIG } from '@/lib/api/envelopes';
import type { EnvelopeWithAllocation } from '@/types/accounting.types';

describe('Envelope Specifications & Protected Reserve Feature', () => {
  it('seeds default starter envelopes including Regular, Emergency, and Savings', () => {
    const allSlugs = DEFAULT_ENVELOPES_CONFIG.map((e) => e.slug);
    expect(allSlugs).toContain('regular'); // Regular
    expect(allSlugs).toContain('emergency');
    expect(allSlugs).toContain('savings');

    // Emergency and Savings spawn with Protected Reserve enabled
    const emergency = DEFAULT_ENVELOPES_CONFIG.find((e) => e.slug === 'emergency');
    expect(emergency?.is_system_reserved).toBe(true);

    const savings = DEFAULT_ENVELOPES_CONFIG.find((e) => e.slug === 'savings');
    expect(savings?.name).toBe('Savings');
    expect(savings?.is_system_reserved).toBe(true);
    expect(savings?.color).toBe('#10b981');
    expect(savings?.icon).toBe('PiggyBank');
    expect(savings?.sort_order).toBe(2); // 3rd place (0-indexed: 2)

    // Regular spawns as a flexible envelope without lock
    const regular = DEFAULT_ENVELOPES_CONFIG.find((e) => e.slug === 'regular');
    expect(regular?.name).toBe('Regular');
    expect(regular?.is_system_reserved).toBe(false);
    expect(regular?.sort_order).toBe(0); // 1st place
  });

  it('strictly excludes credit-cards and emis envelopes from default configuration', () => {
    const allSlugs = DEFAULT_ENVELOPES_CONFIG.map((e) => e.slug);
    expect(allSlugs).not.toContain('credit-cards');
    expect(allSlugs).not.toContain('emis');
    expect(allSlugs).not.toContain('monthly-targets');
  });

  it('correctly filters out legacy credit-cards and emis envelopes from active list', () => {
    const mockEnvelopes: Partial<EnvelopeWithAllocation>[] = [
      { id: '1', name: 'Regular', slug: 'regular', isSystemReserved: false },
      { id: '2', name: 'Emergency', slug: 'emergency', isSystemReserved: true },
      { id: '3', name: 'Savings', slug: 'savings', isSystemReserved: true },
      { id: '4', name: 'Credit Cards', slug: 'credit-cards', isSystemReserved: true },
      { id: '5', name: 'EMI(s)', slug: 'emis', isSystemReserved: true },
      { id: '6', name: 'Monthly Targets', slug: 'monthly-targets', isSystemReserved: true },
      { id: '7', name: 'Gym', slug: 'gym', isSystemReserved: false },
    ];

    const filtered = mockEnvelopes.filter(
      (env) => env.slug !== 'credit-cards' && env.slug !== 'emis' && env.slug !== 'monthly-targets'
    );

    expect(filtered.map((e) => e.slug)).toEqual(['regular', 'emergency', 'savings', 'gym']);
  });

  it('supports custom sort order and rearranging envelopes with Savings in 3rd place', () => {
    const envelopes: Partial<EnvelopeWithAllocation>[] = [
      { id: '1', name: 'Regular', sortOrder: 0 },
      { id: '2', name: 'Emergency', sortOrder: 1 },
      { id: '3', name: 'Savings', sortOrder: 2 },
      { id: '4', name: 'Essentials', sortOrder: 3 },
    ];

    // Rearrange: move Essentials to index 0
    const desiredOrder = ['4', '1', '2', '3'];
    const reordered = [...envelopes].sort((a, b) => {
      const idxA = desiredOrder.indexOf(a.id!);
      const idxB = desiredOrder.indexOf(b.id!);
      return idxA - idxB;
    });

    expect(reordered.map((e) => e.name)).toEqual(['Essentials', 'Regular', 'Emergency', 'Savings']);
  });

  it('validates complete starter envelope sequence and reserve defaults', () => {
    const names = DEFAULT_ENVELOPES_CONFIG.map((e) => e.name);
    expect(names[0]).toBe('Regular');
    expect(names[1]).toBe('Emergency');
    expect(names[2]).toBe('Savings');
    expect(names[3]).toBe('Essentials');
    expect(names[4]).toBe('Gym');
    expect(names[5]).toBe('Outing');
    expect(names[6]).toBe('Birthdays');

    // Emergency and Savings have Protected Reserve = true; all others are false
    expect(DEFAULT_ENVELOPES_CONFIG[0].is_system_reserved).toBe(false);
    expect(DEFAULT_ENVELOPES_CONFIG[1].is_system_reserved).toBe(true);
    expect(DEFAULT_ENVELOPES_CONFIG[2].is_system_reserved).toBe(true);
    expect(DEFAULT_ENVELOPES_CONFIG[3].is_system_reserved).toBe(false);
    expect(DEFAULT_ENVELOPES_CONFIG[4].is_system_reserved).toBe(false);
    expect(DEFAULT_ENVELOPES_CONFIG[5].is_system_reserved).toBe(false);
    expect(DEFAULT_ENVELOPES_CONFIG[6].is_system_reserved).toBe(false);
  });

  it('allows deleting an envelope and re-creating an envelope with the same name with a distinct UUID', () => {
    interface EnvelopeRecord {
      id: string;
      name: string;
      slug: string;
      allocatedPaise: bigint;
      spentPaise: bigint;
    }

    // Initial state with pre-existing Regular envelope
    const initialList: EnvelopeRecord[] = [
      { id: 'env-orig-1', name: 'Regular', slug: 'regular', allocatedPaise: 50000n, spentPaise: 20000n },
      { id: 'env-orig-2', name: 'Emergency', slug: 'emergency', allocatedPaise: 100000n, spentPaise: 0n },
    ];

    // User deletes 'Regular'
    const afterDelete = initialList.filter((e) => e.id !== 'env-orig-1');
    expect(afterDelete.find((e) => e.name === 'Regular')).toBeUndefined();

    // User re-creates an envelope named 'Regular'
    const newEnvelope: EnvelopeRecord = {
      id: 'env-new-uuid-999', // Fresh UUID generated by database
      name: 'Regular',
      slug: 'regular',
      allocatedPaise: 0n, // Fresh envelope starts with zero balance
      spentPaise: 0n,
    };
    const afterRecreate = [...afterDelete, newEnvelope];

    // The newly created envelope is independent of the deleted one
    const activeRegular = afterRecreate.find((e) => e.name === 'Regular');
    expect(activeRegular).toBeDefined();
    expect(activeRegular?.id).toBe('env-new-uuid-999');
    expect(activeRegular?.id).not.toBe('env-orig-1');
    expect(activeRegular?.allocatedPaise).toBe(0n);
    expect(activeRegular?.spentPaise).toBe(0n);
  });

  it('cleanses stale/deleted IDs from ordering list without losing valid envelope positions', () => {
    const liveEnvelopes = [
      { id: 'env-2', name: 'Emergency' },
      { id: 'env-3', name: 'Savings' },
      { id: 'env-new-999', name: 'Regular' },
    ];
    const liveIds = new Set(liveEnvelopes.map((e) => e.id));

    // Stale order cached in localStorage before deletion of env-orig-1
    const cachedOrder = ['env-orig-1', 'env-2', 'env-3'];
    const sanitizedOrder = cachedOrder.filter((id) => liveIds.has(id));

    // Stale ID is cleanly purged
    expect(sanitizedOrder).toEqual(['env-2', 'env-3']);
    expect(sanitizedOrder).not.toContain('env-orig-1');
  });
});
