import { supabase } from '@/lib/supabase/client';
import type { AccountType } from '@/types/accounting.types';

export interface AccountItem {
  id: string;
  name: string;
  institution: string;
  accountType: AccountType;
  balancePaise: bigint;
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

/**
 * Fetches all active accounts for a user.
 */
export async function fetchAccounts(userId: string): Promise<AccountItem[]> {
  await ensureDefaultAccounts(userId);

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Envello Accounts API] Error fetching accounts:', error.message);
    throw error;
  }

  return (data || []).map((acc) => ({
    id: acc.id,
    name: acc.name,
    institution: acc.institution,
    accountType: acc.account_type as AccountType,
    balancePaise: BigInt(acc.balance_paise),
    isActive: acc.is_active,
    createdAt: acc.created_at,
  }));
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

  return {
    id: created.id,
    name: created.name,
    institution: created.institution,
    accountType: created.account_type as AccountType,
    balancePaise: BigInt(created.balance_paise),
    isActive: created.is_active,
    createdAt: created.created_at,
  };
}

/**
 * Updates an existing account's balance or metadata.
 */
export async function updateAccountBalance(
  accountId: string,
  userId: string,
  newBalancePaise: bigint
): Promise<void> {
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
