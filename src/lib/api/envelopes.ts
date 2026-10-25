import { supabase } from '@/lib/supabase/client';
import type { EnvelopeWithAllocation, EnvelopeRolloverPolicy } from '@/types/accounting.types';
import { calculateAvailableEnvelopeBalance } from '@/lib/accounting/calculations';

export const DEFAULT_ENVELOPES_CONFIG = [
  {
    name: 'Regular / Balance',
    slug: 'regular',
    icon: 'Mail',
    color: '#38bdf8', // sky-400
    is_system_reserved: true,
    rollover_policy: 'carry_forward' as EnvelopeRolloverPolicy,
    sort_order: 1,
  },
  {
    name: 'Emergency',
    slug: 'emergency',
    icon: 'ShieldAlert',
    color: '#f87171', // red-400
    is_system_reserved: true,
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
    sort_order: env.sort_order,
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

  // 2. Fetch all user envelopes ordered by sort_order
  const { data: envelopesData, error: envError } = await supabase
    .from('envelopes')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  if (envError) {
    console.error('[Envello API] Error fetching envelopes:', envError.message);
    throw envError;
  }

  // 3. Fetch allocations for the specified month
  const { data: allocationsData, error: allocError } = await supabase
    .from('envelope_allocations')
    .select('*')
    .eq('user_id', userId)
    .eq('year_month', yearMonth);

  if (allocError) {
    console.error('[Envello API] Error fetching allocations:', allocError.message);
    throw allocError;
  }

  const allocMap = new Map<string, (typeof allocationsData)[number]>();
  for (const alloc of allocationsData || []) {
    allocMap.set(alloc.envelope_id, alloc);
  }

  // 4. Combine into EnvelopeWithAllocation domain objects
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
      sortOrder: env.sort_order,
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
  const { data: existing } = await supabase
    .from('envelope_allocations')
    .select('id')
    .eq('envelope_id', envelopeId)
    .eq('year_month', yearMonth)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from('envelope_allocations')
      .update({
        allocated_paise: Number(allocatedPaise),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) throw error;
  } else {
    const { error } = await supabase.from('envelope_allocations').insert({
      envelope_id: envelopeId,
      user_id: userId,
      year_month: yearMonth,
      allocated_paise: Number(allocatedPaise),
      carried_over_paise: 0,
      spent_paise: 0,
    });

    if (error) throw error;
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

  // 1. Get current allocations
  const { data: fromAlloc } = await supabase
    .from('envelope_allocations')
    .select('*')
    .eq('envelope_id', fromEnvelopeId)
    .eq('year_month', yearMonth)
    .maybeSingle();

  const { data: toAlloc } = await supabase
    .from('envelope_allocations')
    .select('*')
    .eq('envelope_id', toEnvelopeId)
    .eq('year_month', yearMonth)
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
  const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const { data: maxSortOrderData } = await supabase
    .from('envelopes')
    .select('sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextSortOrder = (maxSortOrderData?.[0]?.sort_order ?? 6) + 1;

  const { error } = await supabase.from('envelopes').insert({
    user_id: userId,
    name: data.name.trim(),
    slug,
    icon: data.icon || 'Folder',
    color: data.color || '#38bdf8',
    is_system_reserved: false,
    rollover_policy: data.rolloverPolicy,
    sort_order: nextSortOrder,
  });

  if (error) {
    console.error('[Envello API] Error creating custom envelope:', error.message);
    throw error;
  }
}
