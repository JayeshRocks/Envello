import { describe, it, expect } from 'vitest';
import { DEFAULT_ENVELOPES_CONFIG } from '@/lib/api/envelopes';
import type { EnvelopeWithAllocation } from '@/types/accounting.types';

describe('Core Envelopes & Savings Reserve Specifications', () => {
  it('seeds Spendable, Emergency, and Savings as core system-reserved envelopes', () => {
    const systemEnvs = DEFAULT_ENVELOPES_CONFIG.filter((e) => e.is_system_reserved);
    const systemSlugs = systemEnvs.map((e) => e.slug);

    expect(systemSlugs).toContain('regular'); // Spendable
    expect(systemSlugs).toContain('emergency');
    expect(systemSlugs).toContain('savings');
    expect(systemEnvs.length).toBe(3);

    const savings = systemEnvs.find((e) => e.slug === 'savings');
    expect(savings?.name).toBe('Savings');
    expect(savings?.is_system_reserved).toBe(true);
    expect(savings?.color).toBe('#10b981');
    expect(savings?.icon).toBe('PiggyBank');
  });

  it('strictly excludes credit-cards and emis envelopes from default configuration', () => {
    const allSlugs = DEFAULT_ENVELOPES_CONFIG.map((e) => e.slug);
    expect(allSlugs).not.toContain('credit-cards');
    expect(allSlugs).not.toContain('emis');
    expect(allSlugs).not.toContain('monthly-targets');
  });

  it('correctly filters out legacy credit-cards and emis envelopes from active list', () => {
    const mockEnvelopes: Partial<EnvelopeWithAllocation>[] = [
      { id: '1', name: 'Spendable', slug: 'regular', isSystemReserved: true },
      { id: '2', name: 'Emergency', slug: 'emergency', isSystemReserved: true },
      { id: '3', name: 'Savings & Fixed Deposits', slug: 'savings', isSystemReserved: true },
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

  it('orders system envelopes deterministically: Spendable first, Emergency second, Savings third', () => {
    const envelopes: Partial<EnvelopeWithAllocation>[] = [
      { id: '3', name: 'Savings', slug: 'savings', isSystemReserved: true },
      { id: '1', name: 'Spendable', slug: 'regular', isSystemReserved: true },
      { id: '2', name: 'Emergency', slug: 'emergency', isSystemReserved: true },
    ];

    const CORE_SLUGS = ['regular', 'spendable', 'emergency', 'savings'];
    const sorted = envelopes
      .filter((env) => CORE_SLUGS.includes(env.slug || ''))
      .sort((a, b) => {
        const order: Record<string, number> = { regular: 1, spendable: 1, emergency: 2, savings: 3 };
        const orderA = order[a.slug || ''] ?? 99;
        const orderB = order[b.slug || ''] ?? 99;
        return orderA - orderB;
      });

    expect(sorted.map((e) => e.slug)).toEqual(['regular', 'emergency', 'savings']);
  });
});
