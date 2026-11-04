import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';
import { getAccountHoldPaise } from './accounts';
import { formatINR } from '@/lib/accounting/currency';

export type FixedDepositRow = Database['public']['Tables']['fixed_deposits']['Row'];
export type FixedDepositInsert = Database['public']['Tables']['fixed_deposits']['Insert'];
export type DepositType = 'fd' | 'rd';

/**
 * Fetch all fixed deposits and RDs for a user
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

  return (data || []).map((fd: any) => ({
    ...fd,
    deposit_type: fd.deposit_type || (fd.institution?.toLowerCase().includes('rd') ? 'rd' : 'fd'),
    monthly_deposit_paise: fd.monthly_deposit_paise ?? 0,
  }));
}

/**
 * Create a new fixed deposit, recurring deposit (RD), or term savings reserve.
 * Gracefully handles missing database columns via automatic schema fallback.
 * Optionally debits a liquid account if funding is selected, guarded by headroom.
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
    deposit_type?: DepositType;
    monthly_deposit_paise?: number;
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
    deposit_type = 'fd',
    monthly_deposit_paise = 0,
    funding_account_id,
  } = params;

  // 1. Try to create the deposit record with deposit_type and monthly_deposit_paise
  const insertPayload: any = {
    user_id: userId,
    institution,
    principal_paise,
    interest_rate_percent,
    start_date,
    maturity_date,
    maturity_amount_paise,
    is_liquidated: false,
    deposit_type,
    monthly_deposit_paise,
  };

  let fd: FixedDepositRow;
  const { data: fdData, error: fdError } = await supabase
    .from('fixed_deposits')
    .insert(insertPayload)
    .select()
    .single();

  if (fdError) {
    const errorMsg = (fdError.message || '').toLowerCase();
    // If remote Supabase table does not yet have deposit_type / monthly_deposit_paise columns
    if (
      errorMsg.includes('deposit_type') ||
      errorMsg.includes('monthly_deposit_paise') ||
      errorMsg.includes('schema cache') ||
      errorMsg.includes('column') ||
      fdError.code === 'PGRST204'
    ) {
      console.warn('[Envello FD] Retrying insert with base fixed_deposits schema without extended columns');
      const basePayload = {
        user_id: userId,
        institution:
          deposit_type === 'rd' && !institution.toLowerCase().includes('rd')
            ? `[RD] ${institution}`
            : institution,
        principal_paise,
        interest_rate_percent,
        start_date,
        maturity_date,
        maturity_amount_paise,
        is_liquidated: false,
      };

      const { data: fallbackFd, error: fallbackError } = await supabase
        .from('fixed_deposits')
        .insert(basePayload)
        .select()
        .single();

      if (fallbackError || !fallbackFd) {
        console.error('Error creating fixed deposit with fallback:', fallbackError);
        throw fallbackError;
      }

      fd = {
        ...fallbackFd,
        deposit_type,
        monthly_deposit_paise,
      };
    } else {
      console.error('Error creating fixed deposit:', fdError);
      throw fdError;
    }
  } else {
    fd = {
      ...fdData,
      deposit_type: fdData.deposit_type || deposit_type,
      monthly_deposit_paise: fdData.monthly_deposit_paise ?? monthly_deposit_paise,
    };
  }

  // 2. If funded from a liquid bank account, record the movement and debit account
  if (funding_account_id) {
    const { data: account, error: accError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', funding_account_id)
      .eq('user_id', userId)
      .single();

    if (accError || !account) {
      throw new Error('Selected funding account not found.');
    }

    // For RD, initial debit is first month installment; for FD, it is principal
    const debitPaise =
      deposit_type === 'rd' && monthly_deposit_paise > 0
        ? monthly_deposit_paise
        : principal_paise;

    // Headroom invariant: ensure account has sufficient free unallocated funds
    const activeHold = await getAccountHoldPaise(funding_account_id, userId);
    const unallocatedPaise = BigInt(account.balance_paise) - activeHold;
    if (BigInt(debitPaise) > unallocatedPaise) {
      throw new Error(
        `Cannot fund deposit: "${account.name}" only has ${formatINR(
          unallocatedPaise > 0n ? unallocatedPaise : 0n
        )} in free unallocated funds (${formatINR(
          activeHold
        )} is reserved across envelopes). Required initial funding is ${formatINR(
          BigInt(debitPaise)
        )}.`
      );
    }

    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        transaction_date: start_date,
        type: 'fd_movement',
        total_amount_paise: debitPaise,
        description: `${deposit_type === 'rd' ? 'RD Initial Deposit' : 'FD Placement'}: ${institution}`,
        notes: `Funded ${deposit_type === 'rd' ? 'Recurring Deposit' : 'Fixed Deposit'} (${institution})`,
      })
      .select()
      .single();

    if (txError || !tx) {
      console.error('Error creating funding transaction:', txError);
      throw txError;
    }

    await supabase.from('transaction_entries').insert({
      transaction_id: tx.id,
      user_id: userId,
      account_id: funding_account_id,
      envelope_id: null,
      direction: 'credit', // money leaves bank account to enter locked term deposit
      amount_paise: debitPaise,
    });

    await supabase
      .from('accounts')
      .update({
        balance_paise: Number(BigInt(account.balance_paise) - BigInt(debitPaise)),
        updated_at: new Date().toISOString(),
      })
      .eq('id', funding_account_id)
      .eq('user_id', userId);
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
      description: `${fd.deposit_type === 'rd' || fd.institution?.toLowerCase().includes('rd') ? 'RD' : 'FD'} liquidated: ${fd.institution}`,
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
        balance_paise: Number(BigInt(account.balance_paise) + BigInt(finalAmount)),
        updated_at: new Date().toISOString(),
      })
      .eq('id', destinationAccountId)
      .eq('user_id', userId);
  }
}
