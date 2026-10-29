import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';

export type ActualDebtRow = Database['public']['Tables']['actual_debts']['Row'];
export type ActualDebtInsert = Database['public']['Tables']['actual_debts']['Insert'];

/**
 * Fetch all external actual debts for a user
 */
export async function fetchActualDebts(
  userId: string,
  includeSettled = false
): Promise<ActualDebtRow[]> {
  let query = supabase
    .from('actual_debts')
    .select('*')
    .eq('user_id', userId)
    .order('due_date', { ascending: true });

  if (!includeSettled) {
    query = query.eq('is_settled', false);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching actual debts:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new external debt entry
 */
export async function createActualDebt(
  userId: string,
  params: {
    lender_name: string;
    initial_debt_paise: number;
    monthly_instalment_paise: number;
    due_date?: string;
  }
): Promise<ActualDebtRow> {
  const { lender_name, initial_debt_paise, monthly_instalment_paise, due_date } = params;

  const { data, error } = await supabase
    .from('actual_debts')
    .insert({
      user_id: userId,
      lender_name,
      initial_debt_paise,
      remaining_debt_paise: initial_debt_paise,
      monthly_instalment_paise,
      due_date: due_date || null,
      is_settled: false,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Error creating actual debt:', error);
    throw error;
  }

  return data;
}

/**
 * Record payment towards an actual debt from a liquid bank account
 */
export async function recordDebtPayment(
  userId: string,
  params: {
    debtId: string;
    fromAccountId: string;
    amountPaise: number;
    paymentDate?: string;
    notes?: string;
  }
): Promise<void> {
  const { debtId, fromAccountId, amountPaise, paymentDate, notes } = params;
  const dateStr = paymentDate || new Date().toISOString().split('T')[0];

  const [debtRes, accRes] = await Promise.all([
    supabase.from('actual_debts').select('*').eq('id', debtId).eq('user_id', userId).single(),
    supabase.from('accounts').select('*').eq('id', fromAccountId).eq('user_id', userId).single(),
  ]);

  if (debtRes.error || !debtRes.data) throw new Error('Debt record not found');
  if (accRes.error || !accRes.data) throw new Error('Payment account not found');

  const debt = debtRes.data;
  const account = accRes.data;

  // Invariant enforcement: payment cannot exceed remaining debt liability
  if (amountPaise > debt.remaining_debt_paise) {
    throw new Error(
      `Payment amount (₹${(amountPaise / 100).toFixed(2)}) cannot exceed remaining debt of ₹${(debt.remaining_debt_paise / 100).toFixed(2)}.`
    );
  }

  // Insert master transaction
  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      transaction_date: dateStr,
      type: 'debt_repayment',
      total_amount_paise: amountPaise,
      description: `Debt repayment: ${debt.lender_name}`,
      notes: notes || `Paid from ${account.name}`,
    })
    .select()
    .single();

  if (txError || !tx) {
    console.error('Error recording debt payment transaction:', txError);
    throw txError;
  }

  // Insert transaction entry (money leaving bank account)
  await supabase.from('transaction_entries').insert({
    transaction_id: tx.id,
    user_id: userId,
    account_id: fromAccountId,
    envelope_id: null,
    direction: 'credit',
    amount_paise: amountPaise,
  });

  const newRemaining = Math.max(0, debt.remaining_debt_paise - amountPaise);
  const isSettled = newRemaining === 0;

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
      .from('actual_debts')
      .update({
        remaining_debt_paise: newRemaining,
        is_settled: isSettled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', debtId)
      .eq('user_id', userId),
  ]);
}

/**
 * Update an actual debt entry
 */
export async function updateActualDebt(
  userId: string,
  debtId: string,
  updates: Partial<ActualDebtInsert>
): Promise<ActualDebtRow> {
  const { data, error } = await supabase
    .from('actual_debts')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', debtId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) {
    console.error('Error updating actual debt:', error);
    throw error;
  }

  return data;
}

/**
 * Delete an actual debt entry
 */
export async function deleteActualDebt(userId: string, debtId: string): Promise<void> {
  const { error } = await supabase
    .from('actual_debts')
    .delete()
    .eq('id', debtId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting actual debt:', error);
    throw error;
  }
}

