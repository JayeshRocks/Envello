import { supabase } from '@/lib/supabase/client';
import { getOrCreateBudgetPeriod } from './envelopes';

export interface TransactionEntryRecord {
  id: string;
  accountId: string | null;
  envelopeId: string | null;
  accountName?: string;
  envelopeName?: string;
  direction: 'credit' | 'debit';
  amountPaise: bigint;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  transactionDate: string;
  type:
    | 'income'
    | 'expense'
    | 'transfer'
    | 'envelope_allocation'
    | 'credit_card_purchase'
    | 'credit_card_payment'
    | 'fd_movement'
    | 'self_emi_repayment'
    | 'debt_repayment'
    | 'refund'
    | 'adjustment';
  totalAmountPaise: bigint;
  description: string;
  notes: string | null;
  createdAt: string;
  entries: TransactionEntryRecord[];
}

/**
 * Records an Expense transaction:
 * - Inserts master transaction (type: 'expense')
 * - Inserts debit entry for envelope & credit entry for bank account
 * - Debits liquid account balance
 * - Increments envelope spent_paise for the corresponding budget period
 */
export async function recordExpenseTransaction(
  userId: string,
  params: {
    accountId: string;
    envelopeId: string;
    amountPaise: bigint;
    payee: string;
    date: string; // YYYY-MM-DD
    notes?: string;
  }
): Promise<string> {
  if (params.amountPaise <= 0n) {
    throw new Error('Expense amount must be greater than zero.');
  }

  const numAmount = Number(params.amountPaise);

  // 1. Insert master transaction
  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      transaction_date: params.date,
      type: 'expense',
      total_amount_paise: numAmount,
      description: params.payee.trim(),
      notes: params.notes?.trim() || null,
    })
    .select('id')
    .single();

  if (txError || !tx) {
    console.error('[Envello Transactions API] Error inserting transaction:', txError?.message);
    throw txError || new Error('Transaction creation failed.');
  }

  // 2. Insert transaction entries (Debit envelope, Credit account)
  const entries = [
    {
      transaction_id: tx.id,
      user_id: userId,
      envelope_id: params.envelopeId,
      account_id: null,
      direction: 'debit' as const,
      amount_paise: numAmount,
    },
    {
      transaction_id: tx.id,
      user_id: userId,
      account_id: params.accountId,
      envelope_id: null,
      direction: 'credit' as const,
      amount_paise: numAmount,
    },
  ];

  const { error: entriesError } = await supabase.from('transaction_entries').insert(entries);
  if (entriesError) {
    console.error('[Envello Transactions API] Error inserting entries:', entriesError.message);
    throw entriesError;
  }

  // 3. Deduct cash from account
  const { data: accData } = await supabase
    .from('accounts')
    .select('balance_paise')
    .eq('id', params.accountId)
    .single();

  const currentBalance = accData?.balance_paise ?? 0;
  await supabase
    .from('accounts')
    .update({
      balance_paise: currentBalance - numAmount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.accountId);

  // 4. Increment envelope spent_paise for the budget period
  const periodKey = params.date.slice(0, 7); // YYYY-MM
  const periodId = await getOrCreateBudgetPeriod(userId, periodKey);

  const { data: allocData } = await supabase
    .from('envelope_allocations')
    .select('id, spent_paise')
    .eq('envelope_id', params.envelopeId)
    .eq('period_id', periodId)
    .maybeSingle();

  if (allocData?.id) {
    await supabase
      .from('envelope_allocations')
      .update({
        spent_paise: (allocData.spent_paise || 0) + numAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', allocData.id);
  } else {
    await supabase.from('envelope_allocations').insert({
      envelope_id: params.envelopeId,
      period_id: periodId,
      user_id: userId,
      allocated_paise: 0,
      carried_over_paise: 0,
      spent_paise: numAmount,
    });
  }

  return tx.id;
}

/**
 * Records an Income transaction:
 * - Inserts master transaction (type: 'income')
 * - Inserts debit entry for bank account
 * - Credits liquid account balance
 */
export async function recordIncomeTransaction(
  userId: string,
  params: {
    accountId: string;
    amountPaise: bigint;
    source: string;
    date: string; // YYYY-MM-DD
    notes?: string;
  }
): Promise<string> {
  if (params.amountPaise <= 0n) {
    throw new Error('Income amount must be greater than zero.');
  }

  const numAmount = Number(params.amountPaise);

  // 1. Insert master transaction
  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      transaction_date: params.date,
      type: 'income',
      total_amount_paise: numAmount,
      description: params.source.trim(),
      notes: params.notes?.trim() || null,
    })
    .select('id')
    .single();

  if (txError || !tx) {
    console.error('[Envello Transactions API] Error inserting income transaction:', txError?.message);
    throw txError || new Error('Income transaction creation failed.');
  }

  // 2. Insert debit entry for the receiving account
  const { error: entryError } = await supabase.from('transaction_entries').insert({
    transaction_id: tx.id,
    user_id: userId,
    account_id: params.accountId,
    envelope_id: null,
    direction: 'debit',
    amount_paise: numAmount,
  });

  if (entryError) {
    console.error('[Envello Transactions API] Error inserting income entry:', entryError.message);
    throw entryError;
  }

  // 3. Increment liquid account balance
  const { data: accData } = await supabase
    .from('accounts')
    .select('balance_paise')
    .eq('id', params.accountId)
    .single();

  const currentBalance = accData?.balance_paise ?? 0;
  await supabase
    .from('accounts')
    .update({
      balance_paise: currentBalance + numAmount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.accountId);

  return tx.id;
}

/**
 * Records an Account-to-Account Transfer:
 * - Source Account -Amount, Destination Account +Amount
 * - Net cash impact is zero. Net consumption is zero.
 */
export async function recordAccountTransfer(
  userId: string,
  params: {
    fromAccountId: string;
    toAccountId: string;
    amountPaise: bigint;
    description: string;
    date: string; // YYYY-MM-DD
  }
): Promise<string> {
  if (params.fromAccountId === params.toAccountId) {
    throw new Error('Source and destination accounts must be different.');
  }
  if (params.amountPaise <= 0n) {
    throw new Error('Transfer amount must be greater than zero.');
  }

  const numAmount = Number(params.amountPaise);

  // 1. Insert master transaction
  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      transaction_date: params.date,
      type: 'transfer',
      total_amount_paise: numAmount,
      description: params.description.trim() || 'Internal Account Transfer',
    })
    .select('id')
    .single();

  if (txError || !tx) {
    console.error('[Envello Transactions API] Error creating transfer transaction:', txError?.message);
    throw txError || new Error('Transfer transaction creation failed.');
  }

  // 2. Insert debit & credit legs
  const entries = [
    {
      transaction_id: tx.id,
      user_id: userId,
      account_id: params.fromAccountId,
      envelope_id: null,
      direction: 'credit' as const, // Money leaving source
      amount_paise: numAmount,
    },
    {
      transaction_id: tx.id,
      user_id: userId,
      account_id: params.toAccountId,
      envelope_id: null,
      direction: 'debit' as const, // Money entering destination
      amount_paise: numAmount,
    },
  ];

  await supabase.from('transaction_entries').insert(entries);

  // 3. Update balances
  const { data: fromAcc } = await supabase
    .from('accounts')
    .select('balance_paise')
    .eq('id', params.fromAccountId)
    .single();

  const { data: toAcc } = await supabase
    .from('accounts')
    .select('balance_paise')
    .eq('id', params.toAccountId)
    .single();

  if (fromAcc) {
    await supabase
      .from('accounts')
      .update({
        balance_paise: (fromAcc.balance_paise || 0) - numAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.fromAccountId);
  }

  if (toAcc) {
    await supabase
      .from('accounts')
      .update({
        balance_paise: (toAcc.balance_paise || 0) + numAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.toAccountId);
  }

  return tx.id;
}

/**
 * Fetches recent transactions for a user with joined entries, accounts, and envelopes.
 */
export async function fetchTransactions(
  userId: string,
  options?: {
    type?: string;
    limit?: number;
    search?: string;
  }
): Promise<TransactionRecord[]> {
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(options?.limit ?? 50);

  if (options?.type && options.type !== 'all') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = query.eq('type', options.type as any);
  }

  if (options?.search) {
    query = query.ilike('description', `%${options.search}%`);
  }

  const { data: txList, error: txError } = await query;
  if (txError) {
    console.error('[Envello Transactions API] Error fetching transactions:', txError.message);
    throw txError;
  }

  if (!txList || txList.length === 0) {
    return [];
  }

  const txIds = txList.map((t) => t.id);

  // Fetch entries for these transactions
  const { data: entriesData, error: entriesError } = await supabase
    .from('transaction_entries')
    .select('*')
    .in('transaction_id', txIds);

  if (entriesError) {
    console.error('[Envello Transactions API] Error fetching transaction entries:', entriesError.message);
  }

  // Fetch accounts and envelopes to map names
  const [accountsRes, envelopesRes] = await Promise.all([
    supabase.from('accounts').select('id, name').eq('user_id', userId),
    supabase.from('envelopes').select('id, name').eq('user_id', userId),
  ]);

  const accountMap = new Map<string, string>();
  for (const acc of accountsRes.data || []) {
    accountMap.set(acc.id, acc.name);
  }

  const envelopeMap = new Map<string, string>();
  for (const env of envelopesRes.data || []) {
    envelopeMap.set(env.id, env.name);
  }

  const entriesByTxId = new Map<string, TransactionEntryRecord[]>();
  for (const entry of entriesData || []) {
    const list = entriesByTxId.get(entry.transaction_id) || [];
    list.push({
      id: entry.id,
      accountId: entry.account_id,
      envelopeId: entry.envelope_id,
      accountName: entry.account_id ? accountMap.get(entry.account_id) : undefined,
      envelopeName: entry.envelope_id ? envelopeMap.get(entry.envelope_id) : undefined,
      direction: entry.direction,
      amountPaise: BigInt(entry.amount_paise),
    });
    entriesByTxId.set(entry.transaction_id, list);
  }

  return txList.map((tx) => ({
    id: tx.id,
    userId: tx.user_id,
    transactionDate: tx.transaction_date,
    type: tx.type,
    totalAmountPaise: BigInt(tx.total_amount_paise),
    description: tx.description,
    notes: tx.notes,
    createdAt: tx.created_at,
    entries: entriesByTxId.get(tx.id) || [],
  }));
}
