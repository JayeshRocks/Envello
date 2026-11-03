import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';
import type { EnvelopeWithAllocation, EnvelopeRolloverPolicy } from '@/types/accounting.types';
import { calculateAvailableEnvelopeBalance } from '@/lib/accounting/calculations';

export type EnvelopeWithDetails = EnvelopeWithAllocation;

export const DEFAULT_ENVELOPES_CONFIG = [
  {
    name: 'Spendable',
    slug: 'regular',
    icon: 'Mail',
    color: '#38bdf8', // sky-400
    is_system_reserved: true,
    rollover_policy: 'carry_forward' as EnvelopeRolloverPolicy,
  },
  {
    name: 'Emergency',
    slug: 'emergency',
    icon: 'ShieldAlert',
    color: '#f87171', // red-400
    is_system_reserved: true,
    rollover_policy: 'carry_forward' as EnvelopeRolloverPolicy,
  },
  {
    name: 'Savings',
    slug: 'savings',
    icon: 'PiggyBank',
    color: '#10b981', // emerald-500
    is_system_reserved: true,
    rollover_policy: 'carry_forward' as EnvelopeRolloverPolicy,
  },
  {
    name: 'Essentials',
    slug: 'essentials',
    icon: 'Home',
    color: '#fbbf24', // amber-400
    is_system_reserved: false,
    rollover_policy: 'carry_forward' as EnvelopeRolloverPolicy,
  },
  {
    name: 'Gym',
    slug: 'gym',
    icon: 'Dumbbell',
    color: '#34d399', // emerald-400
    is_system_reserved: false,
    rollover_policy: 'carry_forward' as EnvelopeRolloverPolicy,
  },
  {
    name: 'Outing',
    slug: 'outing',
    icon: 'Coffee',
    color: '#c084fc', // purple-400
    is_system_reserved: false,
    rollover_policy: 'sweep_to_regular' as EnvelopeRolloverPolicy,
  },
  {
    name: 'Birthdays',
    slug: 'birthdays',
    icon: 'Gift',
    color: '#f472b6', // pink-400
    is_system_reserved: false,
    rollover_policy: 'carry_forward' as EnvelopeRolloverPolicy,
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
    .select('id, slug, name')
    .eq('user_id', userId);

  if (checkError) {
    console.error('[Envello API] Error checking existing envelopes:', checkError.message);
    throw checkError;
  }

  // If user already has envelopes, ensure legacy names and reserves are standardized
  if (existing && existing.length > 0) {
    // 1. Ensure legacy "Regular / Balance" is renamed to "Spendable"
    await supabase
      .from('envelopes')
      .update({ name: 'Spendable' })
      .eq('user_id', userId)
      .in('name', ['Regular / Balance', 'Regular/Balance']);

    // 2. Ensure "Savings" envelope exists, is named "Savings", and is marked as system-reserved
    const savingsEnv = existing.find((env) => env.slug === 'savings');
    if (savingsEnv) {
      if (savingsEnv.name !== 'Savings') {
        await supabase
          .from('envelopes')
          .update({
            name: 'Savings',
            icon: 'PiggyBank',
            color: '#10b981',
            is_system_reserved: true,
          })
          .eq('id', savingsEnv.id);
      }
    } else {
      // Seed missing Savings core envelope
      await supabase.from('envelopes').insert({
        user_id: userId,
        name: 'Savings',
        slug: 'savings',
        icon: 'PiggyBank',
        color: '#10b981',
        is_system_reserved: true,
        rollover_policy: 'carry_forward',
      });
    }

    // 3. Clean up unreferenced deprecated envelopes (credit-cards, emis, monthly-targets)
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
    return;
  }

  const rowsToInsert = DEFAULT_ENVELOPES_CONFIG.map((env) => ({
    user_id: userId,
    name: env.name,
    slug: env.slug,
    icon: env.icon,
    color: env.color,
    is_system_reserved: env.is_system_reserved,
    rollover_policy: env.rollover_policy,
  }));

  const { error: insertError } = await supabase.from('envelopes').insert(rowsToInsert);
  if (insertError) {
    console.error('[Envello API] Error seeding default envelopes:', insertError.message);
    throw insertError;
  }
}

/**
 * Fetches all envelopes for a user along with their allocation figures for the chosen year-month.
 */
export async function fetchEnvelopesWithAllocations(
  userId: string,
  yearMonth: string
): Promise<EnvelopeWithAllocation[]> {
  // 1. Ensure user has default envelopes seeded
  await ensureDefaultEnvelopes(userId);

  // 2. Resolve budget_period ID
  const periodId = await getOrCreateBudgetPeriod(userId, yearMonth);

  // 3. Fetch all user envelopes (excluding deprecated credit-cards and emis)
  const { data: envelopesData, error: envError } = await supabase
    .from('envelopes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (envError) {
    console.error('[Envello API] Error fetching envelopes:', envError.message);
    throw envError;
  }

  const validEnvelopes = (envelopesData || []).filter(
    (env) => env.slug !== 'credit-cards' && env.slug !== 'emis' && env.slug !== 'monthly-targets'
  );

  // 4. Fetch allocations for the specified period
  const { data: allocationsData, error: allocError } = await supabase
    .from('envelope_allocations')
    .select('*')
    .eq('user_id', userId)
    .eq('period_id', periodId);

  if (allocError) {
    console.error('[Envello API] Error fetching allocations:', allocError.message);
    throw allocError;
  }

  const allocMap = new Map<string, (typeof allocationsData)[number]>();
  for (const alloc of allocationsData || []) {
    allocMap.set(alloc.envelope_id, alloc);
  }

  // 5. Combine into EnvelopeWithAllocation domain objects
  return validEnvelopes.map((env) => {
    const alloc = allocMap.get(env.id);
    const allocatedPaise = BigInt(alloc?.allocated_paise ?? 0);
    const carriedOverPaise = BigInt(alloc?.carried_over_paise ?? 0);
    const spentPaise = BigInt(alloc?.spent_paise ?? 0);
    const availablePaise = calculateAvailableEnvelopeBalance(allocatedPaise, carriedOverPaise, spentPaise);

    return {
      id: env.id,
      name: env.name,
      slug: env.slug,
      icon: env.icon ?? undefined,
      color: env.color ?? undefined,
      isSystemReserved: env.is_system_reserved,
      rolloverPolicy: env.rollover_policy as EnvelopeRolloverPolicy,
      allocationId: alloc?.id,
      allocatedPaise,
      carriedOverPaise,
      spentPaise,
      availablePaise,
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
  allocatedPaise: bigint
): Promise<void> {
  if (allocatedPaise < 0n) {
    throw new Error('Allocation amount cannot be negative.');
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
    const { error } = await supabase.from('envelope_allocations').insert({
      envelope_id: envelopeId,
      period_id: periodId,
      user_id: userId,
      allocated_paise: Number(allocatedPaise),
      carried_over_paise: 0,
      spent_paise: 0,
    });

    if (error) {
      console.error('[Envello API] Error inserting allocation:', error.message);
      throw error;
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

  const { error } = await supabase.from('envelopes').insert({
    user_id: userId,
    name: data.name.trim(),
    slug: finalSlug,
    icon: data.icon || 'Folder',
    color: data.color || '#38bdf8',
    is_system_reserved: false,
    rollover_policy: data.rolloverPolicy,
  });

  if (error) {
    console.error('[Envello API] Error creating custom envelope:', error.message);
    throw error;
  }
}

/**
 * Updates an envelope's name, icon, color, or rollover policy.
 */
export async function updateEnvelope(
  envelopeId: string,
  userId: string,
  data: {
    name?: string;
    icon?: string;
    color?: string;
    rolloverPolicy?: EnvelopeRolloverPolicy;
  }
): Promise<void> {
  const updatePayload: Database['public']['Tables']['envelopes']['Update'] = {
    updated_at: new Date().toISOString(),
  };

  if (data.name !== undefined) updatePayload.name = data.name.trim();
  if (data.icon !== undefined) updatePayload.icon = data.icon;
  if (data.color !== undefined) updatePayload.color = data.color;
  if (data.rolloverPolicy !== undefined) updatePayload.rollover_policy = data.rolloverPolicy;

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
 * Deletes a user envelope and cleans up its allocations.
 * System-reserved envelopes cannot be deleted.
 */
export async function deleteEnvelope(envelopeId: string, userId: string): Promise<void> {
  // Check if system reserved
  const { data: env, error: fetchErr } = await supabase
    .from('envelopes')
    .select('is_system_reserved, name')
    .eq('id', envelopeId)
    .eq('user_id', userId)
    .single();

  if (fetchErr || !env) throw new Error('Envelope not found');

  if (env.is_system_reserved) {
    throw new Error(`The "${env.name}" envelope is system-reserved and cannot be deleted.`);
  }

  // Delete envelope allocations first
  await supabase
    .from('envelope_allocations')
    .delete()
    .eq('envelope_id', envelopeId)
    .eq('user_id', userId);

  // Delete envelope
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
