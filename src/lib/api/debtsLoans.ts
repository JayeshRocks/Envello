import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';

export type DebtLoanRow = Database['public']['Tables']['debts_loans']['Row'];
export type DebtLoanInsert = Database['public']['Tables']['debts_loans']['Insert'];

/**
 * Fetch all personal debts and loans for a user
 */
export async function fetchDebtsLoans(
  userId: string,
  includeSettled = false
): Promise<DebtLoanRow[]> {
  let query = supabase
    .from('debts_loans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!includeSettled) {
    query = query.eq('is_settled', false);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching debts and loans:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new personal debt or loan
 */
export async function createDebtLoan(
  userId: string,
  params: {
    lender_name: string;
    borrowed_amount_paise: number;
    remaining_balance_paise?: number;
    interest_rate_percent?: number;
    due_date?: string;
    notes?: string;
    initial_deposit_account_id?: string;
  }
): Promise<DebtLoanRow> {
  const {
    lender_name,
    borrowed_amount_paise,
    remaining_balance_paise,
    interest_rate_percent = 0,
    due_date,
    notes,
    initial_deposit_account_id,
  } = params;

  const currentBalance =
    remaining_balance_paise !== undefined ? remaining_balance_paise : borrowed_amount_paise;

  const { data, error } = await supabase
    .from('debts_loans')
    .insert({
      user_id: userId,
      lender_name: lender_name.trim(),
      borrowed_amount_paise,
      remaining_balance_paise: currentBalance,
      interest_rate_percent,
      due_date: due_date || null,
      notes: notes?.trim() || null,
      is_settled: currentBalance === 0,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Error creating debt / loan:', error);
    throw error;
  }

  // If the user optionally received this borrowed money into one of their accounts, record the deposit
  if (initial_deposit_account_id) {
    const { data: account } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', initial_deposit_account_id)
      .eq('user_id', userId)
      .single();

    if (account) {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: tx } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          transaction_date: todayStr,
          type: 'income',
          total_amount_paise: borrowed_amount_paise,
          description: `Loan proceeds: ${lender_name.trim()}`,
          notes: notes || `Borrowed funds received into ${account.name}`,
        })
        .select()
        .single();

      if (tx) {
        await supabase.from('transaction_entries').insert({
          transaction_id: tx.id,
          user_id: userId,
          account_id: initial_deposit_account_id,
          envelope_id: null,
          direction: 'debit',
          amount_paise: borrowed_amount_paise,
        });

        await supabase
          .from('accounts')
          .update({
            balance_paise: account.balance_paise + borrowed_amount_paise,
            updated_at: new Date().toISOString(),
          })
          .eq('id', initial_deposit_account_id)
          .eq('user_id', userId);
      }
    }
  }

  return data;
}

/**
 * Record manual payment towards a loan/debt from a liquid bank account
 * Exactly like a credit card bill settlement
 */
export async function recordLoanPayment(
  userId: string,
  params: {
    loanId: string;
    fromAccountId: string;
    amountPaise: number;
    paymentDate?: string;
    notes?: string;
  }
): Promise<void> {
  const { loanId, fromAccountId, amountPaise, paymentDate, notes } = params;
  const dateStr = paymentDate || new Date().toISOString().split('T')[0];

  const [loanRes, accRes] = await Promise.all([
    supabase.from('debts_loans').select('*').eq('id', loanId).eq('user_id', userId).single(),
    supabase.from('accounts').select('*').eq('id', fromAccountId).eq('user_id', userId).single(),
  ]);

  if (loanRes.error || !loanRes.data) throw new Error('Debt / loan record not found');
  if (accRes.error || !accRes.data) throw new Error('Payment bank account not found');

  const loan = loanRes.data;
  const account = accRes.data;

  // Invariant enforcement: payment cannot exceed remaining balance
  if (amountPaise > loan.remaining_balance_paise) {
    throw new Error(
      `Payment amount (₹${(amountPaise / 100).toFixed(2)}) cannot exceed remaining balance of ₹${(loan.remaining_balance_paise / 100).toFixed(2)}.`
    );
  }

  // 1. Insert master transaction
  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      transaction_date: dateStr,
      type: 'debt_repayment',
      total_amount_paise: amountPaise,
      description: `Debt payment: ${loan.lender_name}`,
      notes: notes || `Paid from ${account.name}`,
    })
    .select()
    .single();

  if (txError || !tx) {
    console.error('Error recording debt payment transaction:', txError);
    throw txError;
  }

  // 2. Insert transaction entry (money leaving bank account)
  await supabase.from('transaction_entries').insert({
    transaction_id: tx.id,
    user_id: userId,
    account_id: fromAccountId,
    envelope_id: null,
    direction: 'credit',
    amount_paise: amountPaise,
  });

  const newRemaining = Math.max(0, loan.remaining_balance_paise - amountPaise);
  const isSettled = newRemaining === 0;

  // 3. Atomically update account balance and loan balance
  await Promise.all([
    supabase
      .from('accounts')
      .update({
        balance_paise: account.balance_paise - amountPaise,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fromAccountId)
      .eq('user_id', userId),
    supabase
      .from('debts_loans')
      .update({
        remaining_balance_paise: newRemaining,
        is_settled: isSettled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', loanId)
      .eq('user_id', userId),
  ]);
}

/**
 * Update a debt / loan entry
 */
export async function updateDebtLoan(
  userId: string,
  loanId: string,
  updates: Partial<DebtLoanInsert>
): Promise<DebtLoanRow> {
  const { data, error } = await supabase
    .from('debts_loans')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', loanId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) {
    console.error('Error updating debt / loan:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a debt / loan entry
 */
export async function deleteDebtLoan(userId: string, loanId: string): Promise<void> {
  const { error } = await supabase
    .from('debts_loans')
    .delete()
    .eq('id', loanId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting debt / loan:', error);
    throw error;
  }
}
