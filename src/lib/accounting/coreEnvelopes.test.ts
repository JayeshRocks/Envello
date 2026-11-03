import { describe, it, expect } from 'vitest';
import { DEFAULT_ENVELOPES_CONFIG } from '@/lib/api/envelopes';
import type { EnvelopeWithAllocation } from '@/types/accounting.types';

describe('Envelope Specifications & Protected Reserve Feature', () => {
  it('seeds default starter envelopes including Spendable, Emergency, and Savings', () => {
    const allSlugs = DEFAULT_ENVELOPES_CONFIG.map((e) => e.slug);
    expect(allSlugs).toContain('regular'); // Spendable
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

    // Spendable spawns as a flexible envelope without lock
    const spendable = DEFAULT_ENVELOPES_CONFIG.find((e) => e.slug === 'regular');
    expect(spendable?.is_system_reserved).toBe(false);
  });

  it('strictly excludes credit-cards and emis envelopes from default configuration', () => {
    const allSlugs = DEFAULT_ENVELOPES_CONFIG.map((e) => e.slug);
    expect(allSlugs).not.toContain('credit-cards');
    expect(allSlugs).not.toContain('emis');
    expect(allSlugs).not.toContain('monthly-targets');
  });

  it('correctly filters out legacy credit-cards and emis envelopes from active list', () => {
    const mockEnvelopes: Partial<EnvelopeWithAllocation>[] = [
      { id: '1', name: 'Spendable', slug: 'regular', isSystemReserved: false },
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

  it('supports custom sort order and rearranging envelopes', () => {
    const envelopes: Partial<EnvelopeWithAllocation>[] = [
      { id: '1', name: 'Spendable', sortOrder: 0 },
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

    expect(reordered.map((e) => e.name)).toEqual(['Essentials', 'Spendable', 'Emergency', 'Savings']);
  });
});
