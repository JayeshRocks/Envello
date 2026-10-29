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

export type TransactionWithEntries = TransactionRecord;

export interface RecordExpenseParams {
  accountId?: string | null;
  cardId?: string | null;
  envelopeId?: string | null;
  amountPaise: bigint;
  payee: string;
  date: string; // YYYY-MM-DD
  notes?: string;
}

/**
 * Records an Expense or Credit Card Purchase transaction:
 * - If paid via Card (cardId):
 *   - Inserts master transaction (type: 'credit_card_purchase')
 *   - Increments credit_cards.outstanding_balance_paise
 *   - If envelopeId provided: increments envelope spent_paise and logs debit entry
 *   - If envelopeId is null/'none': direct card purchase without envelope deduction
 * - If paid via Account (accountId):
 *   - Inserts master transaction (type: 'expense')
 *   - Debits liquid account balance
 *   - If envelopeId provided: increments envelope spent_paise and logs debit entry
 *   - If envelopeId is null/'none': direct account expense without envelope deduction
 */
export async function recordExpenseTransaction(
  userId: string,
  params: RecordExpenseParams
): Promise<string> {
  if (params.amountPaise <= 0n) {
    throw new Error('Expense amount must be greater than zero.');
  }

  const isCard = Boolean(params.cardId);
  if (!isCard && !params.accountId) {
    throw new Error('Please select a payment account or credit card.');
  }

  const numAmount = Number(params.amountPaise);
  const hasEnvelope = Boolean(params.envelopeId && params.envelopeId !== 'none');

  if (isCard) {
    // 1. Credit Card Purchase
    const { data: cardData, error: cardError } = await supabase
      .from('credit_cards')
      .select('id, card_name, issuer, outstanding_balance_paise')
      .eq('id', params.cardId!)
      .eq('user_id', userId)
      .single();

    if (cardError || !cardData) {
      throw new Error('Selected credit card not found.');
    }

    const userNotes = params.notes?.trim() || '';
    const systemNotes = `[card:${cardData.id}] Paid via ${cardData.card_name}${userNotes ? ` • ${userNotes}` : ''}`;

    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        transaction_date: params.date,
        type: 'credit_card_purchase',
        total_amount_paise: numAmount,
        description: params.payee.trim(),
        notes: systemNotes,
      })
      .select('id')
      .single();

    if (txError || !tx) {
      console.error('[Envello Transactions API] Error inserting card purchase:', txError?.message);
      throw txError || new Error('Transaction creation failed.');
    }

    // Increment card outstanding balance
    const currentOutstanding = cardData.outstanding_balance_paise || 0;
    await supabase
      .from('credit_cards')
      .update({
        outstanding_balance_paise: currentOutstanding + numAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cardData.id)
      .eq('user_id', userId);

    // Entries:
    const entries: {
      transaction_id: string;
      user_id: string;
      account_id: string | null;
      envelope_id: string | null;
      direction: 'debit' | 'credit';
      amount_paise: number;
    }[] = [];

    if (hasEnvelope) {
      entries.push({
        transaction_id: tx.id,
        user_id: userId,
        account_id: null,
        envelope_id: params.envelopeId!,
        direction: 'debit',
        amount_paise: numAmount,
      });

      const periodKey = params.date.slice(0, 7);
      const periodId = await getOrCreateBudgetPeriod(userId, periodKey);

      const { data: allocData } = await supabase
        .from('envelope_allocations')
        .select('id, spent_paise')
        .eq('envelope_id', params.envelopeId!)
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
          envelope_id: params.envelopeId!,
          period_id: periodId,
          user_id: userId,
          allocated_paise: 0,
          carried_over_paise: 0,
          spent_paise: numAmount,
        });
      }
    } else {
      // Direct card purchase without envelope
      entries.push({
        transaction_id: tx.id,
        user_id: userId,
        account_id: null,
        envelope_id: null,
        direction: 'debit',
        amount_paise: numAmount,
      });
    }

    const { error: entriesError } = await supabase.from('transaction_entries').insert(entries);
    if (entriesError) {
      console.error('[Envello Transactions API] Error inserting card entries:', entriesError.message);
    }

    return tx.id;
  } else {
    // 2. Bank Account / Cash Expense
    const { data: accData, error: accError } = await supabase
      .from('accounts')
      .select('balance_paise')
      .eq('id', params.accountId!)
      .eq('user_id', userId)
      .single();

    if (accError || !accData) {
      throw new Error('Selected payment account not found.');
    }

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

    // Deduct cash from account
    const currentBalance = accData.balance_paise ?? 0;
    await supabase
      .from('accounts')
      .update({
        balance_paise: currentBalance - numAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.accountId!)
      .eq('user_id', userId);

    const entries: {
      transaction_id: string;
      user_id: string;
      account_id: string | null;
      envelope_id: string | null;
      direction: 'debit' | 'credit';
      amount_paise: number;
    }[] = [
      {
        transaction_id: tx.id,
        user_id: userId,
        account_id: params.accountId!,
        envelope_id: null,
        direction: 'credit',
        amount_paise: numAmount,
      },
    ];

    if (hasEnvelope) {
      entries.push({
        transaction_id: tx.id,
        user_id: userId,
        account_id: null,
        envelope_id: params.envelopeId!,
        direction: 'debit',
        amount_paise: numAmount,
      });

      const periodKey = params.date.slice(0, 7);
      const periodId = await getOrCreateBudgetPeriod(userId, periodKey);

      const { data: allocData } = await supabase
        .from('envelope_allocations')
        .select('id, spent_paise')
        .eq('envelope_id', params.envelopeId!)
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
          envelope_id: params.envelopeId!,
          period_id: periodId,
          user_id: userId,
          allocated_paise: 0,
          carried_over_paise: 0,
          spent_paise: numAmount,
        });
      }
    }

    const { error: entriesError } = await supabase.from('transaction_entries').insert(entries);
    if (entriesError) {
      console.error('[Envello Transactions API] Error inserting entries:', entriesError.message);
      throw entriesError;
    }

    return tx.id;
  }
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

/**
 * Reverses and deletes a transaction and its associated ledger entries:
 * 1. Reverses account balances:
 *    - Credit entry reversed: adds money back to account
 *    - Debit entry reversed: subtracts money from account
 * 2. Reverses envelope spent_paise if an envelope allocation was charged
 * 3. Deletes transaction_entries and transaction
 */
export async function deleteTransaction(transactionId: string, userId: string): Promise<void> {
  // 1. Fetch transaction record
  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .eq('user_id', userId)
    .single();

  if (txError || !tx) {
    throw new Error('Transaction not found or unauthorized.');
  }

  // 2. Fetch all entries
  const { data: entries, error: entriesError } = await supabase
    .from('transaction_entries')
    .select('*')
    .eq('transaction_id', transactionId)
    .eq('user_id', userId);

  if (entriesError) {
    throw new Error('Failed to fetch entries for transaction deletion.');
  }

  // 3. Reverse account entries
  for (const entry of entries || []) {
    if (entry.account_id) {
      const { data: acc } = await supabase
        .from('accounts')
        .select('balance_paise')
        .eq('id', entry.account_id)
        .eq('user_id', userId)
        .single();

      if (acc) {
        // If entry was credit (money went out), reverse adds it back
        // If entry was debit (money went in), reverse deducts it
        const adjustment = entry.direction === 'credit' ? entry.amount_paise : -entry.amount_paise;
        const newBalance = acc.balance_paise + adjustment;

        await supabase
          .from('accounts')
          .update({
            balance_paise: newBalance,
            updated_at: new Date().toISOString(),
          })
          .eq('id', entry.account_id)
          .eq('user_id', userId);
      }
    }

    // Reversal for credit card purchases if card was charged
    if (tx.type === 'credit_card_purchase') {
      const cardMatch = tx.notes?.match(/\[card:([a-f0-9-]+)\]/);
      if (cardMatch && cardMatch[1]) {
        const cardId = cardMatch[1];
        const { data: card } = await supabase
          .from('credit_cards')
          .select('outstanding_balance_paise')
          .eq('id', cardId)
          .eq('user_id', userId)
          .single();

        if (card) {
          const newOutstanding = Math.max(0, card.outstanding_balance_paise - tx.total_amount_paise);
          await supabase
            .from('credit_cards')
            .update({
              outstanding_balance_paise: newOutstanding,
              updated_at: new Date().toISOString(),
            })
            .eq('id', cardId)
            .eq('user_id', userId);
        }
      }
    }

    // 4. Reverse envelope spent_paise if this entry was debit on an envelope
    if (entry.envelope_id && entry.direction === 'debit') {
      const yearMonth = tx.transaction_date.substring(0, 7);
      const periodId = await getOrCreateBudgetPeriod(userId, yearMonth);

      const { data: alloc } = await supabase
        .from('envelope_allocations')
        .select('*')
        .eq('user_id', userId)
        .eq('envelope_id', entry.envelope_id)
        .eq('period_id', periodId)
        .maybeSingle();

      if (alloc) {
        const newSpent = Math.max(0, alloc.spent_paise - entry.amount_paise);
        await supabase
          .from('envelope_allocations')
          .update({
            spent_paise: newSpent,
            updated_at: new Date().toISOString(),
          })
          .eq('id', alloc.id);
      }
    }
  }

  // 5. Delete entries first (cascade or explicit)
  await supabase
    .from('transaction_entries')
    .delete()
    .eq('transaction_id', transactionId)
    .eq('user_id', userId);

  // 6. Delete transaction record
  const { error: delError } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId)
    .eq('user_id', userId);

  if (delError) {
    console.error('[Envello Transactions API] Error deleting transaction:', delError.message);
    throw delError;
  }
}
