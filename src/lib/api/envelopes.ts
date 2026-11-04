
/**
 * Fetches all backing liquid account sources and hold amounts for a given allocation ID.
 */
export async function fetchEnvelopeAllocationSources(
  userId: string,
  allocationId: string
): Promise<AllocationSourceRecord[]> {
  try {
    const { data: sources, error } = await supabase
      .from('envelope_allocation_sources')
      .select('id, allocation_id, account_id, amount_paise')
      .eq('allocation_id', allocationId)
      .eq('user_id', userId);

    if (error || !sources || sources.length === 0) return [];

    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('user_id', userId);

    const nameMap = new Map((accounts || []).map((a) => [a.id, a.name]));

    return sources.map((s) => ({
      id: s.id,
      allocationId: s.allocation_id,
      accountId: s.account_id,
      accountName: nameMap.get(s.account_id) || 'Liquid Account',
      amountPaise: BigInt(s.amount_paise),
    }));
  } catch (err) {
    console.warn('[Envello API] Error fetching allocation sources:', err);
    return [];
  }
}

import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';
import type { EnvelopeWithAllocation, EnvelopeRolloverPolicy, AllocationSourceRecord } from '@/types/accounting.types';
import { calculateAvailableEnvelopeBalance } from '@/lib/accounting/calculations';

export type EnvelopeWithDetails = EnvelopeWithAllocation;

export const DEFAULT_ENVELOPES_CONFIG = [
  {
    name: 'Regular',
    slug: 'regular',
    icon: 'Mail',
    color: '#38bdf8', // sky-400
    is_system_reserved: false,
    rollover_policy: 'carry_forward' as EnvelopeRolloverPolicy,
    sort_order: 0,
  },
  {
    name: 'Emergency',
    slug: 'emergency',
    icon: 'ShieldAlert',
    color: '#f87171', // red-400
    is_system_reserved: true, // Default protected reserve
    rollover_policy: 'carry_forward' as EnvelopeRolloverPolicy,
    sort_order: 1,
  },
  {
    name: 'Savings',
    slug: 'savings',
    icon: 'PiggyBank',
    color: '#10b981', // emerald-500
    is_system_reserved: true, // Default protected reserve
    rollover_policy: 'carry_forward' as EnvelopeRolloverPolicy,
    sort_order: 2,
  },
  {
    name: 'Essentials',
    slug: 'essentials',
    icon: 'Home',
    color: '#fbbf24', // amber-400
    is_system_reserved: false,
    rollover_policy: 'carry_forward' as EnvelopeRolloverPolicy,
    sort_order: 3,
  },
  {
    name: 'Gym',
    slug: 'gym',
    icon: 'Dumbbell',
    color: '#34d399', // emerald-400
    is_system_reserved: false,
    rollover_policy: 'carry_forward' as EnvelopeRolloverPolicy,
    sort_order: 4,
  },
  {
    name: 'Outing',
    slug: 'outing',
    icon: 'Coffee',
    color: '#c084fc', // purple-400
    is_system_reserved: false,
    rollover_policy: 'sweep_to_regular' as EnvelopeRolloverPolicy,
    sort_order: 5,
  },
  {
    name: 'Birthdays',
    slug: 'birthdays',
    icon: 'Gift',
    color: '#f472b6', // pink-400
    is_system_reserved: false,
    rollover_policy: 'carry_forward' as EnvelopeRolloverPolicy,
    sort_order: 6,
  },
];

/**
 * Gets an existing budget_period record for a user and period key (YYYY-MM),
 * or creates one if it does not yet exist.
 */
export async function getOrCreateBudgetPeriod(userId: string, periodKey: string): Promise<string> {
  const { data: existing, error: fetchError } = await supabase
    .from('budget_periods')
    .select('id')
    .eq('user_id', userId)
    .eq('period_key', periodKey)
    .maybeSingle();

  if (fetchError) {
    console.error('[Envello API] Error fetching budget period:', fetchError.message);
  }

  if (existing?.id) {
    return existing.id;
  }

  const { data: created, error: insertError } = await supabase
    .from('budget_periods')
    .insert({
      user_id: userId,
      period_key: periodKey,
      is_closed: false,
    })
    .select('id')
    .single();

  if (insertError) {
    // If a concurrent insert occurred, attempt one final lookup
    const { data: retry } = await supabase
      .from('budget_periods')
      .select('id')
      .eq('user_id', userId)
      .eq('period_key', periodKey)
      .maybeSingle();

    if (retry?.id) return retry.id;
    console.error('[Envello API] Error creating budget period:', insertError.message);
    throw insertError;
  }

  return created.id;
}

/**
 * Ensures a user has the default six financial envelopes seeded in their personal workspace.
 */
export async function ensureDefaultEnvelopes(userId: string): Promise<void> {
  const { data: existing, error: checkError } = await supabase
    .from('envelopes')
    .select('id, slug, name, sort_order')
    .eq('user_id', userId);

  if (checkError) {
    console.error('[Envello API] Error checking existing envelopes:', checkError.message);
    throw checkError;
  }

  // If user already has envelopes:
  // 1. Clean up unreferenced legacy envelopes (credit-cards, emis, monthly-targets)
  // 2. Standardize 'Regular / Balance' or 'Spendable' to 'Regular'
  // 3. Ensure Savings is in the third place (sort_order = 2)
  if (existing && existing.length > 0) {
    const deprecatedEnvs = existing.filter((env) =>
      ['credit-cards', 'emis', 'monthly-targets'].includes(env.slug)
    );
    for (const dep of deprecatedEnvs) {
      try {
        const { data: entries } = await supabase
          .from('transaction_entries')
          .select('id')
          .eq('envelope_id', dep.id)
          .limit(1);

        if (!entries || entries.length === 0) {
          await supabase.from('envelope_allocations').delete().eq('envelope_id', dep.id);
          await supabase.from('envelopes').delete().eq('id', dep.id);
        }
      } catch (err) {
        console.warn(`[Envello API] Could not auto-delete deprecated envelope ${dep.slug}:`, err);
      }
    }

    // Standardize default envelope name to 'Regular'
    const legacyRegular = existing.find(
      (env) => env.slug === 'regular' && (env.name === 'Regular / Balance' || env.name === 'Regular/Balance' || env.name === 'Spendable')
    );
    if (legacyRegular) {
      try {
        await supabase
          .from('envelopes')
          .update({ name: 'Regular' })
          .eq('id', legacyRegular.id);
        legacyRegular.name = 'Regular';
      } catch (err) {
        console.warn('[Envello API] Could not auto-rename regular envelope:', err);
      }
    }

    // Ensure Savings is ordered in 3rd place (sort_order = 2) if not already aligned
    const savingsEnv = existing.find((e) => e.slug === 'savings');
    const regularEnv = existing.find((e) => e.slug === 'regular');
    const emergencyEnv = existing.find((e) => e.slug === 'emergency');
    if (
      savingsEnv &&
      (savingsEnv.sort_order === undefined || savingsEnv.sort_order === 0 || savingsEnv.sort_order > 2) &&
      (!regularEnv?.sort_order || regularEnv.sort_order === 0)
    ) {
      try {
        if (regularEnv) await supabase.from('envelopes').update({ sort_order: 0 }).eq('id', regularEnv.id);
        if (emergencyEnv) await supabase.from('envelopes').update({ sort_order: 1 }).eq('id', emergencyEnv.id);
        await supabase.from('envelopes').update({ sort_order: 2 }).eq('id', savingsEnv.id);
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.removeItem(`envello_envelope_order_${userId}`);
        }
      } catch (err) {
        console.warn('[Envello API] Could not auto-reorder savings envelope:', err);
      }
    }

    return;
  }

  const rowsToInsert = DEFAULT_ENVELOPES_CONFIG.map((env, index) => ({
    user_id: userId,
    name: env.name,
    slug: env.slug,
    icon: env.icon,
    color: env.color,
    is_system_reserved: env.is_system_reserved,
    rollover_policy: env.rollover_policy,
    sort_order: env.sort_order ?? index,
  }));

  const { error: insertError } = await supabase.from('envelopes').insert(rowsToInsert);
  if (insertError) {
    console.error('[Envello API] Error seeding default envelopes:', insertError.message);
    throw insertError;
  }
}

// In-memory session cache to avoid redundant ensureDefaultEnvelopes DB checks on every fetch
const initializedEnvelopesUsers = new Set<string>();

/**
 * Fetches all envelopes for a user along with their allocation figures for the chosen year-month.
 */
export async function fetchEnvelopesWithAllocations(
  userId: string,
  yearMonth: string
): Promise<EnvelopeWithAllocation[]> {
  // 1. Ensure user has default envelopes seeded (run once per session or if empty)
  if (!initializedEnvelopesUsers.has(userId)) {
    await ensureDefaultEnvelopes(userId);
    initializedEnvelopesUsers.add(userId);
  }

  // 2. Fetch budget_period ID, envelopes, and accounts in PARALLEL to eliminate network waterfall
  const [periodId, envelopesResult, accountsResult] = await Promise.all([
    getOrCreateBudgetPeriod(userId, yearMonth),
    supabase
      .from('envelopes')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('accounts')
      .select('id, name, is_active')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
  ]);

  let envelopesData = envelopesResult.data;
  if (envelopesResult.error) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('envelopes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (fallbackError) {
      console.error('[Envello API] Error fetching envelopes:', fallbackError.message);
      throw fallbackError;
    }
    envelopesData = fallbackData;
  }

  // If user unexpectedly has 0 envelopes, seed defaults and re-fetch once
  if (!envelopesData || envelopesData.length === 0) {
    await ensureDefaultEnvelopes(userId);
    const { data: reseeded } = await supabase
      .from('envelopes')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    envelopesData = reseeded || [];
  }

  const validEnvelopes = (envelopesData || []).filter(
    (env) => env.slug !== 'credit-cards' && env.slug !== 'emis' && env.slug !== 'monthly-targets'
  );

  // Apply localStorage custom ordering overlay if present
  let localOrder: string[] = [];
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(`envello_envelope_order_${userId}`);
      if (raw) {
        localOrder = JSON.parse(raw);
      }
    }
  } catch {
    // Ignore JSON parse errors
  }

  if (localOrder.length > 0) {
    validEnvelopes.sort((a, b) => {
      const idxA = localOrder.indexOf(a.id);
      const idxB = localOrder.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
  }

  // 3. Fetch allocations for the specified period
  const { data: allocationsData, error: allocError } = await supabase
    .from('envelope_allocations')
    .select('*')
    .eq('user_id', userId)
    .eq('period_id', periodId);

  // 4. Fetch allocation sources for all allocations in this period in parallel with account mapping
  const sourcesMap = new Map<string, AllocationSourceRecord[]>();
  const allocIds = (allocationsData || []).map((a) => a.id);
  const accountsData = accountsResult.data || [];
  const accMap = new Map(accountsData.map((a) => [a.id, a.name]));

  if (allocIds.length > 0) {
    try {
      const { data: sourcesData } = await supabase
        .from('envelope_allocation_sources')
        .select('id, allocation_id, account_id, amount_paise')
        .eq('user_id', userId)
        .in('allocation_id', allocIds);

      for (const src of sourcesData || []) {
        const list = sourcesMap.get(src.allocation_id) || [];
        list.push({
          id: src.id,
          allocationId: src.allocation_id,
          accountId: src.account_id,
          accountName: accMap.get(src.account_id) || 'Liquid Account',
          amountPaise: BigInt(src.amount_paise),
        });
        sourcesMap.set(src.allocation_id, list);
      }
    } catch (err) {
      console.warn('[Envello API] Error loading allocation sources for period:', err);
    }
  }

  if (allocError) {
    console.error('[Envello API] Error fetching allocations:', allocError.message);
    throw allocError;
  }

  const allocMap = new Map<string, (typeof allocationsData)[number]>();
  for (const alloc of allocationsData || []) {
    allocMap.set(alloc.envelope_id, alloc);
  }

  // 5. Combine into EnvelopeWithAllocation domain objects
  return validEnvelopes.map((env, index) => {
    const alloc = allocMap.get(env.id);
    const allocatedPaise = BigInt(alloc?.allocated_paise ?? 0);
    const carriedOverPaise = BigInt(alloc?.carried_over_paise ?? 0);
    const spentPaise = BigInt(alloc?.spent_paise ?? 0);
    const availablePaise = calculateAvailableEnvelopeBalance(allocatedPaise, carriedOverPaise, spentPaise);

    let sources = alloc?.id ? sourcesMap.get(alloc.id) || [] : [];
    // If allocatedPaise > 0 but sources list is empty (e.g. legacy allocation or remote sync gap),
    // supply a backing source hold from the primary liquid account
    if (sources.length === 0 && allocatedPaise > 0n && alloc?.id) {
      const primaryAcc = (accountsData || []).find((a) => a.is_active !== false) || accountsData?.[0];
      if (primaryAcc) {
        sources = [
          {
            id: `fallback-${alloc.id}`,
            allocationId: alloc.id,
            accountId: primaryAcc.id,
            accountName: primaryAcc.name,
            amountPaise: allocatedPaise,
          },
        ];
      }
    } else if (allocatedPaise === 0n) {
      sources = [];
    }

    return {
      id: env.id,
      name: env.name,
      slug: env.slug,
      icon: env.icon ?? undefined,
      color: env.color ?? undefined,
      isSystemReserved: env.is_system_reserved,
      isProtected: env.is_system_reserved,
      rolloverPolicy: env.rollover_policy as EnvelopeRolloverPolicy,
      sortOrder: (env as unknown as { sort_order?: number }).sort_order ?? index,
      allocationId: alloc?.id,
      allocatedPaise,
      carriedOverPaise,
      spentPaise,
      availablePaise,
      sources,
    };
  });
}

/**
 * Sets or updates the planned monthly allocation for an envelope in integer paise.
 * Invariant: New allocation + carried over must NOT be less than already spent funds for this period.
 */
export async function upsertEnvelopeAllocation(
  envelopeId: string,
  userId: string,
  yearMonth: string,
  allocatedPaise: bigint,
  fundingSources?: Array<{ accountId: string; amountPaise: bigint }>
): Promise<void> {
  if (allocatedPaise < 0n) {
    throw new Error('Allocation amount cannot be negative.');
  }

  // Fast Path: Try atomic database RPC function first (1 single network round-trip)
  try {
    const { data: rpcAllocId, error: rpcError } = await supabase.rpc(
      'upsert_envelope_allocation_atomic',
      {
        p_envelope_id: envelopeId,
        p_year_month: yearMonth,
        p_allocated_paise: Number(allocatedPaise),
        p_funding_sources: (fundingSources || []).map((s) => ({
          accountId: s.accountId,
          amountPaise: Number(s.amountPaise),
        })),
      }
    );

    if (!rpcError && rpcAllocId) {
      return;
    }
    if (rpcError && rpcError.message && rpcError.message.includes('Cannot set allocation lower')) {
      throw new Error(rpcError.message);
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Cannot set allocation lower')) {
      throw err;
    }
    // Fall back to client-side batched verification & execution
  }

  const periodId = await getOrCreateBudgetPeriod(userId, yearMonth);

  const { data: existing } = await supabase
    .from('envelope_allocations')
    .select('id, allocated_paise, carried_over_paise, spent_paise')
    .eq('user_id', userId)
    .eq('envelope_id', envelopeId)
    .eq('period_id', periodId)
    .maybeSingle();

  const carriedOverPaise = BigInt(existing?.carried_over_paise ?? 0);
  const spentPaise = BigInt(existing?.spent_paise ?? 0);

  // Invariant Guard: New allocation cannot violate already spent money
  if (allocatedPaise + carriedOverPaise < spentPaise) {
    const minRequired = spentPaise > carriedOverPaise ? spentPaise - carriedOverPaise : 0n;
    throw new Error(
      `Cannot set allocation to ₹${(Number(allocatedPaise) / 100).toFixed(2)}. This envelope has already spent ₹${(Number(spentPaise) / 100).toFixed(2)} this month. Minimum allowable budget is ₹${(Number(minRequired) / 100).toFixed(2)}.`
    );
  }

  let allocationId = existing?.id;

  if (existing?.id) {
    const { error } = await supabase
      .from('envelope_allocations')
      .update({
        allocated_paise: Number(allocatedPaise),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) {
      console.error('[Envello API] Error updating allocation:', error.message);
      throw error;
    }
  } else {
    const { data: inserted, error } = await supabase
      .from('envelope_allocations')
      .insert({
        envelope_id: envelopeId,
        period_id: periodId,
        user_id: userId,
        allocated_paise: Number(allocatedPaise),
        carried_over_paise: 0,
        spent_paise: 0,
      })
      .select('id')
      .single();

    if (error || !inserted) {
      console.error('[Envello API] Error inserting allocation:', error?.message);
      throw error || new Error('Failed to create allocation.');
    }
    allocationId = inserted.id;
  }

  // Synchronize backing sources in envelope_allocation_sources
  if (allocationId) {
    try {
      if (fundingSources && fundingSources.length > 0) {
        // Delete previous sources for this allocation
        await supabase
          .from('envelope_allocation_sources')
          .delete()
          .eq('allocation_id', allocationId)
          .eq('user_id', userId);

        if (allocatedPaise > 0n) {
          const rows = fundingSources
            .filter((s) => s.amountPaise > 0n)
            .map((s) => ({
              user_id: userId,
              allocation_id: allocationId!,
              account_id: s.accountId,
              amount_paise: Number(s.amountPaise),
            }));

          if (rows.length > 0) {
            const { error: insErr } = await supabase.from('envelope_allocation_sources').insert(rows);
            if (insErr) {
              console.warn('[Envello API] Warning inserting allocation sources:', insErr.message);
            }
          }
        }
      } else if (allocatedPaise > 0n) {
        // Auto-assign to primary/first liquid account if no specific sources passed
        const { data: existingSources } = await supabase
          .from('envelope_allocation_sources')
          .select('id')
          .eq('allocation_id', allocationId)
          .eq('user_id', userId)
          .limit(1);

        if (!existingSources || existingSources.length === 0) {
          const { data: firstAcc } = await supabase
            .from('accounts')
            .select('id')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (firstAcc?.id) {
            const { error: insSingleErr } = await supabase.from('envelope_allocation_sources').insert({
              user_id: userId,
              allocation_id: allocationId,
              account_id: firstAcc.id,
              amount_paise: Number(allocatedPaise),
            });
            if (insSingleErr) {
              console.warn('[Envello API] Warning inserting fallback allocation source:', insSingleErr.message);
            }
          }
        } else {
          // Update single existing source amount if exactly one exists
          const { data: singleSource } = await supabase
            .from('envelope_allocation_sources')
            .select('id, account_id')
            .eq('allocation_id', allocationId)
            .eq('user_id', userId);

          if (singleSource && singleSource.length === 1) {
            await supabase
              .from('envelope_allocation_sources')
              .update({
                amount_paise: Number(allocatedPaise),
                updated_at: new Date().toISOString(),
              })
              .eq('id', singleSource[0].id);
          }
        }
      } else {
        // Zero allocation -> clear sources
        await supabase
          .from('envelope_allocation_sources')
          .delete()
          .eq('allocation_id', allocationId)
          .eq('user_id', userId);
      }
    } catch (err) {
      console.warn('[Envello API] Error synchronizing allocation sources:', err);
    }
  }
}

/**
 * Reallocates budget between two envelopes in the same period.
 * (e.g. Move ₹2,000 from Regular to Gym)
 * Invariants:
 * - Amount must be positive.
 * - From envelope must have at least amountPaise available.
 * - Updates both envelope balances and logs an audit transaction in transactions table.
 */
export async function transferBetweenEnvelopes(
  userId: string,
  yearMonth: string,
  fromEnvelopeId: string,
  toEnvelopeId: string,
  amountPaise: bigint
): Promise<void> {
  if (amountPaise <= 0n) {
    throw new Error('Transfer amount must be greater than zero.');
  }

  if (fromEnvelopeId === toEnvelopeId) {
    throw new Error('Cannot transfer budget to the same envelope.');
  }

  const periodId = await getOrCreateBudgetPeriod(userId, yearMonth);

  // 1. Get current allocations
  const { data: fromAlloc } = await supabase
    .from('envelope_allocations')
    .select('*')
    .eq('user_id', userId)
    .eq('envelope_id', fromEnvelopeId)
    .eq('period_id', periodId)
    .maybeSingle();

  const { data: toAlloc } = await supabase
    .from('envelope_allocations')
    .select('*')
    .eq('user_id', userId)
    .eq('envelope_id', toEnvelopeId)
    .eq('period_id', periodId)
    .maybeSingle();

  const currentFromAllocated = BigInt(fromAlloc?.allocated_paise ?? 0);
  const currentFromCarried = BigInt(fromAlloc?.carried_over_paise ?? 0);
  const currentFromSpent = BigInt(fromAlloc?.spent_paise ?? 0);
  const currentFromAvailable = calculateAvailableEnvelopeBalance(
    currentFromAllocated,
    currentFromCarried,
    currentFromSpent
  );

  if (amountPaise > currentFromAvailable) {
    throw new Error(
      `Insufficient available funds in source envelope (available: ₹${(Number(currentFromAvailable) / 100).toFixed(2)}). Cannot transfer more than available balance.`
    );
  }

  // 2. Compute new balances for fromEnvelope
  let newFromAllocated = currentFromAllocated;
  let newFromCarried = currentFromCarried;

  if (currentFromAllocated >= amountPaise) {
    newFromAllocated = currentFromAllocated - amountPaise;
  } else {
    // Deduct remaining from carried_over_paise
    const remainder = amountPaise - currentFromAllocated;
    newFromAllocated = 0n;
    newFromCarried = currentFromCarried - remainder;
  }

  // 3. Compute new balances for toEnvelope
  const currentToAllocated = BigInt(toAlloc?.allocated_paise ?? 0);
  const newToAllocated = currentToAllocated + amountPaise;

  // 4. Update fromEnvelope
  if (fromAlloc?.id) {
    await supabase
      .from('envelope_allocations')
      .update({
        allocated_paise: Number(newFromAllocated),
        carried_over_paise: Number(newFromCarried),
        updated_at: new Date().toISOString(),
      })
      .eq('id', fromAlloc.id);
  } else {
    await supabase.from('envelope_allocations').insert({
      envelope_id: fromEnvelopeId,
      period_id: periodId,
      user_id: userId,
      allocated_paise: Number(newFromAllocated),
      carried_over_paise: Number(newFromCarried),
      spent_paise: 0,
    });
  }

  // 5. Update toEnvelope
  if (toAlloc?.id) {
    await supabase
      .from('envelope_allocations')
      .update({
        allocated_paise: Number(newToAllocated),
        updated_at: new Date().toISOString(),
      })
      .eq('id', toAlloc.id);
  } else {
    await supabase.from('envelope_allocations').insert({
      envelope_id: toEnvelopeId,
      period_id: periodId,
      user_id: userId,
      allocated_paise: Number(newToAllocated),
      carried_over_paise: 0,
      spent_paise: 0,
    });
  }

  // 6. Log audit transaction into double-entry ledger
  const { data: envs } = await supabase
    .from('envelopes')
    .select('id, name')
    .in('id', [fromEnvelopeId, toEnvelopeId]);

  const fromName = envs?.find((e) => e.id === fromEnvelopeId)?.name || 'Envelope';
  const toName = envs?.find((e) => e.id === toEnvelopeId)?.name || 'Envelope';

  const { data: tx } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      transaction_date: `${yearMonth}-01`,
      type: 'envelope_allocation',
      total_amount_paise: Number(amountPaise),
      description: `Reallocation: ${fromName} → ${toName}`,
      notes: `Reallocated budget allowance from ${fromName} to ${toName}`,
    })
    .select('id')
    .single();

  if (tx) {
    await supabase.from('transaction_entries').insert([
      {
        transaction_id: tx.id,
        user_id: userId,
        account_id: null,
        envelope_id: fromEnvelopeId,
        direction: 'credit',
        amount_paise: Number(amountPaise),
      },
      {
        transaction_id: tx.id,
        user_id: userId,
        account_id: null,
        envelope_id: toEnvelopeId,
        direction: 'debit',
        amount_paise: Number(amountPaise),
      },
    ]);
  }

  // 7. Transfer backing sources between envelopes to preserve account hold mapping
  if (fromAlloc?.id && toAlloc?.id && amountPaise > 0n) {
    try {
      const fromSources = await fetchEnvelopeAllocationSources(userId, fromAlloc.id);
      if (fromSources.length > 0) {
        // Sort descending to transfer from largest hold
        const sorted = [...fromSources].sort((a, b) =>
          b.amountPaise > a.amountPaise ? 1 : -1
        );

        let needed = amountPaise;
        for (const src of sorted) {
          if (needed <= 0n) break;
          const shift = src.amountPaise >= needed ? needed : src.amountPaise;

          // Deduct shift from source envelope allocation source
          if (src.amountPaise === shift) {
            await supabase
              .from('envelope_allocation_sources')
              .delete()
              .eq('id', src.id);
          } else {
            await supabase
              .from('envelope_allocation_sources')
              .update({
                amount_paise: Number(src.amountPaise - shift),
                updated_at: new Date().toISOString(),
              })
              .eq('id', src.id);
          }

          // Add shift to target envelope allocation source
          const { data: existingToSrc } = await supabase
            .from('envelope_allocation_sources')
            .select('id, amount_paise')
            .eq('allocation_id', toAlloc.id)
            .eq('account_id', src.accountId)
            .maybeSingle();

          if (existingToSrc?.id) {
            await supabase
              .from('envelope_allocation_sources')
              .update({
                amount_paise: existingToSrc.amount_paise + Number(shift),
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingToSrc.id);
          } else {
            await supabase.from('envelope_allocation_sources').insert({
              user_id: userId,
              allocation_id: toAlloc.id,
              account_id: src.accountId,
              amount_paise: Number(shift),
            });
          }

          needed -= shift;
        }
      }
    } catch (err) {
      console.warn('[Envello API] Error transferring allocation sources:', err);
    }
  }
}

/**
 * Creates a new user-defined envelope.
 */
export async function createCustomEnvelope(
  userId: string,
  data: {
    name: string;
    slug?: string;
    icon?: string;
    color?: string;
    rolloverPolicy: EnvelopeRolloverPolicy;
    isProtected?: boolean;
  }
): Promise<void> {
  // Generate safe slug
  const baseSlug =
    data.slug ||
    data.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') ||
    'category';

  // Check if slug already exists for this user to prevent unique constraint conflict
  const { data: existingSlug } = await supabase
    .from('envelopes')
    .select('id')
    .eq('user_id', userId)
    .eq('slug', baseSlug)
    .maybeSingle();

  const finalSlug = existingSlug?.id
    ? `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`
    : baseSlug;

  // Calculate next sort_order
  let nextSortOrder = 0;
  try {
    const { data: maxEnv } = await supabase
      .from('envelopes')
      .select('sort_order')
      .eq('user_id', userId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxEnv && typeof maxEnv.sort_order === 'number') {
      nextSortOrder = maxEnv.sort_order + 1;
    }
  } catch {
    // Ignore if column doesn't exist yet
  }

  const { data: inserted, error } = await supabase
    .from('envelopes')
    .insert({
      user_id: userId,
      name: data.name.trim(),
      slug: finalSlug,
      icon: data.icon || 'Folder',
      color: data.color || '#38bdf8',
      is_system_reserved: Boolean(data.isProtected),
      rollover_policy: data.rolloverPolicy,
      sort_order: nextSortOrder,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[Envello API] Error creating custom envelope:', error.message);
    throw error;
  }

  // Also append to local order cache if present
  try {
    if (typeof window !== 'undefined' && window.localStorage && inserted?.id) {
      const raw = localStorage.getItem(`envello_envelope_order_${userId}`);
      if (raw) {
        const order: string[] = JSON.parse(raw);
        if (!order.includes(inserted.id)) {
          order.push(inserted.id);
          localStorage.setItem(`envello_envelope_order_${userId}`, JSON.stringify(order));
        }
      }
    }
  } catch {
    // Ignore JSON errors
  }
}

/**
 * Updates the user-defined display order for envelopes.
 * Syncs instantly to localStorage for 0ms latency and persists to Supabase.
 */
export async function updateEnvelopeSortOrders(
  userId: string,
  orderedIds: string[]
): Promise<void> {
  // 1. Instantly save to localStorage for cache and offline resilience
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(`envello_envelope_order_${userId}`, JSON.stringify(orderedIds));
    }
  } catch (e) {
    console.warn('[Envello API] Failed to cache envelope order locally:', e);
  }

  // 2. Persist sort_order to Supabase
  try {
    const updates = orderedIds.map((id, index) =>
      supabase
        .from('envelopes')
        .update({ sort_order: index, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
    );
    await Promise.all(updates);
  } catch (err) {
    console.warn('[Envello API] Failed to persist sort_order to Supabase:', err);
  }
}

/**
 * Updates an envelope's name, icon, color, rollover policy, or protected reserve status.
 */
export async function updateEnvelope(
  envelopeId: string,
  userId: string,
  data: {
    name?: string;
    icon?: string;
    color?: string;
    rolloverPolicy?: EnvelopeRolloverPolicy;
    isProtected?: boolean;
  }
): Promise<void> {
  const updatePayload: Database['public']['Tables']['envelopes']['Update'] = {
    updated_at: new Date().toISOString(),
  };

  if (data.name !== undefined) updatePayload.name = data.name.trim();
  if (data.icon !== undefined) updatePayload.icon = data.icon;
  if (data.color !== undefined) updatePayload.color = data.color;
  if (data.rolloverPolicy !== undefined) updatePayload.rollover_policy = data.rolloverPolicy;
  if (data.isProtected !== undefined) updatePayload.is_system_reserved = data.isProtected;

  const { error } = await supabase
    .from('envelopes')
    .update(updatePayload)
    .eq('id', envelopeId)
    .eq('user_id', userId);

  if (error) {
    console.error('[Envello API] Error updating envelope:', error.message);
    throw error;
  }
}

/**
 * Deletes any user envelope and cleans up its allocations.
 * Past transaction records retain ledger history by unlinking envelope_id.
 */
export async function deleteEnvelope(envelopeId: string, userId: string): Promise<void> {
  // 1. Delete envelope allocation sources first
  try {
    const { data: allocs } = await supabase
      .from('envelope_allocations')
      .select('id')
      .eq('envelope_id', envelopeId)
      .eq('user_id', userId);

    if (allocs && allocs.length > 0) {
      await supabase
        .from('envelope_allocation_sources')
        .delete()
        .in('allocation_id', allocs.map((a) => a.id))
        .eq('user_id', userId);
    }
  } catch (err) {
    console.warn('[Envello API] Error deleting allocation sources on envelope deletion:', err);
  }

  // 2. Delete envelope allocations
  await supabase
    .from('envelope_allocations')
    .delete()
    .eq('envelope_id', envelopeId)
    .eq('user_id', userId);

  // 2. Unlink envelope_id from transaction entries to preserve double-entry ledger history
  await supabase
    .from('transaction_entries')
    .update({ envelope_id: null })
    .eq('envelope_id', envelopeId)
    .eq('user_id', userId);

  // 3. Delete the envelope
  const { error } = await supabase
    .from('envelopes')
    .delete()
    .eq('id', envelopeId)
    .eq('user_id', userId);

  if (error) {
    console.error('[Envello API] Error deleting envelope:', error.message);
    throw error;
  }
}
