import { supabase } from '@/lib/supabase/client';
import { calculateReconciliationDiscrepancy } from '@/lib/accounting/calculations';
import { formatINR } from '@/lib/accounting/currency';

export interface ReconcileAccountParams {
  accountId: string;
  userId: string;
  statementBalancePaise: bigint;
  statementDate: string; // YYYY-MM-DD
  reason: string;
}

export interface AccountAuditLog {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ADJUSTMENT';
  oldState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  reason: string | null;
  createdAt: string;
}

/**
 * Fetches recent audit logs for a specific account.
 */
export async function fetchAccountAuditLogs(
  accountId: string,
  userId: string
): Promise<AccountAuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, action, old_state, new_state, reason, created_at')
    .eq('user_id', userId)
    .eq('entity_name', 'accounts')
    .eq('entity_id', accountId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Failed to fetch account audit logs:', error);
    throw new Error(`Audit log fetch failed: ${error.message}`);
  }

  return (data || []).map(row => ({
    id: row.id,
    action: row.action,
    oldState: row.old_state as Record<string, unknown> | null,
    newState: row.new_state as Record<string, unknown> | null,
    reason: row.reason,
    createdAt: row.created_at,
  }));
}

/**
 * Reconciles an account balance against a bank statement closing balance.
 * Implements ACCOUNTING_RULES.md (Rule 7):
 * - If discrepancy == 0: records audit log confirming verified match.
 * - If discrepancy != 0: creates an audited adjustment transaction + ledger entry,
 *   updates account balance deterministically, and logs before/after states with user reason.
 */
export async function reconcileAccount(
  params: ReconcileAccountParams
): Promise<{ discrepancyPaise: bigint; adjustmentTransactionId?: string }> {
  // 1. Fetch current authoritative account record
  const { data: account, error: accError } = await supabase
    .from('accounts')
    .select('id, balance_paise, name')
    .eq('id', params.accountId)
    .eq('user_id', params.userId)
    .single();

  if (accError || !account) {
    throw new Error(`Account fetch failed: ${accError?.message || 'Account not found'}`);
  }

  const currentLedgerPaise = BigInt(account.balance_paise);
  const result = calculateReconciliationDiscrepancy(params.statementBalancePaise, currentLedgerPaise);

  // Case A: Perfect match (₹0 discrepancy)
  if (result.status === 'matched') {
    const { error: auditErr } = await supabase.from('audit_logs').insert({
      user_id: params.userId,
      entity_name: 'accounts',
      entity_id: params.accountId,
      action: 'ADJUSTMENT',
      old_state: { balance_paise: account.balance_paise },
      new_state: { balance_paise: Number(params.statementBalancePaise), discrepancy_paise: 0 },
      reason: params.reason ? `Reconciliation: ${params.reason}` : 'Bank statement reconciliation (Exact Match)',
    });

    if (auditErr) {
      console.warn('Failed to insert match audit log:', auditErr.message);
    }

    return { discrepancyPaise: 0n };
  }

  // Case B: Discrepancy exists (Surplus or Deficit)
  const discrepancyAmountPaise = Number(result.adjustmentAmountPaise);

  // 1. Insert master adjustment transaction
  const formattedDiff = `${result.status === 'surplus' ? '+' : '-'}${formatINR(result.adjustmentAmountPaise)}`;
  const { data: tx, error: txErr } = await supabase
    .from('transactions')
    .insert({
      user_id: params.userId,
      transaction_date: params.statementDate,
      type: 'adjustment',
      total_amount_paise: discrepancyAmountPaise,
      description: `Reconciliation Adjustment (${formattedDiff}): ${params.reason.trim()}`,
      notes: `Reconciled against bank statement. Statement balance: ${formatINR(params.statementBalancePaise)}. Previous ledger: ${formatINR(currentLedgerPaise)}.`,
    })
    .select('id')
    .single();

  if (txErr || !tx) {
    throw new Error(`Failed to record reconciliation adjustment transaction: ${txErr?.message}`);
  }

  // 2. Insert transaction entry for double-entry tracking
  // Surplus: credit entry (increases account balance)
  // Deficit: debit entry (decreases account balance)
  const { error: entryErr } = await supabase.from('transaction_entries').insert({
    transaction_id: tx.id,
    user_id: params.userId,
    account_id: params.accountId,
    direction: result.adjustmentType === 'credit' ? 'credit' : 'debit',
    amount_paise: discrepancyAmountPaise,
  });

  if (entryErr) {
    console.error('Failed to record reconciliation entry:', entryErr);
  }

  // 3. Update account balance to match statement closing balance
  const { error: updateErr } = await supabase
    .from('accounts')
    .update({
      balance_paise: Number(params.statementBalancePaise),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.accountId)
    .eq('user_id', params.userId);

  if (updateErr) {
    throw new Error(`Failed to update account balance during reconciliation: ${updateErr.message}`);
  }

  // 4. Record audit log with old state, new state, discrepancy and reason
  const { error: logErr } = await supabase.from('audit_logs').insert({
    user_id: params.userId,
    entity_name: 'accounts',
    entity_id: params.accountId,
    action: 'ADJUSTMENT',
    old_state: { balance_paise: account.balance_paise },
    new_state: {
      balance_paise: Number(params.statementBalancePaise),
      discrepancy_paise: Number(result.discrepancyPaise),
      adjustment_type: result.adjustmentType,
      transaction_id: tx.id,
    },
    reason: params.reason.trim(),
  });

  if (logErr) {
    console.warn('Failed to insert adjustment audit log:', logErr.message);
  }

  return {
    discrepancyPaise: result.discrepancyPaise,
    adjustmentTransactionId: tx.id,
  };
}
