import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/types/database.types';

export type CreditCardRow = Database['public']['Tables']['credit_cards']['Row'];
export type CreditCardInsert = Database['public']['Tables']['credit_cards']['Insert'];
export type CreditCardStatementRow = Database['public']['Tables']['credit_card_statements']['Row'];

export interface CreditCardWithDetails extends CreditCardRow {
  utilization_percent: number;
  utilization_status: 'safe' | 'warning' | 'danger';
}

/**
 * Fetch all active credit cards for a user
 */
export async function fetchCreditCards(userId: string): Promise<CreditCardRow[]> {
  const { data, error } = await supabase
    .from('credit_cards')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching credit cards:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new credit card
 */
export async function createCreditCard(
  userId: string,
  data: {
    card_name: string;
    issuer: string;
    credit_limit_paise: number;
    outstanding_balance_paise?: number;
    statement_day: number;
    payment_due_day: number;
    warning_threshold_percent?: number;
  }
): Promise<CreditCardRow> {
  const { data: card, error } = await supabase
    .from('credit_cards')
    .insert({
      user_id: userId,
      card_name: data.card_name,
      issuer: data.issuer,
      credit_limit_paise: data.credit_limit_paise,
      outstanding_balance_paise: data.outstanding_balance_paise ?? 0,
      statement_day: data.statement_day,
      payment_due_day: data.payment_due_day,
      warning_threshold_percent: data.warning_threshold_percent ?? 30,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating credit card:', error);
    throw error;
  }

  return card;
}

/**
 * Update an existing credit card
 */
export async function updateCreditCard(
  userId: string,
  cardId: string,
  updates: Partial<CreditCardInsert>
): Promise<CreditCardRow> {
  const { data, error } = await supabase
    .from('credit_cards')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cardId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating credit card:', error);
    throw error;
  }

  return data;
}

/**
 * Record a credit card payment from a liquid bank account.
 * Per Accounting Invariants:
 * - Bank account balance decreases (credit entry).
 * - Credit card liability decreases (debit entry).
 * - It is NOT an expense, but a debt settlement.
 */
export async function recordCreditCardPayment(
  userId: string,
  params: {
    cardId: string;
    fromAccountId: string;
    amountPaise: number;
    paymentDate?: string;
    notes?: string;
  }
): Promise<void> {
  const { cardId, fromAccountId, amountPaise, paymentDate, notes } = params;
  const dateStr = paymentDate || new Date().toISOString().split('T')[0];

  // 1. Fetch current card & account to verify balances
  const [cardRes, accountRes] = await Promise.all([
    supabase.from('credit_cards').select('*').eq('id', cardId).eq('user_id', userId).single(),
    supabase.from('accounts').select('*').eq('id', fromAccountId).eq('user_id', userId).single(),
  ]);

  if (cardRes.error || !cardRes.data) {
    throw new Error('Credit card not found');
  }
  if (accountRes.error || !accountRes.data) {
    throw new Error('Source payment account not found');
  }

  const card = cardRes.data;
  const account = accountRes.data;

  // 2. Insert master transaction
  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      transaction_date: dateStr,
      type: 'credit_card_payment',
      total_amount_paise: amountPaise,
      description: `Card payment: ${card.card_name} (${card.issuer})`,
      notes: notes || `Paid from ${account.name}`,
    })
    .select()
    .single();

  if (txError || !tx) {
    console.error('Error recording payment transaction:', txError);
    throw txError;
  }

  // 3. Insert transaction entries (source bank account credited)
  const { error: entriesError } = await supabase.from('transaction_entries').insert([
    {
      transaction_id: tx.id,
      user_id: userId,
      account_id: fromAccountId,
      envelope_id: null,
      direction: 'credit', // money leaves bank account
      amount_paise: amountPaise,
    },
  ]);

  if (entriesError) {
    console.error('Error inserting payment entries:', entriesError);
    throw entriesError;
  }

  // 4. Update balances
  const newAccountBalance = account.balance_paise - amountPaise;
  const newOutstanding = Math.max(0, card.outstanding_balance_paise - amountPaise);

  await Promise.all([
    supabase
      .from('accounts')
      .update({ balance_paise: newAccountBalance, updated_at: new Date().toISOString() })
      .eq('id', fromAccountId)
      .eq('user_id', userId),
    supabase
      .from('credit_cards')
      .update({ outstanding_balance_paise: newOutstanding, updated_at: new Date().toISOString() })
      .eq('id', cardId)
      .eq('user_id', userId),
  ]);
}
