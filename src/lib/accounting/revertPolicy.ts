import type { TransactionRecord } from '@/lib/api/transactions';
import type { EnvelopeWithAllocation } from '@/types/accounting.types';
import { formatINR } from './currency';

export interface ReversionEligibility {
  isReversible: boolean;
  reason?: string;
  isMonthEndGracePeriod?: boolean;
}

export interface RevertImpactItem {
  targetType: 'account' | 'envelope' | 'card' | 'loan';
  targetName: string;
  action: 'credit' | 'debit';
  amountPaise: bigint;
  description: string;
  isRefund: boolean;
}

export interface RevertAnalysis {
  eligibility: ReversionEligibility;
  impacts: RevertImpactItem[];
  canSafelyRevert: boolean;
  blockingReason?: string;
}

/**
 * Checks whether a transaction is eligible for deletion/reversion.
 * Policy:
 * 1. Transactions in the current active month (based on referenceDate) are always reversible.
 * 2. Transactions in the last 3 days of the preceding month are reversible if referenceDate
 *    is within the first 3 days of the new month (or within 72 hours of transaction date).
 * 3. Older historical transactions from closed months are locked to maintain deterministic ledger integrity.
 */
export function checkReversionEligibility(
  transactionDateStr: string,
  referenceDate: Date = new Date()
): ReversionEligibility {
  if (!transactionDateStr || transactionDateStr.length < 10) {
    return { isReversible: false, reason: 'Invalid transaction date.' };
  }

  const txYear = parseInt(transactionDateStr.substring(0, 4), 10);
  const txMonth = parseInt(transactionDateStr.substring(5, 7), 10) - 1; // 0-based
  const txDay = parseInt(transactionDateStr.substring(8, 10), 10);

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDay = referenceDate.getDate();

  // 1. Current calendar month transactions are always reversible
  if (txYear === refYear && txMonth === refMonth) {
    return { isReversible: true, isMonthEndGracePeriod: false };
  }

  // 2. Month-end grace period check for immediately preceding month
  const txMonthIndex = txYear * 12 + txMonth;
  const refMonthIndex = refYear * 12 + refMonth;

  if (refMonthIndex - txMonthIndex === 1) {
    // Determine number of days in the preceding month
    const daysInPrecedingMonth = new Date(txYear, txMonth + 1, 0).getDate();
    const isTxInLast3Days = txDay >= daysInPrecedingMonth - 2;

    const txTime = new Date(txYear, txMonth, txDay).getTime();
    const refTime = new Date(refYear, refMonth, refDay).getTime();
    const diffDays = (refTime - txTime) / (1000 * 60 * 60 * 24);

    if (isTxInLast3Days && (refDay <= 3 || diffDays <= 3)) {
      return { isReversible: true, isMonthEndGracePeriod: true };
    }
  }

  return {
    isReversible: false,
    reason: 'Historical transaction from a closed month (reversion window elapsed).',
  };
}

/**
 * Previews all financial impacts of reverting a transaction and validates that
 * the reversion will not produce negative envelope balances.
 */
export function analyzeTransactionReversion(
  tx: TransactionRecord,
  currentEnvelopes: EnvelopeWithAllocation[] = [],
  referenceDate: Date = new Date()
): RevertAnalysis {
  const eligibility = checkReversionEligibility(tx.transactionDate, referenceDate);
  const impacts: RevertImpactItem[] = [];
  let canSafelyRevert = eligibility.isReversible;
  let blockingReason = eligibility.reason;

  const envMap = new Map<string, EnvelopeWithAllocation>();
  for (const env of currentEnvelopes) {
    envMap.set(env.id, env);
  }

  switch (tx.type) {
    case 'expense': {
      // 1. Account entry (money leaves account): Reversion credits account back
      const accEntry = tx.entries.find((e) => e.accountId);
      if (accEntry) {
        impacts.push({
          targetType: 'account',
          targetName: accEntry.accountName || 'Bank Account',
          action: 'credit',
          amountPaise: accEntry.amountPaise,
          description: `${formatINR(accEntry.amountPaise)} will be refunded back to spendable cash.`,
          isRefund: true,
        });
      }

      // 2. Envelope entry (money was debited from envelope): Reversion credits envelope (reduces spent)
      const envEntry = tx.entries.find((e) => e.envelopeId);
      if (envEntry) {
        impacts.push({
          targetType: 'envelope',
          targetName: envEntry.envelopeName || 'Envelope',
          action: 'credit',
          amountPaise: envEntry.amountPaise,
          description: `${formatINR(envEntry.amountPaise)} will be refunded back into available budget (spent decreases).`,
          isRefund: true,
        });
      }
      break;
    }

    case 'credit_card_purchase': {
      // 1. Credit card balance: Reversion decreases outstanding debt
      impacts.push({
        targetType: 'card',
        targetName: 'Credit Card',
        action: 'credit',
        amountPaise: tx.totalAmountPaise,
        description: `${formatINR(tx.totalAmountPaise)} will be deducted from your unsettled credit card balance.`,
        isRefund: true,
      });

      // 2. Envelope entry (if assigned): Reversion credits envelope back
      const envEntry = tx.entries.find((e) => e.envelopeId);
      if (envEntry) {
        impacts.push({
          targetType: 'envelope',
          targetName: envEntry.envelopeName || 'Envelope',
          action: 'credit',
          amountPaise: envEntry.amountPaise,
          description: `${formatINR(envEntry.amountPaise)} will be refunded back into available budget (spent decreases).`,
          isRefund: true,
        });
      }
      break;
    }

    case 'income': {
      // 1. Account entry: Reversion debits account
      const accEntry = tx.entries.find((e) => e.accountId);
      if (accEntry) {
        impacts.push({
          targetType: 'account',
          targetName: accEntry.accountName || 'Bank Account',
          action: 'debit',
          amountPaise: accEntry.amountPaise,
          description: `${formatINR(accEntry.amountPaise)} will be deducted from account balance.`,
          isRefund: false,
        });
      }

      // 2. Envelope entry: Reversion unallocates from envelope
      const envEntry = tx.entries.find((e) => e.envelopeId);
      if (envEntry && envEntry.envelopeId) {
        const liveEnv = envMap.get(envEntry.envelopeId);
        if (liveEnv) {
          // Guard: Verify envelope has enough unspent budget to surrender this allocation
          const safeCapacity = liveEnv.allocatedPaise + liveEnv.carriedOverPaise - liveEnv.spentPaise;
          if (envEntry.amountPaise > safeCapacity) {
            canSafelyRevert = false;
            blockingReason = `Cannot revert income: ${formatINR(envEntry.amountPaise)} was assigned to "${liveEnv.name}", but only ${formatINR(safeCapacity)} remains unspent. Reverting would force this envelope into a negative balance.`;
          }
        }

        impacts.push({
          targetType: 'envelope',
          targetName: envEntry.envelopeName || 'Envelope',
          action: 'debit',
          amountPaise: envEntry.amountPaise,
          description: `${formatINR(envEntry.amountPaise)} will be unallocated from monthly envelope budget.`,
          isRefund: false,
        });
      }
      break;
    }

    case 'envelope_allocation': {
      // Double-entry transfer between envelopes: credit on source, debit on destination
      const fromEntry = tx.entries.find((e) => e.direction === 'credit' && e.envelopeId);
      const toEntry = tx.entries.find((e) => e.direction === 'debit' && e.envelopeId);

      if (fromEntry) {
        impacts.push({
          targetType: 'envelope',
          targetName: fromEntry.envelopeName || 'Source Envelope',
          action: 'credit',
          amountPaise: fromEntry.amountPaise,
          description: `${formatINR(fromEntry.amountPaise)} budget allowance will be restored back to source.`,
          isRefund: true,
        });
      }

      if (toEntry && toEntry.envelopeId) {
        const toEnv = envMap.get(toEntry.envelopeId);
        if (toEnv) {
          const safeCapacity = toEnv.allocatedPaise + toEnv.carriedOverPaise - toEnv.spentPaise;
          if (toEntry.amountPaise > safeCapacity) {
            canSafelyRevert = false;
            blockingReason = `Cannot revert reallocation: Destination envelope "${toEnv.name}" has already spent these funds (${formatINR(toEnv.spentPaise)} spent). Deducting ${formatINR(toEntry.amountPaise)} would cause a negative balance.`;
          }
        }

        impacts.push({
          targetType: 'envelope',
          targetName: toEntry.envelopeName || 'Destination Envelope',
          action: 'debit',
          amountPaise: toEntry.amountPaise,
          description: `${formatINR(toEntry.amountPaise)} transferred budget allowance will be removed.`,
          isRefund: false,
        });
      }
      break;
    }

    case 'credit_card_payment': {
      // Bank account gets refund, card outstanding gets restored
      const accEntry = tx.entries.find((e) => e.accountId);
      if (accEntry) {
        impacts.push({
          targetType: 'account',
          targetName: accEntry.accountName || 'Bank Account',
          action: 'credit',
          amountPaise: accEntry.amountPaise,
          description: `${formatINR(accEntry.amountPaise)} will be restored back into your bank account.`,
          isRefund: true,
        });
      }
      impacts.push({
        targetType: 'card',
        targetName: 'Credit Card',
        action: 'debit',
        amountPaise: tx.totalAmountPaise,
        description: `${formatINR(tx.totalAmountPaise)} will be added back to your credit card unsettled debt.`,
        isRefund: false,
      });
      break;
    }

    case 'debt_repayment': {
      const accEntry = tx.entries.find((e) => e.accountId);
      if (accEntry) {
        impacts.push({
          targetType: 'account',
          targetName: accEntry.accountName || 'Bank Account',
          action: 'credit',
          amountPaise: accEntry.amountPaise,
          description: `${formatINR(accEntry.amountPaise)} will be restored back into your bank account.`,
          isRefund: true,
        });
      }
      impacts.push({
        targetType: 'loan',
        targetName: 'Debt / Loan',
        action: 'debit',
        amountPaise: tx.totalAmountPaise,
        description: `${formatINR(tx.totalAmountPaise)} will be added back to your remaining loan balance.`,
        isRefund: false,
      });
      break;
    }

    case 'transfer': {
      const fromAcc = tx.entries.find((e) => e.direction === 'credit' && e.accountId);
      const toAcc = tx.entries.find((e) => e.direction === 'debit' && e.accountId);

      if (fromAcc) {
        impacts.push({
          targetType: 'account',
          targetName: fromAcc.accountName || 'Origin Account',
          action: 'credit',
          amountPaise: fromAcc.amountPaise,
          description: `${formatINR(fromAcc.amountPaise)} will be restored back to origin account.`,
          isRefund: true,
        });
      }
      if (toAcc) {
        impacts.push({
          targetType: 'account',
          targetName: toAcc.accountName || 'Destination Account',
          action: 'debit',
          amountPaise: toAcc.amountPaise,
          description: `${formatINR(toAcc.amountPaise)} will be deducted from destination account.`,
          isRefund: false,
        });
      }
      break;
    }

    default: {
      impacts.push({
        targetType: 'account',
        targetName: 'Ledger',
        action: 'credit',
        amountPaise: tx.totalAmountPaise,
        description: 'Transaction entries will be symmetrically deleted from the ledger.',
        isRefund: true,
      });
      break;
    }
  }

  return {
    eligibility,
    impacts,
    canSafelyRevert: canSafelyRevert && (!blockingReason || eligibility.isReversible),
    blockingReason,
  };
}
