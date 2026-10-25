import { supabase } from '@/lib/supabase/client';
import type { EnvelopeWithAllocation, EnvelopeRolloverPolicy } from '@/types/accounting.types';
import { calculateAvailableEnvelopeBalance } from '@/lib/accounting/calculations';

export type EnvelopeWithDetails = EnvelopeWithAllocation;

export const DEFAULT_ENVELOPES_CONFIG = [
  {
    name: 'Regular / Balance',
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
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (checkError) {
    console.error('[Envello API] Error checking existing envelopes:', checkError.message);
    throw checkError;
  }

  // If user already has envelopes, no seeding needed
  if (existing && existing.length > 0) {
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

  // 3. Fetch all user envelopes
  const { data: envelopesData, error: envError } = await supabase
    .from('envelopes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (envError) {
    console.error('[Envello API] Error fetching envelopes:', envError.message);
    throw envError;
  }

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
  return (envelopesData || []).map((env) => {
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
 */
export async function upsertEnvelopeAllocation(
  envelopeId: string,
  userId: string,
  yearMonth: string,
  allocatedPaise: bigint
): Promise<void> {
  const periodId = await getOrCreateBudgetPeriod(userId, yearMonth);

  const { data: existing } = await supabase
    .from('envelope_allocations')
    .select('id')
    .eq('user_id', userId)
    .eq('envelope_id', envelopeId)
    .eq('period_id', periodId)
    .maybeSingle();

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

  const currentFromPaise = BigInt(fromAlloc?.allocated_paise ?? 0);
  const currentToPaise = BigInt(toAlloc?.allocated_paise ?? 0);

  const newFromPaise = currentFromPaise - amountPaise;
  const newToPaise = currentToPaise + amountPaise;

  // 2. Save both sides
  await upsertEnvelopeAllocation(fromEnvelopeId, userId, yearMonth, newFromPaise);
  await upsertEnvelopeAllocation(toEnvelopeId, userId, yearMonth, newToPaise);
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
