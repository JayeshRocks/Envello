import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';

export type FixedDepositRow = Database['public']['Tables']['fixed_deposits']['Row'];
export type FixedDepositInsert = Database['public']['Tables']['fixed_deposits']['Insert'];

/**
 * Fetch all fixed deposits for a user
 */
export async function fetchFixedDeposits(
  userId: string,
  includeLiquidated = false
): Promise<FixedDepositRow[]> {
  let query = supabase
    .from('fixed_deposits')
    .select('*')
    .eq('user_id', userId)
    .order('maturity_date', { ascending: true });

  if (!includeLiquidated) {
    query = query.eq('is_liquidated', false);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching fixed deposits:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new fixed deposit.
 * Optionally debits a liquid account if funding is selected.
 */
export async function createFixedDeposit(
  userId: string,
  params: {
    institution: string;
    principal_paise: number;
    interest_rate_percent: number;
    start_date: string;
    maturity_date: string;
    maturity_amount_paise: number;
    funding_account_id?: string;
  }
): Promise<FixedDepositRow> {
  const {
    institution,
    principal_paise,
    interest_rate_percent,
    start_date,
    maturity_date,
    maturity_amount_paise,
    funding_account_id,
  } = params;

  // 1. Create the FD record
  const { data: fd, error: fdError } = await supabase
    .from('fixed_deposits')
    .insert({
      user_id: userId,
      institution,
      principal_paise,
      interest_rate_percent,
      start_date,
      maturity_date,
      maturity_amount_paise,
      is_liquidated: false,
    })
    .select()
    .single();

  if (fdError || !fd) {
    console.error('Error creating fixed deposit:', fdError);
    throw fdError;
  }

  // 2. If funded from a liquid bank account, record the movement and debit account
  if (funding_account_id) {
    const { data: account } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', funding_account_id)
      .eq('user_id', userId)
      .single();

    if (account) {
      const { data: tx } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          transaction_date: start_date,
          type: 'fd_movement',
          total_amount_paise: principal_paise,
          description: `Fixed Deposit funded: ${institution}`,
          notes: `Created FD ID: ${fd.id}`,
        })
        .select()
        .single();

      if (tx) {
        await supabase.from('transaction_entries').insert({
          transaction_id: tx.id,
          user_id: userId,
          account_id: funding_account_id,
          envelope_id: null,
          direction: 'credit', // money leaves bank account to enter locked FD
          amount_paise: principal_paise,
        });

        await supabase
          .from('accounts')
          .update({
            balance_paise: account.balance_paise - principal_paise,
            updated_at: new Date().toISOString(),
          })
          .eq('id', funding_account_id)
          .eq('user_id', userId);
      }
    }
  }

  return fd;
}

/**
 * Liquidate an FD and deposit proceeds into an account
 */
export async function liquidateFixedDeposit(
  userId: string,
  params: {
    fdId: string;
    destinationAccountId: string;
    liquidatedAmountPaise?: number;
    liquidationDate?: string;
  }
): Promise<void> {
  const { fdId, destinationAccountId, liquidatedAmountPaise, liquidationDate } = params;
  const dateStr = liquidationDate || new Date().toISOString().split('T')[0];

  const [fdRes, accRes] = await Promise.all([
    supabase.from('fixed_deposits').select('*').eq('id', fdId).eq('user_id', userId).single(),
    supabase.from('accounts').select('*').eq('id', destinationAccountId).eq('user_id', userId).single(),
  ]);

  if (fdRes.error || !fdRes.data) throw new Error('Fixed deposit not found');
  if (accRes.error || !accRes.data) throw new Error('Destination account not found');

  const fd = fdRes.data;
  const account = accRes.data;
  const finalAmount = liquidatedAmountPaise ?? fd.maturity_amount_paise;

  // Mark FD as liquidated
  await supabase
    .from('fixed_deposits')
    .update({ is_liquidated: true, updated_at: new Date().toISOString() })
    .eq('id', fdId)
    .eq('user_id', userId);

  // Credit destination account
  const { data: tx } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      transaction_date: dateStr,
      type: 'fd_movement',
      total_amount_paise: finalAmount,
      description: `Fixed Deposit liquidated: ${fd.institution}`,
      notes: `Matured/liquidated to ${account.name}`,
    })
    .select()
    .single();

  if (tx) {
    await supabase.from('transaction_entries').insert({
      transaction_id: tx.id,
      user_id: userId,
      account_id: destinationAccountId,
      envelope_id: null,
      direction: 'debit', // money enters liquid bank account
      amount_paise: finalAmount,
    });

    await supabase
      .from('accounts')
      .update({
        balance_paise: account.balance_paise + finalAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', destinationAccountId)
      .eq('user_id', userId);
  }
}
