import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';
import type { AccountType } from '@/types/accounting.types';
import { getLocalAllocationSources, saveLocalAllocationSources } from './envelopes';

export type AccountRow = Database['public']['Tables']['accounts']['Row'];

export interface AccountItem {
  id: string;
  name: string;
  institution: string;
  accountType: AccountType;
  balancePaise: bigint;
  allocatedPaise: bigint;
  unallocatedPaise: bigint;
  isActive: boolean;
  createdAt: string;
}

export const DEFAULT_ACCOUNTS_CONFIG = [
  {
    name: 'Primary Savings',
    institution: 'Bank Account',
    account_type: 'savings' as AccountType,
    balance_paise: 0,
    is_active: true,
  },
  {
    name: 'Cash in Hand',
    institution: 'Physical Wallet',
    account_type: 'cash' as AccountType,
    balance_paise: 0,
    is_active: true,
  },
];

/**
 * Ensures a user has baseline liquid accounts seeded on first access.
 */
export async function ensureDefaultAccounts(userId: string): Promise<void> {
  const { data: existing, error: checkError } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (checkError) {
    console.error('[Envello Accounts API] Error checking accounts:', checkError.message);
    throw checkError;
  }

  if (existing && existing.length > 0) {
    return;
  }

  const rows = DEFAULT_ACCOUNTS_CONFIG.map((acc) => ({
    user_id: userId,
    name: acc.name,
    institution: acc.institution,
    account_type: acc.account_type,
    balance_paise: acc.balance_paise,
    is_active: acc.is_active,
  }));

  const { error: insertError } = await supabase.from('accounts').insert(rows);
  if (insertError) {
    console.error('[Envello Accounts API] Error seeding accounts:', insertError.message);
    throw insertError;
  }
}

// Session cache to prevent repeated ensureDefaultAccounts DB round-trips
const initializedAccountsUsers = new Set<string>();

/**
 * Fetches all active accounts for a user and calculates active envelope holds
 * and free unallocated balances for the specified or current budget period.
 */
export async function fetchAccounts(
  userId: string,
  periodKey?: string
): Promise<AccountItem[]> {
  if (!initializedAccountsUsers.has(userId)) {
    await ensureDefaultAccounts(userId);
    initializedAccountsUsers.add(userId);
  }

  const now = new Date();
  const activePeriod =
    periodKey ||
    `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

  // Fetch accounts and active budget period in PARALLEL
  const [accountsRes, periodRes] = await Promise.all([
    supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: true }),
    supabase
      .from('budget_periods')
      .select('id')
      .eq('user_id', userId)
      .eq('period_key', activePeriod)
      .maybeSingle(),
  ]);

  let data = accountsRes.data;
  const error = accountsRes.error;

  if (error) {
    console.error('[Envello Accounts API] Error fetching accounts:', error.message);
    throw error;
  }

  // Fallback: If 0 accounts found, seed defaults and re-fetch once
  if (!data || data.length === 0) {
    await ensureDefaultAccounts(userId);
    const { data: reseeded } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    data = reseeded || [];
  }

  // Calculate allocation holds per account for the period
  const holdsMap = new Map<string, bigint>();
  try {
    const periodData = periodRes.data;

    if (periodData?.id) {
      const { data: allocs } = await supabase
        .from('envelope_allocations')
        .select('id, allocated_paise')
        .eq('period_id', periodData.id)
        .eq('user_id', userId);

      const allocList = allocs || [];
      const allocIds = allocList.map((a) => a.id);
      const coveredAllocIds = new Set<string>();

      // 1. Fetch persisted sources from Supabase envelope_allocation_sources
      if (allocIds.length > 0) {
        const { data: sources, error: srcError } = await supabase
          .from('envelope_allocation_sources')
          .select('allocation_id, account_id, amount_paise')
          .eq('user_id', userId)
          .in('allocation_id', allocIds);

        if (!srcError && sources && sources.length > 0) {
          for (const src of sources) {
            const amt = BigInt(src.amount_paise);
            const current = holdsMap.get(src.account_id) ?? 0n;
            holdsMap.set(src.account_id, current + amt);
            coveredAllocIds.add(src.allocation_id);
          }
        }
      }

      // 2. Fetch from local cache for any allocations not in DB sources
      const localCache = getLocalAllocationSources(userId, activePeriod);
      for (const alloc of allocList) {
        if (!coveredAllocIds.has(alloc.id)) {
          const cached = localCache[alloc.id];
          if (cached && cached.length > 0) {
            for (const c of cached) {
              const amt = BigInt(c.amountPaise);
              const current = holdsMap.get(c.accountId) ?? 0n;
              holdsMap.set(c.accountId, current + amt);
            }
            coveredAllocIds.add(alloc.id);

            // Attempt background sync to Supabase
            try {
              supabase.from('envelope_allocation_sources').insert(
                cached.map((c) => ({
                  user_id: userId,
                  allocation_id: alloc.id,
                  account_id: c.accountId,
                  amount_paise: Number(c.amountPaise),
                }))
              ).then(() => {});
            } catch {
              // Ignore
            }
          }
        }
      }

      // 3. Stable Invariant: For any remaining unassigned legacy allocations:
      // Pin them to the stable primary account (oldest active account by created_at ASC).
      // NEVER sort dynamically by current balance (which would cause holds to jump when balances change).
      const stablePrimaryAcc = (data || []).find((a) => a.is_active !== false) || data?.[0];
      if (stablePrimaryAcc) {
        for (const alloc of allocList) {
          if (!coveredAllocIds.has(alloc.id)) {
            const allocPaise = BigInt(alloc.allocated_paise ?? 0);
            if (allocPaise > 0n) {
              const current = holdsMap.get(stablePrimaryAcc.id) ?? 0n;
              holdsMap.set(stablePrimaryAcc.id, current + allocPaise);
              coveredAllocIds.add(alloc.id);

              saveLocalAllocationSources(userId, activePeriod, alloc.id, [
                { accountId: stablePrimaryAcc.id, amountPaise: allocPaise },
              ]);

              try {
                supabase.from('envelope_allocation_sources').insert({
                  user_id: userId,
                  allocation_id: alloc.id,
                  account_id: stablePrimaryAcc.id,
                  amount_paise: Number(allocPaise),
                }).then(() => {});
              } catch {
                // Ignore
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Envello Accounts API] Error computing account holds:', err);
  }

  return (data || []).map((acc) => {
    const balancePaise = BigInt(acc.balance_paise);
    const allocatedPaise = holdsMap.get(acc.id) ?? 0n;
    const unallocatedPaise = balancePaise - allocatedPaise;

    return {
      id: acc.id,
      name: acc.name,
      institution: acc.institution,
      accountType: acc.account_type as AccountType,
      balancePaise,
      allocatedPaise,
      unallocatedPaise,
      isActive: acc.is_active,
      createdAt: acc.created_at,
    };
  });
}

/**
 * Creates a new account.
 */
export async function createAccount(
  userId: string,
  data: {
    name: string;
    institution: string;
    accountType: AccountType;
    initialBalancePaise?: bigint;
  }
): Promise<AccountItem> {
  const { data: created, error } = await supabase
    .from('accounts')
    .insert({
      user_id: userId,
      name: data.name.trim(),
      institution: data.institution.trim(),
      account_type: data.accountType,
      balance_paise: Number(data.initialBalancePaise ?? 0n),
      is_active: true,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[Envello Accounts API] Error creating account:', error.message);
    throw error;
  }

  const balancePaise = BigInt(created.balance_paise);
  return {
    id: created.id,
    name: created.name,
    institution: created.institution,
    accountType: created.account_type as AccountType,
    balancePaise,
    allocatedPaise: 0n,
    unallocatedPaise: balancePaise,
    isActive: created.is_active,
    createdAt: created.created_at,
  };
}

/**
 * Calculates current active envelope holds on an account.
 */
export async function getAccountHoldPaise(accountId: string, userId: string): Promise<bigint> {
  const accounts = await fetchAccounts(userId);
  const target = accounts.find((a) => a.id === accountId);
  return target?.allocatedPaise ?? 0n;
}

/**
 * Updates an existing account's balance or metadata.
 * Guarded against decreasing balance below active envelope holds.
 */
export async function updateAccountBalance(
  accountId: string,
  userId: string,
  newBalancePaise: bigint
): Promise<void> {
  const currentHold = await getAccountHoldPaise(accountId, userId);
  if (newBalancePaise < currentHold) {
    throw new Error(
      `Cannot decrease account balance below ₹${(Number(currentHold) / 100).toFixed(2)} because ₹${(Number(currentHold) / 100).toFixed(2)} is currently reserved in envelope holds.`
    );
  }

  const { error } = await supabase
    .from('accounts')
    .update({
      balance_paise: Number(newBalancePaise),
      updated_at: new Date().toISOString(),
    })
    .eq('id', accountId)
    .eq('user_id', userId);

  if (error) {
    console.error('[Envello Accounts API] Error updating account balance:', error.message);
    throw error;
  }
}

/**
 * Updates an account's name, institution, type, or balance.
 * Guarded against decreasing balance below active envelope holds.
 */
export async function updateAccount(
  accountId: string,
  userId: string,
  data: {
    name?: string;
    institution?: string;
    accountType?: AccountType;
    balancePaise?: bigint;
  }
): Promise<AccountItem> {
  const currentHold = await getAccountHoldPaise(accountId, userId);
  if (data.balancePaise !== undefined) {
    if (data.balancePaise < currentHold) {
      throw new Error(
        `Cannot decrease account balance below ₹${(Number(currentHold) / 100).toFixed(2)} because ₹${(Number(currentHold) / 100).toFixed(2)} is currently reserved in envelope holds.`
      );
    }
  }

  const updatePayload: Database['public']['Tables']['accounts']['Update'] = {
    updated_at: new Date().toISOString(),
  };

  if (data.name !== undefined) updatePayload.name = data.name.trim();
  if (data.institution !== undefined) updatePayload.institution = data.institution.trim();
  if (data.accountType !== undefined) updatePayload.account_type = data.accountType;
  if (data.balancePaise !== undefined) updatePayload.balance_paise = Number(data.balancePaise);

  const { data: updated, error } = await supabase
    .from('accounts')
    .update(updatePayload)
    .eq('id', accountId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error || !updated) {
    console.error('[Envello Accounts API] Error updating account:', error?.message);
    throw error;
  }

  const balancePaise = BigInt(updated.balance_paise);
  const allocatedPaise = currentHold;
  const unallocatedPaise = balancePaise >= allocatedPaise ? balancePaise - allocatedPaise : 0n;
  return {
    id: updated.id,
    name: updated.name,
    institution: updated.institution,
    accountType: updated.account_type as AccountType,
    balancePaise,
    allocatedPaise,
    unallocatedPaise,
    isActive: updated.is_active,
    createdAt: updated.created_at,
  };
}

/**
 * Deletes an account (or deactivates it if it has foreign key references).
 * Strictly blocked if the account has active envelope holds.
 */
export async function deleteAccount(accountId: string, userId: string): Promise<void> {
  const currentHold = await getAccountHoldPaise(accountId, userId);
  if (currentHold > 0n) {
    throw new Error(
      `Cannot delete account while ₹${(Number(currentHold) / 100).toFixed(2)} is reserved in envelope holds. Please reallocate or release envelope funds first.`
    );
  }

  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', accountId)
    .eq('user_id', userId);

  if (error) {
    // If foreign key constraint prevents deletion, mark as inactive
    if (error.code === '23503') {
      const { error: deactivateError } = await supabase
        .from('accounts')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', accountId)
        .eq('user_id', userId);

      if (deactivateError) throw deactivateError;
      return;
    }
    console.error('[Envello Accounts API] Error deleting account:', error.message);
    throw error;
  }
}
